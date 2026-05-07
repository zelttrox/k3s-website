// Import modules
const express = require("express")
const ejs = require("ejs")
const { fetchContributions } = require("./src/github")

// Define server variables
const server = express()
const port = 3030
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

// GitHub contributions API
server.get("/api/github", async function (request, response) {
    try {
        if (githubCache.data && Date.now() < githubCache.expires) {
            return response.json(githubCache.data)
        }
        const data = await fetchContributions(githubLogin)
        githubCache = { data, expires: Date.now() + 60 * 60 * 1000 }
        response.json(data)
    } catch (err) {
        console.error("[Github API]", err)
        response.status(500).json({ error: "Failed to fetch contributions" })
    }
})

// Start listening for connections
server.listen(port, function () {
    console.log("[Server]", "Server started on port", port)
    console.log("[Server]", "Now listening..")
})