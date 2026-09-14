<<<<<<< HEAD
const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
});

const app = require("./app");

const PORT = Number(process.env.PORT || 3001);
const MONGO_URI = process.env.MONGO_URI || process.env.CS;

async function startServer() {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is not configured.");
  }

  await mongoose.connect(MONGO_URI);
  console.log("MongoDB connected");

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`INOP backend listening on port ${PORT}`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received. Shutting down gracefully...`);

    server.close(async () => {
      try {
        await mongoose.disconnect();
      } finally {
        process.exit(0);
      }
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  return server;
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Failed to start INOP backend:", error);
    process.exit(1);
  });
}

module.exports = { startServer };
=======
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
>>>>>>> 3e8e70665c032f00c1faf98c380eefa6b2ad9977
