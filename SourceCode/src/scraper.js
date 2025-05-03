const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const { generateFilename } = require("./utils");
const siteHandlers = require("./siteHandlers");
const { saveToCSV } = require("./outputData");

// Load theatre website configurations
const loadTheatreConfigs = () => {
  const websiteConfigsPath = path.join(__dirname, "../docs/websiteConfigs.json");
  if (!fs.existsSync(websiteConfigsPath)) {
    throw new Error(`File ${websiteConfigsPath} does not exist.`);
  }
  return JSON.parse(fs.readFileSync(websiteConfigsPath, "utf-8"));
};

// Load show website configurations
const loadShowConfigs = () => {
  const showConfigsPath = path.join(__dirname, "../docs/showConfigs.json");
  if (!fs.existsSync(showConfigsPath)) {
    throw new Error(`File ${showConfigsPath} does not exist.`);
  }
  return JSON.parse(fs.readFileSync(showConfigsPath, "utf-8"));
};

// Load the configuration for the Concord website
const loadConcordData = () => {
  const concordDataPath = path.join(__dirname, "../docs/concordeData.json");
  if (!fs.existsSync(concordDataPath)) {
    throw new Error(`File ${concordDataPath} does not exist.`);
  }
  return JSON.parse(fs.readFileSync(concordDataPath, "utf-8"));
};

// Function to normalise URLs by removing query parameters and hash fragments
const normaliseURL = (url) => {
  if (!url) return '';
  
  try {
    const urlObj = new URL(url);
    urlObj.search = ""; // Remove query parameters
    urlObj.hash = ""; // Remove hash fragment
    return urlObj.toString().replace(/\/$/, "");
  } catch (error) {
    // Return original URL if it can't be parsed
    return url;
  }
};

