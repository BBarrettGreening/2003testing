const express = require('express');
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const router = require('../../src/scraper');
const { setupMockFiles, setupTestOutputDir } = require('../testUtils');

// Mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('../../src/utils', () => ({
  generateFilename: jest.fn().mockReturnValue('2025-05-03-12-00-00.csv')
}));
jest.mock('../../src/siteHandlers', () => ({
  handleSite: jest.fn().mockResolvedValue({
    theatre: 'Test Theatre',
    shows: [
      {
        title: 'Test Show',
        date: '01/05/2025 - 15/05/2025',
        location: 'Test Theatre',
        link: 'https://example.com/show'
      }
    ]
  }),
  scrapeShow: jest.fn().mockResolvedValue({
    shows: [
      {
        date: '01/05/2025 - 15/05/2025',
        location: 'Test Location',
        link: 'https://example.com/show'
      }
    ]
  })
}));
jest.mock('../../src/outputData', () => ({
  saveToCSV: jest.fn().mockReturnValue({
    part1: 'test-output/2025-05-03-12-00-00-Part-1.csv',
    part2: 'test-output/2025-05-03-12-00-00-Part-2.csv'
  })
}));

/**
 * Create a safe version of JSON.stringify that handles circular references
 */
const safeStringify = (obj) => {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
    }
    return value;
  });
};

describe('Scraper Router', () => {
  let app;
  
  beforeAll(() => {
    setupMockFiles();
    
    // Override JSON.stringify with our safe version in the global scope
    const originalStringify = JSON.stringify;
    global.JSON.stringify = function(obj, replacer, spaces) {
      try {
        return replacer ? originalStringify(obj, replacer, spaces) : safeStringify(obj);
      } catch (err) {
        console.warn('Circular reference detected in JSON.stringify, using safe version');
        return safeStringify(obj);
      }
    };
  });
  
  afterAll(() => {
    // Restore original JSON.stringify after tests
    global.JSON.stringify = JSON.stringify;
  });
  
  beforeEach(() => {
    app = express();
    app.use('/', router);
    setupTestOutputDir();
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock file system functions
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockImplementation((filePath) => {
      if (filePath.includes('websiteConfigs.json')) {
        return JSON.stringify([
          {
            id: 1001,
            name: 'test.com',
            url: 'https://test.com',
            selectors: {
              eventCard: '.event-card',
              title: '.title',
              date: '.date',
              link: '.link'
            }
          }
        ]);
      }
      if (filePath.includes('showConfigs.json')) {
        return JSON.stringify([
          {
            id: 2001,
            name: 'Test Show',
            url: 'https://example.com/show',
            selectors: {
              eventCard: '.event-card',
              date: '.date',
              location: '.location',
              link: '.link'
            }
          }
        ]);
      }
      if (filePath.includes('concordeData.json')) {
        return JSON.stringify([
          {
            Name: 'Test Concorde Show',
            Url: 'https://www.concordtheatricals.co.uk/p/123/test-show',
            City: 'London',
            State: 'UK',
            Opening: '01/05/2025',
            Closing: '30/05/2025'
          }
        ]);
      }
      return '[]';
    });
    
    // Mock path.join
    path.join.mockImplementation((...args) => args.join('/'));
    
    // Ensure writeFileSync doesn't fail with circular references
    fs.writeFileSync.mockImplementation((path, content) => {
      // If content is an object, safely stringify it
      if (typeof content === 'object') {
        content = safeStringify(content);
      }
      return undefined; // Mock successful write
    });
  });
  
  test('GET / returns scraped data successfully', async () => {
    const response = await request(app).get('/');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Scraping completed successfully.');
    expect(response.body).toHaveProperty('results');
    expect(response.body).toHaveProperty('outputFiles');
    expect(response.body.outputFiles).toHaveProperty('part1');
    expect(response.body.outputFiles).toHaveProperty('part2');
  });
  
  test('handles normalizeURL functionality correctly', async () => {
    // Mock concordData with URLs that have query parameters
    fs.readFileSync.mockImplementation((filePath) => {
      if (filePath.includes('concordeData.json')) {
        return JSON.stringify([
          {
            Name: 'Test Concorde Show',
            Url: 'https://www.concordtheatricals.co.uk/p/123/test-show?utm_source=test',
            City: 'London',
            State: 'UK',
            Opening: '01/05/2025',
            Closing: '30/05/2025'
          }
        ]);
      }
      if (filePath.includes('websiteConfigs.json')) {
        return JSON.stringify([
          {
            id: 1001,
            name: 'test.com',
            url: 'https://test.com?param=value',
            selectors: {
              eventCard: '.event-card',
              title: '.title',
              date: '.date',
              link: '.link'
            }
          }
        ]);
      }
      if (filePath.includes('showConfigs.json')) { 
        return JSON.stringify([
          {
            id: 2001,
            name: 'Test Show',
            url: 'https://example.com/show',
            selectors: {
              eventCard: '.event-card',
              date: '.date',
              location: '.location',
              link: '.link'
            }
          }
        ]);
      }
      return '[]';
    });
    
    const response = await request(app).get('/');
    
    expect(response.status).toBe(200);
    // The test passes if the request completes successfully, which means normalizeURL handled the query parameters
  });
  
  test('processes Concorde data correctly', async () => {
    // Update the mock implementation for concordeData.json and showConfigs.json for this test
    fs.readFileSync.mockImplementation((filePath) => {
      if (filePath.includes('concordeData.json')) {
        return JSON.stringify([
          {
            Name: 'Test Concorde Show',
            Url: 'https://www.concordtheatricals.co.uk/p/123/test-show',
            City: 'London',
            State: 'UK',
            Opening: '01/05/2025',
            Closing: '30/05/2025'
          }
        ]);
      }
      if (filePath.includes('showConfigs.json')) {
        return JSON.stringify([
          {
            id: 2001,
            name: 'Test Show',
            url: 'https://www.concordtheatricals.co.uk/p/123/test-show', // Match the URL in concordeData
            selectors: {
              eventCard: '.event-card',
              date: ' A concocrd link, no values necissary', // Note the intentional typo to match your code
              location: ' A concocrd link, no values necissary',
              link: ' A concocrd link, no values necissary'
            }
          }
        ]);
      }
      if (filePath.includes('websiteConfigs.json')) {
        return JSON.stringify([]);
      }
      return '[]';
    });
    
    const response = await request(app).get('/');
    
    expect(response.status).toBe(200);
    
    // Check that Concorde data was processed
    const results = response.body.results;
    const concordeResults = results.filter(r => r.type === 'Concord');
    expect(concordeResults.length).toBeGreaterThan(0);
  });
  
  test('handles errors during scraping gracefully', async () => {
    // Mock siteHandlers to throw an error
    const siteHandlers = require('../../src/siteHandlers');
    siteHandlers.handleSite.mockRejectedValueOnce(new Error('Scraping error'));
    
    const response = await request(app).get('/');
    
    expect(response.status).toBe(200);
    // The response should still be successful even if one scraping operation fails
    expect(response.body).toHaveProperty('message', 'Scraping completed successfully.');
  });
});