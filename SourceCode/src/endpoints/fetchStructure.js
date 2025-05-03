const express = require('express');
const { processTheatresFromXLSX } = require("../getStructure");

const router = express.Router();

router.post("/fetchStructure", async (req, res) => {
  try {
    const result = await processTheatresFromXLSX();
    res.json(result);
  } catch (error) {
    console.error("Error processing website structures:", error);
    res.status(500).json({ error: "Failed to process website structures." });
  }
});

module.exports = router;