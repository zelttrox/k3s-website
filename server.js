// Import modules
const express = require("express")
const ejs = require("ejs")

// Define server variables
const server = express()
const port = 3030

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

// Start listening for connections
server.listen(port, function () {
    console.log("[Server]", "Server started on port", port)
    console.log("[Server]", "Now listening..")
})