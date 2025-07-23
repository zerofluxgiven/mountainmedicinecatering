// Mock data for AI testing

export const mockRecipes = {
  chocolateLavaCake: {
    id: 'recipe_choc_lava',
    name: 'Chocolate Lava Cake',
    servings: 8,
    prep_time: '20 minutes',
    cook_time: '15 minutes',
    ingredients: [
      { item: 'dark chocolate', amount: '200', unit: 'g' },
      { item: 'unsalted butter', amount: '100', unit: 'g' },
      { item: 'eggs', amount: '4', unit: '' },
      { item: 'egg yolks', amount: '4', unit: '' },
      { item: 'sugar', amount: '60', unit: 'g' },
      { item: 'all-purpose flour', amount: '60', unit: 'g' },
      { item: 'salt', amount: '1', unit: 'pinch' },
      { item: 'vanilla extract', amount: '1', unit: 'tsp' }
    ],
    instructions: [
      'Preheat oven to 425°F (220°C). Butter and flour 8 ramekins.',
      'Melt chocolate and butter in a double boiler until smooth.',
      'In a bowl, whisk eggs, egg yolks, and sugar until thick and pale.',
      'Add melted chocolate mixture and flour to egg mixture. Mix until combined.',
      'Divide batter among ramekins. Can be refrigerated up to 24 hours.',
      'Bake for 12-14 minutes until edges are firm but center jiggles.',
      'Let cool for 1 minute, then invert onto plates. Serve immediately.'
    ],
    allergens: ['gluten', 'dairy', 'eggs'],
    dietary_tags: ['vegetarian'],
    notes: 'The key is not to overbake - the center should be liquid'
  },
  
  pastaPrimavera: {
    id: 'recipe_pasta_prim',
    name: 'Pasta Primavera',
    servings: 4,
    prep_time: '15 minutes',
    cook_time: '20 minutes',
    ingredients: [
      { item: 'penne pasta', amount: '1', unit: 'lb' },
      { item: 'olive oil', amount: '3', unit: 'tbsp' },
      { item: 'garlic cloves', amount: '3', unit: '' },
      { item: 'bell peppers', amount: '2', unit: '' },
      { item: 'zucchini', amount: '2', unit: 'medium' },
      { item: 'cherry tomatoes', amount: '2', unit: 'cups' },
      { item: 'basil', amount: '1/4', unit: 'cup' },
      { item: 'parmesan cheese', amount: '1/2', unit: 'cup' }
    ],
    instructions: [
      'Cook pasta according to package directions.',
      'Heat olive oil in large skillet over medium heat.',
      'Add garlic and cook until fragrant, about 1 minute.',
      'Add peppers and zucchini, cook until tender.',
      'Add tomatoes and cook until they start to burst.',
      'Toss vegetables with pasta, basil, and cheese.'
    ],
    allergens: ['gluten', 'dairy'],
    dietary_tags: ['vegetarian']
  }
};

export const mockEvents = {
  summerRetreat: {
    id: 'event_summer_2024',
    name: 'Summer Wellness Retreat',
    start_date: '2024-08-15',
    end_date: '2024-08-18',
    location: 'Mountain View Lodge',
    guest_count: 45,
    allergens: ['gluten', 'dairy', 'nuts', 'shellfish'],
    dietary_restrictions: ['vegan', 'vegetarian', 'gluten-free'],
    guests_with_restrictions: [
      { name: 'Sarah M.', allergies: ['gluten'], diet: 'vegan' },
      { name: 'John D.', allergies: ['nuts', 'shellfish'], diet: null },
      { name: 'Lisa K.', allergies: [], diet: 'vegetarian' }
    ],
    notes: '3-day wellness retreat with focus on healthy eating'
  },
  
  corporateEvent: {
    id: 'event_corp_2024',
    name: 'Tech Company Annual Meeting',
    start_date: '2024-09-20',
    end_date: '2024-09-20',
    location: 'Downtown Conference Center',
    guest_count: 150,
    allergens: ['gluten', 'dairy', 'soy', 'eggs'],
    dietary_restrictions: ['vegan', 'keto', 'halal'],
    guests_with_restrictions: [],
    notes: 'Single day event with breakfast, lunch, and afternoon snack'
  }
};

export const mockMenus = {
  retreatMenu: {
    id: 'menu_retreat_primary',
    event_id: 'event_summer_2024',
    name: 'Summer Retreat - Primary Menu',
    type: 'primary',
    days: [
      {
        date: '2024-08-15',
        day_label: 'Day 1 - Arrival',
        expanded: true,
        meals: [
          {
            id: 'meal_d1_dinner',
            type: 'dinner',
            time: '7:00 PM',
            color: '#F5F5DC',
            courses: [
              {
                id: 'course_d1_d_1',
                name: 'Pasta Primavera',
                recipe_id: 'recipe_pasta_prim',
                servings: 45,
                notes: 'Welcome dinner',
                allergens: ['gluten', 'dairy'],
                dietary_tags: ['vegetarian']
              }
            ]
          }
        ]
      },
      {
        date: '2024-08-16',
        day_label: 'Day 2 - Full Day',
        expanded: false,
        meals: [
          {
            id: 'meal_d2_breakfast',
            type: 'breakfast',
            time: '8:00 AM',
            color: '#FFF8DC',
            courses: []
          },
          {
            id: 'meal_d2_lunch',
            type: 'lunch',
            time: '12:30 PM',
            color: '#F0F8FF',
            courses: []
          },
          {
            id: 'meal_d2_dinner',
            type: 'dinner',
            time: '7:00 PM',
            color: '#F5F5DC',
            courses: []
          }
        ]
      }
    ]
  }
};

