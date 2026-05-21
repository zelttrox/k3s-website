// Import modules
const express = require("express")
const ejs = require("ejs")
const path = require("path")
const { createProxyMiddleware } = require("http-proxy-middleware")

const github = require("./src/github")
const kubernetes = require("./src/kubernetes")

// Define server variables
const server = express()
const port = 3030
const sessions = new Map()
const githubLogin = "zelttrox"
let githubCache = { data: null, expires: 0 }

// Define parsing middlewares
server.use(express.urlencoded({extended: true}))
server.use(express.json())

// Set render engine
server.set("view engine", "ejs")

// Define static folder
server.use(express.static("static"))

// Root GET request handler
server.get("/", function (request, response) {
    response.render("index", {})
})

// Contact route handler
server.get("/contact", function (request, response) {
    response.render("contact", {})
})

// Projects route handler
server.get("/projects", function (request, response) {
    response.render("projects", {})
})

// GitHub contributions API
server.get("/api/github", async function (request, response) {
    try {
        if (githubCache.data && Date.now() < githubCache.expires) {
            return response.json(githubCache.data)
        }
        const data = await github.fetchContributions(githubLogin)
        githubCache = { data, expires: Date.now() + 60 * 60 * 1000 }
        response.json(data)
    } catch (err) {
        console.error("[Github API]", err)
        response.status(500).json({ error: "Failed to fetch contributions" })
    }
})

// List server pods (like `kubectl get pods`)
server.get("/api/pods", async function (request, response) {
    try {
        const pods = await kubernetes.ListPods()
        response.json(pods)
    } catch (err) {
        console.error("[Pods API]", err)
        response.status(500).json({ error: "Failed to list pods" })
    }
})

// Classic resume PDF
server.get("/cv/pdf", function (request, response) {
    response.sendFile(path.join(__dirname, "static", "files", "resume.pdf"))
})

// K3s sessions — resolve pod IP via label lookup on cache miss
async function resolveSession(req, res, next) {
    const { sessionId } = req.params
    if (sessions.has(sessionId)) return next()
    try {
        sessions.set(sessionId, await kubernetes.GetPodIP(sessionId))
        next()
    } catch {
        res.status(404).send('Session expirée ou introuvable')
    }
}

server.use('/cv/:sessionId', resolveSession, createProxyMiddleware({
  target: '',
  router: req => `http://${sessions.get(req.params.sessionId)}:80`,
  pathRewrite: (path, req) => path.replace(`/cv/${req.params.sessionId}`, ''),
  changeOrigin: true,
}))

// Start K3s resume pod if < 15
server.post("/api/cv/start", async (req, res) => {
    if (await kubernetes.CountResumePods() >= 15) {
        server.response.redirect("/cv/pdf"); 
        return;
    }
    const {sessionId, podIP} = await kubernetes.CreateJob();
    sessions.set(sessionId, podIP)
    res.json({ sessionId })
})

// Delete K3s resume pod
server.delete("/api/cv/:podName", async (req, res) => {
    await kubernetes.DeleteJob(req.params.podName);
    res.json({ status: 'deleted' });
})

// Start listening for connections
server.listen(port, function () {
    console.log("Server is up")
})