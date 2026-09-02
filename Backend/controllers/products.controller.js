const fs = require("fs")
const path = require("path")
const mongoose = require("mongoose")
const { products } = require("../models/products.model")

const toWebPath = (filePath) => {
    const uploadsIndex = filePath.replace(/\\/g, "/").indexOf("uploads/")
    return uploadsIndex >= 0 ? filePath.replace(/\\/g, "/").slice(uploadsIndex) : filePath
}

const deleteImageFiles = (imagePaths = []) => {
    imagePaths.forEach((imgPath) => {
        const absolutePath = path.join(__dirname, "..", imgPath)
        fs.unlink(absolutePath, (err) => {
            if (err && err.code !== "ENOENT") {
                console.error(`Failed to delete image ${imgPath}:`, err.message)
            }
        })
    })
}

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id)

const productsController = {
    getAll: async (req, res) => {
        try {
            const { search, category } = req.query
            const filter = {}

            if (search) {
                filter.$or = [
                    { title: { $regex: search, $options: "i" } },
                    { description: { $regex: search, $options: "i" } },
                ]
            }
            if (category) {
                filter.category = { $regex: `^${category}$`, $options: "i" }
            }

            const target = await products.find(filter).sort({ createdAt: -1 })
            res.status(200).send(target)
        } catch (err) {
            res.status(500).send({ message: "Failed to fetch products", error: err.message })
        }
    },

    getOne: async (req, res) => {
        try {
            const { id } = req.params
            if (!isValidObjectId(id)) {
                return res.status(400).send({ message: "Invalid product id" })
            }

            const target = await products.findById(id)
            if (!target) {
                return res.status(404).send({ message: "Product not found" })
            }

            res.status(200).send(target)
        } catch (err) {
            res.status(500).send({ message: "Failed to fetch product", error: err.message })
        }
    },

    add: async (req, res) => {
        try {
            const { title, description, price, category } = req.body

            if (!title || !description) {
                return res.status(400).send({ message: "Title and description are required" })
            }

            const images = (req.files || []).map((file) => toWebPath(file.path))

            const newProduct = new products({
                title,
                description,
                price: price !== undefined && price !== "" ? Number(price) : undefined,
                category: category || undefined,
                images,
            })

            await newProduct.save()
            const target = await products.find().sort({ createdAt: -1 })
            res.status(201).send(target)
        } catch (err) {
            if (err.name === "ValidationError") {
                return res.status(400).send({ message: "Validation failed", error: err.message })
            }
            res.status(500).send({ message: "Failed to add product", error: err.message })
        }
    },

    edit: async (req, res) => {
        try {
            const { id } = req.params
            if (!isValidObjectId(id)) {
                return res.status(400).send({ message: "Invalid product id" })
            }

            const existing = await products.findById(id)
            if (!existing) {
                return res.status(404).send({ message: "Product not found" })
            }

            const { title, description, price, category } = req.body
            const updateData = {}
            if (title !== undefined) updateData.title = title
            if (description !== undefined) updateData.description = description
            if (price !== undefined && price !== "") updateData.price = Number(price)
            if (category !== undefined) updateData.category = category

            if (req.files && req.files.length > 0) {
                updateData.images = req.files.map((file) => toWebPath(file.path))
                deleteImageFiles(existing.images)
            }

            await products.findByIdAndUpdate(id, updateData, {
                new: true,
                runValidators: true,
            })

            const target = await products.find().sort({ createdAt: -1 })
            res.status(200).send(target)
        } catch (err) {
            if (err.name === "ValidationError") {
                return res.status(400).send({ message: "Validation failed", error: err.message })
            }
            res.status(500).send({ message: "Failed to update product", error: err.message })
        }
    },

    delete: async (req, res) => {
        try {
            const { id } = req.params
            if (!isValidObjectId(id)) {
                return res.status(400).send({ message: "Invalid product id" })
            }

            const deleted = await products.findByIdAndDelete(id)
            if (!deleted) {
                return res.status(404).send({ message: "Product not found" })
            }

            deleteImageFiles(deleted.images)

            const target = await products.find().sort({ createdAt: -1 })
            res.status(200).send(target)
        } catch (err) {
            res.status(500).send({ message: "Failed to delete product", error: err.message })
        }
    },
}

module.exports = { productsController }
