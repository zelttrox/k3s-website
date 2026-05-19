const k8s = require('@kubernetes/client-node');

const kubeConfig = new k8s.KubeConfig();
kubeConfig.loadFromDefault();

const api = kubeConfig.makeApiClient(k8s.CoreV1Api);

// Generate random 5 characters session ID
function GenSessionId() {
    const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
    var sessionId = "";
    for (var i = 0 ; i < 5 ; i++) {
        sessionId += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return sessionId;
}

// Init and create pod for resume
async function CreatePod() {
    const sessionId = GenSessionId();
    const podName = `resume-${sessionId}`;
    var pod = {
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: {
            name: podName,
            labels: { app: 'resume', session: sessionId },
            },
        spec: {
            containers: [{
                name: 'resume',
                image: 'resume:latest',
                ports: [{ containerPort: 3040 }]
            }],
            restartPolicy: 'Never',
            activeDeadlineSeconds: 600
            }
        };
    await api.createNamespacedPod('default', pod);
    return podName;
}

// Delete pod
async function DeletePod(podName) {
    await api.deleteNamespacedPod(podName, 'default');
}

// Return pod status
async function GetPodStatus(podName) {
    const res = await api.readNamespacedPod(podName, 'default');
    return res.body.status.phase;
}

module.exports = {CreatePod, DeletePod, GetPodStatus}