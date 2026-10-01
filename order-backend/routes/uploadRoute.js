const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const { r2Storage } = require("../utils/r2Storage");

const storage = r2Storage({
  namer: (req, file) => `${Date.now()}-${file.originalname.replace(/s+/g, "_")}`,
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