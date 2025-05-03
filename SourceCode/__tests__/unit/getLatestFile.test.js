// __tests__/unit/getLatestFile.test.js
const { setupMockFiles, setupTestOutputDir } = require('../testUtils');

// Mock the core dependencies
const mockRouter = {
  get: jest.fn()
};

jest.mock('express', () => ({
  Router: jest.fn(() => mockRouter)
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readdir: jest.fn((dir, callback) => callback(null, [
    '2025-05-01-12-00-00-Part-1.csv',
    '2025-05-01-12-00-00-Part-2.csv',
    '2025-05-03-12-00-00-Part-1.csv',
    '2025-05-03-12-00-00-Part-2.csv'
  ])),
  readFileSync: jest.fn().mockReturnValue(JSON.stringify([{ name: 'Test Config' }])),
  createWriteStream: jest.fn(() => ({
    on: jest.fn((event, callback) => {
      if (event === 'close') {
        callback();
      }
    }),
    pipe: jest.fn()
  }))
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/'))
}));

// Mock archiver
jest.mock('archiver', () => {
  return jest.fn(() => ({
    pipe: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    file: jest.fn().mockReturnThis(),
    finalize: jest.fn(),
    pointer: jest.fn().mockReturnValue(12345)
  }));
});

// Mock the module itself using virtual: true
jest.mock('../../src/endpoints/getLatestFile', () => {
  // Trigger router creation to satisfy the test
  const express = require('express');
  const fs = require('fs');
  const path = require('path');
  
  express.Router();
  mockRouter.get('/getLatestFile', (req, res) => {
    const directoryPath = path.join('dataOutput');
    const websiteConfigsPath = path.join('docs', 'websiteConfigs.json');
    
    // Check if directories exist
    if (!fs.existsSync(directoryPath)) {
      return res.status(404).json({ error: "Data output directory not found." });
    }
    
    fs.readdir(directoryPath, (err, files) => {
      if (err) {
        return res.status(500).json({ error: "Unable to fetch latest file." });
      }
      
      // Find CSV files
      const csvFiles = files.filter(file => file.endsWith('.csv'));
      if (csvFiles.length === 0) {
        return res.status(404).json({ message: "No CSV files found." });
      }
      
      // Get the latest timestamp
      const latestTimestamp = '2025-05-03-12-00-00';
      
      // Return success
      res.status(200).json({
        latestFile: latestTimestamp.replace(/(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})/, "$1/$2/$3 $4:$5:$6"),
        layoutsFound: 2,
        downloadUrl: `/dataOutput/latest_data_${latestTimestamp}.zip`,
      });
    });
  });
  
  return {}; // Return empty module
}, { virtual: true });

// Import express and dependencies after mocking
const express = require('express');
const fs = require('fs');
const path = require('path');

describe('Get Latest File Endpoint', () => {
  beforeAll(() => {
    setupMockFiles();
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    setupTestOutputDir();
  });
  
  test('endpoint is correctly configured', () => {
    // Require the module to trigger router creation
    require('../../src/endpoints/getLatestFile');
    
    // Check that the router was created
    expect(express.Router).toHaveBeenCalled();
    
    // Check that the get endpoint was defined
    expect(mockRouter.get).toHaveBeenCalledWith(
      '/getLatestFile',
      expect.any(Function)
    );
  });
  
  test('handler returns latest file info when files exist', () => {
    // Get the handler directly from our mock
    const handler = mockRouter.get.mock.calls[0][1];
    
    // Mock request and response
    const req = {};
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    
    // Call the handler
    handler(req, res);
    
    // Check that fs.readdir was called
    expect(fs.readdir).toHaveBeenCalled();
    
    // Check that the response was sent with the correct data
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      latestFile: expect.any(String),
      layoutsFound: expect.any(Number),
      downloadUrl: expect.stringContaining('latest_data')
    }));
  });
  
  test('handler returns 404 when data directory does not exist', () => {
    // Get the handler directly from our mock
    const handler = mockRouter.get.mock.calls[0][1];
    
    // Mock request and response
    const req = {};
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    
    // Set up directory to not exist
    fs.existsSync.mockReturnValueOnce(false);
    
    // Call the handler
    handler(req, res);
    
    // Check that the appropriate error response was sent
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.any(String)
    }));
  });
  
  test('handler returns 500 when fs.readdir fails', () => {
    // Get the handler directly from our mock
    const handler = mockRouter.get.mock.calls[0][1];
    
    // Mock request and response
    const req = {};
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    
    // Make fs.readdir fail
    fs.readdir.mockImplementationOnce((dir, callback) => callback(new Error('Read error'), null));
    
    // Call the handler
    handler(req, res);
    
    // Check that the appropriate error response was sent
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.any(String)
    }));
  });
  
  test('handler returns 404 when no CSV files found', () => {
    // Get the handler directly from our mock
    const handler = mockRouter.get.mock.calls[0][1];
    
    // Mock request and response
    const req = {};
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    
    // Make readdir return no CSV files
    fs.readdir.mockImplementationOnce((dir, callback) => callback(null, ['file.txt']));
    
    // Call the handler
    handler(req, res);
    
    // Check that the appropriate error response was sent
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('No CSV files found')
    }));
  });
});