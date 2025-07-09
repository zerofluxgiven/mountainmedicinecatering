// Event parsing service using AI
// Parses event details from uploaded flyers/invitations

import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '../config/firebase';

const MOCK_DELAY = 1500; // Simulate API delay

// Parser for text-based files
// In production, this would call the actual AI parsing API
async function mockParseEvent(text) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
  
  if (!text || text.trim().length === 0) {
    return {};
  }
  
  const result = {};
  
  // Clean up the text
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleanText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Extract event name (usually the first prominent line or title)
  // Look for lines that don't contain common keywords and are relatively short
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    if (line.length < 100 && 
        !line.match(/^(date|time|when|where|location|venue|rsvp|email|phone|website)/i) &&
        !line.match(/^\d/) &&
        line.length > 5) {
      result.name = line;
      break;
    }
  }
  
  // Extract date patterns - improved regex
  const datePatterns = [
    // MM/DD/YYYY or MM-DD-YYYY or MM.DD.YYYY
    /(\d{1,2})[\\/\\-\\.](\d{1,2})[\\/\\-\\.](\d{2,4})/,
    // Month DD, YYYY
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i,
    // DD Month YYYY
    /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December),?\s+(\d{4})/i,
    // Weekday, Month DD, YYYY
    /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const date = new Date(match[0]);
        if (!isNaN(date.getTime())) {
          result.event_date = date.toISOString().split('T')[0];
          break;
        }
      } catch (e) {
        // Continue to next pattern
      }
    }
  }
  
  // Extract time - improved regex
  const timePatterns = [
    /(\d{1,2}):(\d{2})\s*(AM|PM|am|pm|a\.m\.|p\.m\.)/,
    /(\d{1,2})\s*(AM|PM|am|pm|a\.m\.|p\.m\.)/,
    /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/
  ];
  
  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      result.start_time = match[0].split('-')[0].trim();
      break;
    }
  }
  
  // Extract venue/location - look for various keywords
  const venuePatterns = [
    /(?:venue|location|where|at|held at|taking place at)[\s:]+(.+?)(?:\n|$)/i,
    /(?:^|\n)at\s+(.+?)(?:\n|$)/i
  ];
  
  for (const pattern of venuePatterns) {
    const match = text.match(pattern);
    if (match && match[1].length < 100) {
      result.venue = match[1].trim();
      break;
    }
  }
  
  // Extract address - improved pattern
  const addressPatterns = [
    /(\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Way|Circle|Cir)\.?(?:,?\s*(?:Suite|Ste|Unit|Apt)\.?\s*[\w\d]+)?[\w\s,]*\d{5}(?:-\d{4})?)/i,
    /(\d+\s+[\w\s]+,\s*[\w\s]+,\s*[A-Z]{2}\s+\d{5})/i
  ];
  
  for (const pattern of addressPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.venue_address = match[0].trim();
      break;
    }
  }
  
  // Extract guest count
  const guestPatterns = [
    /(\d+)\s*(?:guests?|people|attendees|seats|capacity)/i,
    /(?:guests?|people|attendees|seats|capacity)[\s:]+(\d+)/i
  ];
  
  for (const pattern of guestPatterns) {
    const match = text.match(pattern);
    if (match) {
      const count = parseInt(match[1]);
      if (!isNaN(count) && count > 0 && count < 10000) {
        result.guest_count = count;
        break;
      }
    }
  }
  
  // Extract website - improved pattern
  const websitePatterns = [
    /(?:website|web|online|visit us at|more info)[\s:]+(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?:\/[^\s]*)?)/i,
    /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/
  ];
  
  for (const pattern of websitePatterns) {
    const match = text.match(pattern);
    if (match) {
      let url = match[0];
      if (url.match(/^(website|web|online|visit)/i)) {
        url = url.replace(/^[^:]+:\s*/, '');
      }
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      result.website = url;
      break;
    }
  }
  
  // Extract description - look for longer text blocks
  const descLines = lines.filter(line => 
    line.length > 30 && 
    !line.match(/^(date|time|when|where|location|venue|rsvp|email|phone|website):/i) &&
    !line.match(/^\d+\s+\w+\s+(Street|St|Avenue|Ave|Road|Rd)/)
  );
  
  if (descLines.length > 0) {
    result.description = descLines.slice(0, 3).join(' ').substring(0, 500);
  }
  
  return result;
}

