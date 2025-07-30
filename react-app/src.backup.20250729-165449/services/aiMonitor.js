import { httpsCallable } from 'firebase/functions';
import { functions, db } from '../config/firebase';
import { collection, doc, addDoc, updateDoc, getDoc, query, where, getDocs, onSnapshot, serverTimestamp } from 'firebase/firestore';

// AI monitoring service for diet/allergy interactions
class AIMonitorService {
  constructor() {
    this.activeSubscriptions = new Map();
    this.pendingQuestions = [];
    this.onQuestionCallback = null;
  }

  // Start monitoring an event for diet/allergy conflicts
  startEventMonitoring(eventId) {
    if (this.activeSubscriptions.has(eventId)) {
      return; // Already monitoring
    }

    // Monitor event allergies
    const allergiesUnsubscribe = onSnapshot(
      collection(db, 'events', eventId, 'allergies'),
      (snapshot) => this.handleAllergiesUpdate(eventId, snapshot)
    );

    // Monitor event diets
    const dietsUnsubscribe = onSnapshot(
      collection(db, 'events', eventId, 'diets'),
      (snapshot) => this.handleDietsUpdate(eventId, snapshot)
    );

    // Monitor event menus
    const menusUnsubscribe = onSnapshot(
      query(collection(db, 'menus'), where('event_id', '==', eventId)),
      (snapshot) => this.handleMenusUpdate(eventId, snapshot)
    );

    // Store unsubscribe functions
    this.activeSubscriptions.set(eventId, {
      allergies: allergiesUnsubscribe,
      diets: dietsUnsubscribe,
      menus: menusUnsubscribe,
      data: {
        allergies: [],
        diets: [],
        menus: []
      }
    });
  }

  // Stop monitoring an event
  stopEventMonitoring(eventId) {
    const subscription = this.activeSubscriptions.get(eventId);
    if (subscription) {
      subscription.allergies();
      subscription.diets();
      subscription.menus();
      this.activeSubscriptions.delete(eventId);
    }
  }

  // Handle allergies update
  async handleAllergiesUpdate(eventId, snapshot) {
    const subscription = this.activeSubscriptions.get(eventId);
    if (!subscription) return;

    subscription.data.allergies = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    await this.analyzeInteractions(eventId);
  }

  // Handle diets update
  async handleDietsUpdate(eventId, snapshot) {
    const subscription = this.activeSubscriptions.get(eventId);
    if (!subscription) return;

    subscription.data.diets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    await this.analyzeInteractions(eventId);
  }

  // Handle menus update
  async handleMenusUpdate(eventId, snapshot) {
    const subscription = this.activeSubscriptions.get(eventId);
    if (!subscription) return;

    subscription.data.menus = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    await this.analyzeInteractions(eventId);
  }

  // Analyze interactions between allergies, diets, and menus
  async analyzeInteractions(eventId) {
    const subscription = this.activeSubscriptions.get(eventId);
    if (!subscription) return;

    const { allergies, diets, menus } = subscription.data;

    // Combine all dietary restrictions
    const allRestrictions = [];
    
    // Add allergens
    allergies.forEach(allergy => {
      allergy.allergens?.forEach(allergen => {
        allRestrictions.push({
          type: 'allergen',
          value: allergen,
          guest: allergy.guest_name,
          guestId: allergy.id
        });
      });
    });

    // Add diet restrictions
    diets.forEach(diet => {
      const dietName = diet.diet_name || diet.diet_type;
      if (dietName) {
        allRestrictions.push({
          type: 'diet',
          value: dietName,
          guest: diet.guest_name,
          guestId: diet.id,
          restrictions: diet.restrictions || []
        });
      }
    });

    // Check for conflicts in menus
    for (const menu of menus) {
      await this.checkMenuConflicts(eventId, menu, allRestrictions);
    }

    // Check for diet compatibility questions
    await this.checkDietCompatibility(eventId, diets, menus);
  }

  // Check menu for conflicts with restrictions
  async checkMenuConflicts(eventId, menu, restrictions) {
    // Get all recipes in the menu
    const recipeIds = [];
    menu.meals?.forEach(meal => {
      meal.recipes?.forEach(recipe => {
        if (recipe.recipe_id) {
          recipeIds.push(recipe.recipe_id);
        }
      });
    });

    if (recipeIds.length === 0) return;

    // Fetch recipe details
    const recipes = await Promise.all(
      recipeIds.map(async (recipeId) => {
        const recipeDoc = await getDocs(doc(db, 'recipes', recipeId));
        return recipeDoc.exists() ? { id: recipeDoc.id, ...recipeDoc.data() } : null;
      })
    ).then(results => results.filter(r => r !== null));

    // Check each recipe against restrictions
    const conflicts = [];
    
    recipes.forEach(recipe => {
      restrictions.forEach(restriction => {
        if (restriction.type === 'allergen') {
          // Check if recipe contains allergen
          if (recipe.allergens?.includes(restriction.value)) {
            conflicts.push({
              type: 'allergen_conflict',
              recipe: recipe.name,
              recipeId: recipe.id,
              menu: menu.name,
              menuId: menu.id,
              allergen: restriction.value,
              guest: restriction.guest,
              guestId: restriction.guestId
            });
          }
        } else if (restriction.type === 'diet') {
          // Check if recipe is compatible with diet
          if (!this.isRecipeDietCompatible(recipe, restriction.value)) {
            conflicts.push({
              type: 'diet_conflict',
              recipe: recipe.name,
              recipeId: recipe.id,
              menu: menu.name,
              menuId: menu.id,
              diet: restriction.value,
              guest: restriction.guest,
              guestId: restriction.guestId
            });
          }
        }
      });
    });

    // Generate questions for conflicts
    if (conflicts.length > 0) {
      await this.generateConflictQuestions(eventId, conflicts);
    }
  }

