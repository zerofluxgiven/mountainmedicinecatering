// Local event parser that works without Firebase Functions
// This provides full functionality for event parsing locally

import { parseEventFromText } from './eventParser';

// Enhanced local parser that can handle more complex formats
export async function parseEventLocally(file) {
  try {
    const text = await readFileAsText(file);
    if (!text) {
      throw new Error('Could not read file contents');
    }
    
    // Use the existing mock parser which has good pattern matching
    const result = await parseEventFromText(text);
    
    // Enhance the result with additional parsing if needed
    if (result) {
      // Clean up any fields
      if (result.guest_count && typeof result.guest_count === 'string') {
        result.guest_count = parseInt(result.guest_count.replace(/\D/g, ''), 10) || 0;
      }
      
      // Ensure dates are properly formatted
      if (result.start_date && !result.start_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        result.start_date = formatDateString(result.start_date);
      }
      
      if (result.end_date && !result.end_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        result.end_date = formatDateString(result.end_date);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error in local parser:', error);
    throw error;
  }
}

// Helper to read file as text
async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// Helper to format date strings
function formatDateString(dateStr) {
  if (!dateStr) return null;
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    return null;
  }
}