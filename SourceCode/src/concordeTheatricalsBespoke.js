const puppeteer = require("puppeteer");
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const fs = require("fs");
const path = require("path");
const getStartEndDate = require("./getStartEndDate");

/**
* Function to update the output file with new data.
* @param {Array} newData - The new data to be added to the output file.
* @param {string} outputFile - The path to the output file.
* */
const updateOutPutFile = (newData, outputFile) => {
    // Ensure the directory exists
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
        try {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`Created directory: ${outputDir}`);
        } catch (dirError) {
            console.error(`Error creating directory ${outputDir}: ${dirError.message}`);
            return false;
        }
    }

    let existingData = [];

    if (fs.existsSync(outputFile)) {
        try {
            const fileContent = fs.readFileSync(outputFile, "utf-8");
            existingData = JSON.parse(fileContent);
        } catch (error) {
            console.error(`Error reading existing file: ${error.message}`);
        }
    }
    
    if (!Array.isArray(existingData)) {
        existingData = [];
    }
    
    existingData.push(...newData);

    try {
        fs.writeFileSync(outputFile, JSON.stringify(existingData, null, 2), "utf-8");
        console.log(`Data saved to ${outputFile}`);
        return true;
    } catch (writeError) {
        console.error(`Error writing to file ${outputFile}: ${writeError.message}`);
        return false;
    }
};

/**
 * Function to remove USA states from the data
 * @param {Array} arr - The array of objects to filter.
 * @return {Array} - The filtered array without USA states.
 *                Each object contains the keys: Producer, City, State, Opening, Closing.
 * */
const noUSA = async (arr) => {
    const usStates = new Set(["alabama", "ala", "albama", "alaska", "ak", "alaaska", "arizona", "ariz", "arozona", "arkansas", "arkan", "arkansaw", "california", "calif", "cal", "colorado", "colo", "colarado", "connecticut", "conn", "conneticut", "delaware", "del", "deleware", "florida", "fla", "floridia", "georgia", "ga", "georja", "hawaii", "haw", "hawaaii", "idaho", "idaho", "idahoo", "illinois", "ill", "illinoise", "indiana", "ind", "indianna", "iowa", "ia", "ioha", "kansas", "kan", "kansaw", "kentucky", "ky", "kentuckee", "louisiana", "la", "louisana", "maine", "me", "mainee", "maryland", "md", "marylind", "massachusetts", "mass", "massachusets", "michigan", "mich", "michagan", "minnesota", "minn", "minisota", "mississippi", "miss", "missisippi", "missouri", "mo", "missoura", "montana", "mont", "montanna", "nebraska", "nebr", "nebrasca", "nevada", "nev", "navada", "new hampshire", "nh", "new hamshire", "new jersey", "nj", "new jersy", "new mexico", "nm", "new mex", "new york", "ny", "new yark", "north carolina", "nc", "no carolina", "north dakota", "nd", "no dakota", "ohio", "oh", "oiho", "oklahoma", "okla", "oklahama", "oregon", "ore", "oregen", "pennsylvania", "penn", "pensylvania", "rhode island", "ri", "rhod island", "south carolina", "sc", "so carolina", "south dakota", "sd", "so dakota", "tennessee", "tenn", "tennesee", "texas", "tex", "texes", "utah", "ut", "utaah", "vermont", "vt", "vermonte", "virginia", "va", "virgina", "washington", "wash", "wasington", "west virginia", "wv", "w virginia", "wisconsin", "wis", "wisconson", "wyoming", "wyo", "wyoming"]);

    return arr.filter(item => {
        const state = item.State?.toLowerCase().trim();
        const isUSA = usStates.has(state);
        return !isUSA;
    });
};

/**
 * Function to scroll the page slowly to the bottom and then up, this triggers the lazy loading of the table
 * and makes the loading look more natural and less bot like
 */
const scrollPage = async (page) => {
    try {
        await page.evaluate(async () => {
            const scrollStep = 500; 
            const scrollDelay = 10;
            const scrollHeight = document.body.scrollHeight || 5000; // Fallback if scrollHeight can't be determined

            for (let i = 0; i < scrollHeight; i += scrollStep) {
                window.scrollBy(0, scrollStep);
                await new Promise(resolve => setTimeout(resolve, scrollDelay)); // Wait for content to load
            }       
            // Scroll up by 1000 pixels to bring the table into view
            window.scrollBy(0, -1000);
        });
        return true;
    } catch (error) {
        console.error(`Error during page scrolling: ${error.message}`);
        return false;
    }
};

