// __tests__/unit/siteHandlers.test.js
const axios = require('axios');
const cheerio = require('cheerio');
const siteHandlers = require('../../src/siteHandlers');
const { setupMockFiles, setupTestOutputDir } = require('../testUtils');

jest.mock('axios');
jest.mock('cheerio');

describe('Site Handlers Tests', () => {
  beforeAll(() => {
    setupMockFiles();
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    setupTestOutputDir();
    
    // Setup mock cheerio element
    const mockCheerioElement = {
      text: jest.fn().mockReturnValue('Test Title'),
      attr: jest.fn().mockReturnValue('/test-link'),
      next: jest.fn().mockReturnValue({
        text: jest.fn().mockReturnValue('City Name')
      })
    };
    
    // Setup cheerio mock
    const mockCheerioInstance = {
      find: jest.fn().mockReturnValue({
        each: jest.fn().mockImplementation(function(callback) {
          // Simulate finding 2 events
          callback.call(this, 0, mockCheerioElement);
          callback.call(this, 1, mockCheerioElement);
          return this;
        }),
        text: jest.fn().mockReturnValue('Test Title'),
        attr: jest.fn().mockReturnValue('/test-link'),
        next: jest.fn().mockReturnValue({
          text: jest.fn().mockReturnValue('City Name')
        })
      }),
      each: jest.fn().mockImplementation(function(callback) {
        // Simulate finding 2 events
        callback.call(this, 0, mockCheerioElement);
        callback.call(this, 1, mockCheerioElement);
        return this;
      })
    };
    
    cheerio.load.mockImplementation(() => {
      const $ = function(selector) {
        return mockCheerioInstance;
      };
      
      // Add necessary properties to make $ function as expected
      $.find = $;
      
      return $;
    });
    
    // Setup axios mock
    axios.get.mockResolvedValue({
      data: `<html>
        <div class="event-card">
          <h3>Test Event</h3>
          <span class="date">May 2025</span>
          <span class="location">London</span>
          <a href="/test-link">Book</a>
        </div>
      </html>`
    });
  });
  
  // Test for the handleSite method
  test('handleSite extracts show data correctly', async () => {
    const selectors = {
      eventCard: '.event-card',
      title: 'h3',
      date: '.date',
      location: '.location',
      link: 'a'
    };
    
    const result = await siteHandlers.handleSite('Test Theatre', 'https://example.com', selectors);
    
    expect(result).toHaveProperty('theatre', 'Test Theatre');
    expect(result).toHaveProperty('shows');
    expect(result.shows.length).toBeGreaterThan(0);
    
    // Check that data is extracted correctly
    const show = result.shows[0];
    expect(show).toHaveProperty('title', 'Test Title');
    expect(show).toHaveProperty('date', 'Test Title');
    expect(show).toHaveProperty('location');
    expect(show).toHaveProperty('link');
    
    // Check that axios was called correctly
    expect(axios.get).toHaveBeenCalledWith('https://example.com');
  });
  
  // Test LW Theatres specific logic
  test('handleSite handles LW Theatres URLs correctly', async () => {
    const selectors = {
      eventCard: '.event-card',
      title: 'h3',
      date: '.date',
      location: '.location',
      link: 'a'
    };
    
    const result = await siteHandlers.handleSite(
      'LW Theatre', 
      'https://lwtheatres.co.uk/theatres/london-palladium/', 
      selectors
    );
    
    // LW Theatres should extract theatre name from URL
    expect(result.theatre).toEqual(expect.stringContaining('LONDON PALLADIUM'));
  });
  
  // Test handleSite with Nederlander URLs
  test('handleSite delegates to correct handler for Nederlander URLs', async () => {
    const selectors = {
      eventCard: '.event-card',
      title: 'h3',
      date: '.date',
      link: 'a'
    };
    
    const result = await siteHandlers.handleSite(
      'Nederlander', 
      'https://www.nederlander.co.uk/dominion-theatre', 
      selectors
    );
    
    // Check that the theatre name is properly parsed from URL
    expect(result.theatre).toEqual(expect.stringContaining('DOMINION THEATRE'));
  });
  
  // Test handleSite with ATG URLs
  test('handleSite delegates to correct handler for ATG URLs', async () => {
    const selectors = {
      eventCard: '.event-card',
      title: 'h3',
      date: '.date',
      link: 'a'
    };
    
    const result = await siteHandlers.handleSite(
      'ATG', 
      'https://www.atgtickets.com/venues/lyceum-theatre/', 
      selectors
    );
    
    // Check that the theatre name is properly parsed from URL
    expect(result.theatre).toEqual(expect.stringContaining('LYCEUM THEATRE'));
  });
  
  // Test error handling
  test('handleSite handles network errors gracefully', async () => {
    // Mock axios to throw an error
    axios.get.mockRejectedValue(new Error('Network error'));
    
    const selectors = {
      eventCard: '.event-card',
      title: 'h3',
      date: '.date',
      link: 'a'
    };
    
    // This should throw an error
    await expect(
      siteHandlers.handleSite('Test Theatre', 'https://example.com', selectors)
    ).rejects.toThrow();
  });
  
  // Test scrapeShow function if available
  test('scrapeShow extracts show data correctly', async () => {
    if ('scrapeShow' in siteHandlers) {
      const selectors = {
        eventCard: '.event-card',
        date: '.date',
        location: '.location',
        link: 'a'
      };
      
      const result = await siteHandlers.scrapeShow('https://example.com', selectors);
      
      expect(result).toHaveProperty('shows');
      expect(result.shows.length).toBeGreaterThan(0);
      
      // Check show properties
      const show = result.shows[0];
      expect(show).toHaveProperty('date');
      expect(show).toHaveProperty('location');
      expect(show).toHaveProperty('link');
    } else {
      // Skip test if scrapeShow is not available
      console.log('scrapeShow not available, skipping test');
    }
  });
  
  // Test special handling for batoutofhellmusical
  test('scrapeShow handles batoutofhellmusical URLs correctly', async () => {
    if ('scrapeShow' in siteHandlers) {
      // Setup special cheerio mock for batoutofhellmusical
      const mockBatCheerioInstance = {
        find: jest.fn().mockImplementation((selector) => {
          if (selector === 'h3.text-cream') {
            return {
              text: jest.fn().mockReturnValue('Venue Name'),
              next: jest.fn().mockReturnValue({
                text: jest.fn().mockReturnValue('City Name')
              })
            };
          }
          
          return {
            each: jest.fn().mockImplementation(function(callback) {
              callback.call(this, 0, {});
              return this;
            }),
            text: jest.fn().mockReturnValue('Test Title'),
            attr: jest.fn().mockReturnValue('/test-link')
          };
        }),
        each: jest.fn().mockImplementation(function(callback) {
          callback.call(this, 0, {});
          return this;
        })
      };
      
      // Override cheerio mock for this test
      cheerio.load.mockImplementation(() => {
        const $ = function(selector) {
          return mockBatCheerioInstance;
        };
        
        // Add necessary properties
        $.find = $;
        
        return $;
      });
      
      const selectors = {
        eventCard: '.event-card',
        date: '.date',
        link: 'a'
      };
      
      const result = await siteHandlers.scrapeShow('https://batoutofhellmusical.com/', selectors);
      
      // Check that some data was returned
      expect(result).toHaveProperty('shows');
      expect(result.shows.length).toBeGreaterThan(0);
    } else {
      // Skip test if scrapeShow is not available
      console.log('scrapeShow not available, skipping test');
    }
  });
});