  // Check if recipe is compatible with diet
  isRecipeDietCompatible(recipe, dietType) {
    // Check if recipe explicitly supports this diet
    if (recipe.diets?.includes(dietType)) {
      return true;
    }

    // Check common diet rules
    const dietRules = {
      'Vegan': ['Dairy', 'Eggs', 'Fish', 'Shellfish', 'Meat', 'Poultry', 'Honey'],
      'Vegetarian': ['Fish', 'Shellfish', 'Meat', 'Poultry'],
      'Pescatarian': ['Meat', 'Poultry'],
      'Gluten-Free': ['Wheat', 'Gluten', 'Barley', 'Rye'],
      'Dairy-Free': ['Dairy', 'Milk', 'Cheese', 'Butter', 'Cream'],
      'Nut-Free': ['Tree Nuts', 'Peanuts']
    };

    const restrictedAllergens = dietRules[dietType] || [];
    
    // Check if recipe contains any restricted allergens
    if (recipe.allergens) {
      for (const allergen of recipe.allergens) {
        if (restrictedAllergens.includes(allergen)) {
          return false;
        }
      }
    }

    // If no explicit conflicts, we can't be sure
    return null; // Unknown compatibility
  }

  // Check diet compatibility and generate questions
  async checkDietCompatibility(eventId, diets, menus) {
    const questions = [];

    // Check for guests with multiple dietary restrictions
    const guestRestrictions = {};
    diets.forEach(diet => {
      if (!guestRestrictions[diet.guest_name]) {
        guestRestrictions[diet.guest_name] = [];
      }
      guestRestrictions[diet.guest_name].push(diet);
    });

    // Generate questions for complex dietary needs
    Object.entries(guestRestrictions).forEach(([guestName, restrictions]) => {
      if (restrictions.length > 1) {
        questions.push({
          type: 'multiple_diets',
          priority: 'medium',
          question: `${guestName} has multiple dietary restrictions. Should I create a specialized menu combining these requirements?`,
          context: {
            guest: guestName,
            diets: restrictions.map(r => r.diet_name || r.diet_type),
            eventId
          }
        });
      }
    });

    // Check for missing diet information in recipes
    const recipesNeedingDietInfo = [];
    for (const menu of menus) {
      for (const meal of menu.meals || []) {
        for (const menuRecipe of meal.recipes || []) {
          if (menuRecipe.recipe_id) {
            const recipeDoc = await getDoc(doc(db, 'recipes', menuRecipe.recipe_id));
            if (recipeDoc.exists()) {
              const recipe = { id: recipeDoc.id, ...recipeDoc.data() };
              if (!recipe.diets || recipe.diets.length === 0) {
                recipesNeedingDietInfo.push(recipe);
              }
            }
          }
        }
      }
    }

    if (recipesNeedingDietInfo.length > 0) {
      questions.push({
        type: 'missing_diet_info',
        priority: 'low',
        question: `I noticed ${recipesNeedingDietInfo.length} recipes don't have diet compatibility marked. Would you like me to analyze them?`,
        context: {
          recipes: recipesNeedingDietInfo.map(r => ({ id: r.id, name: r.name })),
          eventId
        }
      });
    }

    // Store questions
    if (questions.length > 0) {
      await this.storeQuestions(eventId, questions);
    }
  }

