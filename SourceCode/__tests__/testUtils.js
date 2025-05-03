// __tests__/testUtils.js
const fs = require('fs');
const path = require('path');

const setupMockFiles = () => {
  const docsDir = path.join(__dirname, '../docs');
  
  // Create docs directory if it doesn't exist
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  
  // Create showPotentialSelectors.json
  const showPotentialSelectors = {
    eventCard: ['.event-card', '.show-item', '.production-item'],
    date: ['.date', '.event-date', '.show-date', 'time'],
    location: ['.location', '.venue', '.theatre-name', '.city'],
    link: ['a.link', '.event-link a', '.book-link', 'a.btn']
  };
  
  fs.writeFileSync(
    path.join(docsDir, 'showPotentialSelectors.json'),
    JSON.stringify(showPotentialSelectors, null, 2)
  );
  
  // Create potentialSelectors.json (for theatre websites)
  const potentialSelectors = {
    eventCard: ['.event-card', '.production-item', '.show-listing'],
    title: ['.title', 'h3.show-title', '.event-name'],
    date: ['.date', '.event-date', '.show-dates'],
    link: ['a.link', '.more-info a', '.book-now']
  };
  
  fs.writeFileSync(
    path.join(docsDir, 'potentialSelectors.json'),
    JSON.stringify(potentialSelectors, null, 2)
  );
  
  // Create mock config files
  createMockConfigFiles(docsDir);
  
  // Create empty mock Excel files (we won't actually write XLSX content)
  fs.writeFileSync(path.join(docsDir, 'TheatreListReport.xlsx'), 'mock excel content');
  fs.writeFileSync(path.join(docsDir, 'ShowsListReport.xlsx'), 'mock excel content');
};

const createMockConfigFiles = (docsDir) => {
  // Website configs (for theatres)
  const websiteConfigs = [
    {
      id: 1,
      name: 'test.com',
      url: 'https://test.com',
      selectors: {
        eventCard: '.event-card',
        title: '.title',
        date: '.date',
        link: 'a.link'
      },
      location: 'London, UK'
    },
    {
      id: 2,
      name: 'example.com',
      url: 'https://example.com/theatre',
      selectors: {
        eventCard: '.production-item',
        title: 'h3.show-title',
        date: '.show-dates',
        link: '.book-now'
      },
      location: 'Bristol, UK'
    }
  ];
  
  fs.writeFileSync(
    path.join(docsDir, 'websiteConfigs.json'),
    JSON.stringify(websiteConfigs, null, 2)
  );
  
  // Show configs
  const showConfigs = [
    {
      id: 1,
      name: 'Test Show',
      url: 'https://example.com/show',
      selectors: {
        eventCard: '.event-card',
        date: '.date',
        location: '.venue',
        link: 'a.link'
      }
    },
    {
      id: 2,
      name: 'Concord Show',
      url: 'https://www.concordtheatricals.co.uk/p/123/test-show',
      selectors: {
        eventCard: '.production-item',
        date: '.show-date',
        location: '.theatre-name',
        link: '.book-link'
      }
    }
  ];
  
  fs.writeFileSync(
    path.join(docsDir, 'showConfigs.json'),
    JSON.stringify(showConfigs, null, 2)
  );
  
  // Failed structures
  const failedStructures = [
    {
      id: 3,
      name: 'No Website Theatre',
      url: null,
      reason: 'No website provided'
    },
    {
      id: 4,
      name: 'Failed Theatre',
      url: 'https://brokensite.com',
      reason: 'No valid structure detected'
    }
  ];
  
  fs.writeFileSync(
    path.join(docsDir, 'failedStructures.json'),
    JSON.stringify(failedStructures, null, 2)
  );
  
  // Concorde data
  const concordeData = [
    {
      Name: 'Test Concorde Show performing test-show',
      Url: 'https://www.concordtheatricals.co.uk/p/123/test-show',
      City: 'London',
      State: 'UK',
      Opening: '01/05/2025',
      Closing: '30/05/2025'
    },
    {
      Name: 'Another Concorde Show performing another-show',
      Url: 'https://www.concordtheatricals.co.uk/p/456/another-show',
      City: 'Edinburgh',
      State: 'UK',
      Opening: '15/05/2025',
      Closing: '15/06/2025'
    },
    {
      Name: 'US Show performing broadway-show',
      Url: 'https://www.concordtheatricals.co.uk/p/789/broadway-show',
      City: 'New York',
      State: 'NY',
      Opening: '01/06/2025',
      Closing: '01/07/2025'
    }
  ];
  
  fs.writeFileSync(
    path.join(docsDir, 'concordeData.json'),
    JSON.stringify(concordeData, null, 2)
  );
  
  // Create empty failedAttempts.json
  fs.writeFileSync(
    path.join(docsDir, 'failedAttempts.json'),
    JSON.stringify([], null, 2)
  );
};

// Function to create a test output directory
const setupTestOutputDir = () => {
  const outputDir = path.join(__dirname, '../dataOutput');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  return outputDir;
};

module.exports = {
  setupMockFiles,
  setupTestOutputDir
};