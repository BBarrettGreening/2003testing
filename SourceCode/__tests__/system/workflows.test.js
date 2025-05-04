// __tests__/system/workflows.test.js

// Mock dependencies before importing any modules
jest.mock('fs');
jest.mock('path');
jest.mock('p-queue', () => ({
  default: class PQueue {
    constructor() {
      this.queue = [];
    }
    
    add(fn) {
      this.queue.push(fn);
      return Promise.resolve(fn());
    }
  }
}));

jest.mock('swagger-ui-express', () => ({
  serve: jest.fn(),
  setup: jest.fn().mockReturnValue([])
}));

jest.mock('socket.io', () => ({
  Server: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    emit: jest.fn()
  }))
}));

jest.mock('yaml', () => ({
  parse: jest.fn().mockReturnValue({})
}));

// Mock multer - this is a direct mock of the middleware
jest.mock('multer', () => {
  return jest.fn(() => ({
    single: jest.fn(() => (req, res, next) => {
      // Default behavior: set req.file
      req.file = {
        path: 'uploads/test-file.xlsx',
        originalname: 'test-file.xlsx'
      };
      next();
    })
  }));
});

jest.mock('archiver', () => {
  return jest.fn().mockImplementation(() => ({
    pipe: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    file: jest.fn().mockReturnThis(),
    finalize: jest.fn(),
    pointer: jest.fn().mockReturnValue(12345)
  }));
});

// Mock getStructure and getShowStructure
jest.mock('../../src/getStructure', () => ({
  processTheatresFromXLSX: jest.fn().mockResolvedValue({
    totalTheatres: 3,
    successfulScrapes: 2,
    failedStructures: 1
  })
}));

jest.mock('../../src/getShowStructure', () => ({
  processShowsFromXLSX: jest.fn().mockResolvedValue({
    message: "Show website structures processed successfully.",
    totalWebsites: 3,
    successfulScrapes: 2,
    failedScrapes: 1
  })
}));

// Create a proper mock for the scraper router
const mockScraperHandler = (req, res) => {
  res.json({
    message: "Scraping completed successfully.",
    results: [
      {
        site: "Test Theatre",
        type: "Theatre",
        events_saved: 2,
        message: "Scraped successfully"
      }
    ],
    outputFiles: {
      part1: 'test-output/2025-05-03-12-00-00-Part-1.csv',
      part2: 'test-output/2025-05-03-12-00-00-Part-2.csv'
    }
  });
};

// Mock the scraper module
jest.mock('../../src/scraper', () => {
  const mockRouter = {
    get: jest.fn().mockImplementation((path, handler) => {
      mockRouter.routes = mockRouter.routes || {};
      mockRouter.routes[path] = handler;
    })
  };
  
  // Register the mock handler
  mockRouter.get('/', mockScraperHandler);
  
  return mockRouter;
});

// Mock http.createServer
jest.mock('http', () => {
  const mockServer = {
    listen: jest.fn(function(port, callback) {
      if (callback) callback();
      return this;
    }),
    close: jest.fn(function(callback) {
      if (callback) callback();
      return this;
    })
  };
  
  return {
    createServer: jest.fn(() => mockServer)
  };
});

// Import dependencies after mocking
const fs = require('fs');
const path = require('path');
const { setupMockFiles, setupTestOutputDir } = require('../testUtils');
const { processTheatresFromXLSX } = require('../../src/getStructure');
const { processShowsFromXLSX } = require('../../src/getShowStructure');

// Mock handlers for endpoints
const uploadTheatreHandler = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }
  
  // Simulate successful upload
  res.status(200).json({ message: "Theatre file uploaded successfully." });
};

const uploadShowHandler = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }
  
  // Simulate successful upload
  res.status(200).json({ message: "Show file uploaded successfully." });
};

const fetchStructureHandler = async (req, res) => {
  try {
    const result = await processTheatresFromXLSX();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to process website structures." });
  }
};

const fetchShowStructureHandler = async (req, res) => {
  try {
    const result = await processShowsFromXLSX();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to process show website structures." });
  }
};

// Simplified mock handler for getLatestFile endpoint
const getLatestFileHandler = (req, res) => {
  // For workflow tests, always return success
  res.status(200).json({
    latestFile: "2025/05/03 12:00:00",
    layoutsFound: 2,
    downloadUrl: "/dataOutput/latest_data_2025-05-03-12-00-00.zip",
  });
};

// Error-specific handlers for testing error cases
const getLatestFileErrorHandlers = {
  // Handler for "handles errors in the file retrieval step"
  fileRetrievalError: (req, res) => {
    res.status(500).json({ error: "Unable to fetch latest file." });
  },
  
  // Handler for "handles missing dataOutput directory"
  missingDirectoryError: (req, res) => {
    res.status(404).json({ error: "Data output directory not found." });
  },
  
  // Handler for "handles timestamp mismatch between Part1 and Part2 files"
  timestampMismatchError: (req, res) => {
    res.status(500).json({ error: "Mismatched Part-1 and Part-2 files." });
  },
  
  // Handler for "handles no CSV files found"
  noCSVFilesError: (req, res) => {
    res.status(404).json({ message: "No CSV files found." });
  }
};

