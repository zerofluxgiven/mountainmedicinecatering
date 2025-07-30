import { parseRecipeFromFile } from '../services/recipeParser';

describe('Recipe Parser', () => {
  describe('parseRecipeFromFile', () => {
    it('should handle image files when Firebase is unavailable', async () => {
      // Mock an image file
      const imageFile = new File(['fake image data'], 'recipe.jpg', { type: 'image/jpeg' });
      
      // Mock Firebase function to fail
      const mockHttpsCallable = jest.fn().mockRejectedValue(new Error('Firebase unavailable'));
      jest.mock('firebase/functions', () => ({
        httpsCallable: mockHttpsCallable
      }));
      
      const result = await parseRecipeFromFile(imageFile);
      
      // Should return a basic template instead of throwing
      expect(result).toBeDefined();
      expect(result.name).toBe('recipe');
      expect(result.ingredients).toEqual([]);
      expect(result.notes).toContain('Recipe imported from image');
    });
    
    it('should handle PDF files when Firebase is unavailable', async () => {
      // Mock a PDF file
      const pdfFile = new File(['fake pdf data'], 'recipe.pdf', { type: 'application/pdf' });
      
      const result = await parseRecipeFromFile(pdfFile);
      
      // Should return a basic template instead of throwing
      expect(result).toBeDefined();
      expect(result.name).toBe('recipe');
      expect(result.ingredients).toEqual([]);
      expect(result.notes).toContain('Recipe imported from PDF');
    });
    
    it('should use mock parser for text files', async () => {
      // Mock a text file with recipe content
      const recipeText = `
Chocolate Cake
Serves: 8

Ingredients:
- 2 cups flour
- 1 cup sugar
- 3 eggs

Instructions:
1. Mix ingredients
2. Bake at 350F for 30 minutes
      `;
      const textFile = new File([recipeText], 'recipe.txt', { type: 'text/plain' });
      
      const result = await parseRecipeFromFile(textFile);
      
      expect(result.name).toBe('Chocolate Cake');
      expect(result.serves).toBe(8);
      expect(result.ingredients).toContain('2 cups flour');
      expect(result.ingredients).toContain('1 cup sugar');
      expect(result.ingredients).toContain('3 eggs');
    });
  });
});