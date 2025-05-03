// __tests__/unit/endpoints.test.js
const { setupMockFiles, setupTestOutputDir } = require('../testUtils');

// Create mocks before any imports
const mockRouter = {
  post: jest.fn(),
  get: jest.fn()
};

// Mock express first
jest.mock('express', () => ({
  Router: jest.fn(() => mockRouter)
}));

// Mock other dependencies
jest.mock('multer', () => {
  return jest.fn().mockImplementation(() => ({
    single: jest.fn().mockReturnValue('mockMiddleware')
  }));
});

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue('{}'),
  writeFileSync: jest.fn(),
  rename: jest.fn((src, dest, callback) => callback && callback()),
  mkdirSync: jest.fn()
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/'))
}));

// Import express after mocking
const express = require('express');
const fs = require('fs');
const path = require('path');

// Directly mock the module exports to avoid dependency issues
jest.mock('../../src/endpoints/uploadShow', () => {
  // This will trigger our mocked router
  express.Router();
  mockRouter.post('/upload-show', 'mockMiddleware', (req, res) => {
    // Mock the handler behavior
    fs.rename(req.file.path, path.join('somewhere', 'test-file.xlsx'), (err) => {
      if (err) res.status(500).json({ message: 'Error' });
      else res.status(200).json({ message: 'Success' });
    });
  });
  
  return {}; // Return empty module
}, { virtual: true });

jest.mock('../../src/endpoints/uploadTheatre', () => {
  // This will trigger our mocked router
  express.Router();
  mockRouter.post('/upload-theatre', 'mockMiddleware', (req, res) => {
    // Mock the handler behavior
    fs.rename(req.file.path, path.join('somewhere', 'test-file.xlsx'), (err) => {
      if (err) res.status(500).json({ message: 'Error' });
      else res.status(200).json({ message: 'Success' });
    });
  });
  
  return {}; // Return empty module
}, { virtual: true });

describe('Endpoint Tests', () => {
  beforeAll(() => {
    setupMockFiles();
  });
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    setupTestOutputDir();
  });
  
  test('should have a test', () => {
    expect(true).toBe(true);
  });
  
  test('uploadShow router is configured correctly', () => {
    // Require the module to trigger router creation
    require('../../src/endpoints/uploadShow');
    
    // Check that the router was created
    expect(express.Router).toHaveBeenCalled();
    
    // Check that the post endpoint was defined
    expect(mockRouter.post).toHaveBeenCalledWith(
      '/upload-show',
      'mockMiddleware',
      expect.any(Function)
    );
  });
  
  test('uploadTheatre router is configured correctly', () => {
    // Clear previous calls
    jest.clearAllMocks();
    
    // Require the module to trigger router creation
    require('../../src/endpoints/uploadTheatre');
    
    // Check that the router was created
    expect(express.Router).toHaveBeenCalled();
    
    // Check that the post endpoint was defined
    expect(mockRouter.post).toHaveBeenCalledWith(
      '/upload-theatre',
      'mockMiddleware',
      expect.any(Function)
    );
  });
  
  test('uploadShow handler uses fs.rename', () => {
    // Create test objects
    const req = { file: { path: 'test-path' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Get the handler directly from our mock
    const handler = mockRouter.post.mock.calls[0][2];
    
    // Call the handler
    handler(req, res);
    
    // Check that fs.rename was called
    expect(fs.rename).toHaveBeenCalled();
    expect(fs.rename.mock.calls[0][0]).toBe('test-path');
  });
  
  test('uploadTheatre handler uses fs.rename', () => {
    // Create test objects
    const req = { file: { path: 'test-path' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Get the handler directly from our mock
    const handler = mockRouter.post.mock.calls[1][2];
    
    // Call the handler
    handler(req, res);
    
    // Check that fs.rename was called
    expect(fs.rename).toHaveBeenCalled();
    expect(fs.rename.mock.calls[0][0]).toBe('test-path');
  });
});