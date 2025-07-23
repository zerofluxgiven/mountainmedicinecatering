const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sharp = require('sharp');
const path = require('path');
const os = require('os');
const fs = require('fs').promises;

// Thumbnail sizes
const THUMBNAIL_SIZES = {
  small: { width: 150, height: 150 },  // For recipe cards
  medium: { width: 400, height: 300 }, // For list views
  large: { width: 800, height: 600 }   // For detail views
};

/**
 * Generates thumbnails when a recipe image is uploaded
 */
exports.generateRecipeThumbnails = functions.storage.object().onFinalize(async (object) => {
  try {
    const filePath = object.name;
    const contentType = object.contentType;
    
    // Only process images in the recipes folder
    if (!contentType?.startsWith('image/') || !filePath?.startsWith('recipes/')) {
      console.log('Not a recipe image, skipping thumbnail generation');
      return null;
    }
    
    // Skip if this is already a thumbnail
    if (filePath.includes('_thumb_')) {
      console.log('Already a thumbnail, skipping');
      return null;
    }
    
    const bucket = admin.storage().bucket(object.bucket);
    const fileName = path.basename(filePath);
    const tempFilePath = path.join(os.tmpdir(), fileName);
    
    // Download original image
    await bucket.file(filePath).download({ destination: tempFilePath });
    console.log('Downloaded image to temp:', tempFilePath);
    
    // Generate thumbnails for each size
    const uploadPromises = [];
    
    for (const [sizeName, dimensions] of Object.entries(THUMBNAIL_SIZES)) {
      const thumbFileName = `${path.basename(fileName, path.extname(fileName))}_thumb_${sizeName}${path.extname(fileName)}`;
      const thumbFilePath = path.join(path.dirname(filePath), 'thumbnails', thumbFileName);
      const tempThumbPath = path.join(os.tmpdir(), thumbFileName);
      
      // Generate thumbnail
      await sharp(tempFilePath)
        .resize(dimensions.width, dimensions.height, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 85, progressive: true })
        .toFile(tempThumbPath);
      
      console.log(`Generated ${sizeName} thumbnail:`, tempThumbPath);
      
      // Upload thumbnail
      const uploadPromise = bucket.upload(tempThumbPath, {
        destination: thumbFilePath,
        metadata: {
          contentType: 'image/jpeg',
          metadata: {
            originalImage: filePath,
            thumbnailSize: sizeName,
            width: dimensions.width.toString(),
            height: dimensions.height.toString()
          }
        }
      });
      
      uploadPromises.push(uploadPromise);
    }
    
    // Wait for all uploads to complete
    await Promise.all(uploadPromises);
    console.log('All thumbnails uploaded successfully');
    
    // Update recipe document with thumbnail URLs
    await updateRecipeWithThumbnails(filePath);
    
    // Clean up temp files
    await fs.unlink(tempFilePath);
    for (const sizeName of Object.keys(THUMBNAIL_SIZES)) {
      const thumbFileName = `${path.basename(fileName, path.extname(fileName))}_thumb_${sizeName}${path.extname(fileName)}`;
      const tempThumbPath = path.join(os.tmpdir(), thumbFileName);
      try {
        await fs.unlink(tempThumbPath);
      } catch (error) {
        // Ignore if file doesn't exist
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error generating thumbnails:', error);
    return null;
  }
});

/**
 * Updates the recipe document with thumbnail URLs
 */
async function updateRecipeWithThumbnails(imagePath) {
  try {
    // Extract recipe ID from the file path
    // Expected format: recipes/{recipeId}/image.jpg
    const pathParts = imagePath.split('/');
    if (pathParts.length < 2) return;
    
    const recipeId = pathParts[1];
    const bucket = admin.storage().bucket();
    
    // Get thumbnail URLs
    const thumbnails = {};
    for (const sizeName of Object.keys(THUMBNAIL_SIZES)) {
      const thumbFileName = `${path.basename(imagePath, path.extname(imagePath))}_thumb_${sizeName}${path.extname(imagePath)}`;
      const thumbPath = path.join(path.dirname(imagePath), 'thumbnails', thumbFileName);
      
      // Get download URL
      const [url] = await bucket.file(thumbPath).getSignedUrl({
        action: 'read',
        expires: '01-01-2500' // Far future expiration
      });
      
      thumbnails[sizeName] = url;
    }
    
    // Update recipe document
    const recipeRef = admin.firestore().collection('recipes').doc(recipeId);
    await recipeRef.update({
      thumbnails: thumbnails,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Updated recipe ${recipeId} with thumbnail URLs`);
  } catch (error) {
    console.error('Error updating recipe with thumbnails:', error);
  }
}

/**
 * Manually generate thumbnails for existing recipe images
 * Can be called via HTTP endpoint for batch processing
 */
exports.generateThumbnailsForExistingImages = functions.https.onCall(async (data, context) => {
  // Require authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  try {
    const bucket = admin.storage().bucket();
    const [files] = await bucket.getFiles({ prefix: 'recipes/' });
    
    const imageFiles = files.filter(file => {
      const name = file.name;
      return (
        !name.includes('_thumb_') &&
        !name.includes('/thumbnails/') &&
        (name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png'))
      );
    });
    
    console.log(`Found ${imageFiles.length} images to process`);
    
    // Process images in batches to avoid memory issues
    const batchSize = 5;
    for (let i = 0; i < imageFiles.length; i += batchSize) {
      const batch = imageFiles.slice(i, i + batchSize);
      await Promise.all(batch.map(file => 
        exports.generateRecipeThumbnails({
          name: file.name,
          contentType: file.metadata.contentType,
          bucket: bucket.name
        })
      ));
    }
    
    return { 
      success: true, 
      processed: imageFiles.length,
      message: `Generated thumbnails for ${imageFiles.length} images`
    };
  } catch (error) {
    console.error('Error in batch thumbnail generation:', error);
    throw new functions.https.HttpsError('internal', 'Failed to generate thumbnails');
  }
});