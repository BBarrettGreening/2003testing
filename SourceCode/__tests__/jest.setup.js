// __tests__/jest.setup.js
const { setupMockFiles } = require('./testUtils');

// Set up mock files before all tests run
beforeAll(() => {
  setupMockFiles();
});