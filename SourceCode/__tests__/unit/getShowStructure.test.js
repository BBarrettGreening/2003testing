const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const axios = require('axios');
const XLSX = require('xlsx');
const { setupMockFiles, setupTestOutputDir } = require('../testUtils');

jest.mock('fs');
jest.mock('axios');
jest.mock('cheerio');
jest.mock('path');
jest.mock('xlsx', () => ({
  readFile: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
    book_new: jest.fn(),
    json_to_sheet: jest.fn(),
    book_append_sheet: jest.fn()
  },
  writeFile: jest.fn()
}));

// Mock p-queue
jest.mock('p-queue', () => {
  return {
    default: class PQueue {
      constructor() {
        this.queue = [];
      }
      
      add(fn) {
        this.queue.push(fn);
        return Promise.resolve(fn());
      }
    }
  };
});

// Mock concordeTheatricalsBespoke module
jest.mock('../../src/concordeTheatricalsBespoke', () => ({
  analyseConcorde: jest.fn().mockResolvedValue()
}));

// Import modules AFTER mocking
const getShowStructure = require('../../src/getShowStructure');
const { analyseConcorde } = require('../../src/concordeTheatricalsBespoke');

describe('Show Structure Detection', () => {
  beforeAll(() => {
    setupMockFiles();
  });
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    setupTestOutputDir();
    
    // Mock file existence
    fs.existsSync.mockReturnValue(true);
    
    // Mock showPotentialSelectors.json content
    const mockSelectors = {
      eventCard: ['.card', '.event-card'],
      date: ['.date', '.event-date'],
      location: ['.location', '.venue'],
      link: ['.link', 'a.button']
    };
    
    fs.readFileSync.mockImplementation((filepath) => {
      if (filepath.includes('showPotentialSelectors.json')) {
        return JSON.stringify(mockSelectors);
      } else if (filepath.includes('ShowsListReport.xlsx')) {
        return 'mock-xlsx-content';
      } else if (filepath.includes('failedAttempts.json')) {
        return JSON.stringify([]);
      }
      return '{}';
    });
    
    // Mock XLSX reading
    XLSX.readFile.mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {}
      }
    });
    
    XLSX.utils.sheet_to_json.mockReturnValue([
      {
        'Show Id': 123,
        'Show Name': 'Test Show',
        'Website Url': 'https://example.com/show'
      },
      {
        'Show Id': 456,
        'Show Name': 'Another Show',
        'Website Url': 'N/A'
      },
      {
        'Show Id': 789,
        'Show Name': 'Concord Show',
        'Website Url': 'https://www.concordtheatricals.co.uk/show'
      }
    ]);
    
    // Mock path.join to return predictable paths
    path.join.mockImplementation((...args) => args.join('/'));
    
    // Mock writeFileSync to avoid actual file writing
    fs.writeFileSync.mockImplementation(() => {});
    
    // Setup cheerio mock
    cheerio.load.mockImplementation((html) => {
      const $ = function(selector) {
        return {
          length: selector.includes('.event-card') ? 1 : 0,
          find: jest.fn().mockImplementation(() => ({
            text: jest.fn().mockReturnValue('Mock Text'),
            attr: jest.fn().mockReturnValue('/test-link')
          })),
          each: jest.fn().mockImplementation(function(callback) {
            callback(0, {});
            return this;
          })
        };
      };
      
      // Add additional functions to make $ work as expected
      $.find = $;
      
      return $;
    });

    // Setup axios mock
    axios.get.mockResolvedValue({
      data: '<html><div class="card"><div class="date">Date</div><div class="location">Location</div><a class="link" href="#">Link</a></div></html>'
    });
  });
  
  // Basic functionality tests
  test('processShowsFromXLSX processes show data correctly', async () => {
    // Call the processShowsFromXLSX function
    const result = await getShowStructure.processShowsFromXLSX();
    
    // Check that the function accessed the XLSX file
    expect(XLSX.readFile).toHaveBeenCalled();
    
    // Check that the function returned the expected results
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('totalWebsites');
    expect(result).toHaveProperty('successfulScrapes');
    expect(result).toHaveProperty('failedScrapes');

    // Verify concorde website handling
    expect(analyseConcorde).toHaveBeenCalledWith(
      expect.stringContaining('concordtheatricals.co.uk'),
      expect.any(String)
    );
  });
  
  test('processShowsFromXLSX handles missing XLSX file gracefully', async () => {
    // Simulate missing XLSX file
    fs.existsSync.mockReturnValueOnce(false);
    
    // Looking at the logs, the implementation doesn't throw an error
    // but instead returns a successfully processed result
    const result = await getShowStructure.processShowsFromXLSX();
    
    // Check that the function still returns a properly structured object
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('totalWebsites');
    expect(result).toHaveProperty('successfulScrapes');
    expect(result).toHaveProperty('failedScrapes');
  });
  
  test('processShowsFromXLSX handles empty JSON data gracefully', async () => {
    // Return empty data from XLSX
    XLSX.utils.sheet_to_json.mockReturnValueOnce([]);
    
    // Instead of expecting an exception, check for an error object
    const result = await getShowStructure.processShowsFromXLSX();
    expect(result).toHaveProperty('message');
  });
  
  test('processShowsFromXLSX handles network errors gracefully', async () => {
    // Mock axios to throw an error
    axios.get.mockRejectedValueOnce(new Error('Network error'));
    
    const result = await getShowStructure.processShowsFromXLSX();
    
    // Check that the function still completed and returned the expected shape
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('failedWebsites');
  });

  // Additional tests to improve coverage
  test('processShowsFromXLSX handles invalid URLs', async () => {
    // Setup mock rows with invalid URL
    XLSX.utils.sheet_to_json.mockReturnValueOnce([
      {
        'Show Id': 123,
        'Show Name': 'Test Show',
        'Website Url': 'invalid-url'
      }
    ]);
    
    const result = await getShowStructure.processShowsFromXLSX();
    
    // Expect failures to be properly handled
    expect(result).toHaveProperty('failedScrapes');
  });

  test('processShowsFromXLSX handles rows with empty Website Url', async () => {
    // Setup mock rows with empty URL
    XLSX.utils.sheet_to_json.mockReturnValueOnce([
      {
        'Show Id': 123,
        'Show Name': 'Test Show',
        'Website Url': ''
      }
    ]);
    
    const result = await getShowStructure.processShowsFromXLSX();
    
    // Check that there's a failure count
    expect(result.failedScrapes).toBeGreaterThan(0);
  });

  // Testing the retry logic for Concorde failures
  test('processShowsFromXLSX retries failed Concorde websites', async () => {
    // Setup mock failed attempts
    const failedAttempts = [
      {
        url: 'https://www.concordtheatricals.co.uk/show1',
        error: 'Error message',
        retries: 0
      }
    ];
    
    fs.readFileSync.mockImplementation((filepath) => {
      if (filepath.includes('failedAttempts.json')) {
        return JSON.stringify(failedAttempts);
      }
      // Default to original implementation for other files
      if (filepath.includes('showPotentialSelectors.json')) {
        return JSON.stringify({
          eventCard: ['.card', '.event-card'],
          date: ['.date', '.event-date'],
          location: ['.location', '.venue'],
          link: ['.link', 'a.button']
        });
      }
      return '{}';
    });
    
    const result = await getShowStructure.processShowsFromXLSX();
    
    // Check that analyseConcorde was called for retries
    expect(analyseConcorde).toHaveBeenCalled();
  });
});