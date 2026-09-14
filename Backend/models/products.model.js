const mongoose = require("mongoose")

const productsSchema = new mongoose.Schema(
    {
        title: {
            type: String,
<<<<<<< HEAD
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

=======
            required: [true, "Title is required"],
            trim: true,
        },
        description: {
            type: String,
            required: [true, "Description is required"],
            trim: true,
        },
        price: {
            type: Number,
            default: 0,
            min: [0, "Price cannot be negative"],
        },
>>>>>>> 3e8e70665c032f00c1faf98c380eefa6b2ad9977
        category: {
            type: String,
            default: "General",
            trim: true,
        },
<<<<<<< HEAD

=======
>>>>>>> 3e8e70665c032f00c1faf98c380eefa6b2ad9977
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
<<<<<<< HEAD

module.exports = { products }
=======
module.exports = { products }
>>>>>>> 3e8e70665c032f00c1faf98c380eefa6b2ad9977
