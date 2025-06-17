# Catering Management App
<!-- Trigger Firebase deploy -->



Instructions and structure overview.

## Offline Parsing
The app normally uses OpenAI to extract recipes, menus and other data. If the
API cannot be reached, a fallback parser uses simple regex heuristics. This
offline mode supports basic extraction of ingredients, instructions, menus and
common allergens.
