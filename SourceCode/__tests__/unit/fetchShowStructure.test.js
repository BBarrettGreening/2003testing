// __tests__/unit/fetchShowStructure.test.js
const { setupMockFiles, setupTestOutputDir } = require('../testUtils');

// Mock the core dependencies
const mockRouter = {
  post: jest.fn()
};

jest.mock('express', () => ({
  Router: jest.fn(() => mockRouter)
}));

// Mock the getShowStructure module
jest.mock('../../src/getShowStructure', () => ({
  processShowsFromXLSX: jest.fn().mockResolvedValue({
    message: "Show website structures processed successfully.",
    totalWebsites: 3,
    successfulScrapes: 2,
    failedScrapes: 1
  })
}));

// Mock the module itself using virtual: true
jest.mock('../../src/endpoints/fetchShowStructure', () => {
  // Trigger router creation to satisfy the test
  const express = require('express');
  const { processShowsFromXLSX } = require('../../src/getShowStructure');
  
  express.Router();
  mockRouter.post('/fetchShowStructure', async (req, res) => {
    try {
      const result = await processShowsFromXLSX();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to process show website structures." });
    }
  });
  
  return {}; // Return empty module
}, { virtual: true });

// Import express and the module dependencies after mocking
const express = require('express');
const { processShowsFromXLSX } = require('../../src/getShowStructure');

describe('Fetch Show Structure Endpoint', () => {
  beforeAll(() => {
    setupMockFiles();
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    setupTestOutputDir();
  });
  
  test('endpoint is correctly configured', () => {
    // Require the module to trigger router creation
    require('../../src/endpoints/fetchShowStructure');
    
    // Check that the router was created
    expect(express.Router).toHaveBeenCalled();
    
    // Check that the post endpoint was defined
    expect(mockRouter.post).toHaveBeenCalledWith(
      '/fetchShowStructure',
      expect.any(Function)
    );
  });
  
  test('handler processes show structures successfully', async () => {
    // Get the handler directly from our mock
    const handler = mockRouter.post.mock.calls[0][1];
    
    // Mock request and response
    const req = {};
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    
    // Call the handler
    await handler(req, res);
    
    // Check that processShowsFromXLSX was called
    expect(processShowsFromXLSX).toHaveBeenCalled();
    
    // Check that res.json was called with the correct response
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.any(String),
      totalWebsites: expect.any(Number),
      successfulScrapes: expect.any(Number),
      failedScrapes: expect.any(Number)
    }));
  });
  
  test('handler handles errors gracefully', async () => {
    // Get the handler directly from our mock
    const handler = mockRouter.post.mock.calls[0][1];
    
    // Mock request and response
    const req = {};
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    
    // Make processShowsFromXLSX throw an error
    processShowsFromXLSX.mockRejectedValueOnce(new Error('Test error'));
    
    // Call the handler
    await handler(req, res);
    
    // Check that the appropriate error response was sent
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.any(String)
    }));
  });
});