/**
 * Find if the table contains a next button
 * @param {object} iframe - The iframe element containing the table.
 * @returns {int} - The number of pages available in the table.
 *                  If the table is not found, return 0.
*/
const pageCnt = async (iframe) => {
    if (!iframe) {
        console.warn("iframe is null in pageCnt");
        return 0;
    }
    
    try {
        const isNext = await iframe.evaluate(async () => {
            try {
                const table = document.querySelector("#map-table-container");
                if (!table) {
                    return "Table not found in iframe.";
                }
                
                const paging = table.querySelector("#paging");
                if (!paging) {
                    return false;
                }
                
                const list = paging.querySelector("ul");
                if (!list) {
                    return false;
                }
                
                const items = Array.from(list.querySelectorAll("li"));
                return items.map(item => item.textContent.trim());
            } catch (innerError) {
                console.error(`Inner iframe evaluate error: ${innerError.message}`);
                return false;
            }
        });
        
        // Check if isNext is an array before trying to access its length
        if (Array.isArray(isNext)) {
            return isNext.length - 1; // -1 because the last item is the "next" button
        } else {
            return 0; // Return 0 if not an array
        }
    } catch (error) {
        console.error(`Error in pageCnt: ${error.message}`);
        return 0; // Return 0 on error
    }
};

/**
 * Get the data from the table
 * @param {object} iframe - The iframe element containing the table.
 * @param {string} url - The URL of the page being scraped.
 * @param {Array} failedAttempts - Array to store failed attempts.
 * @param {number} retries - Number of retries to attempt (default: 5).
 * @return {Array} - The data from the table as an array of objects.
 *                   Each object contains the keys: Producer, City, State, Opening, Closing.
 */
const getTableContents = async (iframe, url, failedAttempts, retries = 5) => {
    let data;
    let lastErrorMessage = null; // Variable to store the last error message
    
    // Make sure iframe exists
    if (!iframe) {
        console.warn("Error: iframe is null or undefined");
        failedAttempts.push({
            url: url, 
            error: "Iframe not found",
            retries: 0
        });
        return [];
    }
    
    while (retries > 0) {
        try {
            data = await iframe.evaluate(async () => {
                try {
                    const table = document.querySelector("#map-table-container");
                    if (!table) {
                        console.log("Table not found in iframe");
                        return null;
                    }    
                    
                    const rows = Array.from(table.querySelectorAll("tr") || []);
                    if (!rows || rows.length === 0) {
                        console.log("No rows found in table");
                        return [];
                    }
                    
                    return rows.map(row => {
                        if (!row) return [];
                        
                        const cells = Array.from(row.querySelectorAll("td") || []);
                        if (!cells || cells.length === 0) return [];
                        
                        return cells.map(cell => cell ? cell.textContent.trim() : "");
                    });
                } catch (innerError) {
                    console.error(`Inner iframe evaluate error: ${innerError.message}`);
                    return null;
                }
            });
            
            if (data && Array.isArray(data) && data.length > 0) {
                break; // Exit the loop if successful
            }
            
            // Add short delay before retry to allow for page loading
            await delay(1000);
        } catch (error) {
            lastErrorMessage = error.message;
            await delay(1000); // Wait before retrying
        }
        
        retries--;
        console.log(`Retrying to get table contents... (${retries} attempts left)`);
    }
    
    if (!data || !Array.isArray(data) || data.length === 0) {
        console.warn("Failed to get table contents after multiple attempts.");
        failedAttempts.push({
            url: url, 
            error: lastErrorMessage || "Unknown error",
            timestamp: new Date().toISOString(),
            retries: 0
        });
        return [];
    }
    
    // Filter out any empty or invalid rows
    const validData = data.filter(row => Array.isArray(row) && row.length >= 5);
    
    const formattedData = validData.map(row => ({
        Producer: row[0] || "",
        City: row[1] || "",
        State: row[2] || "",
        Opening: row[3] || "",
        Closing: row[4] || ""       
    }));

    console.log(`Data length: ${formattedData.length}`);
    
    // Check if there's data before trying to pop
    if (formattedData.length > 1) {
        // Only remove the last item if it's likely to be navigation
        formattedData.pop(); // Remove the last item (potential next button)
    }

    // Remove USA states from the data
    let newFormatted = [];
    try {
        newFormatted = await noUSA(formattedData);
    } catch (error) {
        console.error(`Error filtering USA states: ${error.message}`);
        newFormatted = formattedData; // Fallback to using unfiltered data
    }

    return newFormatted; // Return the data as an array of objects
};

