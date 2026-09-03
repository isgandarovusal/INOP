const express = require("express")
const { productsController } = require("../controllers/products.controller")
const { upload } = require("../middleware/multer.middleware")

const router = express.Router()

router.get("/", productsController.getAll)
router.get("/:id", productsController.getOne)

router.post(
    "/",
    upload.array("images", 5),
    productsController.add
)

router.put(
    "/:id",
    upload.array("images", 5),
    productsController.edit
)

router.delete("/:id", productsController.delete)

module.exports = { router }