// Main scraping route
router.get("/", async (req, res) => {
  const results = [];
  const scrapedData = [];
  let theatreConfigs = [];
  let showConfigs = [];
  let concordData = [];

  try {
    theatreConfigs = loadTheatreConfigs();
  } catch (error) {
    console.error("Failed to load theatre website configurations:", error.message);
  }

  try {
    showConfigs = loadShowConfigs();
  } catch (error) {
    console.error("Failed to load show website configurations:", error.message);
  }

  try {
    concordData = loadConcordData();
  } catch (error) {
    console.error("Failed to load concord data:", error.message);
  }

  const allConfigs = [...theatreConfigs, ...showConfigs];

  // Process theatre sites
  for (const site of theatreConfigs) {
    const { name, url, selectors } = site;
    console.log(`Scraping site: ${url}`);
    //Check if it's a concordURL
    const isConcordUrl = url && url.toLowerCase().includes("concord");
    const match = concordData.filter(item => {
      if (!item.Url) return false;
      try {
        const normalizedItemUrl = normaliseURL(item.Url).toLowerCase();
        const normalizedSiteUrl = normaliseURL(url).toLowerCase();
        return normalizedItemUrl === normalizedSiteUrl;
      } catch (error) {
        return false;
      }
    });
    
    if (isConcordUrl || (match && match.length > 0)) {
      console.log(`Skipping concord site: ${name}`);
      continue; // Skip concord sites
    }

    try {
      const siteData = await siteHandlers.handleSite(name, url, selectors);

      // Determine correct naming format
      const isTheatre = theatreConfigs.some(config => config.name === name);

      const formattedData = {
        theatre: isTheatre ? name : "", // Use theatre name if it's a theatre website
        show_name: isTheatre ? "" : name, // Use show name if it's a show website
        shows: siteData.shows.map(show => ({
          title: show.title || "Unknown Show",
          date: show.date || "TBA",
          location: show.location || "Unknown Venue",
          link: show.link || ""
        }))
      };

      scrapedData.push(formattedData);
      console.log(`Scraped data for ${isTheatre ? "theatre" : "show"}: ${name}`);
      console.log(`Theatre found: ${formattedData.shows.length}`);

      results.push({
        site: name,
        type: isTheatre ? "Theatre" : "show",
        events_saved: formattedData.shows.length,
        message: "Scraped successfully",
      });
    } catch (error) {
      console.error(`Error scraping ${name}:`, error.message);
      results.push({
        site: name,
        type: theatreConfigs.some(config => config.name === name) ? "Theatre" : "show",
        events_saved: 0,
        message: `Error scraping: ${error.message}`,
      });
    }
  }

  // Process show sites
  for (const site of showConfigs) {
    const { name, url, selectors } = site;
    console.log(`Scraping site: ${url}`);
    
    // Check if it's a concordURL
    const isConcordUrl = url && url.toLowerCase().includes("concord");
    const match = concordData.filter(item => {
      if (!item.Url) return false;
      try {
        const normalizedItemUrl = normaliseURL(item.Url).toLowerCase();
        const normalizedSiteUrl = normaliseURL(url).toLowerCase();
        return normalizedItemUrl === normalizedSiteUrl;
      } catch (error) {
        return false;
      }
    });
    
    if (isConcordUrl || (match && match.length > 0)) {
      console.log(`Skipping concord site: ${name}`);
      continue; // Skip concord sites
    }

    try {
      const siteData = await siteHandlers.scrapeShow(url, selectors);

      // Determine correct naming format
      const isTheatre = theatreConfigs.some(config => config.name === name);
      //getting the location to use as the theatre

      const location = Array.from(new Set(
        siteData.shows.map(show => show.location).filter(loc => loc)));

      const formattedData = {
        theatre: isTheatre ? name : null, 
        show_name: isTheatre ? "" : name, // Use show name if it's a show website
        shows: siteData.shows.map(show => ({      
          title: name,
          date: show.date || "TBA",
          location: show.location || "Unknown Venue",
          link: show.link || ""
        }))
      };

      scrapedData.push(formattedData);
      console.log(`Scraped data for ${isTheatre ? "theatre" : "show"}: ${name}`);
      console.log(`Shows found: ${formattedData.shows.length}`);

      results.push({
        site: name,
        type: isTheatre ? "Theatre" : "show",
        events_saved: formattedData.shows.length,
        message: "Scraped successfully",
      });
    } catch (error) {
      console.error(`Error scraping ${name}:`, error.message);
      results.push({
        site: name,
        type: theatreConfigs.some(config => config.name === name) ? "Theatre" : "show",
        events_saved: 0,
        message: `Error scraping: ${error.message}`,
      });
    }
  }

  // Process Concorde data
  for (const concSite of showConfigs) {
    const { name, url } = concSite;
    
    // Check if it's a concord URL
    if (!url || !url.toLowerCase().includes("concord")) {
      continue;
    }
    
    try {
      console.log(`Scraping concord site: ${name}`);
      
      // Find all matches in concordeData.json with normalized URLs
      const normalizedSearchUrl = normaliseURL(url).toLowerCase();
      const match = concordData.filter(item => {
        if (!item.Url) return false;
        const normalizedItemUrl = normaliseURL(item.Url).toLowerCase();
        return normalizedItemUrl === normalizedSearchUrl;
      });

      if (match && match.length > 0) {
        for (const item of match) {
          console.log(`Found match for ${name} in concordData.json`);
          const Name = item.Name || "Unknown Name";
          const City = item.City || "Unknown City";
          const State = item.State || "Unknown State";
          const OpeningDate = item.Opening || "Unknown Date";
          const ClosingDate = item.Closing || "Unknown Date";

          const formattedData = {
            show_name: Name,
            shows: [
              {
                title: Name,
                date: `${OpeningDate} - ${ClosingDate}`,
                location: `${City}, ${State}`,
                link: url,
              },
            ],
          };
          scrapedData.push(formattedData);
          console.log(`Scraped data for concord site: ${name}`);
          console.log(`Concorde found: ${formattedData.shows.length}`);

          results.push({
            site: name,
            type: "Concord",
            events_saved: formattedData.shows.length,
            message: "Scraped successfully",
          });
        }
      } else {
        console.log(`No match found for ${name} in concordData.json`);
        results.push({
          site: name,
          type: "Concord",
          events_saved: 0,
          message: "No matching data found",
        });
      }
    } catch (error) {
      console.error(`Error scraping ${name}:`, error.message);
      results.push({
        site: name,
        type: "Concord",
        events_saved: 0,
        message: `Error scraping: ${error.message}`,
      });
    }
  }

  // Ensure output path exists
  const outputPath = path.join(__dirname, "../dataOutput");
  const outputFiles = saveToCSV(scrapedData, outputPath);
  console.log(JSON.stringify(scrapedData, null, 2));
  console.log(`Scraping completed. Data saved to ${outputFiles.part1} and ${outputFiles.part2}`);

  res.json({
    message: "Scraping completed successfully.",
    results,
    outputFiles,
  });
});

module.exports = router;