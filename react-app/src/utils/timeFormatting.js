// Utility functions for formatting recipe times

/**
 * Format minutes to a human-readable string
 * @param {number} minutes - The number of minutes
 * @returns {string} - Formatted time string (e.g., "45 minutes", "1 hour 30 minutes")
 */
export function formatTime(minutes) {
  if (!minutes || typeof minutes !== 'number') return null;
  
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
}

/**
 * Format recipe times object for display
 * @param {Object} recipe - Recipe object with time fields
 * @returns {Object} - Object with formatted time strings
 */
export function formatRecipeTimes(recipe) {
  const times = {};
  
  if (recipe.prep_time) {
    times.prep = formatTime(recipe.prep_time);
  }
  
  if (recipe.cook_time) {
    times.cook = formatTime(recipe.cook_time);
  }
  
  if (recipe.total_time) {
    times.total = formatTime(recipe.total_time);
  } else if (recipe.prep_time && recipe.cook_time) {
    // Calculate total if not provided
    times.total = formatTime(recipe.prep_time + recipe.cook_time);
  }
  
  return times;
}

/**
 * Parse a time string to minutes
 * @param {string} timeStr - Time string (e.g., "30 minutes", "1 hour", "1h 30m")
 * @returns {number|null} - Number of minutes or null if invalid
 */
export function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  
  // Handle simple minute patterns
  const minuteMatch = timeStr.match(/^(\d+)\s*(?:min|minute|minutes)$/i);
  if (minuteMatch) {
    return parseInt(minuteMatch[1]);
  }
  
  // Handle simple hour patterns
  const hourMatch = timeStr.match(/^(\d+)\s*(?:hr|hour|hours)$/i);
  if (hourMatch) {
    return parseInt(hourMatch[1]) * 60;
  }
  
  // Handle combined patterns (e.g., "1 hour 30 minutes", "1h 30m")
  const combinedMatch = timeStr.match(/(?:(\d+)\s*(?:hours?|hrs?|h)\b)?(?:\s+and\s+|\s+)?(?:(\d+)\s*(?:minutes?|mins?|m)\b)?/i);
  if (combinedMatch && (combinedMatch[1] || combinedMatch[2])) {
    const hours = combinedMatch[1] ? parseInt(combinedMatch[1]) : 0;
    const minutes = combinedMatch[2] ? parseInt(combinedMatch[2]) : 0;
    if (hours > 0 || minutes > 0) {
      return hours * 60 + minutes;
    }
  }
  
  return null;
}

/**
 * Get a short time display (e.g., "45m", "1h 30m")
 * @param {number} minutes - The number of minutes
 * @returns {string} - Short formatted time string
 */
export function formatTimeShort(minutes) {
  if (!minutes || typeof minutes !== 'number') return null;
  
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format a time string from 24-hour to 12-hour format with AM/PM
 * @param {string} timeString - Time in 24-hour format (e.g., "14:30", "09:00")
 * @returns {string} - Time in 12-hour format with AM/PM (e.g., "2:30 PM", "9:00 AM")
 */
export function formatClockTime(timeString) {
  if (!timeString || typeof timeString !== 'string') return 'No time';
  
  // Handle various time formats
  const timeMatch = timeString.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!timeMatch) return timeString; // Return as-is if not a valid time format
  
  let hours = parseInt(timeMatch[1], 10);
  const minutes = timeMatch[2];
  
  // Determine AM/PM
  const period = hours >= 12 ? 'PM' : 'AM';
  
  // Convert to 12-hour format
  if (hours === 0) {
    hours = 12; // Midnight
  } else if (hours > 12) {
    hours = hours - 12;
  }
  
  return `${hours}:${minutes} ${period}`;
}

/**
 * Format a date and time together
 * @param {Date|string} date - The date object or string
 * @param {string} time - Time in 24-hour format
 * @returns {string} - Formatted date and time string
 */
export function formatDateTime(date, time) {
  if (!date) return 'No date';
  
  const d = date instanceof Date ? date : new Date(date);
  const dateStr = d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  if (!time) return dateStr;
  
  return `${dateStr} at ${formatClockTime(time)}`;
}

/**
 * Parse a 12-hour time string to 24-hour format
 * @param {string} timeString - Time in 12-hour format (e.g., "2:30 PM", "9:00 AM")
 * @returns {string} - Time in 24-hour format (e.g., "14:30", "09:00")
 */
export function parseClockTimeTo24Hour(timeString) {
  if (!timeString || typeof timeString !== 'string') return '';
  
  const match = timeString.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return timeString; // Return as-is if not a valid 12-hour format
  
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3].toUpperCase();
  
  // Convert to 24-hour format
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  
  // Pad hours with leading zero if needed
  const hoursStr = hours.toString().padStart(2, '0');
  
  return `${hoursStr}:${minutes}`;
}