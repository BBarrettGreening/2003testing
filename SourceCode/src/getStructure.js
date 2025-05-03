const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

/**
 * Load potential selectors from the JSON file.
 * @returns {object} - Potential selectors for event cards.
 */
const loadPotentialSelectors = () => {
  const selectorsFile = path.join(__dirname, "../docs/potentialSelectors.json");
  try {
    if (!fs.existsSync(selectorsFile)) {
      console.error(`File ${selectorsFile} does not exist.`);
      return {
        eventCard: [],
        title: [],
        date: [],
        link: []
      };
    }
    
    const selectors = JSON.parse(fs.readFileSync(selectorsFile, "utf-8"));

    const requiredKeys = ['eventCard', 'title', 'date', 'link'];
    for (const key of requiredKeys) {
      if (!Array.isArray(selectors[key])) {
        console.error(`Invalid selectors format: ${key} should be an array.`);
        return {
          eventCard: [],
          title: [],
          date: [],
          link: []
        };
      }
    }

    return selectors;
  } catch (error) {
    console.error(`Error loading potential selectors: ${error.message}`);
    return {
      eventCard: [],
      title: [],
      date: [],
      link: []
    };
  }
};

/**
 * Validate selectors by checking for their existence on the page.
 * @param {object} $ - Cheerio instance of the page content.
 * @param {string[]} potentialSelectors - List of potential selectors to check.
 * @returns {string[]} - Array of all matching selectors.
 */
const findMatchingSelectors = ($, potentialSelectors) => {
  return potentialSelectors.filter(selector => {
    try {
      return $(selector).length > 0;
    } catch (error) {
      return false;
    }
  });
};

/**
 * Analyze the webpage for event structure using potential selectors.
 * @param {object} $ - Cheerio instance of the page content.
 * @param {object} potentialSelectors - Potential selectors for event cards.
 * @returns {object|null} - Detected selectors for the event structure, or null if none found.
 */
const detectEventStructure = ($, potentialSelectors) => {
  const eventCards = findMatchingSelectors($, potentialSelectors.eventCard);
  if (eventCards.length === 0) return null;

  const titles = findMatchingSelectors($, potentialSelectors.title);
  const dates = findMatchingSelectors($, potentialSelectors.date);
  const links = findMatchingSelectors($, potentialSelectors.link);

  return {
    eventCard: eventCards[0] || null,
    title: titles[0] || null,
    date: dates[0] || null,
    link: links[0] || null,
  };
};

/**
 * Check if a given URL string is valid.
 * @param {string} urlString - URL string to validate.
 * @returns {boolean} - True if valid URL, false otherwise.
 */
