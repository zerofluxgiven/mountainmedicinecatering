// Event parsing service using AI
// Parses event details from uploaded flyers/invitations

import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '../config/firebase';


export async function parseEventFromFile(file) {
  try {
    // Check if user is authenticated
    if (!auth.currentUser) {
      console.error('User not authenticated for AI parsing');
      throw new Error('Authentication required for AI parsing');
    }
    
    console.log('File size:', file.size, 'bytes');
    
    // Check file size (Firebase Functions have a 10MB limit for callable functions)
    if (file.size > 9 * 1024 * 1024) { // 9MB to be safe
      throw new Error('File too large. Please use a file smaller than 9MB.');
    }
    
    const fileData = await fileToBase64(file);
    
    try {
      // Try the callable function first
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
    } catch (callableError) {
      // If callable function fails with CORS or not found, try HTTP endpoint
      if (callableError.code === 'internal' || 
          callableError.message?.includes('403') ||
          callableError.message?.includes('CORS') ||
          callableError.message?.includes('Preflight')) {
        console.warn('Callable function failed, trying HTTP endpoint:', callableError);
        
        // Get auth token
        const idToken = await auth.currentUser.getIdToken();
        
        // Try HTTP endpoint with explicit CORS
        const response = await fetch(`https://us-central1-${functions.app.options.projectId}.cloudfunctions.net/parseEventFlyerHTTP`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            fileData: fileData,
            mimeType: file.type
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP endpoint failed: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        if (result.success) {
          // Handle event_images from the response
          const event = result.event;
          if (result.tempEventId && event.event_images && event.event_images.length > 0) {
            // The images are already uploaded by the backend
            console.log('Event images received:', event.event_images);
          }
          return event;
        } else {
          throw new Error(result.error || 'Failed to parse event flyer');
        }
      } else {
        // Re-throw if it's not a CORS/connection issue
        throw callableError;
      }
    }
  } catch (error) {
    console.error('Error parsing event file:', error);
    
    // Categorize the error for better handling
    let errorCategory = 'unknown';
    let userMessage = 'Unable to parse event details from this file. Please try a different file or enter details manually.';
    
    if (error.code === 'functions/not-found' || error.message?.includes('404')) {
      errorCategory = 'deployment';
      userMessage = 'The AI parsing service is being deployed. Please try again in a few minutes, or use a text file which can be parsed locally.';
    } else if (error.code === 'unauthenticated' || error.message?.includes('401')) {
      errorCategory = 'auth';
      userMessage = 'Authentication required. Please make sure you are logged in and try again.';
    } else if (error.message?.includes('CORS') || error.message?.includes('403')) {
      errorCategory = 'cors';
      userMessage = 'Service configuration issue. Our team has been notified. In the meantime, text files can still be parsed locally.';
    } else if (error.code === 'internal' || error.message?.includes('500')) {
      errorCategory = 'server';
      userMessage = 'Server error occurred. Please try again later or use a text file.';
    } else if (error.message?.includes('File too large')) {
      errorCategory = 'size';
      userMessage = error.message;
    }
    
    console.warn(`AI parsing failed (${errorCategory}):`, error.message);
    
    // For all file types, AI parsing is required
    if (errorCategory === 'deployment' || errorCategory === 'cors' || errorCategory === 'server') {
      throw new Error(userMessage + ' AI parsing service is required for all file types.');
    }
    
    throw new Error(userMessage);
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

