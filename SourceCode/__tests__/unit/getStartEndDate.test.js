// Directly import the module (no mocks needed for this test)
const getStartEndDate = require('../../src/getStartEndDate');

describe('Date Processing Function Tests', () => {
  // No need for beforeEach setup as this is a pure function with no dependencies

  test('handles DD/MM/YYYY - DD/MM/YYYY format', () => {
    const result = getStartEndDate('02/05/2025 - 10/05/2025');
    expect(result).toEqual({
      startDate: '2 May 2025',
      endDate: '10 May 2025'
    });
  });
  
  test('handles "D Month - D Month" format', () => {
    const result = getStartEndDate('6 February - 20 April');
    expect(result).toEqual({
      startDate: '6 February',
      endDate: '20 April'
    });
  });
  
  test('handles "D Month YYYY - D Month YYYY" format', () => {
    const result = getStartEndDate('6 February 2025 - 20 April 2025');
    expect(result).toEqual({
      startDate: '6 February 2025',
      endDate: '20 April 2025'
    });
  });
  
  test('handles "Until Day DD Mon YYYY" format', () => {
    const result = getStartEndDate('Until Sun 26 Oct 2025');
    expect(result).toEqual({
      startDate: '',
      endDate: '26 Oct 2025'
    });
  });
  
  test('handles "Day D Mon YYYY - Day D Mon YYYY" format', () => {
    const result = getStartEndDate('Sat 1 Feb 2025 - Sat 30 May 2026');
    expect(result).toEqual({
      startDate: '1 Feb 2025',
      endDate: '30 May 2026'
    });
  });
  
  test('handles "Day DD Month YYYY - Day D Month YYYY" format', () => {
    const result = getStartEndDate('Mon 10 February 2025 - Sat 5 April 2025');
    expect(result).toEqual({
      startDate: '10 February 2025',
      endDate: '5 April 2025'
    });
  });
  
  test('handles single date format', () => {
    const result = getStartEndDate('Sun 9 February 2025');
    expect(result).toEqual({
      startDate: '9 February 2025',
      endDate: ''
    });
  });
  
  test('handles "Tickets from" format', () => {
    const result = getStartEndDate('Tickets from £25');
    expect(result).toEqual({
      startDate: '',
      endDate: ''
    });
  });
  
  test('handles empty input', () => {
    const result = getStartEndDate('');
    expect(result).toEqual({
      startDate: '',
      endDate: ''
    });
  });
  
  test('handles null input', () => {
    const result = getStartEndDate(null);
    expect(result).toEqual({
      startDate: '',
      endDate: ''
    });
  });
  
  test('handles undefined input', () => {
    const result = getStartEndDate(undefined);
    expect(result).toEqual({
      startDate: '',
      endDate: ''
    });
  });
  
  test('handles unusual single date formats', () => {
    const result = getStartEndDate('Opening Night: 15 March 2025');
    expect(result).toEqual({
      startDate: '15 March 2025',
      endDate: ''
    });
  });
  
  // Add more edge cases for the format function's behavior
  test('handles dates with different day formats', () => {
    const result = getStartEndDate('01/06/2025 - 10/06/2025');
    expect(result).toEqual({
      startDate: '1 June 2025',
      endDate: '10 June 2025'
    });
  });
});