const isValidUrl = (urlString) => {
  try {
    new URL(urlString);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get the best scraping URL by testing known paths.
 * @param {string} baseUrl - Base URL of the website.
 * @returns {string|null} - Best URL for scraping or null if invalid.
 */
const getBestScrapingUrl = async (baseUrl) => {
  if (!isValidUrl(baseUrl)) return null;

  const potentialPaths = ["/whats-on/", "/events/"];
  for (const path of potentialPaths) {
    const testUrl = new URL(path, baseUrl).href;
    try {
      await axios.head(testUrl);
      return testUrl;
    } catch (error) {}
  }
  return baseUrl;
};

/**
 * Analyze a single website to detect event structure.
 * @param {string} baseUrl - The base URL of the website to analyze.
 * @param {object} potentialSelectors - Potential selectors for event cards.
 * @param {string} theatreName - Name of the theatre.
 * @param {string} theatreLocation - Location (City, Country) of the theatre.
 * @returns {object|null} - Detected configuration or null if analysis fails.
 */
const analyzeWebsite = async (baseUrl, potentialSelectors, theatreName, theatreLocation) => {
  const url = await getBestScrapingUrl(baseUrl);
  if (!url) return null;

  try {
    const response = await axios.get(url, { timeout:30000 } );
    const $ = cheerio.load(response.data);

    const selectors = detectEventStructure($, potentialSelectors);
    if (!selectors) return null;

    return {
      name: new URL(baseUrl).hostname,
      url,
      selectors,
      location: theatreLocation || theatreName,
    };
  } catch (error) {
    return null;
  }
};

/**
 * Reads theatre data from the XLSX file.
 * @returns {Array} - Array of theatre data objects.
 */
const readTheatreDataFromXLSX = () => {
  const xlsxFilePath = path.join(__dirname, "../docs/TheatreListReport.xlsx");
  try {
    if (!fs.existsSync(xlsxFilePath)) {
      console.error(`File ${xlsxFilePath} does not exist.`);
      return [];
    }

    const workbook = XLSX.readFile(xlsxFilePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    return XLSX.utils.sheet_to_json(sheet).map(row => ({
      id: row["Theatre Id"],
      name: row["Theatre"],
      website: row["Website Url"]?.trim()?.toUpperCase() !== "N/A" ? row["Website Url"].trim() : null,
      location: row["City"] && row["Country"] ? `${row["City"]}, ${row["Country"]}` : null
    }));
  } catch (error) {
    console.error(`Error reading theatre data: ${error.message}`);
    return [];
  }
};

/**
 * Process theatres from the XLSX file and save the results.
 */
const processTheatresFromXLSX = async () => {
  const outputFile = path.join(__dirname, "../docs/websiteConfigs.json");
  const failedOutputFile = path.join(__dirname, "../docs/failedStructures.json");

  let potentialSelectors = {};
  try {
    potentialSelectors = loadPotentialSelectors();
  } catch (error) {
    console.error(`Error loading selectors: ${error.message}`);
    potentialSelectors = {
      eventCard: [],
      title: [],
      date: [],
      link: []
    };
  }

  let theatres = [];
  try {
    theatres = readTheatreDataFromXLSX();
  } catch (error) {
    console.error(`Error reading theatre data: ${error.message}`);
    // Return a properly structured response even in case of error
    return {
      message: "Error processing theatres: " + error.message,
      totalTheatres: 0,
      successfulScrapes: 0,
      failedStructures: []
    };
  }

  const results = [];
  const failedStructures = [];
  const theatresWithoutWebsite = [];
  let completedCount = 0;

  const totalTheatres = theatres.length;

  const updateProgress = () => {
    console.log(`Progress: ${completedCount}/${totalTheatres} theatres processed`);
  };

  await Promise.all(theatres.map(async (theatre) => {
    if (!theatre.website) {
      theatresWithoutWebsite.push(theatre.name);
      failedStructures.push({ id: theatre.id, name: theatre.name, url: null, reason: "No website provided" });
    } else {
      const config = await analyzeWebsite(theatre.website, potentialSelectors, theatre.name, theatre.location);
      if (config) {
        results.push({ id: theatre.id, ...config });
      } else {
        failedStructures.push({ id: theatre.id, name: theatre.name, url: theatre.website, reason: "No valid structure detected" });
      }
    }
    completedCount++;
    updateProgress();
  }));

  console.log(`Website configurations saved to ${outputFile}`);
  try {
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  } catch (error) {
    console.error(`Error saving website configurations: ${error.message}`);
  }

  console.log(`Failed structures saved to ${failedOutputFile}`);
  try {
    fs.writeFileSync(failedOutputFile, JSON.stringify(failedStructures, null, 2));
  } catch (error) {
    console.error(`Error saving failed structures: ${error.message}`);
  }

  console.log(`${results.length} theatres processed successfully.`);
  console.log(`${theatresWithoutWebsite.length} theatres without a website.`);
  console.log(`${failedStructures.length - theatresWithoutWebsite.length} theatres failed to scrape.`);

  return { 
    message: "Theatre website structures processed successfully.",
    totalTheatres, 
    successfulScrapes: results.length, 
    failedStructures 
  };
};

if (require.main === module) {
  processTheatresFromXLSX().then(console.log).catch(console.error);
}

module.exports = { processTheatresFromXLSX };