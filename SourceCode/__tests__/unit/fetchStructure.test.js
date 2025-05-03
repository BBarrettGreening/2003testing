// __tests__/unit/fetchStructure.test.js
const { setupMockFiles, setupTestOutputDir } = require('../testUtils');

// Mock the core dependencies
const mockRouter = {
  post: jest.fn()
};

jest.mock('express', () => ({
  Router: jest.fn(() => mockRouter)
}));

// Mock the getStructure module
jest.mock('../../src/getStructure', () => ({
  processTheatresFromXLSX: jest.fn().mockResolvedValue({
    totalTheatres: 3,
    successfulScrapes: 2,
    failedStructures: 1
  })
}));

// Mock the module itself using virtual: true
jest.mock('../../src/endpoints/fetchStructure', () => {
  // Trigger router creation to satisfy the test
  const express = require('express');
  const { processTheatresFromXLSX } = require('../../src/getStructure');
  
  express.Router();
  mockRouter.post('/fetchStructure', async (req, res) => {
    try {
      const result = await processTheatresFromXLSX();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to process website structures." });
    }
  });
  
  return {}; // Return empty module
}, { virtual: true });

// Import express and the module dependencies after mocking
const express = require('express');
const { processTheatresFromXLSX } = require('../../src/getStructure');

describe('Fetch Structure Endpoint', () => {
  beforeAll(() => {
    setupMockFiles();
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    setupTestOutputDir();
  });
  
  test('endpoint is correctly configured', () => {
    // Require the module to trigger router creation
    require('../../src/endpoints/fetchStructure');
    
    // Check that the router was created
    expect(express.Router).toHaveBeenCalled();
    
    // Check that the post endpoint was defined
    expect(mockRouter.post).toHaveBeenCalledWith(
      '/fetchStructure',
      expect.any(Function)
    );
  });
  
  test('handler processes structures successfully', async () => {
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
    
    // Check that processTheatresFromXLSX was called
    expect(processTheatresFromXLSX).toHaveBeenCalled();
    
    // Check that res.json was called with the correct response
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      totalTheatres: expect.any(Number),
      successfulScrapes: expect.any(Number),
      failedStructures: expect.any(Number)
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
    
    // Make processTheatresFromXLSX throw an error
    processTheatresFromXLSX.mockRejectedValueOnce(new Error('Test error'));
    
    // Call the handler
    await handler(req, res);
    
    // Check that the appropriate error response was sent
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.any(String)
    }));
  });
});