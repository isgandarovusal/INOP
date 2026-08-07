const express = require("express")
const {productsController} =  require("../controllers/products.controller")
const router = express.Router()
const multer = require("multer")
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./uploads")
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`)
    }
})
const uploads = multer ({storage})
router.get("/",productsController.getAll)
router.get("/:id",productsController.getOne)
router.post("/",uploads.array("images",5),productsController.add)
router.delete("/:id",productsController.delete)
router.put("/:id",uploads.array("images",5),productsController.edit)
module.exports = {router}