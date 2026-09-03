const mongoose = require("mongoose")
const { products } = require("../models/products.model")
const productsController = ({
    getAll: async (req, res) => {
        try {
            const target = await products.find()
            res.status(200).send(target)
        }
        catch (err) {
            res.status(500).send({ message: "Failed to fetch products" })
        }
    },
    getOne: async (req, res) => {
        try {
            const { id } = req.params

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).send({ message: "Invalid product id" })
            }

            const target = await products.findById(id)

            if (!target) {
                return res.status(404).send({ message: "Product not found" })
            }

            res.status(200).send(target)
        }
        catch (err) {
            res.status(500).send({ message: "Failed to fetch product" })
        }
    },
     add: async (req, res) => {
        try {
            const { title, description } = req.body

            if (!title || !description) {
                return res.status(400).send({
                    message: "Title and description are required",
                })
            }

            const images = (req.files || []).map(file => file.path)

            const newProduct = new products({
                title,
                description,
                images,
            })

            await newProduct.save()

            res.status(201).send(newProduct)
        }
        catch (err) {
            res.status(500).send({
                message: "Failed to create product",
            })
        }
    },
     delete: async (req, res) => {
        try {
            const { id } = req.params

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).send({
                    message: "Invalid product id",
                })
            }

            const target = await products.findByIdAndDelete(id)

            if (!target) {
                return res.status(404).send({
                    message: "Product not found",
                })
            }

            res.status(200).send({
                message: "Product deleted successfully",
            })
        }
        catch (err) {
            res.status(500).send({
                message: "Failed to delete product",
            })
        }
    },
     edit: async (req, res) => {
        try {
            const { id } = req.params

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).send({
                    message: "Invalid product id",
                })
            }

            const updateData = { ...req.body }

            if (req.files && req.files.length > 0) {
                updateData.images = req.files.map(file => file.path)
            }

            const target = await products.findByIdAndUpdate(
                id,
                updateData,
                {
                    new: true,
                    runValidators: true,
                }
            )

            if (!target) {
                return res.status(404).send({
                    message: "Product not found",
                })
            }

            res.status(200).send(target)
        }
        catch (err) {
            res.status(500).send({
                message: "Failed to update product",
            })
        }
    }


})
module.exports = {productsController}