const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const upload = multer({ dest: path.join(__dirname, '../../uploads') });

const router = express.Router();

// Upload and replace ShowListReport.xlsx
router.post("/upload-show", upload.single("ShowsListReport"), (req, res) => {
  console.log("Received file upload:", req.file);

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }

  const targetPath = path.join(__dirname, "../../docs/ShowListReport.xlsx");
  fs.rename(req.file.path, targetPath, (err) => {
    if (err) {
      console.error("Error moving file:", err);
      return res.status(500).json({ message: "Error saving show file." });
    }
    res.status(200).json({ message: "Show file uploaded successfully." });
  });
});

module.exports = router;