import React from 'react';
import './SuggestedPrompts.css';

export default function SuggestedPrompts({ onSelectPrompt }) {
  const prompts = [
    {
      category: 'Menu Planning',
      icon: '📋',
      suggestions: [
        'Suggest a menu for a summer wedding with 100 guests',
        'What appetizers pair well with Italian main courses?',
        'Create a vegetarian menu that will impress meat-eaters',
        'Help me plan a cocktail party menu for 50 people'
      ]
    },
    {
      category: 'Recipe Help',
      icon: '👨‍🍳',
      suggestions: [
        'How do I scale this recipe from 4 to 40 servings?',
        'What can I substitute for eggs in baking recipes?',
        'Give me ideas for gluten-free desserts',
        'Convert this recipe to be dairy-free'
      ]
    },
    {
      category: 'Event Planning',
      icon: '📅',
      suggestions: [
        'Create a timeline for prepping a 3-course dinner',
        'How much food do I need for 75 guests?',
        'What should I consider for outdoor event catering?',
        'Help me plan around common food allergies'
      ]
    },
    {
      category: 'Shopping & Prep',
      icon: '🛒',
      suggestions: [
        'Generate a shopping list for my event menu',
        'What ingredients can I prep ahead of time?',
        'How should I organize my shopping by supplier?',
        'Calculate ingredient costs for my menu'
      ]
    }
  ];

  return (
    <div className="suggested-prompts">
      <h3>Try asking about:</h3>
      
      <div className="prompt-categories">
        {prompts.map((category, index) => (
          <div key={index} className="prompt-category">
            <div className="category-header">
              <span className="category-icon">{category.icon}</span>
              <h4>{category.category}</h4>
            </div>
            
            <div className="prompt-list">
              {category.suggestions.map((prompt, promptIndex) => (
                <button
                  key={promptIndex}
                  className="prompt-button"
                  onClick={() => onSelectPrompt(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="prompts-footer">
        <p>💡 Tip: I work best when you provide specific details about your event!</p>
      </div>
    </div>
  );
}