export async function parseEventFromFile(file) {
  try {
    // For text files, try client-side parsing first (faster)
    if (file.type.includes('text')) {
      const text = await readFileAsText(file);
      if (text) {
        return mockParseEvent(text);
      }
    }
    
    // Check if user is authenticated
    if (!auth.currentUser) {
      console.error('User not authenticated for AI parsing');
      throw new Error('Authentication required for AI parsing');
    }
    
    // For images, PDFs, and complex files, use Firebase Function with AI
    console.log('File size:', file.size, 'bytes');
    
    // Check file size (Firebase Functions have a 10MB limit for callable functions)
    if (file.size > 9 * 1024 * 1024) { // 9MB to be safe
      throw new Error('File too large. Please use a file smaller than 9MB.');
    }
    
    const fileData = await fileToBase64(file);
    const parseEventFlyer = httpsCallable(functions, 'parseEventFlyer');
    
    console.log('Calling parseEventFlyer function with auth user:', auth.currentUser.uid);
    console.log('File type:', file.type);
    
    const result = await parseEventFlyer({
      fileData: fileData,
      mimeType: file.type
    });
    
    if (result.data.success) {
      return result.data.event;
    } else {
      throw new Error('Failed to parse event flyer');
    }
  } catch (error) {
    console.error('Error parsing event file:', error);
    
    // Check if it's a function not found error, internal error, or auth error
    if (error.code === 'functions/not-found' || 
        error.message?.includes('404') || 
        error.code === 'internal' ||
        error.code === 'unauthenticated' ||
        error.message?.includes('403')) {
      console.warn('AI parsing function not available or authentication issue. Using fallback parser.', error.code);
      
      // Always try fallback parser when functions aren't available
      const text = await readFileAsText(file);
      if (text) {
        return mockParseEvent(text);
      }
    }
    
    // Fallback to mock parser for text files
    if (file.type.includes('text')) {
      const text = await readFileAsText(file);
      if (text) {
        return mockParseEvent(text);
      }
    }
    
    // Provide helpful error message
    if (error.code === 'functions/not-found' || 
        error.message?.includes('404') || 
        error.code === 'internal' ||
        error.code === 'unauthenticated' ||
        error.message?.includes('403')) {
      throw new Error('AI parsing is temporarily unavailable. Text files can still be parsed locally. For images and PDFs, please enter details manually or try again later.');
    }
    
    throw new Error('Unable to parse event details from this file. Please try a different file or enter details manually.');
  }
}

// Parse event from URL (for online flyers)
export async function parseEventFromURL(url) {
  try {
    const parseEventFlyer = httpsCallable(functions, 'parseEventFlyer');
    
    const result = await parseEventFlyer({
      url: url
    });
    
    if (result.data.success) {
      return result.data.event;
    } else {
      throw new Error('Failed to parse event flyer from URL');
    }
  } catch (error) {
    console.error('Error parsing event from URL:', error);
    throw new Error('Unable to parse event details from this URL. Please check the URL and try again.');
  }
}

// Convert file to base64 for Firebase Function
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Remove the data URL prefix to get just the base64 string
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Helper function to read file as text
async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      resolve(e.target.result);
    };
    
    reader.onerror = (e) => {
      reject(new Error('Failed to read file'));
    };
    
    // Handle different file types
    if (file.type.includes('image')) {
      // For images, we can't extract text without OCR
      // In production, this would use Google Vision API or similar
      // For now, return empty string and let the user know
      console.warn('Image files require OCR service for text extraction. Please use a text-based file or fill in details manually.');
      resolve('');
    } else if (file.type === 'application/pdf') {
      // PDFs also need special handling
      // In production, would use pdf.js or server-side parsing
      console.warn('PDF files require special parsing. Please use a text file or fill in details manually.');
      resolve('');
    } else {
      // For text files, we can read directly
      reader.readAsText(file);
    }
  });
}