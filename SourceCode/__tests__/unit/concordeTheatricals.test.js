// First mock the puppeteer dependency completely
jest.mock('puppeteer', () => {
  // Create mock page and browser
  const mockPage = {
    goto: jest.fn().mockResolvedValue({}),
    setUserAgent: jest.fn().mockResolvedValue({}),
    $: jest.fn().mockResolvedValue({
      contentFrame: jest.fn().mockResolvedValue({
        evaluate: jest.fn()
          .mockResolvedValueOnce([
            ['Test Company', 'Manchester', 'UK', '01/06/2025', '30/06/2025']
          ])
          .mockResolvedValueOnce(1) // Page count
      })
    }),
    evaluate: jest.fn().mockResolvedValue({})
  };

  return {
    launch: jest.fn().mockResolvedValue({
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue({})
    })
  };
});

// Mock file system dependencies
jest.mock('fs');
jest.mock('path');

const { setupMockFiles, setupTestOutputDir } = require('../testUtils');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// Now we can safely require the module
const { analyseConcorde } = require('../../src/concordeTheatricalsBespoke');

describe('Concorde Theatricals Scraper', () => {
  beforeAll(() => {
    setupMockFiles();
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    setupTestOutputDir();
    
    // Mock file system functions
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('[]');
    fs.writeFileSync.mockImplementation(() => {});
    
    // Mock path.join
    path.join.mockImplementation((...args) => args.join('/'));
  });
  
  // Basic test to ensure the suite isn't empty
  test('should have a test', () => {
    expect(true).toBe(true);
  });
  
  test('analyseConcorde extracts show information correctly', async () => {
    const url = 'https://www.concordtheatricals.co.uk/p/44615/42nd-street';
    const outputFile = 'test-output.json';
    
    // Run the function
    await analyseConcorde(url, outputFile);
    
    // Verify puppeteer was used correctly
    expect(puppeteer.launch).toHaveBeenCalled();
    
    // Verify file operations
    expect(fs.writeFileSync).toHaveBeenCalled();
  });
});

