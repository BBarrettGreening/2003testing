const puppeteer = require("puppeteer");
const delay  = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const fs = require("fs");
const path = require("path");
const getStartEndDate = require("./getStartEndDate");
const failedAttemps = [];

/**
* Function to update the output file with new data.
* @param {Array} newData - The new data to be added to the output file.
* @param {string} outputFile - The path to the output file.
* */
const updateOutPutFile = (newData, outputFile) => {
    let existingData = [];

    if (fs.existsSync(outputFile)) {
        try {
            const fileContent = fs.readFileSync(outputFile, "utf-8");
            existingData = JSON.parse(fileContent);
        } catch (error) {
            console.error("Error reading existing file:", error.message);
        }
    }
    if (!Array.isArray(existingData)) {
        existingData = [];
    }
    existingData.push(...newData);

    fs.writeFileSync(outputFile, JSON.stringify(existingData, null, 2), "utf-8");
    console.log(`Data saved to ${outputFile}`);
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
    await page.evaluate(async () => {
        const scrollStep = 500; 
        const scrollDelay = 10;
        const scrollHeight = document.body.scrollHeight; // Total height of the page

        for (let i = 0; i < scrollHeight; i += scrollStep) {
            window.scrollBy(0, scrollStep);
            await new Promise(resolve => setTimeout(resolve, scrollDelay)); // Wait for content to load
        }       
        // Scroll up by 1000 pixels to bring the table into view
        window.scrollBy(0, -1000);
    });
};

/**
 * Find if the table contains a next button
 * @param {object} iframe - The iframe element containing the table.
 * @returns {int} - The number of pages available in the table.
 *                  If the table is not found, return -1.
*/
const pageCnt = async (iframe) => {
    if (!iframe) {
        console.warn("iframe is null in pageCnt");
        return 0;
    }
    
    try {
        const isNext = await iframe.evaluate(async () => {
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
 * @param {number} retries - Number of retries to attempt (default: 5).
 * @return {Array} - The data from the table as an array of objects.
 *                   Each object contains the keys: Producer, City, State, Opening, Closing.
 */
const getTableContents = async (iframe, url, retries = 5) => {
    let data;
    let lastErrorMessage = null; // Variable to store the last error message
    
    // Make sure iframe exists
    if (!iframe) {
        console.error("Error: iframe is null or undefined");
        failedAttemps.push({
            url: url, 
            error: "Iframe not found",
            retries: 0
        });
        return [];
    }
    
    while (retries > 0) {
        try {
            data = await iframe.evaluate(async () => {
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
            });
            
            if (data) {
                break; // Exit the loop if successful
            }
        } catch (error) {
            lastErrorMessage = error.message;
        }
        
        retries--;
        console.log(`Retrying to get table contents... (${5 - retries} attempts left)`);
        await delay(1000); // Wait before retrying 
    }
    
    if (!data) {
        console.error("Failed to get table contents after multiple attempts.");
        failedAttemps.push({
            url: url, 
            error: lastErrorMessage || "Unknown error",
            retries: 0
        });
        return [];
    }
    
    // Make sure data is an array
    if (!Array.isArray(data)) {
        console.error("Table data is not an array");
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
    
    // Only pop if there's at least one item
    if (formattedData.length > 0) {
        formattedData.pop(); // Remove the last item (next button)
    }

    // Remove USA states from the data
    const newFormatted = await noUSA(formattedData);

    return newFormatted; // Return the data as an array of objects
};

/**
 * Function to save failed attempts to a JSON file.
 * @param {Array} failedAttemps - The array of failed attempts to save.
 * @return {void} - No return value.
 *                The function saves the failed attempts to a JSON file.
 */
const saveFailedAttempts = (failedAttemps) => {
    const failedAttemptsFile = path.join(__dirname, "../docs/failedAttempts.json");
    if (failedAttemps.length > 0) {
        fs.writeFileSync(failedAttemptsFile, JSON.stringify(failedAttemps, null, 2), "utf-8");
        console.log(`Failed attempts saved to ${failedAttemptsFile}`);
    } else {
        console.log("No failed attempts to save.");
    }
};

/**
 * Function to analyze the Concorde website and extract data from the table.
 * @param {string} url - The URL of the Concorde website to analyze.
 * @param {string} outputFile - The path to the output file where the data will be saved.
 * @return {Promise<Array>} - A promise that resolves with the extracted data.
 *                The function uses Puppeteer to launch a headless browser, navigate to the URL, and extract data from the table.
 */
const analyseConcorde = async (url, outputFile) => {
    const urlToName = url.split("/").pop(); // Get the last part of the URL
    let browser;
    const results = [];
    try {
        browser = await puppeteer.launch({ 
            headless: true,
            defaultViewport: {width: 1920, height: 1080 }, // needed to that the table is loaded in concorde
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        });

        const page = await browser.newPage();  
        console.log(`Analyzing Concorde website: ${url}`);
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');        
        
        try {
            await page.goto(url, { waitUntil: "load", timeout: 30000 }); // until there are no more than 2 network connections for at least 500 milliseconds
        } catch (navigationError) {
            console.error(`Navigation error: ${navigationError.message}`);
            failedAttemps.push({
                url: url,
                error: `Navigation error: ${navigationError.message}`,
                retries: 0
            });
            return [];
        }
     
        await scrollPage(page);
        
        await delay(3000); // Wait for the lazy loading to complete and the table to be fully loaded
        // the above will also make the web loading look more natural and less bot like

        const iframeElement = await page.$("iframe#now-playing-map"); 
        if (!iframeElement) {
            console.error("Iframe not found on the page");
            failedAttemps.push({
                url: url,
                error: "Iframe not found on the page",
                retries: 0
            });
            return [];
        }
        
        const iframe = await iframeElement.contentFrame(); 

        if (!iframe) {
            console.error("Iframe content frame not found.");
            failedAttemps.push({
                url: url,
                error: "Iframe content frame not found",
                retries: 0
            });
            return [];
        }

        //get table contents
        let data = await getTableContents(iframe, url);
        if (data === "Table not found in iframe.") {
            console.error("Table not found in iframe.");
            return [];
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
                        const nextBtnList = Array.from(document.querySelectorAll("#paging ul li a") || []);
                        const nextButton = nextBtnList.find(el => el && el.textContent && el.textContent.trim().toLowerCase() === "next");
                    
                        if (nextButton) {
                            nextButton.click();
                        } else {
                            console.warn("Next button not found.");
                        }
                    });

                    await delay(3000); // Wait for the lazy loading to complete and the table to be fully loaded
                    await scrollPage(page); // Scroll the page to trigger lazy loading

                    data = await getTableContents(iframe, url);
                    if (data === "Table not found in iframe.") {
                        console.error("Table not found in iframe.");
                        break;
                    }
                    
                    results.push(...data);
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

            // Save the data to the output file
            updateOutPutFile(formattedOutput, outputFile);
        }

    } catch (error) {
        console.error(`Error fetching data from ${url}:`, error.message);
        failedAttemps.push({
            url: url,
            error: error.message,
            retries: 0
        });
    } finally {
        if (browser) {
            await browser.close();
            console.log("Browser closed.");
        }
    }
    
    // Save failed attempts to a JSON file
    saveFailedAttempts(failedAttemps);
    
    return results;
};

module.exports = {
    analyseConcorde
};


analyseConcorde("https://www.concordtheatricals.co.uk/p/44615/42nd-street", path.join(__dirname, "../docs/concordeData.json"));