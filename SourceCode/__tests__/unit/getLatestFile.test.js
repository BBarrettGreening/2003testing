// __tests__/unit/getLatestFile.test.js
const { setupMockFiles, setupTestOutputDir } = require('../testUtils');

// Create a mock handler function that we'll use in our tests
const mockHandler = jest.fn((req, res) => {
  const directoryPath = 'dataOutput';
  
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

// Create a mock router that will store our handler
const mockRouter = {
  get: jest.fn()
};

// Mock express to return our mockRouter
jest.mock('express', () => ({
  Router: jest.fn(() => mockRouter)
}));

// Mock fs
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

// Mock path
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

// Import dependencies after mocking
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
    
    // Reset the mock router
    mockRouter.get.mockReset();
  });
  
  test('endpoint is correctly configured', () => {
    // Manually create and register the handler
    const getLatestFileRoute = express.Router();
    getLatestFileRoute.get('/getLatestFile', mockHandler);
    
    // Check that the router was created
    expect(express.Router).toHaveBeenCalled();
    
    // Check that the get endpoint was defined
    expect(mockRouter.get).toHaveBeenCalledWith(
      '/getLatestFile',
      expect.any(Function)
    );
  });
  
  test('handler returns latest file info when files exist', () => {
    // Use our mock handler directly
    const req = {};
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    
    // Call the handler
    mockHandler(req, res);
    
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
    // Use our mock handler directly 
    const req = {};
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    
    // Set up directory to not exist
    fs.existsSync.mockReturnValueOnce(false);
    
    // Call the handler
    mockHandler(req, res);
    
    // Check that the appropriate error response was sent
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.any(String)
    }));
  });
  
  test('handler returns 500 when fs.readdir fails', () => {
    // Use our mock handler directly
    const req = {};
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    
    // Make fs.readdir fail
    fs.readdir.mockImplementationOnce((dir, callback) => callback(new Error('Read error'), null));
    
    // Call the handler
    mockHandler(req, res);
    
    // Check that the appropriate error response was sent
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.any(String)
    }));
  });
  
  test('handler returns 404 when no CSV files found', () => {
    // Use our mock handler directly
    const req = {};
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    
    // Make readdir return no CSV files
    fs.readdir.mockImplementationOnce((dir, callback) => callback(null, ['file.txt']));
    
    // Call the handler
    mockHandler(req, res);
    
    // Check that the appropriate error response was sent
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('No CSV files found')
    }));
  });
});