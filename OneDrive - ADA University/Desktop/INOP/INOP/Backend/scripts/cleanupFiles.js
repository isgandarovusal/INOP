const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const fs = require("fs/promises");
const mongoose = require("mongoose");
const { uploadsDir } = require("../middleware/privateUpload.middleware");
async function main() {
  await mongoose.connect(process.env.MONGO_URI || process.env.CS);
  const { cleanup } = require("../controllers/files.controller");
  let checked = 0;
  for (const name of await fs.readdir(uploadsDir)) {
    const stat = await fs.stat(path.join(uploadsDir, name));
    if (stat.isFile() && Date.now() - stat.mtimeMs > 24 * 3600000) {
      await cleanup("/uploads/" + name);
      checked++;
    }
  }
  console.log("Old upload files checked:", checked);
  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
