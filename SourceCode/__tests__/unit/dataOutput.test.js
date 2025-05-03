const { saveToCSV } = require('../../src/outputData');
const fs = require('fs');
const path = require('path');
const { generateFilename } = require('../../src/utils');
const getStartEndDate = require('../../src/getStartEndDate');
const { setupMockFiles, setupTestOutputDir } = require('../testUtils');

jest.mock('fs');
jest.mock('path');
jest.mock('../../src/utils');
jest.mock('../../src/getStartEndDate');

describe('Output Data Functions', () => {
  beforeAll(() => {
    setupMockFiles();
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    setupTestOutputDir();
    
    // Mock generateFilename to return consistent filenames
    generateFilename.mockImplementation((suffix, extension) => {
      return `2025-05-03-12-00-00${suffix}${extension}`;
    });
    
    // Mock file system functions
    fs.existsSync.mockReturnValue(true);
    fs.mkdirSync.mockImplementation(() => {});
    fs.writeFileSync.mockImplementation(() => {});
    
    // Mock path.join
    path.join.mockImplementation((...args) => args.join('/'));

    // Mock getStartEndDate
    getStartEndDate.mockImplementation(dateStr => {
      return {
        startDate: '1 May 2025',
        endDate: '15 May 2025'
      };
    });
  });
  
  test('saveToCSV creates two separate CSV files', () => {
    const testData = [
      {
        theatre: 'Test Theatre',
        shows: [
          {
            title: 'Show 1',
            date: '01/05/2025 - 15/05/2025',
            location: 'Test Theatre',
            link: 'https://example.com/show1'
          },
          {
            title: 'Show 2',
            date: '20/05/2025 - 30/05/2025',
            location: 'Test Theatre',
            link: 'https://example.com/show2'
          }
        ]
      }
    ];
    
    const outputPath = 'test-output';
    const result = saveToCSV(testData, outputPath);
    
    // Check that output directory was created if it didn't exist
    expect(fs.existsSync).toHaveBeenCalledWith(outputPath);
    
    // Check that two files were created
    expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
    
    // Check returned paths
    expect(result).toHaveProperty('part1');
    expect(result).toHaveProperty('part2');
    expect(result.part1).toContain('Part-1.csv');
    expect(result.part2).toContain('Part-2.csv');
  });
  
  test('saveToCSV handles empty data gracefully', () => {
    const result = saveToCSV([], 'test-output');
    
    expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
    expect(result).toHaveProperty('part1');
    expect(result).toHaveProperty('part2');
  });
  
  test('saveToCSV processes dates properly using getStartEndDate', () => {
    const testData = [
      {
        theatre: 'Test Theatre',
        shows: [
          {
            title: 'Date Test Show',
            date: '01/05/2025 - 15/05/2025',
            location: 'Test Theatre',
            link: 'https://example.com/show'
          }
        ]
      }
    ];
    
    saveToCSV(testData, 'test-output');
    
    // Verify getStartEndDate was called
    expect(getStartEndDate).toHaveBeenCalled();
    expect(getStartEndDate).toHaveBeenCalledWith('01/05/2025 - 15/05/2025');
  });
  
  test('saveToCSV creates directory if it does not exist', () => {
    fs.existsSync.mockReturnValueOnce(false);
    
    const testData = [
      {
        theatre: 'Test Theatre',
        shows: [
          {
            title: 'Show 1',
            date: '01/05/2025 - 15/05/2025',
            location: 'Test Theatre',
            link: 'https://example.com/show1'
          }
        ]
      }
    ];
    
    saveToCSV(testData, 'non-existent-dir');
    
    expect(fs.existsSync).toHaveBeenCalledWith('non-existent-dir');
    expect(fs.mkdirSync).toHaveBeenCalledWith('non-existent-dir', { recursive: true });
  });
  
  test('saveToCSV handles data with missing fields gracefully', () => {
    const testData = [
      {
        theatre: 'Test Theatre',
        shows: [
          {
            title: 'Show with missing fields',
            // Missing date
            // Missing location
            link: 'https://example.com/show'
          }
        ]
      }
    ];
    
    const result = saveToCSV(testData, 'test-output');
    
    // Should still create files
    expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
  });
});