/**
 * Function to save failed attempts to a JSON file.
 * @param {Array} failedAttempts - The array of failed attempts to save.
 * @return {boolean} - Whether the save was successful.
 */
const saveFailedAttempts = (failedAttempts) => {
    if (!Array.isArray(failedAttempts) || failedAttempts.length === 0) {
        console.log("No failed attempts to save.");
        return true;
    }
    
    const failedAttemptsFile = path.join(__dirname, "../docs/failedAttempts.json");
    
    // Ensure the directory exists
    const failedAttemptsDir = path.dirname(failedAttemptsFile);
    if (!fs.existsSync(failedAttemptsDir)) {
        try {
            fs.mkdirSync(failedAttemptsDir, { recursive: true });
            console.log(`Created directory: ${failedAttemptsDir}`);
        } catch (dirError) {
            console.error(`Error creating directory ${failedAttemptsDir}: ${dirError.message}`);
            return false;
        }
    }
    
    try {
        fs.writeFileSync(failedAttemptsFile, JSON.stringify(failedAttempts, null, 2), "utf-8");
        console.log(`Failed attempts saved to ${failedAttemptsFile}`);
        return true;
    } catch (error) {
        console.error(`Error saving failed attempts: ${error.message}`);
        return false;
    }
};

/**
 * Function to analyze the Concorde website and extract data from the table.
 * @param {string} url - The URL of the Concorde website to analyze.
 * @param {string} outputFile - The path to the output file where the data will be saved.
 * @param {object} options - Optional configuration for testing.
 * @return {Promise<Array>} - A promise that resolves with the extracted data.
 *                The function uses Puppeteer to launch a browser, navigate to the URL, and extract data from the table.
 */