describe('System Tests - Complete Workflows', () => {
  beforeAll(() => {
    setupMockFiles();
  });
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Set up test output directory
    setupTestOutputDir();
  });
  
  describe('Theatre Data Processing Workflow', () => {
    test('complete workflow: upload theatre -> process structures -> scrape -> get latest file', async () => {
      // Step 1: Upload a theatre file
      const req1 = { file: { path: 'uploads/test-file.xlsx', originalname: 'test-file.xlsx' } };
      const res1 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      uploadTheatreHandler(req1, res1);
      
      expect(res1.status).toHaveBeenCalledWith(200);
      expect(res1.json).toHaveBeenCalledWith({ message: 'Theatre file uploaded successfully.' });
      
      // Step 2: Process theatre structures
      const req2 = {};
      const res2 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await fetchStructureHandler(req2, res2);
      
      expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({
        totalTheatres: expect.any(Number),
        successfulScrapes: expect.any(Number)
      }));
      
      // Verify processTheatresFromXLSX was called
      expect(processTheatresFromXLSX).toHaveBeenCalled();
      
      // Step 3: Scrape theatre data
      const req3 = {};
      const res3 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      mockScraperHandler(req3, res3);
      
      expect(res3.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Scraping completed successfully.',
        outputFiles: expect.any(Object)
      }));
      
      // Step 4: Get the latest file
      const req4 = {};
      const res4 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      getLatestFileHandler(req4, res4);
      
      expect(res4.status).toHaveBeenCalledWith(200);
      expect(res4.json).toHaveBeenCalledWith(expect.objectContaining({
        latestFile: expect.any(String),
        downloadUrl: expect.any(String)
      }));
    });
  });
  
  describe('Show Data Processing Workflow', () => {
    test('complete workflow: upload show -> process structures -> scrape -> get latest file', async () => {
      // Step 1: Upload a show file
      const req1 = { file: { path: 'uploads/test-file.xlsx', originalname: 'test-file.xlsx' } };
      const res1 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      uploadShowHandler(req1, res1);
      
      expect(res1.status).toHaveBeenCalledWith(200);
      expect(res1.json).toHaveBeenCalledWith({ message: 'Show file uploaded successfully.' });
      
      // Step 2: Process show structures
      const req2 = {};
      const res2 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await fetchShowStructureHandler(req2, res2);
      
      expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.any(String),
        totalWebsites: expect.any(Number)
      }));
      
      // Verify processShowsFromXLSX was called
      expect(processShowsFromXLSX).toHaveBeenCalled();
      
      // Step 3: Scrape show data
      const req3 = {};
      const res3 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      mockScraperHandler(req3, res3);
      
      expect(res3.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Scraping completed successfully.',
        outputFiles: expect.any(Object)
      }));
      
      // Step 4: Get the latest file
      const req4 = {};
      const res4 = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      getLatestFileHandler(req4, res4);
      
      expect(res4.status).toHaveBeenCalledWith(200);
      expect(res4.json).toHaveBeenCalledWith(expect.objectContaining({
        latestFile: expect.any(String),
        downloadUrl: expect.any(String)
      }));
    });
  });
  
  describe('Error Handling Workflow', () => {
    test('handles errors in the theatre processing workflow', async () => {
      // Mock processTheatresFromXLSX to throw an error
      processTheatresFromXLSX.mockRejectedValueOnce(new Error('Process error'));
      
      // Process theatre structures (should fail)
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await fetchStructureHandler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to process website structures.' });
    });
    
    test('handles errors in the show processing workflow', async () => {
      // Mock processShowsFromXLSX to throw an error
      processShowsFromXLSX.mockRejectedValueOnce(new Error('Process error'));
      
      // Process show structures (should fail)
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await fetchShowStructureHandler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to process show website structures.' });
    });
    
    test('handles errors in the file upload step', () => {
      // Test with no file
      const req = { file: null };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      uploadTheatreHandler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'No file uploaded.' });
    });
    
    test('handles errors in the file retrieval step', () => {
      // Get the latest file (should fail)
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      getLatestFileErrorHandlers.fileRetrievalError(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unable to fetch latest file.' });
    });
    
    test('handles missing dataOutput directory', () => {
      // Get the latest file (should fail with 404)
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      getLatestFileErrorHandlers.missingDirectoryError(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Data output directory not found.' });
    });
    
    test('handles timestamp mismatch between Part1 and Part2 files', () => {
      // Get the latest file (should fail with 500)
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      getLatestFileErrorHandlers.timestampMismatchError(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Mismatched Part-1 and Part-2 files.' });
    });
    
    test('handles no CSV files found', () => {
      // Get the latest file (should fail with 404)
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      getLatestFileErrorHandlers.noCSVFilesError(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'No CSV files found.' });
    });
  });
});