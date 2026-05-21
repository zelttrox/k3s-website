const k8s = require('@kubernetes/client-node');

const kubeConfig = new k8s.KubeConfig();
kubeConfig.loadFromDefault();

const coreApi = kubeConfig.makeApiClient(k8s.CoreV1Api);
const batchApi = kubeConfig.makeApiClient(k8s.BatchV1Api);

const NAMESPACE = 'default';
const POD_READY_TIMEOUT_MS = 30_000;
const POD_READY_POLL_MS = 500;

// Generate random 5 characters session ID
function GenSessionId() {
    const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
    var sessionId = "";
    for (var i = 0 ; i < 5 ; i++) {
        sessionId += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return sessionId;
}

// One-shot lookup of the Running pod IP for a session (null if not ready)
async function findPodIP(sessionId) {
    const res = await coreApi.listNamespacedPod(
        NAMESPACE,
        undefined, undefined, undefined, undefined,
        `session=${sessionId}`,
    );
    const pod = res.body.items[0];
    if (pod && pod.status.phase === 'Running' && pod.status.podIP) {
        return pod.status.podIP;
    }
    return null;
}

// Resolve the pod IP for a session, throw if absent (used by the proxy)
async function GetPodIP(sessionId) {
    const ip = await findPodIP(sessionId);
    if (!ip) throw new Error(`No running pod for session ${sessionId}`);
    return ip;
}

// Poll until the Job's pod is Running with an assigned IP, then return it
async function WaitForPodReady(sessionId) {
    const deadline = Date.now() + POD_READY_TIMEOUT_MS;
    while (Date.now() < deadline) {
        const ip = await findPodIP(sessionId);
        if (ip) return ip;
        await new Promise(r => setTimeout(r, POD_READY_POLL_MS));
    }
    throw new Error(`Pod for session ${sessionId} not ready within ${POD_READY_TIMEOUT_MS}ms`);
}

// Create an ephemeral Job that runs the resume container for 5 minutes
async function CreateJob() {
    const sessionId = GenSessionId();
    const jobName = `resume-${sessionId}`;
    const labels = { app: 'resume', session: sessionId };

    const job = {
        apiVersion: 'batch/v1',
        kind: 'Job',
        metadata: { name: jobName, labels },
        spec: {
            ttlSecondsAfterFinished: 0,
            activeDeadlineSeconds: 300,
            backoffLimit: 0,
            template: {
                metadata: { labels },
                spec: {
                    restartPolicy: 'Never',
                    containers: [{
                        name: 'resume',
                        image: 'resume:latest',
                        imagePullPolicy: 'IfNotPresent',
                        ports: [{ containerPort: 80 }],
                    }],
                },
            },
        },
    };

    await batchApi.createNamespacedJob(NAMESPACE, job);
    const podIP = await WaitForPodReady(sessionId);
    return { sessionId, podIP };
}

// Delete the Job (and its pod via propagation)
async function DeleteJob(sessionId) {
    await batchApi.deleteNamespacedJob(
        `resume-${sessionId}`,
        NAMESPACE,
        undefined, undefined, undefined, undefined,
        'Background',
    );
}

// List all pods in the namespace (like `kubectl get pods`)
async function ListPods() {
    const res = await coreApi.listNamespacedPod(NAMESPACE);
    return res.body.items.map(pod => {
        const containers = pod.status.containerStatuses || [];
        const ready = containers.filter(c => c.ready).length;
        const restarts = containers.reduce((sum, c) => sum + c.restartCount, 0);
        const start = pod.status.startTime || pod.metadata.creationTimestamp;
        return {
            name: pod.metadata.name,
            ready: `${ready}/${containers.length || pod.spec.containers.length}`,
            status: pod.status.phase,
            restarts,
            age: start ? FormatAge(start) : '—',
        };
    });
}

// Format a timestamp into a compact age string (like kubectl: 5m, 2h, 3d)
function FormatAge(timestamp) {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
}

// Count the amount of resume pods
async function CountResumePods() {
    const res = await batchApi.listNamespacedJob(
        NAMESPACE,
        undefined, undefined, undefined, undefined,
        'app=resume',
    );
    return res.body.items.filter(j => !j.status.succeeded && !j.status.failed).length;
}

module.exports = { CreateJob, DeleteJob, GetPodIP, ListPods, CountResumePods };
