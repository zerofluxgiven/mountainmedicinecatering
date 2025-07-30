#!/usr/bin/env node

/**
 * Detect duplicate and similar components/functionality in Mountain Medicine Kitchen
 * This will help identify if there are multiple versions of the same feature
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Directories to analyze
const SRC_DIR = path.join(__dirname, 'src');
const PAGES_DIR = path.join(SRC_DIR, 'pages');
const COMPONENTS_DIR = path.join(SRC_DIR, 'components');

// Track findings
const componentsByName = new Map();
const componentsByFunction = new Map();
const routeDefinitions = new Map();
const similarComponents = [];
const fileHashes = new Map();

// Helper to get file hash
function getFileHash(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('md5').update(content).digest('hex');
}

// Helper to extract component info
function analyzeComponent(filePath, content) {
  const info = {
    path: filePath,
    relativePath: path.relative(SRC_DIR, filePath),
    name: path.basename(filePath, path.extname(filePath)),
    exports: [],
    imports: [],
    routes: [],
    functionality: [],
    size: content.length,
    lines: content.split('\n').length,
    hash: getFileHash(filePath)
  };

  // Extract exports
  const exportMatches = content.matchAll(/export\s+(?:default\s+)?(?:function|const|class)\s+(\w+)/g);
  for (const match of exportMatches) {
    info.exports.push(match[1]);
  }

  // Extract imports
  const importMatches = content.matchAll(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g);
  for (const match of importMatches) {
    info.imports.push(match[1]);
  }

  // Detect functionality patterns
  if (content.includes('MenuPlannerCalendar') || content.includes('menu planner')) {
    info.functionality.push('menu-planning');
  }
  if (content.includes('Recipe') && (content.includes('Edit') || content.includes('Editor'))) {
    info.functionality.push('recipe-editing');
  }
  if (content.includes('Event') && (content.includes('Edit') || content.includes('Editor'))) {
    info.functionality.push('event-editing');
  }
  if (content.includes('Shopping') || content.includes('shopping')) {
    info.functionality.push('shopping-list');
  }
  if (content.includes('allergen') || content.includes('Allergen')) {
    info.functionality.push('allergen-management');
  }
  if (content.includes('PDF') || content.includes('pdf')) {
    info.functionality.push('pdf-generation');
  }
  if (content.includes('<Route') || content.includes('path=')) {
    info.functionality.push('routing');
  }

  // Extract route definitions
  const routeMatches = content.matchAll(/<Route\s+path=["']([^"']+)["'].*?(?:element|component)={([^}]+)}/g);
  for (const match of routeMatches) {
    info.routes.push({ path: match[1], component: match[2] });
  }

  return info;
}

// Find similar component names
function findSimilarNames(name1, name2) {
  // Check for exact match
  if (name1 === name2) return 1.0;
  
  // Check for case-insensitive match
  if (name1.toLowerCase() === name2.toLowerCase()) return 0.9;
  
  // Check if one contains the other
  const lower1 = name1.toLowerCase();
  const lower2 = name2.toLowerCase();
  if (lower1.includes(lower2) || lower2.includes(lower1)) {
    return 0.8;
  }
  
  // Check for common patterns
  const patterns = [
    { pattern: /(.*)Editor$/, type: 'editor' },
    { pattern: /(.*)Viewer$/, type: 'viewer' },
    { pattern: /(.*)List$/, type: 'list' },
    { pattern: /(.*)Planner$/, type: 'planner' },
    { pattern: /(.*)Manager$/, type: 'manager' }
  ];
  
  for (const p of patterns) {
    const match1 = name1.match(p.pattern);
    const match2 = name2.match(p.pattern);
    if (match1 && match2 && match1[1] === match2[1]) {
      return 0.7; // Same base name, different suffix
    }
  }
  
  // Check Levenshtein distance
  const distance = levenshteinDistance(lower1, lower2);
  const maxLen = Math.max(name1.length, name2.length);
  const similarity = 1 - (distance / maxLen);
  
  return similarity > 0.6 ? similarity : 0;
}

// Levenshtein distance algorithm
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Analyze directory recursively
function analyzeDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      analyzeDirectory(filePath);
    } else if ((file.endsWith('.jsx') || file.endsWith('.js')) && !file.includes('.test.')) {
      const content = fs.readFileSync(filePath, 'utf8');
      const info = analyzeComponent(filePath, content);
      
      // Group by name
      if (!componentsByName.has(info.name)) {
        componentsByName.set(info.name, []);
      }
      componentsByName.get(info.name).push(info);
      
      // Group by functionality
      info.functionality.forEach(func => {
        if (!componentsByFunction.has(func)) {
          componentsByFunction.set(func, []);
        }
        componentsByFunction.get(func).push(info);
      });
      
      // Store routes
      if (info.routes.length > 0) {
        routeDefinitions.set(filePath, info.routes);
      }
      
      // Store file hash
      fileHashes.set(filePath, info.hash);
    }
  });
}

// Analyze App.jsx for route usage
function analyzeRoutes() {
  const appPath = path.join(SRC_DIR, 'App.jsx');
  if (fs.existsSync(appPath)) {
    const content = fs.readFileSync(appPath, 'utf8');
    
    // Extract all imports
    const imports = new Map();
    const importMatches = content.matchAll(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g);
    for (const match of importMatches) {
      imports.set(match[1], match[2]);
    }
    
    // Extract all routes
    const routes = [];
    const routeMatches = content.matchAll(/<Route\s+path=["']([^"']+)["'].*?(?:element|component)={(?:<)?(\w+)/g);
    for (const match of routeMatches) {
      routes.push({
        path: match[1],
        component: match[2],
        importPath: imports.get(match[2]) || 'not found'
      });
    }
    
    return { imports, routes };
  }
  return { imports: new Map(), routes: [] };
}

// Find duplicate functionality
function findDuplicates() {
  // Find components with same name
  console.log('\n🔍 DUPLICATE ANALYSIS REPORT\n');
  console.log('=' .repeat(80) + '\n');
  
  console.log('📁 COMPONENTS WITH IDENTICAL NAMES:');
  console.log('-'.repeat(80));
  let foundIdentical = false;
  componentsByName.forEach((components, name) => {
    if (components.length > 1) {
      foundIdentical = true;
      console.log(`\n"${name}" found in ${components.length} locations:`);
      components.forEach(comp => {
        console.log(`  - ${comp.relativePath} (${comp.lines} lines, ${comp.exports.join(', ')})`);
      });
    }
  });
  if (!foundIdentical) {
    console.log('✅ No components with identical names found\n');
  }
  
  // Find similar component names
  console.log('\n🔄 SIMILAR COMPONENT NAMES:');
  console.log('-'.repeat(80));
  const names = Array.from(componentsByName.keys());
  let foundSimilar = false;
  
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const similarity = findSimilarNames(names[i], names[j]);
      if (similarity > 0.6 && similarity < 1.0) {
        foundSimilar = true;
        const components1 = componentsByName.get(names[i]);
        const components2 = componentsByName.get(names[j]);
        
        console.log(`\n"${names[i]}" ↔️ "${names[j]}" (${Math.round(similarity * 100)}% similar)`);
        components1.forEach(c => console.log(`  ${names[i]}: ${c.relativePath}`));
        components2.forEach(c => console.log(`  ${names[j]}: ${c.relativePath}`));
      }
    }
  }
  if (!foundSimilar) {
    console.log('✅ No suspiciously similar component names found\n');
  }
  
  // Analyze route usage
  console.log('\n🚦 ROUTE ANALYSIS:');
  console.log('-'.repeat(80));
  const appAnalysis = analyzeRoutes();
  
  console.log('\nComponents imported in App.jsx but not used in routes:');
  const usedComponents = new Set(appAnalysis.routes.map(r => r.component));
  let foundUnused = false;
  appAnalysis.imports.forEach((importPath, componentName) => {
    if (!usedComponents.has(componentName) && 
        (componentName.includes('Page') || componentName.includes('View') || 
         componentName.includes('Editor') || componentName.includes('List'))) {
      foundUnused = true;
      console.log(`  - ${componentName} from ${importPath}`);
    }
  });
  if (!foundUnused) {
    console.log('  ✅ All imported components are used in routes\n');
  }
  
  // Find duplicate functionality
  console.log('\n🔧 COMPONENTS BY FUNCTIONALITY:');
  console.log('-'.repeat(80));
  componentsByFunction.forEach((components, func) => {
    if (components.length > 1) {
      console.log(`\n${func.toUpperCase()} (${components.length} components):`);
      components.sort((a, b) => b.lines - a.lines).forEach(comp => {
        console.log(`  - ${comp.relativePath} (${comp.lines} lines)`);
      });
    }
  });
  
  // Find identical files
  console.log('\n🎯 IDENTICAL FILES (same content hash):');
  console.log('-'.repeat(80));
  const hashGroups = new Map();
  fileHashes.forEach((hash, file) => {
    if (!hashGroups.has(hash)) {
      hashGroups.set(hash, []);
    }
    hashGroups.get(hash).push(file);
  });
  
  let foundIdenticalFiles = false;
  hashGroups.forEach((files, hash) => {
    if (files.length > 1) {
      foundIdenticalFiles = true;
      console.log('\nIdentical files:');
      files.forEach(file => {
        console.log(`  - ${path.relative(SRC_DIR, file)}`);
      });
    }
  });
  if (!foundIdenticalFiles) {
    console.log('✅ No identical files found\n');
  }
  
  // Specific checks for menu functionality
  console.log('\n📋 MENU-RELATED COMPONENTS:');
  console.log('-'.repeat(80));
  const menuComponents = [];
  componentsByName.forEach((components, name) => {
    if (name.toLowerCase().includes('menu')) {
      components.forEach(comp => {
        menuComponents.push({
          name: comp.name,
          path: comp.relativePath,
          lines: comp.lines,
          imports: comp.imports.filter(i => i.includes('Menu')).length,
          exports: comp.exports
        });
      });
    }
  });
  
  menuComponents.sort((a, b) => b.lines - a.lines).forEach(comp => {
    console.log(`\n${comp.name}:`);
    console.log(`  Path: ${comp.path}`);
    console.log(`  Size: ${comp.lines} lines`);
    console.log(`  Exports: ${comp.exports.join(', ')}`);
  });
  
  // Active routes using menu components
  console.log('\n\n📍 ACTIVE MENU ROUTES IN APP.JSX:');
  console.log('-'.repeat(80));
  appAnalysis.routes.filter(r => r.path.includes('menu')).forEach(route => {
    console.log(`  ${route.path} → ${route.component}`);
  });
}

// Main execution
console.log('🔍 Analyzing Mountain Medicine Kitchen for duplicates...\n');

analyzeDirectory(SRC_DIR);
findDuplicates();

console.log('\n\n💡 RECOMMENDATIONS:');
console.log('=' .repeat(80));
console.log('1. Check if MenuEditor and MenuPlanner are the OLD versions');
console.log('2. The ACTIVE menu system appears to be MenuPlannerCalendar/MenuPlannerWrapper');
console.log('3. Look for overlapping functionality in similar-named components');
console.log('4. Consider consolidating components with identical functionality');
console.log('\n✅ Analysis complete! Check the report above for potential issues.');