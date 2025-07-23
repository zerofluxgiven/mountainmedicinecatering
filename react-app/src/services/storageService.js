import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';

// Log storage configuration for debugging
console.log('Storage service initialized');
console.log('Storage bucket:', storage?.app?.options?.storageBucket);
console.log('Storage instance:', storage);

// Maximum image dimensions
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const JPEG_QUALITY = 0.85;

/**
 * Resizes an image to fit within max dimensions while maintaining aspect ratio
 * @param {File} file - The image file to resize
 * @returns {Promise<Blob>} - The resized image as a Blob
 */
async function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        // Create canvas and resize
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to resize image'));
            }
          },
          'image/jpeg',
          JPEG_QUALITY
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a recipe image to Firebase Storage
 * @param {File} file - The image file to upload
 * @param {string} recipeId - The ID of the recipe
 * @returns {Promise<string>} - The download URL of the uploaded image
 */
export async function uploadRecipeImage(file, recipeId) {
  try {
    console.log('uploadRecipeImage called with:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      recipeId: recipeId
    });
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }
    
    // Resize image if needed
    console.log('Resizing image...');
    const imageBlob = await resizeImage(file);
    console.log('Image resized, blob size:', imageBlob.size);
    
    // Create storage reference
    const timestamp = Date.now();
    const filename = `recipe_${recipeId}_${timestamp}.jpg`;
    const storagePath = `recipes/${recipeId}/${filename}`;
    console.log('Storage path:', storagePath);
    
    const storageRef = ref(storage, storagePath);
    
    // Upload the resized image
    console.log('Starting upload to Firebase Storage...');
    const snapshot = await uploadBytes(storageRef, imageBlob, {
      contentType: 'image/jpeg',
      customMetadata: {
        recipeId: recipeId,
        uploadedAt: new Date().toISOString()
      }
    });
    console.log('Upload complete, snapshot:', snapshot);
    
    // Get download URL
    console.log('Getting download URL...');
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('Download URL obtained:', downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error('Error in uploadRecipeImage:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error object:', error);
    throw error;
  }
}

/**
 * Deletes a recipe image from Firebase Storage
 * @param {string} imageUrl - The URL of the image to delete
 */
export async function deleteRecipeImage(imageUrl) {
  try {
    // Extract the path from the URL
    const storageRef = ref(storage, imageUrl);
    await deleteObject(storageRef);
  } catch (error) {
    // If the image doesn't exist, that's okay
    if (error.code !== 'storage/object-not-found') {
      console.error('Error deleting recipe image:', error);
      throw error;
    }
  }
}

/**
 * Downloads an image from a URL and uploads it to Firebase Storage
 * @param {string} imageUrl - The URL of the image to download
 * @param {string} recipeId - The ID of the recipe
 * @returns {Promise<string>} - The Firebase Storage URL of the uploaded image
 */
export async function downloadAndUploadImage(imageUrl, recipeId) {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    // Convert to blob
    const blob = await response.blob();
    
    // Create a File object from the blob
    const filename = imageUrl.split('/').pop().split('?')[0] || 'image.jpg';
    const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
    
    // Upload to Firebase Storage
    return await uploadRecipeImage(file, recipeId);
  } catch (error) {
    console.error('Error downloading and uploading image:', error);
    throw error;
  }
}

/**
 * Uploads an event image to Firebase Storage
 * @param {File|Buffer} file - The image file or buffer to upload
 * @param {string} eventId - The ID of the event
 * @param {boolean} isBuffer - Whether the file is a buffer (for server-side uploads)
 * @returns {Promise<string>} - The download URL of the uploaded image
 */
export async function uploadEventImage(file, eventId, isBuffer = false) {
  try {
    let imageBlob;
    
    if (isBuffer) {
      // Server-side upload from buffer
      imageBlob = new Blob([file], { type: 'image/jpeg' });
    } else {
      // Client-side upload from File
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }
      // Resize image if needed
      imageBlob = await resizeImage(file);
    }
    
    // Create storage reference
    const timestamp = Date.now();
    const filename = `event_${eventId}_${timestamp}.jpg`;
    const storageRef = ref(storage, `events/${eventId}/${filename}`);
    
    // Upload the image
    const snapshot = await uploadBytes(storageRef, imageBlob, {
      contentType: 'image/jpeg',
      customMetadata: {
        eventId: eventId,
        uploadedAt: new Date().toISOString()
      }
    });
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading event image:', error);
    throw error;
  }
}

/**
 * Deletes an event image from Firebase Storage
 * @param {string} imageUrl - The URL of the image to delete
 */
export async function deleteEventImage(imageUrl) {
  try {
    // Extract the path from the URL
    const storageRef = ref(storage, imageUrl);
    await deleteObject(storageRef);
  } catch (error) {
    // If the image doesn't exist, that's okay
    if (error.code !== 'storage/object-not-found') {
      console.error('Error deleting event image:', error);
      throw error;
    }
  }
}