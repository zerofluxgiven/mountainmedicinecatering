// PDF Generation Service
// Uses jsPDF for client-side PDF generation with proper margins and formatting

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// PDF Configuration
const PDF_CONFIG = {
  margins: {
    top: 40,
    right: 40,
    bottom: 40,
    left: 40
  },
  pageSize: {
    width: 210, // A4 width in mm
    height: 297 // A4 height in mm
  },
  fonts: {
    title: { size: 24, style: 'bold' },
    heading: { size: 18, style: 'bold' },
    subheading: { size: 14, style: 'bold' },
    body: { size: 12, style: 'normal' },
    small: { size: 10, style: 'normal' }
  },
  colors: {
    primary: '#6B46C1',
    secondary: '#666666',
    text: '#1A1A1A',
    light: '#F5F5F5',
    border: '#E0E0E0'
  }
};

/**
 * Generate PDF from HTML element
 * @param {HTMLElement} element - The element to convert to PDF
 * @param {string} filename - The filename for the PDF
 * @param {Object} options - Additional options
 */
export async function generatePDFFromElement(element, filename = 'document.pdf', options = {}) {
  try {
    // Show loading state
    const loadingDiv = document.createElement('div');
    loadingDiv.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                  background: rgba(0,0,0,0.5); display: flex; align-items: center; 
                  justify-content: center; z-index: 9999;">
        <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
          <div style="margin-bottom: 10px;">Generating PDF...</div>
          <div style="width: 200px; height: 4px; background: #e0e0e0; border-radius: 2px; overflow: hidden;">
            <div style="width: 50%; height: 100%; background: #6B46C1; animation: progress 2s infinite;"></div>
          </div>
        </div>
      </div>
      <style>
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      </style>
    `;
    document.body.appendChild(loadingDiv);

    // Create canvas from element
    const canvas = await html2canvas(element, {
      scale: 2, // Higher quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    // Calculate dimensions
    const imgWidth = PDF_CONFIG.pageSize.width - (PDF_CONFIG.margins.left + PDF_CONFIG.margins.right);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: imgHeight > imgWidth ? 'portrait' : 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Add margins visually
    if (options.showMargins !== false) {
      pdf.setDrawColor(240);
      pdf.setLineWidth(0.1);
      pdf.rect(
        PDF_CONFIG.margins.left - 10,
        PDF_CONFIG.margins.top - 10,
        PDF_CONFIG.pageSize.width - (PDF_CONFIG.margins.left + PDF_CONFIG.margins.right) + 20,
        PDF_CONFIG.pageSize.height - (PDF_CONFIG.margins.top + PDF_CONFIG.margins.bottom) + 20
      );
    }

    // Add content with pagination
    let yPosition = PDF_CONFIG.margins.top;
    let remainingHeight = imgHeight;
    let sourceY = 0;

    while (remainingHeight > 0) {
      const pageHeight = PDF_CONFIG.pageSize.height - (PDF_CONFIG.margins.top + PDF_CONFIG.margins.bottom);
      const chunkHeight = Math.min(remainingHeight, pageHeight);
      
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        PDF_CONFIG.margins.left,
        yPosition,
        imgWidth,
        chunkHeight,
        undefined,
        'FAST',
        0,
        sourceY
      );

      remainingHeight -= chunkHeight;
      sourceY += (chunkHeight * canvas.height) / imgHeight;

      if (remainingHeight > 0) {
        pdf.addPage();
        yPosition = PDF_CONFIG.margins.top;
      }
    }

    // Remove loading state
    document.body.removeChild(loadingDiv);

    // Auto-download the PDF
    pdf.save(filename);

    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

/**
 * Generate Recipe PDF
 */
export async function generateRecipePDF(recipe) {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  let yPosition = PDF_CONFIG.margins.top;

  // Add visual margin indicators
  pdf.setDrawColor(240);
  pdf.setLineWidth(0.1);
  pdf.rect(
    PDF_CONFIG.margins.left - 10,
    PDF_CONFIG.margins.top - 10,
    PDF_CONFIG.pageSize.width - (PDF_CONFIG.margins.left + PDF_CONFIG.margins.right) + 20,
    PDF_CONFIG.pageSize.height - (PDF_CONFIG.margins.top + PDF_CONFIG.margins.bottom) + 20
  );

  // Title
  pdf.setFontSize(PDF_CONFIG.fonts.title.size);
  pdf.setTextColor(PDF_CONFIG.colors.primary);
  pdf.text(recipe.name || 'Untitled Recipe', PDF_CONFIG.margins.left, yPosition);
  yPosition += 15;

  // Recipe meta info
  pdf.setFontSize(PDF_CONFIG.fonts.body.size);
  pdf.setTextColor(PDF_CONFIG.colors.secondary);
  
  if (recipe.serves) {
    pdf.text(`Serves: ${recipe.serves}`, PDF_CONFIG.margins.left, yPosition);
    yPosition += 7;
  }

  if (recipe.prep_time || recipe.cook_time || recipe.total_time) {
    const times = [];
    if (recipe.prep_time) times.push(`Prep: ${recipe.prep_time} min`);
    if (recipe.cook_time) times.push(`Cook: ${recipe.cook_time} min`);
    if (recipe.total_time) times.push(`Total: ${recipe.total_time} min`);
    pdf.text(times.join(' | '), PDF_CONFIG.margins.left, yPosition);
    yPosition += 10;
  }

  // Divider
  pdf.setDrawColor(PDF_CONFIG.colors.border);
  pdf.line(PDF_CONFIG.margins.left, yPosition, PDF_CONFIG.pageSize.width - PDF_CONFIG.margins.right, yPosition);
  yPosition += 10;

  // Ingredients
  pdf.setFontSize(PDF_CONFIG.fonts.heading.size);
  pdf.setTextColor(PDF_CONFIG.colors.text);
  pdf.text('Ingredients', PDF_CONFIG.margins.left, yPosition);
  yPosition += 10;

  pdf.setFontSize(PDF_CONFIG.fonts.body.size);
  pdf.setTextColor(PDF_CONFIG.colors.text);

  // Handle sections or regular ingredients
  if (recipe.sections && recipe.sections.length > 0) {
    recipe.sections.forEach(section => {
      // Section title
      pdf.setFontSize(PDF_CONFIG.fonts.subheading.size);
      pdf.setTextColor(PDF_CONFIG.colors.primary);
      pdf.text(section.label, PDF_CONFIG.margins.left + 5, yPosition);
      yPosition += 7;

      // Section ingredients
      pdf.setFontSize(PDF_CONFIG.fonts.body.size);
      pdf.setTextColor(PDF_CONFIG.colors.text);
      section.ingredients.forEach(ingredient => {
        const lines = pdf.splitTextToSize(`• ${ingredient}`, PDF_CONFIG.pageSize.width - PDF_CONFIG.margins.left - PDF_CONFIG.margins.right - 10);
        lines.forEach(line => {
          if (yPosition > PDF_CONFIG.pageSize.height - PDF_CONFIG.margins.bottom) {
            pdf.addPage();
            yPosition = PDF_CONFIG.margins.top;
          }
          pdf.text(line, PDF_CONFIG.margins.left + 10, yPosition);
          yPosition += 6;
        });
      });
      yPosition += 5;
    });
  } else if (recipe.ingredients) {
    recipe.ingredients.forEach(ingredient => {
      const lines = pdf.splitTextToSize(`• ${ingredient}`, PDF_CONFIG.pageSize.width - PDF_CONFIG.margins.left - PDF_CONFIG.margins.right - 10);
      lines.forEach(line => {
        if (yPosition > PDF_CONFIG.pageSize.height - PDF_CONFIG.margins.bottom) {
          pdf.addPage();
          yPosition = PDF_CONFIG.margins.top;
        }
        pdf.text(line, PDF_CONFIG.margins.left + 5, yPosition);
        yPosition += 6;
      });
    });
  }

  yPosition += 5;

  // Instructions
  if (yPosition > PDF_CONFIG.pageSize.height - PDF_CONFIG.margins.bottom - 20) {
    pdf.addPage();
    yPosition = PDF_CONFIG.margins.top;
  }

  pdf.setFontSize(PDF_CONFIG.fonts.heading.size);
  pdf.setTextColor(PDF_CONFIG.colors.text);
  pdf.text('Instructions', PDF_CONFIG.margins.left, yPosition);
  yPosition += 10;

  pdf.setFontSize(PDF_CONFIG.fonts.body.size);
  const instructionLines = pdf.splitTextToSize(recipe.instructions || '', PDF_CONFIG.pageSize.width - PDF_CONFIG.margins.left - PDF_CONFIG.margins.right);
  instructionLines.forEach(line => {
    if (yPosition > PDF_CONFIG.pageSize.height - PDF_CONFIG.margins.bottom) {
      pdf.addPage();
      yPosition = PDF_CONFIG.margins.top;
    }
    pdf.text(line, PDF_CONFIG.margins.left, yPosition);
    yPosition += 6;
  });

  // Notes
  if (recipe.notes) {
    yPosition += 10;
    if (yPosition > PDF_CONFIG.pageSize.height - PDF_CONFIG.margins.bottom - 20) {
      pdf.addPage();
      yPosition = PDF_CONFIG.margins.top;
    }

    pdf.setFontSize(PDF_CONFIG.fonts.heading.size);
    pdf.text('Notes', PDF_CONFIG.margins.left, yPosition);
    yPosition += 7;

    pdf.setFontSize(PDF_CONFIG.fonts.body.size);
    const noteLines = pdf.splitTextToSize(recipe.notes, PDF_CONFIG.pageSize.width - PDF_CONFIG.margins.left - PDF_CONFIG.margins.right);
    noteLines.forEach(line => {
      if (yPosition > PDF_CONFIG.pageSize.height - PDF_CONFIG.margins.bottom) {
        pdf.addPage();
        yPosition = PDF_CONFIG.margins.top;
      }
      pdf.text(line, PDF_CONFIG.margins.left, yPosition);
      yPosition += 6;
    });
  }

  // Footer on each page
  const pageCount = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(PDF_CONFIG.fonts.small.size);
    pdf.setTextColor(PDF_CONFIG.colors.secondary);
    pdf.text(
      `Mountain Medicine Kitchen • ${new Date().toLocaleDateString()}`,
      PDF_CONFIG.margins.left,
      PDF_CONFIG.pageSize.height - 20
    );
    pdf.text(
      `Page ${i} of ${pageCount}`,
      PDF_CONFIG.pageSize.width - PDF_CONFIG.margins.right - 20,
      PDF_CONFIG.pageSize.height - 20
    );
  }

  // Auto-download
  pdf.save(`${recipe.name || 'recipe'}-${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Generate Menu PDF
 */
export async function generateMenuPDF(menu, event) {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  let yPosition = PDF_CONFIG.margins.top;

  // Header
  pdf.setFontSize(PDF_CONFIG.fonts.title.size);
  pdf.setTextColor(PDF_CONFIG.colors.primary);
  pdf.text('Mountain Medicine Kitchen', PDF_CONFIG.margins.left, yPosition);
  yPosition += 15;

  // Event info
  if (event) {
    pdf.setFontSize(PDF_CONFIG.fonts.heading.size);
    pdf.setTextColor(PDF_CONFIG.colors.text);
    pdf.text(event.name, PDF_CONFIG.margins.left, yPosition);
    yPosition += 10;

    pdf.setFontSize(PDF_CONFIG.fonts.body.size);
    pdf.setTextColor(PDF_CONFIG.colors.secondary);
    
    if (event.start_date && event.end_date) {
      const startDate = new Date(event.start_date);
      const endDate = new Date(event.end_date);
      pdf.text(
        `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
        PDF_CONFIG.margins.left,
        yPosition
      );
      yPosition += 7;
    }

    if (event.guest_count) {
      pdf.text(`Guests: ${event.guest_count}`, PDF_CONFIG.margins.left, yPosition);
      yPosition += 10;
    }
  }

  // Menu name
  pdf.setFontSize(PDF_CONFIG.fonts.heading.size);
  pdf.setTextColor(PDF_CONFIG.colors.text);
  pdf.text(menu.name || 'Menu', PDF_CONFIG.margins.left, yPosition);
  yPosition += 15;

  // Days and meals
  if (menu.days) {
    menu.days.forEach((day, dayIndex) => {
      // Check if we need a new page
      if (yPosition > PDF_CONFIG.pageSize.height - PDF_CONFIG.margins.bottom - 40) {
        pdf.addPage();
        yPosition = PDF_CONFIG.margins.top;
      }

      // Day header
      pdf.setFontSize(PDF_CONFIG.fonts.subheading.size);
      pdf.setTextColor(PDF_CONFIG.colors.primary);
      pdf.text(
        `${day.day_label || `Day ${dayIndex + 1}`} - ${new Date(day.date).toLocaleDateString()}`,
        PDF_CONFIG.margins.left,
        yPosition
      );
      yPosition += 10;

      // Meals
      day.meals.forEach(meal => {
        pdf.setFontSize(PDF_CONFIG.fonts.body.size);
        pdf.setTextColor(PDF_CONFIG.colors.text);
        pdf.setFont(undefined, 'bold');
        pdf.text(
          `${meal.type.charAt(0).toUpperCase() + meal.type.slice(1)} ${meal.time ? `- ${meal.time}` : ''}`,
          PDF_CONFIG.margins.left + 5,
          yPosition
        );
        pdf.setFont(undefined, 'normal');
        yPosition += 7;

        // Courses
        meal.courses.forEach(course => {
          const courseText = `• ${course.name}${course.servings ? ` (Serves ${course.servings})` : ''}`;
          const lines = pdf.splitTextToSize(
            courseText,
            PDF_CONFIG.pageSize.width - PDF_CONFIG.margins.left - PDF_CONFIG.margins.right - 15
          );
          lines.forEach(line => {
            if (yPosition > PDF_CONFIG.pageSize.height - PDF_CONFIG.margins.bottom) {
              pdf.addPage();
              yPosition = PDF_CONFIG.margins.top;
            }
            pdf.text(line, PDF_CONFIG.margins.left + 10, yPosition);
            yPosition += 6;
          });

          // Course notes
          if (course.notes) {
            pdf.setFontSize(PDF_CONFIG.fonts.small.size);
            pdf.setTextColor(PDF_CONFIG.colors.secondary);
            const noteLines = pdf.splitTextToSize(
              course.notes,
              PDF_CONFIG.pageSize.width - PDF_CONFIG.margins.left - PDF_CONFIG.margins.right - 20
            );
            noteLines.forEach(line => {
              if (yPosition > PDF_CONFIG.pageSize.height - PDF_CONFIG.margins.bottom) {
                pdf.addPage();
                yPosition = PDF_CONFIG.margins.top;
              }
              pdf.text(line, PDF_CONFIG.margins.left + 15, yPosition);
              yPosition += 5;
            });
            pdf.setFontSize(PDF_CONFIG.fonts.body.size);
            pdf.setTextColor(PDF_CONFIG.colors.text);
          }
        });
        yPosition += 5;
      });
      yPosition += 10;
    });
  }

  // Footer on each page
  const pageCount = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(PDF_CONFIG.fonts.small.size);
    pdf.setTextColor(PDF_CONFIG.colors.secondary);
    pdf.text(
      `Mountain Medicine Kitchen • ${new Date().toLocaleDateString()}`,
      PDF_CONFIG.margins.left,
      PDF_CONFIG.pageSize.height - 20
    );
    pdf.text(
      `Page ${i} of ${pageCount}`,
      PDF_CONFIG.pageSize.width - PDF_CONFIG.margins.right - 20,
      PDF_CONFIG.pageSize.height - 20
    );
  }

  // Auto-download
  pdf.save(`${menu.name || 'menu'}-${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Generate Event PDF
 */
export async function generateEventPDF(event, menus = []) {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  let yPosition = PDF_CONFIG.margins.top;

  // Title
  pdf.setFontSize(PDF_CONFIG.fonts.title.size);
  pdf.setTextColor(PDF_CONFIG.colors.primary);
  pdf.text('Event Details', PDF_CONFIG.margins.left, yPosition);
  yPosition += 15;

  // Event name
  pdf.setFontSize(PDF_CONFIG.fonts.heading.size);
  pdf.setTextColor(PDF_CONFIG.colors.text);
  pdf.text(event.name, PDF_CONFIG.margins.left, yPosition);
  yPosition += 15;

  // Event details
  pdf.setFontSize(PDF_CONFIG.fonts.body.size);
  pdf.setTextColor(PDF_CONFIG.colors.text);

  // Dates
  if (event.start_date) {
    const startDate = new Date(event.start_date);
    const endDate = event.end_date ? new Date(event.end_date) : startDate;
    
    pdf.text('Dates:', PDF_CONFIG.margins.left, yPosition);
    pdf.text(
      `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      PDF_CONFIG.margins.left + 30,
      yPosition
    );
    yPosition += 7;
  }

  // Location
  if (event.location) {
    pdf.text('Location:', PDF_CONFIG.margins.left, yPosition);
    pdf.text(event.location, PDF_CONFIG.margins.left + 30, yPosition);
    yPosition += 7;
  }

  // Guest count
  if (event.guest_count) {
    pdf.text('Guests:', PDF_CONFIG.margins.left, yPosition);
    pdf.text(event.guest_count.toString(), PDF_CONFIG.margins.left + 30, yPosition);
    yPosition += 10;
  }

  // Dietary restrictions
  if ((event.allergens && event.allergens.length > 0) || 
      (event.dietary_restrictions && event.dietary_restrictions.length > 0)) {
    yPosition += 5;
    pdf.setFontSize(PDF_CONFIG.fonts.subheading.size);
    pdf.text('Dietary Requirements', PDF_CONFIG.margins.left, yPosition);
    yPosition += 7;

    pdf.setFontSize(PDF_CONFIG.fonts.body.size);
    
    if (event.allergens && event.allergens.length > 0) {
      pdf.text('Allergens:', PDF_CONFIG.margins.left, yPosition);
      pdf.text(event.allergens.join(', '), PDF_CONFIG.margins.left + 30, yPosition);
      yPosition += 7;
    }

    if (event.dietary_restrictions && event.dietary_restrictions.length > 0) {
      pdf.text('Diets:', PDF_CONFIG.margins.left, yPosition);
      pdf.text(event.dietary_restrictions.join(', '), PDF_CONFIG.margins.left + 30, yPosition);
      yPosition += 7;
    }
  }

  // Description
  if (event.description) {
    yPosition += 10;
    pdf.setFontSize(PDF_CONFIG.fonts.subheading.size);
    pdf.text('Description', PDF_CONFIG.margins.left, yPosition);
    yPosition += 7;

    pdf.setFontSize(PDF_CONFIG.fonts.body.size);
    const descLines = pdf.splitTextToSize(
      event.description,
      PDF_CONFIG.pageSize.width - PDF_CONFIG.margins.left - PDF_CONFIG.margins.right
    );
    descLines.forEach(line => {
      if (yPosition > PDF_CONFIG.pageSize.height - PDF_CONFIG.margins.bottom) {
        pdf.addPage();
        yPosition = PDF_CONFIG.margins.top;
      }
      pdf.text(line, PDF_CONFIG.margins.left, yPosition);
      yPosition += 6;
    });
  }

  // Menus
  if (menus.length > 0) {
    yPosition += 10;
    pdf.setFontSize(PDF_CONFIG.fonts.subheading.size);
    pdf.text('Menus', PDF_CONFIG.margins.left, yPosition);
    yPosition += 7;

    pdf.setFontSize(PDF_CONFIG.fonts.body.size);
    menus.forEach(menu => {
      pdf.text(`• ${menu.name}`, PDF_CONFIG.margins.left, yPosition);
      yPosition += 6;
    });
  }

  // Footer
  pdf.setFontSize(PDF_CONFIG.fonts.small.size);
  pdf.setTextColor(PDF_CONFIG.colors.secondary);
  pdf.text(
    `Mountain Medicine Kitchen • Generated ${new Date().toLocaleDateString()}`,
    PDF_CONFIG.margins.left,
    PDF_CONFIG.pageSize.height - 20
  );

  // Auto-download
  pdf.save(`${event.name || 'event'}-details-${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Create print-friendly styles with visible margins
 */
export function injectPrintStyles() {
  const styleId = 'pdf-print-styles';
  
  // Remove existing styles if any
  const existing = document.getElementById(styleId);
  if (existing) {
    existing.remove();
  }

  const styles = document.createElement('style');
  styles.id = styleId;
  styles.innerHTML = `
    @media print {
      @page {
        size: A4;
        margin: 0;
      }
      
      body {
        margin: 0;
        padding: 0;
      }
      
      .print-container {
        position: relative;
        padding: 40mm;
        min-height: 297mm;
        box-sizing: border-box;
      }
      
      /* Visual margin indicators */
      .print-container::before {
        content: '';
        position: absolute;
        top: 30mm;
        left: 30mm;
        right: 30mm;
        bottom: 30mm;
        border: 1px dashed #e0e0e0;
        pointer-events: none;
        z-index: -1;
      }
      
      /* Hide non-printable elements */
      .no-print,
      nav,
      .header-actions,
      .form-actions,
      button {
        display: none !important;
      }
      
      /* Ensure content breaks properly */
      .page-break {
        page-break-after: always;
      }
      
      .avoid-break {
        page-break-inside: avoid;
      }
      
      /* Better text rendering */
      * {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        color-adjust: exact;
      }
      
      /* Font adjustments for print */
      body {
        font-size: 12pt;
        line-height: 1.5;
      }
      
      h1 { font-size: 24pt; }
      h2 { font-size: 18pt; }
      h3 { font-size: 14pt; }
      h4 { font-size: 12pt; }
    }
    
    /* Screen preview styles */
    @media screen {
      .print-preview {
        max-width: 210mm;
        margin: 0 auto;
        background: white;
        box-shadow: 0 0 20px rgba(0,0,0,0.1);
        position: relative;
      }
      
      .print-preview::before {
        content: '';
        position: absolute;
        top: 40mm;
        left: 40mm;
        right: 40mm;
        bottom: 40mm;
        border: 1px dashed #e0e0e0;
        pointer-events: none;
        z-index: 0;
      }
      
      .print-content {
        position: relative;
        padding: 40mm;
        z-index: 1;
      }
    }
  `;
  
  document.head.appendChild(styles);
}

/**
 * Enhanced print function that shows margins and auto-saves as PDF
 */
export function enhancedPrint(title = 'document') {
  // Inject print styles
  injectPrintStyles();
  
  // Set document title for PDF filename
  const originalTitle = document.title;
  document.title = title;
  
  // Add print-specific class to body
  document.body.classList.add('printing');
  
  // Trigger print dialog
  setTimeout(() => {
    window.print();
    
    // Restore original state after print
    setTimeout(() => {
      document.title = originalTitle;
      document.body.classList.remove('printing');
    }, 1000);
  }, 100);
}

/**
 * Generate PDF for a shopping list
 */
export async function generateShoppingListFromObjectPDF(shoppingList) {
  const element = document.createElement('div');
  element.style.cssText = 'position: absolute; left: -9999px; width: 794px; padding: 40px; background: white; font-family: Arial, sans-serif;';
  
  // Generate HTML for shopping list
  let html = `
    <h1 style="text-align: center; margin-bottom: 20px; color: #333;">${shoppingList.name}</h1>
    ${shoppingList.event_name ? `<p style="text-align: center; margin-bottom: 30px; color: #666;"><strong>Event:</strong> ${shoppingList.event_name}</p>` : ''}
    ${shoppingList.notes ? `<div style="background: #f5f5f5; padding: 15px; margin-bottom: 30px; border-radius: 5px;"><p style="margin: 0;"><strong>Notes:</strong> ${shoppingList.notes}</p></div>` : ''}
  `;

  // Group items by category if requested
  const groups = {};
  if (shoppingList.group_by === 'category') {
    shoppingList.items.forEach(item => {
      const category = item.category || 'Other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
    });
  } else {
    groups['All Items'] = shoppingList.items;
  }

  // Add items by group
  Object.entries(groups).forEach(([groupName, items]) => {
    if (shoppingList.group_by === 'category') {
      html += `<h2 style="margin-top: 30px; margin-bottom: 15px; color: #333; border-bottom: 2px solid #007bff; padding-bottom: 5px;">${groupName}</h2>`;
    }
    
    html += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">';
    items.forEach(item => {
      const checkBox = item.checked ? '☑' : '☐';
      html += `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="width: 30px; padding: 8px 5px; font-size: 20px; vertical-align: top;">${checkBox}</td>
          <td style="padding: 8px;">
            <strong>${item.quantity || ''} ${item.unit || ''}</strong> ${item.name}
            ${item.notes ? `<br><small style="color: #666; font-style: italic;">${item.notes}</small>` : ''}
          </td>
        </tr>
      `;
    });
    html += '</table>';
  });
  
  element.innerHTML = html;
  document.body.appendChild(element);

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: 'white',
      logging: false
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Generate filename
    const date = new Date().toISOString().split('T')[0];
    const safeListName = shoppingList.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const filename = `shopping-list-${safeListName}-${date}.pdf`;
    
    pdf.save(filename);
  } finally {
    document.body.removeChild(element);
  }
}