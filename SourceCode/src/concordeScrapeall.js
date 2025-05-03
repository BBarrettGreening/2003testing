// Currently volitle, takes hours to run, have not been able to fully test 
const puppeteer = require("puppeteer");
const delay  = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const fs = require("fs");
const path = require("path");
const getStartEndDate = require("./getStartEndDate");
const e = require("express");
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
}


/**
 * Find if the table contains a next button
 * @param {object} iframe - The iframe element containing the table.
 * @returns {int} - The number of pages available in the table.
 *                  If the table is not found, return -1.
*/
const pageCnt = async (page) => {
    const isNext = await page.evaluate(() => {
        const table = document.querySelector("#map-table-container");
        if (!table) {
            return "Table not found.";
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

    return isNext.length - 1; // -1 because the last item is the "next" button
};

/**
 * Get the data from the table
 * @param {object} iframe - The iframe element containing the table.
 * @return {Array} - The data from the table as an array of objects.
 *                   Each object contains the keys: Producer, City, State, Opening, Closing.
 */
const getTableContents = async (page, url, retries = 5) => {
    let data;
    let lastErrorMessage = null; // Store the last error message

    while (retries > 0) {
        try {
            data = await page.evaluate(() => {
                const table = document.querySelector("#map-table-container");
                if (!table) {
                    return null;
                }    

                const rows = Array.from(table.querySelectorAll("tr"));
                return rows.map(row => {
                    const cells = Array.from(row.querySelectorAll("td"));
                    return cells.map(cell => cell.textContent.trim());
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
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retrying
    }

    if (!data) {
        console.error("Failed to get table contents after multiple attempts.");
        failedAttempts.push({
            url: url,
            error: lastErrorMessage,
            retries: 0
        });
        return [];
    }

    const formattedData = data.map(row => ({
        Producer: row[0],
        City: row[1],
        State: row[2],
        Opening: row[3],
        Closing: row[4]       
    }));

    console.log(`Data length: ${data.length}`);
    formattedData.pop(); // Remove the last item, which is assumed to be a "next" button

    return formattedData; // Return the data as an array of objects
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
}


const zoomout = async (page) => {
    
    console.log("Zooming out...");
    await delay(10000); // Wait for the map to load
    const viewport = page.viewport();
    const centerX = viewport.width / 2;
    const centerY = viewport.height / 2;
    await page.mouse.click(centerX, centerY);
    for (i = 0; i < 11; i++){       
        await page.keyboard.press('-');    
    }
}

/**
 * Function to analyze the Concorde website and extract data from the table.
 * @param {string} url - The URL of the Concorde website to analyze.
 * @param {string} outputFile - The path to the output file where the data will be saved.
 * @return {Promise<void>} - A promise that resolves when the analysis is complete.
 *                The function uses Puppeteer to launch a headless browser, navigate to the URL, and extract data from the table.
 */
const analyseConcorde = async (url, outputFile) => {
    const urlToName = url.split("/").pop(); // Get the last part of the URL
    let browser;
    const results = [];
    try{

        browser = await puppeteer.launch({ 
            headless: false 
            , defaultViewport: {width: 1920, height: 1080 } // needed to that the table is loaded in concorde
            , args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        });

        const page = await browser.newPage();  
        console.log(`Analyzing Concorde website: ${url}`);
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');        
        await page.goto(url, { waitUntil: "load", timeout: 0 });
     
        
        await zoomout(page); // Zoom out the map to load the table
        await delay(120000);

        //get table contents
        let data = await getTableContents(page, url);

        results.push(...data); 

        // Page count value 
        pageCount = await pageCnt(page) // -1 because the last item is the "next" button
        if (pageCount === 0) {         //Single page or not?
            console.log("No next button found, single page table.");
            return;        
        }else{
            let i = 1; // Start from the first page
            console.log(`Page Count: ${await pageCnt(page)}`);
            let nextButton = 0;
            while (nextButton !== -1 && i < 10) { // 10 pages for testing 
                i++;
                pageNumber = i;
                console.log(`Going to page number: ${i}`);

                await Promise.race([
                    page.waitForNetworkIdle(),
                    page.waitForSelector('#map-table-container', { visible: true }),
                    page.waitForFunction(() => document.readyState === 'complete')
                ])


                data = await getTableContents(page, url); // Get the data from the table
                if (data === "Table not found in iframe.") {
                    console.error("Table not found in iframe.");
                    return;
                }
                // data = JSON.stringify(data, null, 2); // Format the data as JSON for better readability
                console.log(`Data for page number ${pageNumber}:\n\t ${data}\n`);
                results.push(...data); 

                nextButton = await page.evaluate(() => {
                    const paginationButtons = document.querySelectorAll("#paging ul li a");
                    const nextButton = paginationButtons[paginationButtons.length - 1]; // Last button
                    if (nextButton) {
                        nextButton.click();
                        return true;
                    }
                    console.warn("Next button not found.");
                    return -1;
                });
            
                if (nextButton !== -1) {
                    await page.waitForFunction(() => {
                        const firstRow = document.querySelector("#map-table-container tbody tr td");
                        return firstRow && firstRow.innerText.length > 0;
                    }, { timeout: 10000 }).catch(() => console.warn("Timeout waiting for table to update."));
                } else {
                    console.log("No more pages to load.");
                }
            }
        }

        const formattedOutput = results.map(item => ({
            Name: `${item.Producer}${" performing " + urlToName}`,
            Url: url,
            City: item.City,
            State: item.State,
            Opening: item.Opening,
            Closing: item.Closing
        }));

        // Save the data to the output file
        updateOutPutFile(formattedOutput, outputFile);

        

    } catch (error) {
        console.error(`Error fetching data from ${url}:`, error.message);
    } finally {
        if (browser) {
            await browser.close();
            console.log("Browser closed.");
        }
    }
    // Save failed attempts to a JSON file
    saveFailedAttempts(failedAttemps);
};

module.exports = {
    analyseConcorde
};


// testing url
analyseConcorde("https://shop.concordtheatricals.co.uk/now-playing", path.join(__dirname, "../docs/concordAllData.json"));
