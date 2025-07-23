# Image Extraction Fix for peachie.recipes

## Issue
Images were not being extracted from peachie.recipes URLs even though the parser was correctly finding them.

## Root Cause
The `validateRecipeData` function in `/functions/recipes/parser.js` was stripping out the `image_url` field because it wasn't included in the return object. This function is called at the end of the parsing process to clean and validate the recipe data.

## What Was Happening
1. The `extractImageFromHtml` function correctly found the image URL from the Open Graph meta tag
2. The image URL was added to the parsed recipe object
3. But then `validateRecipeData` stripped it out because it wasn't in the list of fields to return

## Fix Applied
Added `image_url: data.image_url || null` to the return object in `validateRecipeData` function (line 427).

## Test Results
For the URL `https://peachie.recipes/recipes/135712?category=38798`:
- Found Open Graph image: `https://res.cloudinary.com/recipes-peachie/image/upload/c_scale,w_1400,q_auto,f_auto/app/recipes/user/kwdaefkgmuafmxitice0.jpg`
- The existing selector `[property="og:image"]` was working correctly
- No additional selectors needed for this site

## Verification
The image URL should now be preserved through the entire parsing pipeline:
1. URL parsing → finds image via Open Graph meta tag
2. Structured data parsing → includes image_url field
3. validateRecipeData → now preserves the image_url field

## Additional Notes
- The parser already has good coverage for image extraction with multiple fallback selectors
- Open Graph meta tags are a reliable source for recipe images on modern recipe sites
- The fix ensures that any image URL found during parsing will be preserved in the final recipe object