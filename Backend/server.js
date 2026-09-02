const path = require("path")
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const multer = require("multer")
require("dotenv").config()

const { router } = require("./routes/route")
const { uploadsDir } = require("./middleware/multer.middleware")

const app = express()

app.use(express.json())
app.use(cors())
app.use("/uploads", express.static(uploadsDir))

app.get("/", (req, res) => {
    res.status(200).send({ status: "ok", message: "INOP Backend is running" })
})

app.use("/products", router)

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).send({ message: err.message })
    }
    if (err) {
        return res.status(500).send({ message: err.message || "Something went wrong" })
    }
    next()
})

app.use((req, res) => {
    res.status(404).send({ message: "Route not found" })
})

const PORT = process.env.PORT || 2000
const CS = process.env.CS

if (!CS) {
    console.error("Missing CS (MongoDB connection string) environment variable. Check your .env file.")
    process.exit(1)
}

mongoose
    .connect(CS)
    .then(() => {
        console.log("db connected")
        app.listen(PORT, () => {
            console.log(`Port is listening in ${PORT}`)
        })
    })
    .catch((err) => {
        console.error("Failed to connect to MongoDB:", err.message)
        process.exit(1)
    })
