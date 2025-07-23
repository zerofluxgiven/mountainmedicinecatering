const admin = require("firebase-admin");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

// Color scheme
const COLORS = {
  primary: rgb(0.42, 0.275, 0.757), // Purple #6B46C1
  secondary: rgb(0.4, 0.4, 0.4),
  text: rgb(0.1, 0.1, 0.1),
  light: rgb(0.95, 0.95, 0.95)
};

// Format time from 24-hour to 12-hour with AM/PM
function formatClockTime(timeString) {
  if (!timeString) return null;
  
  const match = timeString.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return timeString;
  
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = hours >= 12 ? 'PM' : 'AM';
  
  if (hours === 0) {
    hours = 12;
  } else if (hours > 12) {
    hours = hours - 12;
  }
  
  return `${hours}:${minutes} ${period}`;
}

async function generateMenuPDF(menuData, eventData) {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Add first page
  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  let yPosition = height - 50;

  // Header
  page.drawText("Mountain Medicine Catering", {
    x: 50,
    y: yPosition,
    size: 24,
    font: helveticaBoldFont,
    color: COLORS.primary,
  });
  yPosition -= 40;

  // Event info if available
  if (eventData) {
    page.drawText(`Event: ${eventData.name}`, {
      x: 50,
      y: yPosition,
      size: 16,
      font: helveticaFont,
      color: COLORS.text,
    });
    yPosition -= 20;

    const eventDate = eventData.event_date?.toDate?.() || new Date(eventData.event_date);
    page.drawText(`Date: ${eventDate.toLocaleDateString("en-US", { 
      weekday: "long", 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    })}`, {
      x: 50,
      y: yPosition,
      size: 14,
      font: helveticaFont,
      color: COLORS.secondary,
    });
    yPosition -= 20;

    if (eventData.start_time || eventData.end_time) {
      const timeStr = eventData.start_time && eventData.end_time
        ? `${formatClockTime(eventData.start_time)} - ${formatClockTime(eventData.end_time)}`
        : eventData.start_time
        ? `Starting at ${formatClockTime(eventData.start_time)}`
        : `Ending at ${formatClockTime(eventData.end_time)}`;
        
      page.drawText(`Time: ${timeStr}`, {
        x: 50,
        y: yPosition,
        size: 14,
        font: helveticaFont,
        color: COLORS.secondary,
      });
      yPosition -= 20;
    }

    if (eventData.guest_count) {
      page.drawText(`Guests: ${eventData.guest_count}`, {
        x: 50,
        y: yPosition,
        size: 14,
        font: helveticaFont,
        color: COLORS.secondary,
      });
      yPosition -= 30;
    }
  }

  // Menu title
  page.drawText(menuData.name || "Menu", {
    x: 50,
    y: yPosition,
    size: 20,
    font: helveticaBoldFont,
    color: COLORS.text,
  });
  yPosition -= 30;

  // Menu type
  if (menuData.type) {
    page.drawText(menuData.type.charAt(0).toUpperCase() + menuData.type.slice(1), {
      x: 50,
      y: yPosition,
      size: 14,
      font: helveticaFont,
      color: COLORS.secondary,
    });
    yPosition -= 40;
  }

  // Process menu sections
  for (const section of menuData.sections || []) {
    // Check if we need a new page
    if (yPosition < 150) {
      page = pdfDoc.addPage();
      yPosition = height - 50;
    }

    // Section header
    page.drawText(section.name.toUpperCase(), {
      x: 50,
      y: yPosition,
      size: 16,
      font: helveticaBoldFont,
      color: COLORS.primary,
    });
    yPosition -= 25;

    // Section items
    for (const item of section.items || []) {
      if (yPosition < 100) {
        page = pdfDoc.addPage();
        yPosition = height - 50;
      }

      // Item name
      page.drawText(`• ${item.name}`, {
        x: 70,
        y: yPosition,
        size: 12,
        font: helveticaFont,
        color: COLORS.text,
      });
      yPosition -= 18;

      // Item notes
      if (item.notes) {
        const notes = wrapText(item.notes, 60);
        for (const line of notes) {
          if (yPosition < 100) {
            page = pdfDoc.addPage();
            yPosition = height - 50;
          }
          page.drawText(line, {
            x: 90,
            y: yPosition,
            size: 10,
            font: timesRomanFont,
            color: COLORS.secondary,
          });
          yPosition -= 15;
        }
      }
      yPosition -= 5;
    }
    yPosition -= 15;
  }

  // Add footer
  const pageCount = pdfDoc.getPageCount();
  for (let i = 0; i < pageCount; i++) {
    const currentPage = pdfDoc.getPage(i);
    currentPage.drawText(`Page ${i + 1} of ${pageCount}`, {
      x: width / 2 - 30,
      y: 30,
      size: 10,
      font: helveticaFont,
      color: COLORS.secondary,
    });
  }

  // Save PDF
  const pdfBytes = await pdfDoc.save();
  
  // Upload to Firebase Storage
  const bucket = admin.storage().bucket();
  const filename = `pdfs/menus/menu_${menuData.id}_${Date.now()}.pdf`;
  const file = bucket.file(filename);
  
  await file.save(pdfBytes, {
    metadata: {
      contentType: "application/pdf",
    },
  });

  // Get download URL
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });

  return url;
}

