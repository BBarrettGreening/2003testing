const express = require('express');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

const router = express.Router();

// Route for `getLatestFile`
router.get("/getLatestFile", (req, res) => {
  const directoryPath = path.join(__dirname, "../../dataOutput");
  const websiteConfigsPath = path.join(__dirname, "../../docs/websiteConfigs.json");

  // Check if the directories exist
  if (!fs.existsSync(directoryPath)) {
    console.error("dataOutput directory does not exist");
    return res.status(404).json({ error: "Data output directory not found." });
  }

  // Read website configurations to get the number of layouts
  let websiteConfigs = [];
  try {
    if (fs.existsSync(websiteConfigsPath)) {
      const rawConfigs = fs.readFileSync(websiteConfigsPath, "utf8");
      websiteConfigs = JSON.parse(rawConfigs);
    }
  } catch (err) {
    console.error("Error reading websiteConfigs.json:", err.message);
    // Don't return here, continue to try finding files
  }

  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      console.error("Error reading dataOutput directory:", err);
      return res.status(500).json({ error: "Unable to fetch latest file." });
    }

    // Find the latest Part-1 and Part-2 CSV files
    const csvFiles = files.filter((file) => file.endsWith(".csv"));
    const part1Files = csvFiles.filter((file) => file.includes("Part-1"));
    const part2Files = csvFiles.filter((file) => file.includes("Part-2"));

    if (part1Files.length === 0 || part2Files.length === 0) {
      return res.status(404).json({ message: "No CSV files found." });
    }

    // Sort files by timestamp and get the latest Part-1 and Part-2 files
    part1Files.sort().reverse();
    part2Files.sort().reverse();
    const latestPart1 = part1Files[0];
    const latestPart2 = part2Files[0];

    // Log for debugging
    console.log("Latest Part1:", latestPart1);
    console.log("Latest Part2:", latestPart2);

    // Ensure they belong to the same timestamp
    const timestamp1 = latestPart1.match(/(\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2})/);
    const timestamp2 = latestPart2.match(/(\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2})/);

    if (!timestamp1 || !timestamp2) {
      console.error("Could not extract timestamps from filenames");
      return res.status(500).json({ error: "Invalid file format." });
    }

    if (timestamp1[0] !== timestamp2[0]) {
      console.error("Timestamp mismatch between Part1 and Part2 files");
      return res.status(500).json({ error: "Mismatched Part-1 and Part-2 files." });
    }

    const latestTimestamp = timestamp1[0];
    const formattedDate = latestTimestamp.replace(
      /(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})/,
      "$1/$2/$3 $4:$5:$6"
    );
    const zipFilePath = path.join(directoryPath, `latest_data_${latestTimestamp}.zip`);

    // Check if the zip file already exists - if so, return it directly
    if (fs.existsSync(zipFilePath)) {
      console.log(`Using existing ZIP file: ${zipFilePath}`);
      return res.status(200).json({
        latestFile: formattedDate,
        layoutsFound: websiteConfigs.length,
        downloadUrl: `/dataOutput/latest_data_${latestTimestamp}.zip`,
      });
    }

    // Create a ZIP archive
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      console.log(`ZIP file created: ${zipFilePath} (${archive.pointer()} bytes)`);
      res.status(200).json({
        latestFile: formattedDate,
        layoutsFound: websiteConfigs.length,
        downloadUrl: `/dataOutput/latest_data_${latestTimestamp}.zip`,
      });
    });

    archive.on("warning", (err) => {
      if (err.code === "ENOENT") {
        console.warn("Archiver warning:", err);
      } else {
        console.error("Archiver error:", err);
        res.status(500).json({ error: "Error creating ZIP: " + err.message });
      }
    });

    archive.on("error", (err) => {
      console.error("Error creating ZIP archive:", err);
      res.status(500).json({ error: "Unable to create ZIP archive." });
    });

    archive.pipe(output);
    
    // Add the CSV files to the archive
    try {
      archive.file(path.join(directoryPath, latestPart1), { name: latestPart1 });
      archive.file(path.join(directoryPath, latestPart2), { name: latestPart2 });
      archive.finalize();
    } catch (err) {
      console.error("Error adding files to archive:", err);
      res.status(500).json({ error: "Error creating archive: " + err.message });
    }
  });
});

module.exports = router;