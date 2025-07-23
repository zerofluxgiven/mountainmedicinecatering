import { detectAllergens, suggestTags, analyzeRecipe } from '../services/allergenDetector';

describe('AllergenDetector', () => {
  describe('detectAllergens', () => {
    it('should detect dairy allergens', () => {
      const ingredients = [
        '2 cups milk',
        '1/2 cup butter',
        '1 cup shredded cheddar cheese'
      ];
      const allergens = detectAllergens(ingredients);
      expect(allergens).toContain('Dairy');
    });

    it('should detect gluten allergens', () => {
      const ingredients = [
        '2 cups all-purpose flour',
        '1 loaf bread',
        '1/2 cup breadcrumbs'
      ];
      const allergens = detectAllergens(ingredients);
      expect(allergens).toContain('Gluten');
    });

    it('should detect multiple allergens', () => {
      const ingredients = [
        '2 eggs',
        '1 cup flour',
        '1/2 cup milk',
        '1/4 cup peanut butter'
      ];
      const allergens = detectAllergens(ingredients);
      expect(allergens).toContain('Eggs');
      expect(allergens).toContain('Gluten');
      expect(allergens).toContain('Dairy');
      expect(allergens).toContain('Peanuts');
    });

    it('should not detect allergens for dairy-free alternatives', () => {
      const ingredients = [
        '1 cup almond milk',
        '1/2 cup coconut milk',
        '1 cup dairy-free cheese'
      ];
      const allergens = detectAllergens(ingredients);
      expect(allergens).not.toContain('Dairy');
    });

    it('should handle empty or invalid inputs', () => {
      expect(detectAllergens([])).toEqual([]);
      expect(detectAllergens(null)).toEqual([]);
      expect(detectAllergens(undefined)).toEqual([]);
    });
  });

  describe('suggestTags', () => {
    it('should suggest dessert tag', () => {
      const recipe = {
        name: 'Chocolate Cake',
        ingredients: ['flour', 'sugar', 'chocolate', 'eggs'],
        instructions: 'Mix and bake the cake'
      };
      const tags = suggestTags(recipe);
      expect(tags).toContain('Dessert');
    });

    it('should suggest quick & easy tag for short cook times', () => {
      const recipe = {
        name: 'Quick Salad',
        total_time: 15,
        ingredients: ['lettuce', 'tomatoes', 'dressing']
      };
      const tags = suggestTags(recipe);
      expect(tags).toContain('Quick & Easy');
    });

    it('should suggest vegetarian tag when no meat is present', () => {
      const recipe = {
        name: 'Veggie Stir Fry',
        ingredients: ['broccoli', 'carrots', 'soy sauce', 'rice']
      };
      const tags = suggestTags(recipe);
      expect(tags).toContain('Vegetarian');
    });

    it('should not suggest vegetarian tag when meat is present', () => {
      const recipe = {
        name: 'Beef Stew',
        ingredients: ['beef', 'potatoes', 'carrots']
      };
      const tags = suggestTags(recipe);
      expect(tags).not.toContain('Vegetarian');
      expect(tags).not.toContain('Vegan');
    });

    it('should suggest vegan tag and remove vegetarian', () => {
      const recipe = {
        name: 'Vegan Burger',
        ingredients: ['black beans', 'quinoa', 'vegetables']
      };
      const tags = suggestTags(recipe);
      expect(tags).toContain('Vegan');
      expect(tags).not.toContain('Vegetarian'); // Vegan implies vegetarian
    });
  });

  describe('analyzeRecipe', () => {
    it('should return both allergens and tags', () => {
      const recipe = {
        name: 'Quick Pasta',
        total_time: 20,
        ingredients: [
          '1 pound pasta',
          '2 cups heavy cream',
          '1 cup parmesan cheese',
          '2 cloves garlic'
        ],
        instructions: 'Cook pasta and mix with cream sauce'
      };
      
      const analysis = analyzeRecipe(recipe);
      
      expect(analysis.allergens).toContain('Dairy');
      expect(analysis.allergens).toContain('Gluten');
      expect(analysis.tags).toContain('Quick & Easy');
    });
  });
});