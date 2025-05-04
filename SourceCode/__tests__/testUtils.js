// __tests__/testUtils.js

/**
 * Sets up mock files for testing (for backward compatibility with old tests)
 * This function is maintained for existing tests that rely on it,
 * but new tests should use localized mocks instead.
 */
const setupMockFiles = () => {
  console.log('Mock files and file system operations set up for testing');
  // This function is now essentially a no-op since we're using localized mocks
  // We keep it for backwards compatibility with existing tests
};

/**
 * Sets up a test output directory (for backward compatibility with old tests)
 * This function is maintained for existing tests that rely on it,
 * but new tests should use localized mocks instead.
 */
const setupTestOutputDir = () => {
  // This function is now essentially a no-op since we're using localized mocks
  // We keep it for backwards compatibility with existing tests
};

module.exports = {
  setupMockFiles,
  setupTestOutputDir
};