const multer = require("multer")
const path = require("path")
const fs = require("fs")

const uploadsDir = path.join(__dirname, "..", "uploads")

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir)
    },

    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/\s+/g, "_")
        cb(null, `${Date.now()}-${safeName}`)
    },
})

const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/

    const extOk = allowed.test(
        path.extname(file.originalname).toLowerCase()
    )

    const mimeOk = allowed.test(file.mimetype)

    if (extOk && mimeOk) {
        cb(null, true)
    } else {
        cb(new Error("Only image files (jpg, jpeg, png, gif, webp) are allowed"))
    }
}

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
})

module.exports = { upload, uploadsDir }