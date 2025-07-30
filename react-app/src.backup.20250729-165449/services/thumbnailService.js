/**
 * Service for handling recipe image thumbnails
 */

/**
 * Get the appropriate thumbnail URL for a recipe based on context
 * @param {Object} recipe - Recipe object with image and thumbnails
 * @param {string} size - Thumbnail size: 'small', 'medium', 'large', or 'original'
 * @returns {string|null} - Thumbnail URL or original image URL
 */
export function getRecipeImageUrl(recipe, size = 'medium') {
  if (!recipe) return null;
  
  // If thumbnails exist, use them
  if (recipe.thumbnails && recipe.thumbnails[size]) {
    return recipe.thumbnails[size];
  }
  
  // Fall back to original image
  return recipe.image_url || recipe.imageUrl || null;
}

/**
 * Get thumbnail URLs for different contexts
 */
export const ThumbnailSize = {
  CARD: 'small',      // 150x150 - Recipe cards in grid
  LIST: 'medium',     // 400x300 - List views
  DETAIL: 'large',    // 800x600 - Detail views (not full size)
  ORIGINAL: 'original' // Full size image
};

/**
 * Check if a recipe has thumbnails generated
 * @param {Object} recipe - Recipe object
 * @returns {boolean} - Whether thumbnails exist
 */
export function hasThumbnails(recipe) {
  return recipe?.thumbnails && Object.keys(recipe.thumbnails).length > 0;
}

/**
 * Get a placeholder image URL for recipes without images
 * @returns {string} - Placeholder image URL
 */
export function getPlaceholderImage() {
  // Using a food-related placeholder from a reliable service
  return 'https://via.placeholder.com/400x300/f3f4f6/666666?text=No+Image';
}

/**
 * Process recipe image URL with fallbacks
 * @param {Object} recipe - Recipe object
 * @param {string} size - Desired thumbnail size
 * @returns {string} - Image URL with fallbacks
 */
export function getRecipeImage(recipe, size = ThumbnailSize.LIST) {
  const imageUrl = getRecipeImageUrl(recipe, size);
  return imageUrl || getPlaceholderImage();
}