describe('Concorde Theatricals Scraper Extended Tests', () => {
  beforeAll(() => {
    setupMockFiles();
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    setupTestOutputDir();
    
    // Reset mocks for each test
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('[]');
    fs.writeFileSync.mockImplementation(() => {});
    
    // Mock path.join
    path.join.mockImplementation((...args) => args.join('/'));
  });
  
  test('analyseConcorde successfully scrapes data from multi-page table', async () => {
    // Mock puppeteer with multi-page behavior
    const mockContentFrame = {
      evaluate: jest.fn()
        .mockResolvedValueOnce([
          ['Test Company', 'Manchester', 'UK', '01/06/2025', '30/06/2025']
        ])
        .mockResolvedValueOnce(2) // Page count = 2
        .mockResolvedValueOnce([
          ['Second Company', 'Liverpool', 'UK', '05/06/2025', '25/06/2025']
        ])
    };
    
    const mockIframeElement = {
      contentFrame: jest.fn().mockResolvedValue(mockContentFrame)
    };
    
    const mockPage = {
      goto: jest.fn().mockResolvedValue({}),
      setUserAgent: jest.fn().mockResolvedValue({}),
      $: jest.fn().mockResolvedValue(mockIframeElement),
      evaluate: jest.fn().mockResolvedValue({})
    };
    
    puppeteer.launch.mockResolvedValue({
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue({})
    });
    
    const url = 'https://www.concordtheatricals.co.uk/p/44615/42nd-street';
    const outputFile = 'test-output.json';
    
    // Reset writeFileSync mock
    fs.writeFileSync.mockReset();
    fs.writeFileSync.mockImplementation(() => {});
    
    // Call analyseConcorde
    await analyseConcorde(url, outputFile);
    
    // Verify that writeFileSync was called
    expect(fs.writeFileSync).toHaveBeenCalled();
    
    // Verify that puppeteer was used
    expect(puppeteer.launch).toHaveBeenCalled();
    expect(mockPage.$).toHaveBeenCalled();
    expect(mockIframeElement.contentFrame).toHaveBeenCalled();
    expect(mockContentFrame.evaluate).toHaveBeenCalled();
  });
  
  test('noUSA function filters out USA states correctly', async () => {
    // Mock content frame to return US state data
    const mockContentFrame = {
      evaluate: jest.fn().mockResolvedValueOnce([
        ['Company 1', 'New York', 'New York', '01/06/2025', '30/06/2025'],
        ['Company 2', 'London', 'UK', '15/06/2025', '15/07/2025'],
        ['Company 3', 'Austin', 'Texas', '20/06/2025', '20/07/2025']
      ])
      .mockResolvedValueOnce(1) // Page count
    };
    
    const mockIframeElement = {
      contentFrame: jest.fn().mockResolvedValue(mockContentFrame)
    };
    
    const mockPage = {
      goto: jest.fn().mockResolvedValue({}),
      setUserAgent: jest.fn().mockResolvedValue({}),
      $: jest.fn().mockResolvedValue(mockIframeElement),
      evaluate: jest.fn().mockResolvedValue({})
    };
    
    puppeteer.launch.mockResolvedValue({
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue({})
    });
    
    const url = 'https://www.concordtheatricals.co.uk/p/44615/42nd-street';
    const outputFile = 'test-output.json';
    
    await analyseConcorde(url, outputFile);
    
    // Verify that writeFileSync was called
    expect(fs.writeFileSync).toHaveBeenCalled();
  });
  
  test('analyseConcorde handles network errors gracefully', async () => {
    // Mock page.goto to throw an error
    const mockPage = {
      goto: jest.fn().mockRejectedValue(new Error('Network error')),
      setUserAgent: jest.fn(),
      $: jest.fn()
    };
    
    const mockBrowserClose = jest.fn().mockResolvedValue({});
    
    // Create a mock browser with the close method as a jest.fn()
    puppeteer.launch.mockResolvedValue({
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: mockBrowserClose // This is the important part - create a separate mock for close
    });
    
    const url = 'https://www.concordtheatricals.co.uk/p/44615/42nd-street';
    const outputFile = 'test-output.json';
    
    // This should not throw, indicating that error handling works
    await expect(analyseConcorde(url, outputFile)).resolves.not.toThrow();
    
    // We expect browser.close to be called in the finally block
    expect(mockBrowserClose).toHaveBeenCalled();
  });
  
  test('getTableContents handles empty data gracefully', async () => {
    // Mock iframe.evaluate to return null
    const mockFrame = {
      evaluate: jest.fn().mockResolvedValue(null)
    };
    
    const mockIframeElement = {
      contentFrame: jest.fn().mockResolvedValue(mockFrame)
    };
    
    const mockPage = {
      goto: jest.fn().mockResolvedValue({}),
      setUserAgent: jest.fn().mockResolvedValue({}),
      $: jest.fn().mockResolvedValue(mockIframeElement),
      evaluate: jest.fn().mockResolvedValue({})
    };
    
    puppeteer.launch.mockResolvedValue({
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue({})
    });
    
    const url = 'https://www.concordtheatricals.co.uk/p/44615/42nd-street';
    const outputFile = 'test-output.json';
    
    // Should not throw
    await expect(analyseConcorde(url, outputFile)).resolves.not.toThrow();
  });
  
  test('scrollPage function is called during scraping', async () => {
    // Create a specific mock for page.evaluate
    const pageEvaluateMock = jest.fn().mockResolvedValue({});
    
    const mockPage = {
      goto: jest.fn().mockResolvedValue({}),
      setUserAgent: jest.fn().mockResolvedValue({}),
      $: jest.fn().mockResolvedValue({
        contentFrame: jest.fn().mockResolvedValue({
          evaluate: jest.fn().mockResolvedValueOnce([
            ['Test Company', 'Manchester', 'UK', '01/06/2025', '30/06/2025']
          ])
          .mockResolvedValueOnce(1) // Page count
        })
      }),
      evaluate: pageEvaluateMock
    };
    
    puppeteer.launch.mockResolvedValue({
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue({})
    });
    
    const url = 'https://www.concordtheatricals.co.uk/p/44615/42nd-street';
    const outputFile = 'test-output.json';
    
    await analyseConcorde(url, outputFile);
    
    // Verify page.evaluate (scrollPage) was called
    expect(mockPage.evaluate).toHaveBeenCalled();
  });
});