const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const swaggerUi = require("swagger-ui-express")
const swaggerSpec = require("./swagger")
const { router } = require("./routes/route")
require("dotenv").config()

const app = express()

app.use(express.json())
app.use(cors())

app.use("/uploads", express.static("uploads"))

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.use("/products", router)

mongoose.connect(process.env.CS).then(() => {
    console.log("db connected")
})

app.listen(process.env.PORT, () => {
    console.log(`Port is listening in ${process.env.PORT}`)
})
