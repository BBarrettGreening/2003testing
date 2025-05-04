module.exports = {
  // Use the configuration from package.json
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/__tests__/jest.setup.js"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "src/**/*.js",
    "!**/node_modules/**",
    "!**/coverage/**",
    "!jest.config.js"
  ],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "__tests__/unit/getStructure.test.js",
    "src/endpoints/exportFailedStructures.js",
    "src/endpoints/fetchShowStructure.js",
    "src/endpoints/fetchStructure.js",
    "src/endpoints/getLatestFile.js",
    "src/endpoints/index.js",
    "src/endpoints/uploadShow.js",
    "src/endpoints/uploadTheatre.js",
    "src/server.js"
  ],
  testMatch: [
    "**/__tests__/**/*.test.js",
    "**/__tests__/**/*.spec.js",
    "**/?(*.)+(spec|test).js"
  ],
  testTimeout: 30000,
  verbose: true,
   
  // Explicitly configure transform to use babel-jest with the babel.config.js file
  transform: {
    "^.+\\.(js|jsx)$": ["babel-jest", { configFile: "./babel.config.js" }]
  },
   
  // Ignore .cjs files in the transformIgnorePatterns
  transformIgnorePatterns: [
    "/node_modules/",
    "\\.cjs$"
  ],
   
  // Add moduleFileExtensions to prioritize .js over .cjs
  moduleFileExtensions: ["js", "json", "jsx", "node", "mjs", "cjs", "ts", "tsx"]
};