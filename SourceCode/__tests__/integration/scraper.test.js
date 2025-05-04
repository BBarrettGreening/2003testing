// __tests__/integration/scraper.test.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const { setupMockFiles, setupTestOutputDir } = require('../testUtils');

// Mock required modules
jest.mock('express', () => {
  const mockRouter = {
    get: jest.fn((path, handler) => {
      // Store handler for testing
      mockRouter._handler = handler;
      return mockRouter;
    }),
    _handler: null
  };
  return {
    Router: jest.fn(() => mockRouter)
  };
});

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn()
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn(path => {
    const parts = path.split('/');
    parts.pop();
    return parts.join('/');
  })
}));

// Mock scraper dependencies
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

jest.mock('../../src/utils', () => ({
  generateFilename: jest.fn().mockReturnValue('2025-05-03-12-00-00.csv')
}));

// Import modules after mocking
const router = require('../../src/scraper');
const siteHandlers = require('../../src/siteHandlers');
const { saveToCSV } = require('../../src/outputData');

describe('Scraper Router', () => {
  beforeAll(() => {
    setupMockFiles();
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    setupTestOutputDir();
    
    // Default mock values
    fs.readFileSync.mockImplementation((filePath) => {
      if (filePath.includes('websiteConfigs.json')) {
        return JSON.stringify([
          {
            id: 1,
            name: 'test.com',
            url: 'https://test.com',
            selectors: {
              eventCard: '.card',
              title: '.title',
              date: '.date',
              location: '.location',
              link: '.link'
            }
          }
        ]);
      } else if (filePath.includes('showConfigs.json')) {
        return JSON.stringify([
          {
            id: 2,
            name: 'Test Show',
            url: 'https://example.com/show',
            selectors: {
              eventCard: '.card',
              date: '.date',
              location: '.location',
              link: '.link'
            }
          }
        ]);
      } else if (filePath.includes('concordeData.json')) {
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
  });
  
  test('scraper endpoint handles theatre and show websites', async () => {
    // Get the route handler
    const handler = express.Router()._handler;
    
    // Create mock response
    const res = {
      json: jest.fn()
    };
    
    // Call the handler
    await handler({}, res);
    
    // Verify that siteHandlers.handleSite was called
    expect(siteHandlers.handleSite).toHaveBeenCalledWith(
      'test.com',
      'https://test.com',
      expect.any(Object)
    );
    
    // Verify that siteHandlers.scrapeShow was called
    expect(siteHandlers.scrapeShow).toHaveBeenCalledWith(
      'https://example.com/show',
      expect.any(Object)
    );
    
    // Verify that saveToCSV was called
    expect(saveToCSV).toHaveBeenCalled();
    
    // Verify the response
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.any(String),
      results: expect.any(Array),
      outputFiles: expect.any(Object)
    }));
  });
  
  test('scraper handles URL normalization correctly', async () => {
    // Modify the mock for this test
    fs.readFileSync.mockImplementationOnce((filePath) => {
      if (filePath.includes('websiteConfigs.json')) {
        return JSON.stringify([
          {
            id: 1,
            name: 'test.com',
            url: 'https://test.com?param=value', // URL with query params
            selectors: {
              eventCard: '.card',
              title: '.title',
              date: '.date',
              location: '.location',
              link: '.link'
            }
          }
        ]);
      }
      return '[]';
    });
    
    // Get the route handler
    const handler = express.Router()._handler;
    
    // Create mock response
    const res = {
      json: jest.fn()
    };
    
    // Call the handler
    await handler({}, res);
    
    // Verify that siteHandlers.handleSite was called with the correct URL
    expect(siteHandlers.handleSite).toHaveBeenCalledWith(
      'test.com',
      'https://test.com?param=value',
      expect.any(Object)
    );
    
    // Verify the response
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.any(String),
      results: expect.any(Array)
    }));
  });
  
  test('scraper handles Concorde websites correctly', async () => {
    // Modify the mock for this test
    fs.readFileSync.mockImplementation((filePath) => {
      if (filePath.includes('showConfigs.json')) {
        return JSON.stringify([
          {
            id: 3,
            name: 'Test Show',
            url: 'https://www.concordtheatricals.co.uk/p/123/test-show',
            selectors: {}
          }
        ]);
      } else if (filePath.includes('websiteConfigs.json')) {
        return JSON.stringify([]);
      } else if (filePath.includes('concordeData.json')) {
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
    
    // Get the route handler
    const handler = express.Router()._handler;
    
    // Create mock response
    const res = {
      json: jest.fn()
    };
    
    // Call the handler
    await handler({}, res);
    
    // Verify that saveToCSV was called with Concorde data
    expect(saveToCSV).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          show_name: 'Test Concorde Show'
        })
      ]),
      expect.any(String)
    );
    
    // Verify the response
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.any(String),
      results: expect.arrayContaining([
        expect.objectContaining({
          site: 'Test Show',
          type: 'Concord'
        })
      ])
    }));
  });
  
  test('scraper handles errors with theatre websites', async () => {
    // Mock handleSite to throw an error
    siteHandlers.handleSite.mockRejectedValueOnce(new Error('Scraping error'));
    
    // Get the route handler
    const handler = express.Router()._handler;
    
    // Create mock response
    const res = {
      json: jest.fn()
    };
    
    // Call the handler
    await handler({}, res);
    
    // Verify the response includes error information
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      results: expect.arrayContaining([
        expect.objectContaining({
          site: 'test.com',
          events_saved: 0,
          message: expect.stringContaining('Error')
        })
      ])
    }));
  });
});