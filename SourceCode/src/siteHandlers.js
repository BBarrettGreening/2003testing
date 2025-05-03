const cheerio = require("cheerio");
const axios = require("axios");

/**
 * POW = prince of wales theatre
 */

/**
 * General scraper for websites with dynamic selectors.
 * @param {string} name - Name of the theatre/site.
 * @param {string} url - URL of the website.
 * @param {object} selectors - Selectors for eventCard, title, date, location, and link.
 * @returns {object} - Scraped data for the given site.
 */
const scrapeGeneral = async (name, url, selectors) => {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
  
    let adjustedName = name;
  
    // Specific logic for LW Theatres
    if (url.includes("lwtheatres.co.uk")) {
      const theatreMatch = url.match(/theatres\/([^/]+)\//);
      adjustedName = theatreMatch
        ? theatreMatch[1].replace(/-/g, " ").toUpperCase()
        : name;
    }
  
    const shows = [];
    $(selectors.eventCard).each((_, el) => {
      const event = $(el);
  
      const title = event.find(selectors.title).text().trim() || null;
      const date = event.find(selectors.date).text().trim() || null;
      const location = selectors.location
        ? event.find(selectors.location).text().trim()
        : adjustedName; // Use adjusted name for location
      const linkElement = event.find(selectors.link);
      const link = linkElement.attr("href");
      const fullLink = link && link.startsWith("http") ? link : new URL(link, url).href;
  
      if (title && date && fullLink) {
        shows.push({ title, date, location, link: fullLink });
      }
    });
  
    return { theatre: adjustedName, shows };
  };

/**
 * Nederlander-specific scraper.
 * @param {string} url - URL of the Nederlander website.
 * @param {object} selectors - Selectors for the site.
 * @returns {object} - Scraped data for the Nederlander site.
 */
const scrapeNederlander = async (url, selectors) => {
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);

  const theatreNameMatch = url.match(/nederlander\.co\.uk\/([^/]+)/);
  const theatreName = theatreNameMatch
    ? theatreNameMatch[1].replace(/-/g, " ").toUpperCase()
    : "Nederlander Theatre";

  const shows = [];
  $(selectors.eventCard).each((_, el) => {
    const event = $(el);

    const title = event.find(selectors.title).text().trim();
    const date = event.find(selectors.date).text().trim();
    const location = selectors.location
      ? event.find(selectors.location).text().trim()
      : theatreName;
    const linkElement = event.find(selectors.link);
    const link = linkElement.attr("href");
    const fullLink = link && link.startsWith("http") ? link : new URL(link, url).href;

    if (title && date && fullLink) {
      shows.push({ title, date, location, link: fullLink });
    }
  });

  return { theatre: theatreName, shows };
};

/**
 * ATG-specific scraper.
 * @param {string} url - URL of the ATG website.
 * @param {object} selectors - Selectors for the site.
 * @returns {object} - Scraped data for the ATG site.
 */
const scrapeATG = async (url, selectors) => {
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);

  const theatreNameMatch = url.match(/\/venues\/([^/]+)/);
  const theatreName = theatreNameMatch
    ? decodeURIComponent(theatreNameMatch[1]).replace(/-/g, " ").toUpperCase()
    : "Unknown Theatre";

  const shows = [];
  $(selectors.eventCard).each((_, el) => {
    const event = $(el);

    const title = event.find(selectors.title).text().trim() || null;
    const date = event.find(selectors.date).text().trim() || null;
    const location = selectors.location
      ? event.find(selectors.location).text().trim()
      : theatreName;
    const linkElement = event.find(selectors.link);
    const link = linkElement.attr("href");
    const fullLink = link && link.startsWith("http") ? link : new URL(link, url).href;

    if (title && date && fullLink) {
      shows.push({ title, date, location, link: fullLink });
    }
  });

  return { theatre: theatreName, shows };
};

/**
 * POW-specific scraper.
 * @param {string} url - URL of the POW website.
 * @param {object} selectors - Selectors for the site.
 * @returns {object} - Scraped data for the POW site.
 */
const scrapePOW = async (url, selectors) => {
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);

  const theatreNameMatch = url.match(/\/venues\/([^/]+)/);
  const theatreName = theatreNameMatch
    ? decodeURIComponent(theatreNameMatch[1]).replace(/-/g, " ").toUpperCase()
    : "Unknown Theatre";

  const shows = [];
  $(selectors.eventCard).each((_, el) => {
    const event = $(el);

    const title = event.find(selectors.title).text().trim() || null;
    const date = event.find(selectors.date).text().trim() || null;
    const location = selectors.location
      ? event.find(selectors.location).text().trim()
      : theatreName;
    const linkElement = event.find(selectors.link);
    const link = linkElement.attr("href");
    const fullLink = link && link.startsWith("http") ? link : new URL(link, url).href;

    if (title && date && fullLink) {
      shows.push({ title, date, location, link: fullLink });
    }
  });

  return { theatre: theatreName, shows };
};

const scrapeShow = async (url, selectors) => {
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);

  const shows = [];
  $(selectors.eventCard).each((_, el) => {
    const event = $(el);
    const date = event.find(selectors.date).text().trim() || null;

    let location = selectors.location
      ? event.find(selectors.location).text().trim()
      : "Unknown Location";
    const linkElement = event.find(selectors.link);
    const link = linkElement.attr("href");

    if (url.includes("batoutofhellmusical")) {
      const h3 = event.find("h3.text-cream");
      const h3Text = h3.text().trim();
      const h4Text = h3.next("h4").text().trim();
      if (h3Text && h4Text) {
        location = `${h3Text} - ${h4Text}`; 
      }
    }

    if (date && link) {
      shows.push({ date, location, link });
    }
  });
  

  return { shows };
};

// Handler to select the appropriate scraper based on the site.
const handleSite = async (name, url, selectors) => {
  if (url.includes("nederlander.co.uk")) {
    return await scrapeNederlander(url, selectors);
  } else if (url.includes("atgtickets.com")) {
    return await scrapeATG(url, selectors);
  } else {
    return await scrapeGeneral(name, url, selectors);
  }
};

module.exports = { handleSite };
module.exports.scrapeShow = scrapeShow;
module.exports.scrapeNederlander = scrapeNederlander;
module.exports.scrapeATG = scrapeATG;
