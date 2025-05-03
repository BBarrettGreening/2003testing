const express = require('express');
const { processShowsFromXLSX } = require("../getShowStructure");

const router = express.Router();

router.post("/fetchShowStructure", async (req, res) => {
  try {
    const result = await processShowsFromXLSX();
    res.json(result);
  } catch (error) {
    console.error("Error processing show website structures:", error);
    res.status(500).json({ error: "Failed to process show website structures." });
  }
});

module.exports = router;