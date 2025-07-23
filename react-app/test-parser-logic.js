// Test the parser logic with sample multi-section recipe text
const sampleRecipeText = `
Almond Cherry Streusel Bars
Makes: 25-30 small bars

Almond Shortbread:
• 1 1/2 cups all-purpose flour
• 1/2 cup plus 1 tablespoon granulated sugar
• 1/2 teaspoon baking powder
• 1/4 teaspoon salt
• 1/2 cup cold unsalted butter, cut into cubes
• 1/2 cup almond paste (about 3oz)
• 1/2 teaspoon almond extract

Cherry Filling:
• 1/4 cup water
• 3 tablespoons fresh lemon juice
• 2 tablespoons cornstarch (increase to 3 scant tablespoons if using frozen cherries)
• 4 cups pitted sweet cherries, fresh or frozen
• 1/2 cup granulated sugar
• 1 tablespoon unsalted butter
• pinch salt

Streusel Topping:
• 1/3 cup sliced almonds
• Remaining shortbread mixture

Icing (optional):
• 1/3 cup powdered sugar
• 2 teaspoons milk
• 1/8 teaspoon almond extract

Instructions:
1. To make the shortbread base, combine flour, sugar, baking powder and salt
2. Add butter and almond paste, mix until crumbly
3. Press half into prepared pan
4. For the filling, mix water, lemon juice and cornstarch
5. Cook cherries with sugar until thickened
6. Spread filling over base
7. Crumble remaining shortbread mixture on top
8. Add sliced almonds
9. Bake at 350°F for 35-40 minutes
`;

// Expected structure
const expectedStructure = {
  name: "Almond Cherry Streusel Bars",
  serves: 25, // or could be a range
  sections: [
    {
      label: "Almond Shortbread",
      ingredientCount: 7
    },
    {
      label: "Cherry Filling", 
      ingredientCount: 7
    },
    {
      label: "Streusel Topping",
      ingredientCount: 2
    },
    {
      label: "Icing",
      ingredientCount: 3
    }
  ]
};

console.log("Sample Recipe Text:");
console.log("==================");
console.log(sampleRecipeText);
console.log("\n\nExpected to parse:");
console.log("==================");
console.log("Recipe Name:", expectedStructure.name);
console.log("Serves:", expectedStructure.serves);
console.log("Number of sections:", expectedStructure.sections.length);
expectedStructure.sections.forEach(section => {
  console.log(`- ${section.label}: ${section.ingredientCount} ingredients`);
});

console.log("\n\nThis recipe clearly has 4 distinct sections that should be parsed separately.");
console.log("The parser should identify these sections and organize ingredients accordingly.");