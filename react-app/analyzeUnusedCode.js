#!/usr/bin/env node

/**
 * Analyze Mountain Medicine Kitchen codebase for unused code
 * Run with: node analyzeUnusedCode.js
 */

const fs = require('fs');
const path = require('path');

// Directories to analyze
const SRC_DIR = path.join(__dirname, 'src');
const IGNORE_PATTERNS = [
  '__tests__',
  '.test.',
  '.spec.',
  'setupTests',
  'reportWebVitals'
];

// Track imports and exports
const fileExports = new Map();
const fileImports = new Map();
const componentUsage = new Map();

// Helper to check if file should be ignored
function shouldIgnore(filePath) {
  return IGNORE_PATTERNS.some(pattern => filePath.includes(pattern));
}

// Extract exports from a file
function extractExports(filePath, content) {
  const exports = [];
  
  // Default exports
  const defaultExportMatch = content.match(/export\s+default\s+(?:function\s+)?(\w+)/);
  if (defaultExportMatch) {
    exports.push({ name: 'default', actualName: defaultExportMatch[1] });
  }
  
  // Named exports
  const namedExports = content.matchAll(/export\s+(?:const|function|class)\s+(\w+)/g);
  for (const match of namedExports) {
    exports.push({ name: match[1], actualName: match[1] });
  }
  
  // Export statements
  const exportStatements = content.matchAll(/export\s+{\s*([^}]+)\s*}/g);
  for (const match of exportStatements) {
    const names = match[1].split(',').map(n => n.trim());
    names.forEach(name => {
      const [original, alias] = name.split(/\s+as\s+/);
      exports.push({ name: alias || original, actualName: original });
    });
  }
  
  fileExports.set(filePath, exports);
}

// Extract imports from a file
function extractImports(filePath, content) {
  const imports = [];
  
  // Import statements
  const importStatements = content.matchAll(/import\s+(?:(\w+)|{([^}]+)}|\*\s+as\s+(\w+))\s+from\s+['"]([^'"]+)['"]/g);
  for (const match of importStatements) {
    const [, defaultImport, namedImports, namespaceImport, source] = match;
    
    if (defaultImport) {
      imports.push({ name: defaultImport, source, type: 'default' });
    }
    
    if (namedImports) {
      const names = namedImports.split(',').map(n => n.trim());
      names.forEach(name => {
        const [original, alias] = name.split(/\s+as\s+/);
        imports.push({ name: alias || original, source, type: 'named' });
      });
    }
    
    if (namespaceImport) {
      imports.push({ name: namespaceImport, source, type: 'namespace' });
    }
  }
  
  fileImports.set(filePath, imports);
}

// Check component usage in JSX
function checkComponentUsage(filePath, content) {
  const jsxPattern = /<(\w+)[\s>]/g;
  const matches = content.matchAll(jsxPattern);
  
  for (const match of matches) {
    const componentName = match[1];
    // Skip HTML elements
    if (componentName[0] === componentName[0].toUpperCase()) {
      const usage = componentUsage.get(componentName) || [];
      usage.push(filePath);
      componentUsage.set(componentName, usage);
    }
  }
}

// Analyze a file
function analyzeFile(filePath) {
  if (shouldIgnore(filePath)) return;
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  extractExports(filePath, content);
  extractImports(filePath, content);
  checkComponentUsage(filePath, content);
}

// Recursively analyze directory
function analyzeDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      analyzeDirectory(filePath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      analyzeFile(filePath);
    }
  });
}

// Find unused exports
function findUnusedExports() {
  const unusedExports = [];
  
  fileExports.forEach((exports, filePath) => {
    exports.forEach(exp => {
      let isUsed = false;
      
      // Check if imported anywhere
      fileImports.forEach((imports, importerPath) => {
        if (importerPath === filePath) return; // Skip self
        
        imports.forEach(imp => {
          if (imp.source.includes(path.basename(filePath, path.extname(filePath)))) {
            if (exp.name === 'default' && imp.type === 'default') {
              isUsed = true;
            } else if (exp.name === imp.name && imp.type === 'named') {
              isUsed = true;
            }
          }
        });
      });
      
      // Check component usage
      if (exp.actualName && componentUsage.has(exp.actualName)) {
        isUsed = true;
      }
      
      if (!isUsed) {
        unusedExports.push({
          file: path.relative(SRC_DIR, filePath),
          export: exp.name,
          component: exp.actualName
        });
      }
    });
  });
  
  return unusedExports;
}

// Find components that might be unused
function findPotentiallyUnusedComponents() {
  const components = new Map();
  
  // Find all component files
  function findComponents(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        findComponents(filePath);
      } else if ((file.endsWith('.jsx') || file.endsWith('.js')) && 
                 file[0] === file[0].toUpperCase() &&
                 !shouldIgnore(filePath)) {
        const componentName = path.basename(file, path.extname(file));
        components.set(componentName, filePath);
      }
    });
  }
  
  findComponents(path.join(SRC_DIR, 'components'));
  findComponents(path.join(SRC_DIR, 'pages'));
  
  const potentiallyUnused = [];
  components.forEach((filePath, name) => {
    const usage = componentUsage.get(name) || [];
    if (usage.length === 0) {
      potentiallyUnused.push({
        component: name,
        file: path.relative(SRC_DIR, filePath)
      });
    }
  });
  
  return potentiallyUnused;
}

// Main analysis
console.log('🔍 Analyzing Mountain Medicine Kitchen codebase...\n');

analyzeDirectory(SRC_DIR);

const unusedExports = findUnusedExports();
const unusedComponents = findPotentiallyUnusedComponents();

console.log('📊 Analysis Results\n');
console.log('===================\n');

if (unusedExports.length > 0) {
  console.log('🚫 Potentially Unused Exports:');
  unusedExports.forEach(item => {
    console.log(`  - ${item.file}: ${item.export} ${item.component ? `(${item.component})` : ''}`);
  });
  console.log('');
}

if (unusedComponents.length > 0) {
  console.log('🚫 Potentially Unused Components:');
  unusedComponents.forEach(item => {
    console.log(`  - ${item.component} in ${item.file}`);
  });
  console.log('');
}

// Find large files
console.log('📦 Large Files (> 500 lines):');
function findLargeFiles(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findLargeFiles(filePath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').length;
      if (lines > 500) {
        console.log(`  - ${path.relative(SRC_DIR, filePath)}: ${lines} lines`);
      }
    }
  });
}
findLargeFiles(SRC_DIR);

console.log('\n✅ Analysis complete!');
console.log('\nNote: This analysis may have false positives. Always verify before removing code.');
console.log('Components might be used dynamically or through routing.');