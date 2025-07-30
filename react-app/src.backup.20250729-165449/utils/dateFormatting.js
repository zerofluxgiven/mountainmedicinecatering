// Utility functions for formatting dates consistently across the app

/**
 * Safely format a date from various sources (Firestore timestamp, Date object, string)
 * @param {any} date - The date to format (can be Firestore timestamp, Date, string, or null)
 * @param {Object} options - Formatting options for toLocaleDateString
 * @returns {string} - Formatted date string or fallback text
 */
export function formatDate(date, options = {}) {
  if (!date) return 'No date';
  
  let dateObj;
  
  try {
    // Handle Firestore timestamp
    if (date && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    }
    // Handle Date object
    else if (date instanceof Date) {
      dateObj = date;
    }
    // Handle string or other formats
    else {
      dateObj = new Date(date);
    }
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date:', date);
      return 'Invalid date';
    }
    
    // Default formatting options
    const defaultOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    return dateObj.toLocaleDateString('en-US', { ...defaultOptions, ...options });
  } catch (error) {
    console.error('Error formatting date:', error, date);
    return 'Invalid date';
  }
}

/**
 * Format a date range (e.g., "Aug 15 - Aug 18, 2024")
 * @param {any} startDate - Start date
 * @param {any} endDate - End date
 * @returns {string} - Formatted date range
 */
export function formatDateRange(startDate, endDate) {
  if (!startDate || !endDate) return 'No dates';
  
  try {
    // Convert to Date objects
    const start = startDate?.toDate?.() || new Date(startDate);
    const end = endDate?.toDate?.() || new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 'Invalid dates';
    }
    
    // Check if same day
    if (start.toDateString() === end.toDateString()) {
      return formatDate(start, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    }
    
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    const startMonth = start.getMonth();
    const endMonth = end.getMonth();
    
    // If same month and year, show compact format
    if (startYear === endYear && startMonth === endMonth) {
      const monthName = start.toLocaleDateString('en-US', { month: 'short' });
      return `${monthName} ${start.getDate()}-${end.getDate()}, ${endYear}`;
    }
    
    // If same year but different months
    if (startYear === endYear) {
      const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${startStr} - ${endStr}, ${endYear}`;
    }
    
    // Different years
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  } catch (error) {
    console.error('Error formatting date range:', error);
    return 'Invalid date range';
  }
}

/**
 * Get a short date format (e.g., "Aug 15")
 * @param {any} date - The date to format
 * @returns {string} - Short formatted date
 */
export function formatDateShort(date) {
  return formatDate(date, { month: 'short', day: 'numeric' });
}

/**
 * Get date with year (e.g., "August 15, 2024")
 * @param {any} date - The date to format
 * @returns {string} - Date with year
 */
export function formatDateWithYear(date) {
  return formatDate(date, { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Convert date to ISO string for input fields
 * @param {any} date - The date to convert
 * @returns {string} - ISO date string (YYYY-MM-DD) or empty string
 */
export function toISODateString(date) {
  if (!date) return '';
  
  try {
    let dateObj;
    
    if (date && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      dateObj = new Date(date);
    }
    
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    return dateObj.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error converting to ISO string:', error);
    return '';
  }
}

/**
 * Get the number of days between two dates
 * @param {any} startDate - Start date
 * @param {any} endDate - End date
 * @returns {number} - Number of days (inclusive)
 */
export function getDaysBetween(startDate, endDate) {
  try {
    const start = startDate?.toDate?.() || new Date(startDate);
    const end = endDate?.toDate?.() || new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 0;
    }
    
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Inclusive
  } catch (error) {
    console.error('Error calculating days between:', error);
    return 0;
  }
}

/**
 * Generate date range array between two dates
 * @param {any} startDate - Start date
 * @param {any} endDate - End date
 * @returns {string[]} - Array of ISO date strings
 */
export function getDateRange(startDate, endDate) {
  try {
    const start = startDate?.toDate?.() || new Date(startDate);
    const end = endDate?.toDate?.() || new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return [];
    }
    
    const dates = [];
    const current = new Date(start);
    
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  } catch (error) {
    console.error('Error generating date range:', error);
    return [];
  }
}