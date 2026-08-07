const { products } = require("../models/products.model")
const productsController = ({
    getAll: async (req, res) => {
        try {
            const target = await products.find()
            res.send(target)
        }
        catch (err) {
            res.status(404).send(err)
        }
    },
    getOne:async (req, res) => {
        try {
            const { id } = req.params
            const target =await products.findById(id)
            res.send(target)
        }
        catch (err) {
            res.status(404).send(err)
        }

    },
    add: async (req,res)=>{
        try{
            const {title,description} = req.body
            const images = await req.files.map(file=>file.path)
            const newProducts = await new products({title,description,images})
            await newProducts.save()
            const target =await products.find()
            res.send(target)
        }
        catch (err) {
            res.status(404).send(err)
        }
    },
    delete: async (req, res) => {
        try {
            const { id } = req.params;
            await products.findByIdAndDelete(id);
            const target = await products.find();
            res.send(target);
        } catch (err) {
            res.status(404).send(err);
        }
    },
    edit: async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = { ...req.body };
            
            if (req.files && req.files.length > 0) {
                updateData.images = req.files.map(file => file.path);
            }

            await products.findByIdAndUpdate(id, updateData)
            const target = await products.find()
            res.send(target)
        }
        catch (err) {
            res.status(404).send(err);
        }
    }


})
module.exports = {productsController}