async function generateShoppingListPDF(eventData, menus, recipes, ingredients, groupBy) {
  const pdfDoc = await PDFDocument.create();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Generate shopping list data
  const shoppingList = generateShoppingListData(eventData, menus, recipes, ingredients);
  const groupedList = groupShoppingList(shoppingList, groupBy, ingredients);

  // Add first page
  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  let yPosition = height - 50;

  // Header
  page.drawText("Shopping List", {
    x: 50,
    y: yPosition,
    size: 24,
    font: helveticaBoldFont,
    color: COLORS.primary,
  });
  yPosition -= 30;

  // Event info
  page.drawText(eventData.name, {
    x: 50,
    y: yPosition,
    size: 16,
    font: helveticaFont,
    color: COLORS.text,
  });
  yPosition -= 20;

  const eventDate = eventData.event_date?.toDate?.() || new Date(eventData.event_date);
  page.drawText(`Date: ${eventDate.toLocaleDateString()}`, {
    x: 50,
    y: yPosition,
    size: 12,
    font: helveticaFont,
    color: COLORS.secondary,
  });
  yPosition -= 15;

  if (eventData.start_time || eventData.end_time) {
    const timeStr = eventData.start_time && eventData.end_time
      ? `${formatClockTime(eventData.start_time)} - ${formatClockTime(eventData.end_time)}`
      : eventData.start_time
      ? `Starting at ${formatClockTime(eventData.start_time)}`
      : `Ending at ${formatClockTime(eventData.end_time)}`;
      
    page.drawText(`Time: ${timeStr}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: helveticaFont,
      color: COLORS.secondary,
    });
    yPosition -= 15;
  }

  page.drawText(`Guests: ${eventData.guest_count || "TBD"}`, {
    x: 50,
    y: yPosition,
    size: 12,
    font: helveticaFont,
    color: COLORS.secondary,
  });
  yPosition -= 30;

  // Process groups
  for (const [groupName, items] of Object.entries(groupedList)) {
    // Check if we need a new page
    if (yPosition < 150) {
      page = pdfDoc.addPage();
      yPosition = height - 50;
    }

    // Group header
    page.drawText(groupName.toUpperCase(), {
      x: 50,
      y: yPosition,
      size: 14,
      font: helveticaBoldFont,
      color: COLORS.primary,
    });
    yPosition -= 20;

    // Group items
    for (const item of items) {
      if (yPosition < 60) {
        page = pdfDoc.addPage();
        yPosition = height - 50;
      }

      // Format quantity
      const quantityStr = `${item.quantity.toFixed(2)} ${item.unit}`.padEnd(15);
      
      // Draw checkbox, quantity, and name
      page.drawRectangle({
        x: 50,
        y: yPosition - 10,
        width: 10,
        height: 10,
        borderColor: COLORS.text,
        borderWidth: 1,
      });

      page.drawText(quantityStr, {
        x: 70,
        y: yPosition,
        size: 11,
        font: helveticaFont,
        color: COLORS.text,
      });

      page.drawText(item.name, {
        x: 170,
        y: yPosition,
        size: 11,
        font: helveticaFont,
        color: COLORS.text,
      });

      yPosition -= 18;
    }
    yPosition -= 10;
  }

  // Add footer
  const pageCount = pdfDoc.getPageCount();
  for (let i = 0; i < pageCount; i++) {
    const currentPage = pdfDoc.getPage(i);
    currentPage.drawText(`Page ${i + 1} of ${pageCount}`, {
      x: width / 2 - 30,
      y: 30,
      size: 10,
      font: helveticaFont,
      color: COLORS.secondary,
    });

    currentPage.drawText(`Generated: ${new Date().toLocaleDateString()}`, {
      x: width - 150,
      y: 30,
      size: 10,
      font: helveticaFont,
      color: COLORS.secondary,
    });
  }

  // Save PDF
  const pdfBytes = await pdfDoc.save();
  
  // Upload to Firebase Storage
  const bucket = admin.storage().bucket();
  const filename = `pdfs/shopping-lists/shopping_${eventData.id}_${Date.now()}.pdf`;
  const file = bucket.file(filename);
  
  await file.save(pdfBytes, {
    metadata: {
      contentType: "application/pdf",
    },
  });

  // Get download URL
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });

  return url;
}

function generateShoppingListData(eventData, menus, recipes, ingredients) {
  const shoppingList = {};
  
  menus.forEach(menu => {
    menu.sections?.forEach(section => {
      section.items?.forEach(item => {
        const recipe = recipes.find(r => r.id === item.recipe_id);
        if (!recipe) return;
        
        const recipeServings = recipe.serves || 4;
        const neededServings = eventData.guest_count || 50;
        const multiplier = neededServings / recipeServings;
        
        // Get all ingredients from recipe (handles both old and new format)
        let allIngredients = [];
        if (recipe.sections && Array.isArray(recipe.sections)) {
          // New format with sections
          allIngredients = recipe.sections.flatMap(section => section.ingredients || []);
        } else if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
          // Old format with flat ingredients array
          allIngredients = recipe.ingredients;
        }
        
        allIngredients.forEach(ingredientLine => {
          const parsed = parseIngredientLine(ingredientLine);
          if (!parsed) return;
          
          const key = parsed.name.toLowerCase();
          
          if (!shoppingList[key]) {
            shoppingList[key] = {
              name: parsed.name,
              quantity: 0,
              unit: parsed.unit,
              recipes: []
            };
          }
          
          shoppingList[key].quantity += (parsed.quantity || 1) * multiplier;
          shoppingList[key].recipes.push({
            name: recipe.name,
            menuSection: section.name
          });
        });
      });
    });
  });
  
  return shoppingList;
}

function parseIngredientLine(line) {
  // Simple parsing - in production would be more sophisticated
  const match = line.match(/^([\d.\/\s]+)?\s*([a-zA-Z]+)?\s+(.+)/);
  if (!match) return { name: line, quantity: 1, unit: "each" };
  
  return {
    quantity: parseFloat(match[1]) || 1,
    unit: match[2] || "each",
    name: match[3] || line
  };
}

function groupShoppingList(shoppingList, groupBy, ingredientsDb) {
  const grouped = {};
  
  Object.entries(shoppingList).forEach(([key, item]) => {
    let groupKey;
    
    if (groupBy === "category") {
      const ingredient = ingredientsDb.find(i => 
        i.name.toLowerCase() === item.name.toLowerCase()
      );
      groupKey = ingredient?.category || "other";
    } else if (groupBy === "supplier") {
      const ingredient = ingredientsDb.find(i => 
        i.name.toLowerCase() === item.name.toLowerCase()
      );
      groupKey = ingredient?.preferred_supplier || "Unknown Supplier";
    } else {
      groupKey = item.recipes[0]?.name || "Unknown Recipe";
    }
    
    if (!grouped[groupKey]) {
      grouped[groupKey] = [];
    }
    
    grouped[groupKey].push(item);
  });
  
  // Sort items within each group
  Object.keys(grouped).forEach(key => {
    grouped[key].sort((a, b) => a.name.localeCompare(b.name));
  });
  
  return grouped;
}

function wrapText(text, maxChars) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length + word.length + 1 > maxChars) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine += (currentLine ? " " : "") + word;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

module.exports = {
  generateMenuPDF,
  generateShoppingListPDF
};