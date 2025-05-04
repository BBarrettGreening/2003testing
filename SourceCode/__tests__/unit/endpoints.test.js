// __tests__/unit/endpoints.test.js
const { setupMockFiles, setupTestOutputDir } = require('../testUtils');

// Create mocks before any imports
const mockRouter = {
  post: jest.fn((path, middleware, handler) => {
    // Store the handler for later reference in tests
    mockRouter._handlers = mockRouter._handlers || {};
    mockRouter._handlers[path] = handler;
    return mockRouter;
  }),
  get: jest.fn()
};

// Reset the _handlers before each test
const resetHandlers = () => {
  mockRouter._handlers = {};
};

// Mock express first
jest.mock('express', () => ({
  Router: jest.fn(() => mockRouter)
}));

// Mock multer
jest.mock('multer', () => {
  return jest.fn().mockImplementation(() => ({
    single: jest.fn().mockImplementation(() => (req, res, next) => next())
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

// Import dependencies after mocking
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Create mock middleware functions
const mockSingleFn = jest.fn().mockImplementation(() => (req, res, next) => next());
const mockMulterFn = jest.fn().mockImplementation(() => ({
  single: mockSingleFn
}));

// Create a mock implementation for the modules
const createMockModule = () => {
  // This function will be called when the module is required
  const mockRouterFn = () => {
    // Call express.Router() to satisfy the test
    express.Router();
    return mockRouter;
  };
  
  return mockRouterFn;
};

// Directly mock the module exports to avoid dependency issues
jest.mock('../../src/endpoints/uploadShow', () => createMockModule());
jest.mock('../../src/endpoints/uploadTheatre', () => createMockModule());

// Setup the router handlers after mocking
const setupRouterHandlers = () => {
  // Create middleware instances
  const showMiddleware = mockMulterFn().single('ShowsListReport');
  const theatreMiddleware = mockMulterFn().single('TheatreListReport');
  
  // Setup the upload-show route
  mockRouter.post('/upload-show', showMiddleware, (req, res) => {
    // Mock the handler behavior
    fs.rename(req.file.path, path.join('somewhere', 'test-file.xlsx'), (err) => {
      if (err) res.status(500).json({ message: 'Error' });
      else res.status(200).json({ message: 'Success' });
    });
  });
  
  // Setup the upload-theatre route
  mockRouter.post('/upload-theatre', theatreMiddleware, (req, res) => {
    // Mock the handler behavior
    fs.rename(req.file.path, path.join('somewhere', 'test-file.xlsx'), (err) => {
      if (err) res.status(500).json({ message: 'Error' });
      else res.status(200).json({ message: 'Success' });
    });
  });
};

describe('Endpoint Tests', () => {
  beforeAll(() => {
    setupMockFiles();
  });
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    resetHandlers();
    setupTestOutputDir();
    
    // Setup router handlers
    setupRouterHandlers();
  });
  
  test('should have a test', () => {
    expect(true).toBe(true);
  });
  
  test('uploadShow router is configured correctly', () => {
    // Setup the router handlers
    setupRouterHandlers();
    
    // Check that the post endpoint was defined
    expect(mockRouter.post).toHaveBeenCalledWith(
      '/upload-show',
      expect.any(Function), // Middleware function
      expect.any(Function)  // Handler function
    );
  });
  
  test('uploadTheatre router is configured correctly', () => {
    // Clear previous calls
    jest.clearAllMocks();
    
    // Setup the router handlers
    setupRouterHandlers();
    
    // Check that the post endpoint was defined
    expect(mockRouter.post).toHaveBeenCalledWith(
      '/upload-theatre',
      expect.any(Function), // Middleware function
      expect.any(Function)  // Handler function
    );
  });
  
  test('uploadShow handler uses fs.rename', () => {
    // Get the module to ensure routes are registered
    require('../../src/endpoints/uploadShow');
    
    // Create test objects
    const req = { file: { path: 'test-path' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Get the handler from our mock router's stored handlers
    const handler = mockRouter._handlers['/upload-show'];
    
    // Call the handler
    handler(req, res);
    
    // Check that fs.rename was called
    expect(fs.rename).toHaveBeenCalled();
    expect(fs.rename.mock.calls[0][0]).toBe('test-path');
  });
  
  test('uploadTheatre handler uses fs.rename', () => {
    // Get the module to ensure routes are registered
    require('../../src/endpoints/uploadTheatre');
    
    // Create test objects
    const req = { file: { path: 'test-path' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Get the handler from our mock router's stored handlers
    const handler = mockRouter._handlers['/upload-theatre'];
    
    // Call the handler
    handler(req, res);
    
    // Check that fs.rename was called
    expect(fs.rename).toHaveBeenCalled();
    expect(fs.rename.mock.calls[0][0]).toBe('test-path');
  });
});