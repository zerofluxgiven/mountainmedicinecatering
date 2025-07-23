const admin = require('firebase-admin');

// Get storage bucket
const bucket = admin.storage().bucket();

/**
 * Uploads an event image buffer to Firebase Storage
 * @param {Buffer} imageBuffer - The image buffer to upload
 * @param {string} eventId - The ID of the event
 * @param {string} mimeType - The MIME type of the image
 * @returns {Promise<string>} - The public URL of the uploaded image
 */
async function uploadEventImage(imageBuffer, eventId, mimeType = 'image/jpeg') {
  try {
    // Generate filename
    const timestamp = Date.now();
    const extension = mimeType.includes('png') ? 'png' : 'jpg';
    const filename = `events/${eventId}/event_${eventId}_${timestamp}.${extension}`;
    
    // Create file reference
    const file = bucket.file(filename);
    
    // Upload the buffer
    await file.save(imageBuffer, {
      metadata: {
        contentType: mimeType,
        metadata: {
          eventId: eventId,
          uploadedAt: new Date().toISOString()
        }
      },
      public: true,
      validation: false
    });
    
    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
    
    return publicUrl;
  } catch (error) {
    console.error('Error uploading event image:', error);
    throw error;
  }
}

module.exports = {
  uploadEventImage
};