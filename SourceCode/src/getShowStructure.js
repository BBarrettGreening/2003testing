const axios = require("axios");
const { raw } = require("body-parser");
const cheerio = require("cheerio");
const e = require("express");
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const PQueue = require("p-queue").default;

//the pqueue 
// const queue = new PQueue({ concurrency: 5, interval: 2500, intervalCap: 5 }); // 5 concurrent jobs with a 1.5 second interval between them

const queue = new PQueue({ concurrency: 7}); // 5 concurrent jobs
/**
 * Load potential selectors for shows from the JSON file.
 * @returns {object} - Potential selectors for show event cards.
 */
const loadShowPotentialSelectors = () => {
    const selectorsFile = path.join(__dirname, "../docs/showPotentialSelectors.json");
    if (!fs.existsSync(selectorsFile)) {
        throw new Error(`File ${selectorsFile} does not exist.`);
    }
    return JSON.parse(fs.readFileSync(selectorsFile, "utf-8"));
};

/**
 * Validate selectors by checking for their existence on the page.
 * @param {object} $ - Cheerio instance of the page content.
 * @param {string[]} potentialSelectors - List of potential selectors to check.
 * @returns {string[]} - Array of all matching selectors.
 */
const findMatchingSelectors = ($, potentialSelectors, eventCardSelector = null) => {
    const matchingSelectors = [];
    
    for (const selector of potentialSelectors) {
      if (eventCardSelector) {
        // Check if the selector is a part of the event card selector
        const eventCard = $(eventCardSelector).find(selector);
        if (eventCard.length > 0) {
            matchingSelectors.push(selector);
        }
    } else {
        // Check if the selector exists in the entire document (original method)
        if ($(selector).length > 0) {
            matchingSelectors.push(selector);
        }
      }
    }

    return matchingSelectors;
};

const detectShowStructure = ($, potentialSelectors, url) => {
  if (!potentialSelectors || !potentialSelectors.eventCard) {
      console.warn(`Invalid potential selectors for url: ${url}`);
      return null;
  }
  
  const eventCards = findMatchingSelectors($, potentialSelectors.eventCard);
  
  for (const eventCardSelector of eventCards) {
    const dates = findMatchingSelectors($, potentialSelectors.date || [], eventCardSelector);
    const locations = findMatchingSelectors($, potentialSelectors.location || [], eventCardSelector);
    const links = findMatchingSelectors($, potentialSelectors.link || [], eventCardSelector);

      // Will check if all of the selectors are full, if one is empty, it will skip the current event card and go to the next one
      if (dates.length > 0 && locations.length > 0 && links.length > 0) {
          // Return the first matching selector for each field
          console.log(`Found valid structure for event card: ${eventCardSelector}`);
          return {
              eventCard: eventCardSelector,
              date: dates[0],
              location: locations[0],
              link: links[0],
          };
      }
      // check if the link is a concord link, if it is it will go through with null values 
      const concText = " A concord link, no values necessary";
      if (url && url.includes("concordtheatricals")) {
          console.log(`Found concord link for event card: ${eventCardSelector}`);
          return {
              eventCard: eventCardSelector,
              date: concText,
              location: concText,
              link: concText,
          };
      }
  }
  // If no valid structure is found, return null
  return null;
};

/**
 * Analyze a single show website to detect show details.
 * @param {string} url - The URL of the website to analyze.
 * @param {object} potentialSelectors - Potential selectors for show details.
 * @returns {object|null} - The detected configuration or null if analysis fails.
 */
const analyzeShowWebsite = async (url, potentialSelectors) => {
    if (!url || typeof url !== 'string') {
        console.warn(`Invalid URL provided: ${url}`);
        return null;
    }

    try {
        console.log(`Analyzing show website: ${url}...`);
        
        // Add timeout to prevent hanging on slow websites
        const response = await axios.get(url, { timeout: 30000 });
        
        if (!response.data) {
            console.warn(`No data received from ${url}`);
            return null;
        }

        const $ = cheerio.load(response.data);

        // Detect show structure dynamically
        const selectors = detectShowStructure($, potentialSelectors, url);
        if (!selectors) {
            console.warn(`No valid structure found for ${url}`);
            return null;
        }

        return {
            name: new URL(url).hostname,
            url,
            selectors,
        };
    } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.message.includes('timeout')) {
            console.error(`Network error analyzing ${url}: ${error.message}`);
        } else {
            console.error(`Error analyzing ${url}: ${error.message}`);
        }
        return null;
    }
};

