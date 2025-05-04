// Create local mock implementations for file system
const mockFs = {
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn()
};

// Create local mock implementation for path
const mockPath = {
  join: jest.fn((...args) => args.join('/'))
};

// Mock modules with local implementations
jest.mock('fs', () => mockFs);
jest.mock('path', () => mockPath);

// Import the module being tested
const { generateFilename, saveHtml } = require('../../src/utils');

describe('Utility Functions Tests', () => {
  describe('generateFilename', () => {
    beforeEach(() => {
      // Set up fake timers for each test
      jest.useFakeTimers();
      
      // Mock the Date object to return a consistent date
      const mockDate = new Date(2025, 4, 3, 9, 22, 37);
      jest.setSystemTime(mockDate);
      
      // Reset mocks
      mockPath.join.mockClear();
      mockFs.existsSync.mockClear();
      mockFs.mkdirSync.mockClear();
      mockFs.writeFileSync.mockClear();
      
      // Mock path.join
      mockPath.join.mockImplementation((...args) => args.join('/'));
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
      jest.clearAllMocks();
      
      // Set up mock date for consistent filenames
      jest.spyOn(global, 'Date').mockImplementation(() => ({
        getFullYear: () => 2025,
        getMonth: () => 4,
        getDate: () => 3,
        getHours: () => 9,
        getMinutes: () => 22,
        getSeconds: () => 37,
        toLocaleDateString: () => '5/3/2025'
      }));
      
      // Default successful implementations
      mockFs.existsSync.mockReturnValue(true);
      mockFs.mkdirSync.mockImplementation(() => {});
      mockFs.writeFileSync.mockImplementation(() => {});
      
      // Mock path.join
      mockPath.join.mockImplementation((...args) => args.join('/'));
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('creates file in correct directory when directory exists', () => {
      mockFs.existsSync.mockReturnValue(true);
      
      const result = saveHtml('<html></html>');
      
      expect(mockFs.existsSync).toHaveBeenCalled();
      expect(mockFs.writeFileSync).toHaveBeenCalled();
      expect(result).toContain('2025-05-03-09-22-37.html');
    });

    test('creates directory when it does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const result = saveHtml('<html></html>');
      
      expect(mockFs.existsSync).toHaveBeenCalled();
      expect(mockFs.mkdirSync).toHaveBeenCalled();
      expect(mockFs.writeFileSync).toHaveBeenCalled();
      expect(result).toContain('2025-05-03-09-22-37.html');
    });

    test('handles null HTML gracefully', () => {
      const result = saveHtml(null);
      
      expect(mockFs.writeFileSync).toHaveBeenCalled();
      // Verify empty string was saved
      expect(mockFs.writeFileSync.mock.calls[0][1]).toBe('');
    });

    test('handles undefined HTML gracefully', () => {
      const result = saveHtml(undefined);
      
      expect(mockFs.writeFileSync).toHaveBeenCalled();
      // Verify empty string was saved
      expect(mockFs.writeFileSync.mock.calls[0][1]).toBe('');
    });

    test('handles empty HTML gracefully', () => {
      const result = saveHtml('');
      
      expect(mockFs.writeFileSync).toHaveBeenCalled();
      // Verify empty string was saved
      expect(mockFs.writeFileSync.mock.calls[0][1]).toBe('');
    });

    test('returns null if directory creation fails', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {
        throw new Error('Directory creation error');
      });
      
      const result = saveHtml('<html></html>');
      
      expect(result).toBeNull();
    });

    test('returns null if file writing fails', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('File write error');
      });
      
      const result = saveHtml('<html></html>');
      
      expect(result).toBeNull();
    });
  });
});