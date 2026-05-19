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

// Poll until the Job's pod is Running with an assigned IP, then return it
async function WaitForPodReady(sessionId) {
    const deadline = Date.now() + POD_READY_TIMEOUT_MS;
    while (Date.now() < deadline) {
        const res = await coreApi.listNamespacedPod(
            NAMESPACE,
            undefined, undefined, undefined, undefined,
            `session=${sessionId}`,
        );
        const pod = res.body.items[0];
        if (pod && pod.status.phase === 'Running' && pod.status.podIP) {
            return pod.status.podIP;
        }
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

module.exports = { CreateJob, DeleteJob };
