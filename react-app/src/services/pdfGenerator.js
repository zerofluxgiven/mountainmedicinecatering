import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { formatScaledAmount } from './recipeScaler';

// Firebase Function references
const generateMenuPDFFunction = httpsCallable(functions, 'generateMenuPDF');
const generateShoppingListPDFFunction = httpsCallable(functions, 'generateShoppingListPDF');

export async function generateMenuPDF(menuId, eventId = null) {
  try {
    const result = await generateMenuPDFFunction({ menuId, eventId });
    return result.data.pdfUrl;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error('Failed to generate menu PDF. Please try again.');
  }
}

export async function generateShoppingListPDF(eventId, groupBy = 'category') {
  try {
    const result = await generateShoppingListPDFFunction({ eventId, groupBy });
    return result.data.pdfUrl;
  } catch (error) {
    console.error('Shopping list PDF generation error:', error);
    throw new Error('Failed to generate shopping list PDF. Please try again.');
  }
}

// Client-side PDF preview (basic implementation)
export function generateMenuPreview(menu, event = null) {
  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #6B46C1; text-align: center;">Mountain Medicine Catering</h1>
      ${event ? `
        <h2 style="text-align: center; color: #333;">${event.name}</h2>
        <p style="text-align: center; color: #666;">
          ${new Date(event.event_date).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      ` : ''}
      <h2 style="text-align: center; color: #333; margin-top: 30px;">${menu.name}</h2>
      ${menu.type ? `<p style="text-align: center; color: #666; text-transform: uppercase;">${menu.type}</p>` : ''}
  `;

  menu.sections?.forEach(section => {
    html += `
      <div style="margin-top: 30px;">
        <h3 style="color: #6B46C1; text-transform: uppercase; border-bottom: 2px solid #6B46C1; padding-bottom: 5px;">
          ${section.name}
        </h3>
        <ul style="list-style: none; padding: 0;">
    `;
    
    section.items?.forEach(item => {
      html += `
        <li style="margin: 10px 0; padding-left: 20px;">
          <strong>• ${item.name}</strong>
          ${item.notes ? `<br><span style="color: #666; font-size: 0.9em; padding-left: 20px;">${item.notes}</span>` : ''}
        </li>
      `;
    });
    
    html += '</ul></div>';
  });

  html += '</div>';
  
  return html;
}

// Generate printable shopping list
export function generateShoppingListHTML(shoppingList, event, groupBy = 'category') {
  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #6B46C1;">Shopping List</h1>
      <h2 style="color: #333;">${event.name}</h2>
      <p style="color: #666;">
        Date: ${new Date(event.event_date).toLocaleDateString()}<br>
        Guests: ${event.guest_count || 'TBD'}
      </p>
  `;

  // Group shopping list
  const grouped = {};
  Object.entries(shoppingList).forEach(([key, item]) => {
    const groupKey = groupBy === 'category' ? item.category : 
                     groupBy === 'supplier' ? item.supplier : 
                     item.recipes[0]?.name || 'Unknown';
    
    if (!grouped[groupKey]) {
      grouped[groupKey] = [];
    }
    grouped[groupKey].push(item);
  });

  // Render groups
  Object.entries(grouped).forEach(([group, items]) => {
    html += `
      <div style="margin-top: 30px;">
        <h3 style="color: #6B46C1; text-transform: uppercase;">${group}</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #ddd;">
              <th style="text-align: left; padding: 8px; width: 20px;">✓</th>
              <th style="text-align: left; padding: 8px;">Quantity</th>
              <th style="text-align: left; padding: 8px;">Ingredient</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    items.forEach(item => {
      html += `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px;">☐</td>
          <td style="padding: 8px;">${item.quantity.toFixed(2)} ${item.unit}</td>
          <td style="padding: 8px;">${item.name}</td>
        </tr>
      `;
    });
    
    html += '</tbody></table></div>';
  });

  html += `
    <div style="margin-top: 40px; text-align: center; color: #666; font-size: 0.9em;">
      Generated: ${new Date().toLocaleDateString()}
    </div>
  </div>`;
  
  return html;
}

// Generate Recipe PDF HTML
export function generateRecipePDF(recipe, scaledRecipe, targetServings) {
  const originalServings = recipe.serves || 4;
  const scaleFactor = targetServings / originalServings;
  
  // Create HTML content for PDF
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        @page {
          size: letter;
          margin: 1in;
        }
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        h1 {
          color: #6B46C1;
          font-size: 28px;
          margin-bottom: 20px;
          text-align: center;
        }
        h2 {
          color: #6B46C1;
          font-size: 20px;
          margin-top: 30px;
          margin-bottom: 15px;
          border-bottom: 2px solid #6B46C1;
          padding-bottom: 5px;
        }
        h3 {
          color: #6B46C1;
          font-size: 18px;
          margin-top: 20px;
          margin-bottom: 10px;
        }
        .header-info {
          text-align: center;
          margin-bottom: 30px;
          font-size: 14px;
          color: #666;
        }
        .serving-info {
          background: #f5f5f5;
          padding: 10px 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
          text-align: center;
        }
        .scale-info {
          font-size: 12px;
          color: #666;
          font-style: italic;
        }
        .ingredients-list {
          margin: 20px 40px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px 30px;
        }
        .ingredient-item {
          display: flex;
          align-items: flex-start;
          page-break-inside: avoid;
        }
        .checkbox {
          width: 18px;
          height: 18px;
          border: 2px solid #666;
          border-radius: 3px;
          margin-right: 10px;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .ingredient-text {
          flex: 1;
          font-size: 14px;
        }
        .instructions-list {
          counter-reset: step-counter;
          padding-left: 0;
        }
        .instruction-step {
          position: relative;
          padding-left: 40px;
          margin-bottom: 15px;
          page-break-inside: avoid;
        }
        .instruction-step::before {
          counter-increment: step-counter;
          content: counter(step-counter);
          position: absolute;
          left: 0;
          top: 0;
          width: 28px;
          height: 28px;
          background: #6B46C1;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
        }
        .section-container {
          margin-bottom: 30px;
          page-break-inside: avoid;
        }
        .notes-section {
          background: #fffbf0;
          border: 1px solid #f0e6d2;
          padding: 15px;
          border-radius: 8px;
          margin-top: 20px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          color: #666;
          font-size: 12px;
        }
        .tag {
          display: inline-block;
          padding: 4px 8px;
          background: #f0f0f0;
          border-radius: 4px;
          font-size: 12px;
          margin-right: 5px;
        }
        .allergen {
          background: #ffebeb;
          color: #d00;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <h1>${scaledRecipe.name || recipe.name}</h1>
      
      <div class="header-info">
        ${recipe.prep_time ? `Prep Time: ${recipe.prep_time} minutes` : ''}
        ${recipe.prep_time && recipe.cook_time ? ' • ' : ''}
        ${recipe.cook_time ? `Cook Time: ${recipe.cook_time} minutes` : ''}
        ${recipe.cook_time && recipe.prep_time ? 
          ` • Total Time: ${recipe.prep_time + recipe.cook_time} minutes` : ''}
      </div>
  `;

  // Handle sections or traditional format
  if (scaledRecipe.sections && scaledRecipe.sections.length > 0) {
    // Ingredients for all sections
    scaledRecipe.sections.forEach((section, index) => {
      html += `
        ${scaledRecipe.sections.length > 1 ? 
          `<h3>${section.label || `Part ${index + 1}`}</h3>` : ''}
        
        <h2>Ingredients</h2>
        <div class="ingredients-list">
          ${section.ingredients.map(ing => `
            <div class="ingredient-item">
              <div class="checkbox"></div>
              <div class="ingredient-text">${ing}</div>
            </div>
          `).join('')}
        </div>
      `;
    });
    
    // Serving info after all ingredients
    html += `
      <div class="serving-info">
        <strong>Serves:</strong> ${targetServings}
        ${scaleFactor !== 1 ? `
          <span class="scale-info">
            (scaled ${scaleFactor > 1 ? 'up' : 'down'} from ${originalServings} servings by ${scaleFactor.toFixed(2)}x)
          </span>
        ` : ''}
      </div>
    `;
    
    // Instructions for all sections
    scaledRecipe.sections.forEach((section, index) => {
      if (section.instructions) {
        html += `
          <h2>Instructions${scaledRecipe.sections.length > 1 && section.label ? 
            ` - ${section.label}` : ''}</h2>
          <div class="instructions-list">
            ${formatInstructionsForPDF(section.instructions)}
          </div>
        `;
      }
    });
  } else {
    // Traditional format
    html += `
      <h2>Ingredients</h2>
      <div class="ingredients-list">
        ${(scaledRecipe.ingredients || []).map(ing => `
          <div class="ingredient-item">
            <div class="checkbox"></div>
            <div class="ingredient-text">${ing}</div>
          </div>
        `).join('')}
      </div>
      
      <div class="serving-info">
        <strong>Serves:</strong> ${targetServings}
        ${scaleFactor !== 1 ? `
          <span class="scale-info">
            (scaled ${scaleFactor > 1 ? 'up' : 'down'} from ${originalServings} servings by ${scaleFactor.toFixed(2)}x)
          </span>
        ` : ''}
      </div>
      
      ${scaledRecipe.instructions ? `
        <h2>Instructions</h2>
        <div class="instructions-list">
          ${formatInstructionsForPDF(scaledRecipe.instructions)}
        </div>
      ` : ''}
    `;
  }

  // Add notes if present
  if (recipe.notes) {
    html += `
      <div class="notes-section">
        <h3>Notes</h3>
        <p>${recipe.notes}</p>
      </div>
    `;
  }

  // Add tags and allergens
  if ((recipe.tags && recipe.tags.length > 0) || 
      (recipe.allergens && recipe.allergens.length > 0)) {
    html += '<div style="margin-top: 20px;">';
    
    if (recipe.tags && recipe.tags.length > 0) {
      recipe.tags.forEach(tag => {
        html += `<span class="tag">${tag}</span>`;
      });
    }
    
    if (recipe.allergens && recipe.allergens.length > 0) {
      recipe.allergens.forEach(allergen => {
        html += `<span class="tag allergen">⚠️ ${allergen}</span>`;
      });
    }
    
    html += '</div>';
  }

  // Add footer
  html += `
      <div class="footer">
        Mountain Medicine Catering<br>
        Printed: ${new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </div>
    </body>
    </html>
  `;

  return html;
}

// Helper function to format instructions for PDF
function formatInstructionsForPDF(instructions) {
  if (typeof instructions === 'string') {
    // Check if it's already numbered
    const numberedPattern = /^\d+\.\s*/;
    const lines = instructions.split('\n').filter(line => line.trim());
    
    // If lines are already numbered, format as steps
    if (lines.length > 0 && numberedPattern.test(lines[0])) {
      return lines.map(line => {
        const text = line.replace(numberedPattern, '').trim();
        return `<div class="instruction-step">${text}</div>`;
      }).join('');
    } else {
      // Otherwise, just return as paragraphs
      return lines.map(line => `<p>${line}</p>`).join('');
    }
  } else if (Array.isArray(instructions)) {
    return instructions.map(step => 
      `<div class="instruction-step">${step}</div>`
    ).join('');
  }
  return '';
}

