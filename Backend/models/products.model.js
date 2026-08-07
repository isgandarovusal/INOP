const mongoose = require("mongoose")
const products = mongoose.model("products",new mongoose.Schema({
    title:{
        type:String,
        required:true,
    },
    description:{
        type:String,
        required:true,
    },
    images:{
        type:[String],
        default:[],
        required:true,
    }

}))
module.exports = {products}