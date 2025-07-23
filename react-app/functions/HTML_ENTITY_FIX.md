# HTML Entity Decoding Fix

## Problem
When parsing recipes from URLs, HTML entities in the scraped content were not being decoded, resulting in ingredients and instructions displaying HTML entities like:
- `&frac12;` instead of `½`
- `&#8217;` instead of `'`
- `&frac34;` instead of `¾`
- `&amp;` instead of `&`

## Solution
Added HTML entity decoding to the recipe parser using the `he` package.

### Changes Made:

1. **Added `he` package dependency** (`functions/package.json`):
   - Added `"he": "^1.2.0"` to dependencies

2. **Updated recipe parser** (`functions/recipes/parser.js`):
   - Imported `he` package
   - Added HTML entity decoding in `extractRecipeText()` function
   - Added HTML entity decoding in `convertStructuredData()` function for:
     - Recipe name
     - Ingredients array
     - Instructions array
     - Description/notes

### How It Works:
- When scraping content from web pages, the parser now decodes all HTML entities
- This applies to both unstructured text extraction and structured data (JSON-LD)
- The decoded content is then passed to the AI parser or returned to the frontend

### Testing:
The fix properly decodes common HTML entities found in recipes:
- Fractions: `&frac12;` → `½`, `&frac34;` → `¾`, `&frac14;` → `¼`
- Quotes: `&#8217;` → `'`, `&quot;` → `"`
- Special characters: `&deg;` → `°`, `&amp;` → `&`, `&ndash;` → `–`

### Deployment:
Run `npm install` in the functions directory to install the new dependency before deploying.