import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

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