export const mockAIActions = {
  createRecipeAction: {
    type: 'create_recipe',
    aiMessage: 'I\'ll create a new recipe called "Grilled Vegetable Skewers" with 6 ingredients and 4 preparation steps.',
    data: {
      recipe: {
        name: 'Grilled Vegetable Skewers',
        servings: 6,
        ingredients: [
          { item: 'bell peppers', amount: '3', unit: '' },
          { item: 'zucchini', amount: '2', unit: '' },
          { item: 'red onion', amount: '1', unit: 'large' },
          { item: 'mushrooms', amount: '8', unit: 'oz' },
          { item: 'olive oil', amount: '1/4', unit: 'cup' },
          { item: 'italian seasoning', amount: '2', unit: 'tbsp' }
        ],
        instructions: [
          'Cut vegetables into 1-inch pieces',
          'Toss with olive oil and seasoning',
          'Thread onto skewers',
          'Grill for 10-12 minutes, turning occasionally'
        ]
      }
    }
  },
  
  scaleRecipeAction: {
    type: 'scale_recipe',
    aiMessage: 'I\'ll scale "Pasta Primavera" from 4 servings to 45 servings. That\'s an 11.25x scale factor.',
    data: {
      recipeName: 'Pasta Primavera',
      recipeId: 'recipe_pasta_prim',
      originalServings: 4,
      newServings: 45,
      scaleFactor: 11.25,
      scaledIngredients: [
        { item: 'penne pasta', originalAmount: '1', scaledAmount: '11.25', unit: 'lb' },
        { item: 'olive oil', originalAmount: '3', scaledAmount: '2.1', unit: 'cups' },
        { item: 'garlic cloves', originalAmount: '3', scaledAmount: '34', unit: '' },
        { item: 'bell peppers', originalAmount: '2', scaledAmount: '23', unit: '' },
        { item: 'zucchini', originalAmount: '2', scaledAmount: '23', unit: 'medium' },
        { item: 'cherry tomatoes', originalAmount: '2', scaledAmount: '22.5', unit: 'cups' },
        { item: 'basil', originalAmount: '1/4', scaledAmount: '2.8', unit: 'cups' },
        { item: 'parmesan cheese', originalAmount: '1/2', scaledAmount: '5.6', unit: 'cups' }
      ]
    }
  },
  
  batchOperationAction: {
    type: 'batch_operation',
    aiMessage: 'I\'m about to perform 5 operations to set up your complete event menu. This includes creating recipes and organizing them into meals.',
    data: {
      operations: [
        { type: 'create_recipe', description: 'Create breakfast frittata recipe' },
        { type: 'create_recipe', description: 'Create lunch salad recipe' },
        { type: 'create_recipe', description: 'Create dinner entree recipe' },
        { type: 'create_menu', description: 'Create 3-day menu structure' },
        { type: 'add_recipe_to_menu', description: 'Assign recipes to meals' }
      ]
    }
  }
};

export const mockAIResponses = {
  recipeImportSuccess: {
    response: 'Boom! Successfully imported "Chocolate Lava Cake"! 🎉\n\nHere\'s what I grabbed:\n• 8 servings\n• 8 ingredients\n• 7 steps\n\nThe recipe has been added to your collection. Want me to scale it for your next event?'
  },
  
  scaleSuccess: {
    response: 'Scaled like a boss! Your Pasta Primavera is now ready to feed 45 hungry souls. Fair warning: you\'re gonna need a bigger pot. Actually, you\'re gonna need ALL the pots.'
  },
  
  wittyError: {
    response: 'Well, this is awkward. Something went sideways and I couldn\'t complete that action. It\'s not you, it\'s me. Actually, it might be the internet. Let\'s blame the internet.'
  },
  
  approvalModify: {
    response: 'Sure thing! Tell me what you\'d like to change about that action, and I\'ll adjust accordingly. Want different servings? Different ingredients? Different attitude? (Okay, maybe not the last one - the sass is hardcoded.)'
  }
};

// Helper function to simulate API delays
export const simulateDelay = (ms = 1000) => new Promise(resolve => setTimeout(resolve, ms));

// Mock recipe URL patterns for testing
export const mockRecipeUrls = {
  valid: [
    'https://www.allrecipes.com/recipe/12345/chocolate-cake',
    'https://cooking.nytimes.com/recipes/1234-pasta',
    'https://www.seriouseats.com/recipes/grilled-chicken',
    'https://peachie.recipes/recipes/145711?category=35321'
  ],
  
  invalid: [
    'https://www.google.com',
    'https://www.facebook.com/post/12345',
    'not-a-url',
    'ftp://files.example.com/recipe.txt'
  ]
};