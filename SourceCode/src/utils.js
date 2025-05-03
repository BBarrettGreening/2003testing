const fs = require("fs");

// Generate unique filenames with an optional extension (using date and time for uniqueness)
const generateFilename = (prefix = "", extension = ".csv") => {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hour = date.getHours().toString().padStart(2, "0");
  const minute = date.getMinutes().toString().padStart(2, "0");
  const second = date.getSeconds().toString().padStart(2, "0");

  // Construct filename correctly with prefix and extension
  return `${year}-${month}-${day}-${hour}-${minute}-${second}${prefix}${extension}`;
};

// Save the raw HTML to a file (for debugging to ensure the selectors are correct)
const saveHtml = (html) => {
  try {
    // Handle null or undefined input
    if (html === null || html === undefined) {
      console.warn("Warning: Attempting to save null or undefined HTML");
      html = "";
    }
    
    const filename = generateFilename(".html");
    // If env == test create a test data folder, else create a scrapedHTML folder
    const folder = process.env.NODE_ENV === "test" ? "test-data" : "scrapedHTML";
    
    // Create a new folder if it doesn't exist
    try {
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }
    } catch (dirError) {
      console.error(`Error creating directory ${folder}:`, dirError.message);
      return null;
    }
    
    // Attempt to write the file
    try {
      fs.writeFileSync(`${folder}/${filename}`, html);
      return `./${folder}/${filename}`;
    } catch (writeError) {
      console.error(`Error writing file ${filename}:`, writeError.message);
      return null;
    }
  } catch (error) {
    console.error("Unexpected error in saveHtml:", error.message);
    return null;
  }
};

// Export functions for use in scraper
module.exports = {
  generateFilename,
  saveHtml,
};