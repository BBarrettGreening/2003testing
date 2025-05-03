const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const upload = multer({ dest: path.join(__dirname, '../../uploads') });

const router = express.Router();

// Upload and replace TheatreListReport.xlsx
router.post("/upload-theatre", upload.single("TheatreListReport"), (req, res) => {
  const targetPath = path.join(__dirname, "../../docs/TheatreListReport.xlsx");

  fs.rename(req.file.path, targetPath, (err) => {
    if (err) {
      console.error("Failed to save theatre file:", err);
      return res.status(500).json({ message: "Error saving theatre file." });
    }
    res.status(200).json({ message: "Theatre file uploaded successfully." });
  });
});

module.exports = router;