const mongoose = require("mongoose")

const productsSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            required: true,
            trim: true,
        },

        price: {
            type: Number,
            default: 0,
            min: 0,
        },

        category: {
            type: String,
            default: "General",
            trim: true,
        },

        images: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true,
    }
)

const products = mongoose.model("products", productsSchema)

module.exports = { products }