import { generateAIName, getSessionAIName, regenerateAIName } from '../services/aiNameGenerator';

// Mock localStorage
const localStorageMock = {
  store: {},
  getItem: jest.fn((key) => localStorageMock.store[key] || null),
  setItem: jest.fn((key, value) => {
    localStorageMock.store[key] = value.toString();
  }),
  clear: jest.fn(() => {
    localStorageMock.store = {};
  })
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock Date for consistent testing
const mockDate = new Date('2024-08-15T10:00:00');
const originalDate = Date;

describe('AI Name Generator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    global.Date.now = originalDate.now;
  });

  afterEach(() => {
    global.Date = originalDate;
  });

  describe('generateAIName', () => {
    test('generates random pattern-based names', () => {
      const names = new Set();
      
      // Generate multiple names to test randomness
      for (let i = 0; i < 10; i++) {
        const name = generateAIName();
        names.add(name);
        
        // Should be a non-empty string
        expect(name).toBeTruthy();
        expect(typeof name).toBe('string');
      }
      
      // Should generate different names (not all the same)
      expect(names.size).toBeGreaterThan(1);
    });

    test('generates Dan-specific names when user is Dan', () => {
      // Mock Math.random to ensure we get Dan names
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.1); // Below 0.3 threshold

      const name = generateAIName({ userName: 'Dan' });
      
      const danNames = [
        'Your Faithful Code Companion',
        'The Blessed Assistant',
        'Captain Appreciation',
        'The Grateful Gourmet',
        'Your Digital Sous Chef',
        'Team Dan\'s Tech Chef'
      ];
      
      expect(danNames).toContain(name);
      
      Math.random = originalRandom;
    });

    test('generates error names when isError is true', () => {
      const name = generateAIName({ isError: true });
      
      const errorNames = [
        '404 Chef Not Found',
        'Blue Screen of Death Baker',
        'Kernel Panic Kitchen',
        'The Glitched Gourmet',
        'Segfault Sauté Sally'
      ];
      
      expect(errorNames).toContain(name);
    });

    test('generates time-based names for morning', () => {
      // Mock morning time (8 AM)
      const morningDate = new Date('2024-08-15T08:00:00');
      jest.spyOn(global, 'Date').mockImplementation(() => morningDate);
      
      // Mock Math.random to ensure we get time-based names
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.1); // Below 0.3 threshold

      const name = generateAIName();
      
      const morningNames = [
        'Breakfast Burnout',
        'Coffee-Deprived Carl',
        'Morning Grump',
        'The Espresso Expressionist',
        'Eggs Benedict Arnold',
        'Pancake Pandemonium Pete'
      ];
      
      expect(morningNames).toContain(name);
      
      Math.random = originalRandom;
    });

    test('generates context-specific names for event pages', () => {
      // Mock Math.random to ensure we get context names
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.35); // Below 0.4 threshold for context names

      const name = generateAIName({ page: '/events/123' });
      
      const eventNames = [
        'The Event Whisperer',
        'Captain Menu Panic',
        'Lord of the Last-Minute',
        'Banquet Breakdown Betty',
        'Catering Catastrophe Chris',
        'The Portion Police',
        'Admiral Allergy Alert'
      ];
      
      expect(eventNames).toContain(name);
      
      Math.random = originalRandom;
    });

    test('generates context-specific names for recipe pages', () => {
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.35);

      const name = generateAIName({ page: '/recipes/edit' });
      
      const recipeNames = [
        'Recipe Wrecker 3000',
        'The Scaling Sorcerer',
        'Measurement Mayhem Mike',
        'The Imperial-to-Metric Menace',
        'Sous Vide Susie',
        'The Mise en Place Master',
        'Batch Size Barbara'
      ];
      
      expect(recipeNames).toContain(name);
      
      Math.random = originalRandom;
    });

    test('generates allergy-specific names when allergies present', () => {
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.35);

      const name = generateAIName({ hasAllergies: true });
      
      const allergyNames = [
        'Gluten Detective',
        'The Nut Job Inspector',
        'Dairy Destroyer Dan',
        'Allergen Assassin',
        'The Cross-Contamination Cop',
        'EpiPen Eddie',
        'Lactose Intolerance Larry'
      ];
      
      expect(allergyNames).toContain(name);
      
      Math.random = originalRandom;
    });
  });

  describe('getSessionAIName', () => {
    test('generates new name when no session exists', () => {
      const name = getSessionAIName();
      
      expect(name).toBeTruthy();
      expect(localStorageMock.setItem).toHaveBeenCalledWith('ai_session_name', name);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('ai_session_time', expect.any(String));
    });

    test('returns existing name within 30 minutes', () => {
      const existingName = 'Chef Sarcastic Spatula';
      const recentTime = Date.now() - (15 * 60 * 1000); // 15 minutes ago
      
      localStorageMock.store.ai_session_name = existingName;
      localStorageMock.store.ai_session_time = recentTime.toString();
      
      const name = getSessionAIName();
      
      expect(name).toBe(existingName);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    test('generates new name after 30 minutes', () => {
      const oldName = 'Old Chef Name';
      const oldTime = Date.now() - (31 * 60 * 1000); // 31 minutes ago
      
      localStorageMock.store.ai_session_name = oldName;
      localStorageMock.store.ai_session_time = oldTime.toString();
      
      const name = getSessionAIName();
      
      expect(name).not.toBe(oldName);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('ai_session_name', name);
    });
  });

  describe('regenerateAIName', () => {
    test('always generates new name', () => {
      const oldName = 'Old Name';
      localStorageMock.store.ai_session_name = oldName;
      
      const newName = regenerateAIName();
      
      expect(newName).toBeTruthy();
      expect(localStorageMock.setItem).toHaveBeenCalledWith('ai_session_name', newName);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('ai_session_time', expect.any(String));
    });

    test('passes context through to generateAIName', () => {
      const context = {
        page: '/recipes',
        hasAllergies: true,
        userName: 'TestUser'
      };
      
      const name = regenerateAIName(context);
      
      expect(name).toBeTruthy();
      // Name should be contextually appropriate
      expect(typeof name).toBe('string');
    });
  });

  describe('Name Pattern Generation', () => {
    test('generates names with correct patterns', () => {
      const names = new Set();
      
      // Generate many names to test various patterns
      for (let i = 0; i < 50; i++) {
        names.add(generateAIName());
      }
      
      // Check that we get various patterns
      const patterns = [
        /^(Chef|Captain|Lord|Master|Baron|Sir|Dame|Professor|Doctor|Señor|Madame|Monsieur|Commander|General|Admiral)/,
        /(Whisk|Spatula|Burninator|Saucepan|Cleaver|Tenderizer|Mandoline|Blowtorch|Mixer|Grater|Peeler|Strainer|Ladle|Tongs|Thermometer)/,
        /(the Wise|of Doom|Supreme|the Merciless|the Gentle|the Unhinged|the Enlightened|the Exhausted|the Magnificent|the Questionable|III|Jr\.|the Great|the Terrible|Maximus)$/,
        /Mc.*face$/
      ];
      
      let matchCount = 0;
      names.forEach(name => {
        if (patterns.some(pattern => pattern.test(name))) {
          matchCount++;
        }
      });
      
      // At least some names should match our patterns
      expect(matchCount).toBeGreaterThan(0);
    });
  });
});