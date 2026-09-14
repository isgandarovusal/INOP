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
<<<<<<< HEAD

=======
>>>>>>> 3e8e70665c032f00c1faf98c380eefa6b2ad9977
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/\s+/g, "_")
        cb(null, `${Date.now()}-${safeName}`)
    },
})

const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/
<<<<<<< HEAD

    const extOk = allowed.test(
        path.extname(file.originalname).toLowerCase()
    )

    const mimeOk = allowed.test(file.mimetype)

=======
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase())
    const mimeOk = allowed.test(file.mimetype)
>>>>>>> 3e8e70665c032f00c1faf98c380eefa6b2ad9977
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
<<<<<<< HEAD
        fileSize: 5 * 1024 * 1024,
    },
})

module.exports = { upload, uploadsDir }
=======
        fileSize: 5 * 1024 * 1024, // 5MB per file
    },
})

module.exports = { upload, uploadsDir }
>>>>>>> 3e8e70665c032f00c1faf98c380eefa6b2ad9977