  // Generate questions for conflicts
  async generateConflictQuestions(eventId, conflicts) {
    // Group conflicts by type
    const allergenConflicts = conflicts.filter(c => c.type === 'allergen_conflict');
    const dietConflicts = conflicts.filter(c => c.type === 'diet_conflict');

    const questions = [];

    // Generate allergen conflict questions
    if (allergenConflicts.length > 0) {
      const groupedByGuest = {};
      allergenConflicts.forEach(conflict => {
        if (!groupedByGuest[conflict.guest]) {
          groupedByGuest[conflict.guest] = [];
        }
        groupedByGuest[conflict.guest].push(conflict);
      });

      Object.entries(groupedByGuest).forEach(([guest, guestConflicts]) => {
        const allergens = [...new Set(guestConflicts.map(c => c.allergen))];
        const recipes = [...new Set(guestConflicts.map(c => c.recipe))];
        
        questions.push({
          type: 'allergen_alert',
          priority: 'high',
          question: `⚠️ ${guest} has allergies to ${allergens.join(', ')}, but the menu includes: ${recipes.join(', ')}. How should I handle this?`,
          context: {
            guest,
            guestId: guestConflicts[0].guestId,
            conflicts: guestConflicts,
            eventId
          },
          options: [
            { action: 'remove_recipes', label: 'Remove these recipes from menu' },
            { action: 'create_alternative', label: 'Create alternative versions' },
            { action: 'assign_special_menu', label: 'Assign guest to special menu' },
            { action: 'acknowledge', label: 'I\'ll handle this manually' }
          ]
        });
      });
    }

    // Generate diet conflict questions
    if (dietConflicts.length > 0) {
      const groupedByDiet = {};
      dietConflicts.forEach(conflict => {
        if (!groupedByDiet[conflict.diet]) {
          groupedByDiet[conflict.diet] = [];
        }
        groupedByDiet[conflict.diet].push(conflict);
      });

      Object.entries(groupedByDiet).forEach(([diet, dietConflicts]) => {
        const guests = [...new Set(dietConflicts.map(c => c.guest))];
        const recipes = [...new Set(dietConflicts.map(c => c.recipe))];
        
        questions.push({
          type: 'diet_compatibility',
          priority: 'medium',
          question: `${guests.length} guest(s) following ${diet} diet may not be able to eat: ${recipes.join(', ')}. Should I suggest alternatives?`,
          context: {
            diet,
            guests,
            conflicts: dietConflicts,
            eventId
          },
          options: [
            { action: 'suggest_alternatives', label: 'Yes, suggest alternatives' },
            { action: 'mark_compatible', label: 'These recipes are actually compatible' },
            { action: 'create_special_menu', label: 'Create special ${diet} menu' },
            { action: 'skip', label: 'Skip for now' }
          ]
        });
      });
    }

    // Store questions
    if (questions.length > 0) {
      await this.storeQuestions(eventId, questions);
    }
  }

  // Store questions in database
  async storeQuestions(eventId, questions) {
    for (const question of questions) {
      // Check if similar question already exists
      const existingQuery = query(
        collection(db, 'ai_questions'),
        where('eventId', '==', eventId),
        where('type', '==', question.type),
        where('status', '==', 'pending')
      );
      
      const existing = await getDocs(existingQuery);
      
      if (existing.empty) {
        // Add new question
        const questionDoc = await addDoc(collection(db, 'ai_questions'), {
          ...question,
          eventId,
          status: 'pending',
          created_at: serverTimestamp()
        });

        // Notify about new question
        if (this.onQuestionCallback) {
          this.onQuestionCallback({
            id: questionDoc.id,
            ...question
          });
        }
      }
    }
  }

  // Set callback for new questions
  setOnQuestionCallback(callback) {
    this.onQuestionCallback = callback;
  }

  // Answer a question
  async answerQuestion(questionId, answer) {
    const questionRef = doc(db, 'ai_questions', questionId);
    
    await updateDoc(questionRef, {
      answer,
      status: 'answered',
      answered_at: serverTimestamp()
    });

    // Log interaction
    await this.logInteraction('question_answered', {
      questionId,
      answer
    });

    // Handle the answer
    const questionDoc = await getDoc(questionRef);
    if (questionDoc.exists()) {
      const question = questionDoc.data();
      await this.handleQuestionAnswer(question, answer);
    }
  }

  // Handle question answer actions
  async handleQuestionAnswer(question, answer) {
    switch (answer.action) {
      case 'remove_recipes':
        // Remove conflicting recipes from menu
        // Implementation depends on menu structure
        break;
        
      case 'create_alternative':
        // Suggest creating alternative versions
        await this.suggestAlternativeRecipes(question.context);
        break;
        
      case 'assign_special_menu':
        // Assign guest to special menu
        await this.assignSpecialMenu(question.context);
        break;
        
      case 'suggest_alternatives':
        // Suggest alternative recipes
        await this.suggestDietAlternatives(question.context);
        break;
        
      case 'mark_compatible':
        // Mark recipes as compatible with diet
        await this.markRecipesCompatible(question.context);
        break;
        
      default:
        // Log the decision
        await this.logInteraction('question_action', {
          question: question.question,
          action: answer.action,
          context: question.context
        });
    }
  }

  // Log AI interactions
  async logInteraction(type, data) {
    await addDoc(collection(db, 'ai_interactions'), {
      type,
      data,
      timestamp: serverTimestamp()
    });
  }

  // Get pending questions for an event
  async getPendingQuestions(eventId) {
    const q = query(
      collection(db, 'ai_questions'),
      where('eventId', '==', eventId),
      where('status', '==', 'pending')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  // Analyze ingredients for diet compatibility
  async analyzeIngredientsForDiet(ingredients, dietType) {
    try {
      const analyzeDiet = httpsCallable(functions, 'analyzeDietCompatibility');
      const result = await analyzeDiet({
        ingredients,
        dietType
      });
      
      return result.data;
    } catch (error) {
      console.error('Error analyzing diet compatibility:', error);
      return null;
    }
  }
}

// Export singleton instance
export const aiMonitor = new AIMonitorService();