/** 
 * Retries failed concorde websites from the failed attempts file.
 * * @param {string} failedAttemptsFile - Path to the failed attempts file.
 * * @param {string} outputFileConc - Path to the output file for concorde data.
 * * @param {PQueue} queue - The PQueue instance for managing concurrent jobs.
 * * @param {function} analyseConcorde - Function to analyze concorde websites.
 * * @returns {Promise<void>} - A promise that resolves when the retries are complete.
 * 
*/
const retryConcordeFailures = async(failedAttemptsFile, outputFileConc, queue, analyseConcorde) => {
  if (!fs.existsSync(failedAttemptsFile)) {
    console.log(`No failed attempts file found at ${failedAttemptsFile}.`);
    return;
  }

  // retry scraping failed concorde websites from the failed attempts file
  let retryLog = JSON.parse(fs.readFileSync(failedAttemptsFile, "utf-8"));
  retryLog = retryLog.filter(entry => entry.url && typeof entry.url === "string");

  let retries = 0;
  const maxRetries = 5; // Maximum number of retries

  let failedTrue = retryLog.filter(entry =>
    entry.url &&
    typeof entry.url === "string" &&
    entry.retries === retries &&
    entry.url.includes("concordtheatricals")
  ).map(entry => entry.url);

  while (failedTrue.length > 0 && retries < maxRetries) {
    retries++;
    console.log("Retrying failed concorde websites...");

    const failedJobs = [];

    for (const rawUrl of failedTrue) {
      failedJobs.push(queue.add( async () => {
        try {
          await analyseConcorde(rawUrl, outputFileConc);
          retryLog = retryLog.filter(entry => entry.url !== rawUrl); 
        } catch (error) {
          console.error(`Error analyzing ${rawUrl}: ${error.message}`);
          retryLog.push({
            url: rawUrl,
            error: error.message,
            retries
          });
        }
      }));
    }

    await Promise.all(failedJobs); // Wait for all jobs to finish
    console.log("All jobs completed.");
    failedTrue = retryLog.filter(entry => entry.retries === retries && entry.url.includes("concordtheatricals"))
        .map(entry => entry.url);
    
    fs.writeFileSync(failedAttemptsFile, JSON.stringify(retryLog, null, 2));
  }
  console.log(`Retrying completed. ${failedTrue.length} websites still failed after ${maxRetries} retries.`);
};



const processShowsFromXLSX = async () => {
  try {
    const xlsxFilePath = path.join(__dirname, "../docs/ShowsListReport.xlsx");
    const outputFile = path.join(__dirname, "../docs/showConfigs.json");
    const outputFileConc = path.join(__dirname, "../docs/concordeData.json");
    
    try {
      const { analyseConcorde } = require("./concordeTheatricalsBespoke.js"); // Import the analyse concore
      const failedAttemptsFile = path.join(__dirname, "../docs/failedAttempts.json");

      // Load potential selectors
      let potentialSelectors;
      try {
        potentialSelectors = loadShowPotentialSelectors();
      } catch (selectorError) {
        console.error("Error loading potential selectors:", selectorError.message);
        potentialSelectors = { eventCard: [], date: [], location: [], link: [] };
      }

      // Check if the input XLSX file exists
      if (!fs.existsSync(xlsxFilePath)) {
        throw new Error(`File ${xlsxFilePath} does not exist.`);
      }

      // Read the XLSX sheet and convert to JSON
      const workbook = XLSX.readFile(xlsxFilePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error(`No data found in ${xlsxFilePath}.`);
      }

      const results = [];
      const failedWebsites = [];
      const jobs = [];

      for (const row of rows) {
        const rawUrl = row["Website Url"];
        const showName = row["Show Name"];
        const showId = row["Show Id"];
      
        if (!rawUrl || rawUrl.toUpperCase() === "N/A") {
          failedWebsites.push(`No valid URL found for show: ${showName}`);
          continue;
        }
        
        // Checking if the url is a sub of https://www.concordtheatricals.co.uk/
        const trimmedUrl = rawUrl;
        const urlPattern = /^(https?:\/\/)?(www\.)?concordtheatricals\.co\.uk/i;
        const isConcordTheatricals = urlPattern.test(trimmedUrl);

        if (isConcordTheatricals) {
          //queue to throttle 
            jobs.push(queue.add(() => analyseConcorde(rawUrl, outputFileConc)
              .catch((error) => {
                console.error(`Error analyzing ${rawUrl}: ${error.message}`);
                failedWebsites.push(rawUrl);
              })
            ));       
            continue;
        }

        const url = rawUrl.trim();
      
        jobs.push(queue.add(async() => {
          try {
            const config = await analyzeShowWebsite(url, potentialSelectors);
            if (config) {
              results.push({
                id: showId,
                name: showName,
                url: config.url,
                selectors: config.selectors
              });
            } else {
              failedWebsites.push(url);
            }
          } catch (error) {
            console.error(`Error in job for ${url}: ${error.message}`);
            failedWebsites.push(url);
          }
        }));
      }  

      await Promise.all(jobs); // Wait for all jobs to finish
      console.log("All jobs completed.");

      // Save configurations
      fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
      console.log(`Show configurations saved to ${outputFile}`);

      console.log(`${results.length} show websites processed successfully.`);
      if (failedWebsites.length > 0) {
        console.log(`${failedWebsites.length} websites failed to process:`);
        failedWebsites.forEach((url) => console.log(`- ${url}`));
      }

      try {
        await retryConcordeFailures(failedAttemptsFile, outputFileConc, queue, analyseConcorde);
      } catch (retryError) {
        console.error("Error retrying Concorde failures:", retryError.message);
      }

      return {
        message: "Show website structures processed successfully.",
        totalWebsites: rows.length,
        successfulScrapes: results.length,
        failedScrapes: failedWebsites.length,
        failedWebsites,
        savedStructures: results,
      };
    } catch (innerError) {
      console.error("Error in processShowsFromXLSX:", innerError.message);
      return {
        message: "Error processing show websites: " + innerError.message,
        totalWebsites: 0,
        successfulScrapes: 0,
        failedScrapes: 0,
        failedWebsites: [],
        savedStructures: [],
      };
    }
  } catch (outerError) {
    console.error("Critical error in processShowsFromXLSX:", outerError.message);
    return {
      message: "Critical error processing show websites: " + outerError.message,
      totalWebsites: 0,
      successfulScrapes: 0,
      failedScrapes: 0,
      failedWebsites: [],
      savedStructures: [],
    };
  }
};


// Run the function and export its result for use in the scraping endpoint
if (require.main === module) {
  processShowsFromXLSX()
    .then((result) => {
      console.log(result);
    })
    .catch((err) => console.error("Error:", err.message));
}

module.exports = { processShowsFromXLSX };