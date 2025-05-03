const fs = require('fs');
const path = require('path');
const { generateFilename, saveHtml } = require('../../src/utils');
const { setupMockFiles, setupTestOutputDir } = require('../testUtils');

// Mock fs module
jest.mock('fs');
jest.mock('path');

describe('Utility Functions', () => {
  beforeAll(() => {
    setupMockFiles();
  });
  
  describe('generateFilename', () => {
    beforeEach(() => {
      // Set up fake timers for each test
      jest.useFakeTimers();
      setupTestOutputDir();
      
      // Mock the Date object to return a consistent date
      const mockDate = new Date(2025, 4, 3, 9, 22, 37);
      jest.setSystemTime(mockDate);
      
      // Mock path.join
      path.join.mockImplementation((...args) => args.join('/'));
    });

    afterEach(() => {
      // Clean up the fake timers
      jest.useRealTimers();
    });

    test('creates filename with correct format', () => {
      const filename = generateFilename();
      expect(filename).toMatch(/^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.csv$/);
    });

    test('works with default parameters', () => {
      const filename = generateFilename();
      expect(filename).toBe('2025-05-03-09-22-37.csv');
    });

    test('handles different prefix and extension', () => {
      const filename = generateFilename('-test', '.txt');
      expect(filename).toBe('2025-05-03-09-22-37-test.txt');
    });

    test('generates unique filenames for different timestamps', () => {
      const filename1 = generateFilename();
      
      // Advance time by 1 second
      jest.advanceTimersByTime(1000);
      
      const filename2 = generateFilename();
      expect(filename1).not.toBe(filename2);
    });
  });

  describe('saveHtml', () => {
    beforeEach(() => {
      // Reset all mock implementations
      fs.existsSync.mockReset();
      fs.mkdirSync.mockReset();
      fs.writeFileSync.mockReset();
      setupTestOutputDir();
      
      // Mock date for consistent filenames
      jest.spyOn(global, 'Date').mockImplementation(() => ({
        getFullYear: () => 2025,
        getMonth: () => 4,
        getDate: () => 3,
        getHours: () => 9,
        getMinutes: () => 22,
        getSeconds: () => 37,
        toLocaleDateString: () => '5/3/2025'
      }));
      
      // Mock path.join
      path.join.mockImplementation((...args) => args.join('/'));
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('creates file in correct directory when directory exists', () => {
      fs.existsSync.mockReturnValue(true);
      
      const result = saveHtml('<html></html>');
      
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(result).toContain('2025-05-03-09-22-37.html');
    });

    test('creates directory when it does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      
      const result = saveHtml('<html></html>');
      
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(result).toContain('2025-05-03-09-22-37.html');
    });

    test('handles empty HTML gracefully', () => {
      fs.existsSync.mockReturnValue(true);
      
      const result = saveHtml('');
      
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.any(String), '');
      expect(result).toContain('.html');
    });

    test('handles null HTML gracefully', () => {
      fs.existsSync.mockReturnValue(true);
      
      const result = saveHtml(null);
      
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.any(String), '');
      expect(result).toContain('.html');
    });

    test('handles file system errors gracefully', () => {
      fs.existsSync.mockReturnValue(true);
      fs.writeFileSync.mockImplementation(() => {
        throw new Error('File write error');
      });
      
      expect(() => saveHtml('<html></html>')).not.toThrow();
    });

    test('handles directory creation errors gracefully', () => {
      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockImplementation(() => {
        throw new Error('Directory creation error');
      });
      
      expect(() => saveHtml('<html></html>')).not.toThrow();
    });
  });
});