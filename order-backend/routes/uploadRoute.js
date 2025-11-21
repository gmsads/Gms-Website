const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// POST /api/upload
router.post("/", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  // Use environment variable with fallback
  const domain = process.env.PRODUCTION_DOMAIN || `${req.protocol}://${req.get("host")}`;
  const fileUrl = `${domain}/uploads/${req.file.filename}`;
  
  res.json({ url: fileUrl });
});

module.exports = router;