const analyseConcorde = async (url, outputFile, options = {}) => {
    const urlToName = url.split("/").pop(); // Get the last part of the URL
    let browser;
    const results = [];
    const failedAttempts = []; // Initialize failedAttempts array locally
    
    // Check if we're in test mode
    const isTestMode = options.isTestMode || false;
    const mockData = options.mockData || null;
    
    // If we're in test mode and have mock data, return it
    if (isTestMode && mockData) {
        console.log(`Test mode: Using mock data for ${url}`);
        
        // Simulate processing and returning the mock data
        const formattedOutput = mockData.map(item => ({
            Name: `${item.Producer}${" performing " + urlToName}`,
            Url: url,
            City: item.City || "",
            State: item.State || "",
            Opening: item.Opening || "",
            Closing: item.Closing || ""
        }));
        
        // Save to outputFile if provided
        if (outputFile) {
            updateOutPutFile(formattedOutput, outputFile);
        }
        
        return mockData;
    }
    
    try {
        // Ensure the output directory exists
        if (outputFile) {
            const outputDir = path.dirname(outputFile);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
                console.log(`Created directory: ${outputDir}`);
            }
        }
        
        browser = await puppeteer.launch({ 
            headless: true,
            defaultViewport: {width: 1920, height: 1080 }, // needed so that the table is loaded in concorde
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
            timeout: 60000 // Increase timeout to 60 seconds
        });

        const page = await browser.newPage();  
        console.log(`Analyzing Concorde website: ${url}`);
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');        
        
        // Set a longer timeout for navigation
        const navigationTimeout = 60000; // 60 seconds
        
        try {
            await page.goto(url, { 
                waitUntil: "load", 
                timeout: navigationTimeout 
            });
        } catch (navigationError) {
            console.warn(`Navigation error: ${navigationError.message}`);
            failedAttempts.push({
                url: url,
                error: `Navigation error: ${navigationError.message}`,
                retries: 0
            });
            
            if (browser) {
                await browser.close();
                console.log("Browser closed.");
            }
            
            saveFailedAttempts(failedAttempts);
            return [];
        }
     
        // Scroll the page to trigger lazy loading
        const scrollSuccessful = await scrollPage(page);
        if (!scrollSuccessful) {
            console.warn("Failed to scroll page properly");
        }
        
        // Wait for the lazy loading to complete and the table to be fully loaded
        await delay(5000);

        // Find the iframe element
        const iframeElement = await page.$("iframe#now-playing-map"); 
        if (!iframeElement) {
            console.warn("Iframe not found on the page");
            failedAttempts.push({
                url: url,
                error: "Iframe not found on the page",
                retries: 0
            });
            
            if (browser) {
                await browser.close();
                console.log("Browser closed.");
            }
            
            saveFailedAttempts(failedAttempts);
            return [];
        }
        
        // Get the content frame of the iframe
        const iframe = await iframeElement.contentFrame(); 
        if (!iframe) {
            console.warn("Iframe content frame not found.");
            failedAttempts.push({
                url: url,
                error: "Iframe content frame not found",
                retries: 0
            });
            
            if (browser) {
                await browser.close();
                console.log("Browser closed.");
            }
            
            saveFailedAttempts(failedAttempts);
            return [];
        }

        // Wait for the table to be loaded in the iframe
        await delay(2000);
        
        // Get table contents
        let data = await getTableContents(iframe, url, failedAttempts);
        
        // If no data found, try a different approach
        if (data.length === 0) {
            console.warn("No data found in table.");
            
            // Try one more time with a longer delay
            await delay(5000);
            data = await getTableContents(iframe, url, failedAttempts);
            
            if (data.length === 0) {
                // If still no data, return empty results
                if (browser) {
                    await browser.close();
                    console.log("Browser closed.");
                }
                
                saveFailedAttempts(failedAttempts);
                return [];
            }
        }

        results.push(...data); 

        // Page count value 
        let pageCount = 0;
        try {
            pageCount = await pageCnt(iframe); // -1 because the last item is the "next" button
        } catch (pageCountError) {
            console.error(`Error getting page count: ${pageCountError.message}`);
            // Continue with what we have
        }
        
        if (pageCount <= 0) {         //Single page or not?
            console.log("No next button found, single page table.");       
        } else {
            console.log(`Page Count: ${pageCount}`);

            for (let i = 2; i <= pageCount; i++) {
                const pageNumber = i;
                console.log(`Going to page number: ${i}`);

                try {
                    await iframe.evaluate(() => {
                        try {
                            const nextBtnList = Array.from(document.querySelectorAll("#paging ul li a") || []);
                            const nextButton = nextBtnList.find(el => el && el.textContent && el.textContent.trim().toLowerCase() === "next");
                        
                            if (nextButton) {
                                nextButton.click();
                                return true;
                            } else {
                                console.warn("Next button not found.");
                                return false;
                            }
                        } catch (clickError) {
                            console.error(`Error clicking next button: ${clickError.message}`);
                            return false;
                        }
                    });

                    await delay(3000); // Wait for the lazy loading to complete
                    await scrollPage(page); // Scroll the page to trigger lazy loading

                    const pageData = await getTableContents(iframe, url, failedAttempts);
                    if (pageData.length === 0) {
                        console.error("No data found in table on page " + pageNumber);
                        break;
                    }
                    
                    results.push(...pageData);
                } catch (paginationError) {
                    console.error(`Error on page ${pageNumber}: ${paginationError.message}`);
                    break; // Stop pagination but use what we have
                }
            }
        }

        if (results.length > 0) {
            const formattedOutput = results.map(item => ({
                Name: `${item.Producer}${" performing " + urlToName}`,
                Url: url,
                City: item.City || "",
                State: item.State || "",
                Opening: item.Opening || "",
                Closing: item.Closing || ""
            }));

            // Save the data to the output file if provided
            if (outputFile) {
                updateOutPutFile(formattedOutput, outputFile);
            }
        }

    } catch (error) {
        console.error(`Error fetching data from ${url}:`, error.message);
        failedAttempts.push({
            url: url,
            error: error.message,
            retries: 0
        });
        return [];
    } finally {
        if (browser) {
            await browser.close();
            console.log("Browser closed.");
        }
    }
    
    // Save failed attempts to a JSON file
    saveFailedAttempts(failedAttempts);
    
    return results;
};

module.exports = {
    analyseConcorde,
    updateOutPutFile,
    saveFailedAttempts,
    // Export for testing purposes
    getTableContents,
    pageCnt,
    scrollPage,
    noUSA
};

// Only run the function when this file is executed directly
if (require.main === module) {
    // Create docs directory if it doesn't exist
    const docsDir = path.join(__dirname, "../docs");
    if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
        console.log(`Created directory: ${docsDir}`);
    }
    
    analyseConcorde("https://www.concordtheatricals.co.uk/p/44615/42nd-street", path.join(__dirname, "../docs/concordeData.json"));
}