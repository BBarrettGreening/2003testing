const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Export failed structures
router.get("/export-failed-structures", (req, res) => {
  const filePath = path.join(__dirname, "../../docs/failedStructures.xlsx");

  if (fs.existsSync(filePath)) {
    res.download(filePath, "failedStructures.xlsx", (err) => {
      if (err) {
        console.error("Error downloading failedStructures.xlsx:", err);
        res.status(500).send("Error downloading file.");
      }
    });
  } else {
    res.status(404).json({ message: "Failed structures file not found." });
  }
});

module.exports = router;