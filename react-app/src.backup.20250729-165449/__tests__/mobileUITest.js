/**
 * Mobile UI Test Suite
 * 
 * This test file simulates mobile viewport conditions and checks for common mobile UI issues
 * across all major components of the Mountain Medicine Kitchen application.
 * 
 * Test Categories:
 * 1. Viewport overflow detection
 * 2. Touch target size validation (minimum 44x44px recommended)
 * 3. Fixed positioning issues
 * 4. Input field accessibility
 * 5. Safe area handling (iOS notch/home indicator)
 * 6. Text readability (font sizes)
 * 7. Scrolling behavior
 * 8. Modal/overlay handling
 */

const fs = require('fs');
const path = require('path');

// Configuration
const MOBILE_VIEWPORT = {
  width: 375,
  height: 667,
  deviceScaleFactor: 2
};

const COMPONENTS_TO_TEST = {
  // Navigation/Layout
  'Layout': {
    cssFiles: ['components/Layout/Layout.css'],
    jsxFiles: ['components/Layout/Layout.jsx'],
    criticalIssues: ['navigation', 'header', 'footer']
  },
  
  // Event Views
  'EventList': {
    cssFiles: ['pages/Dashboard/Dashboard.css'],
    jsxFiles: ['pages/Dashboard/Dashboard.jsx'],
    criticalIssues: ['list-items', 'cards', 'buttons']
  },
  'EventEditor': {
    cssFiles: ['pages/Events/EventEditor.css'],
    jsxFiles: ['pages/Events/EventEditor.jsx'],
    criticalIssues: ['forms', 'inputs', 'date-pickers']
  },
  'EventViewer': {
    cssFiles: ['pages/Events/EventViewer.css'],
    jsxFiles: ['pages/Events/EventViewer.jsx'],
    criticalIssues: ['content-display', 'action-buttons']
  },
  
  // Recipe Views
  'RecipeList': {
    cssFiles: ['pages/Recipes/RecipeList.css'],
    jsxFiles: ['pages/Recipes/RecipeList.jsx'],
    criticalIssues: ['grid-layout', 'cards', 'search']
  },
  'RecipeEditor': {
    cssFiles: ['pages/Recipes/RecipeEditor.css'],
    jsxFiles: ['pages/Recipes/RecipeEditor.jsx'],
    criticalIssues: ['forms', 'ingredient-lists', 'instructions']
  },
  'RecipeViewer': {
    cssFiles: ['pages/Recipes/RecipeViewer.css'],
    jsxFiles: ['pages/Recipes/RecipeViewer.jsx'],
    criticalIssues: ['scaling', 'content-display']
  },
  'RecipeImport': {
    cssFiles: ['pages/Recipes/RecipeImport.css'],
    jsxFiles: ['pages/Recipes/RecipeImport.jsx'],
    criticalIssues: ['file-upload', 'forms']
  },
  
  // Menu Planning
  'MenuPlannerCalendar': {
    cssFiles: ['components/Menu/MenuPlannerCalendar.css'],
    jsxFiles: ['components/Menu/MenuPlannerCalendar.jsx'],
    criticalIssues: ['calendar-layout', 'expandable-sections', 'drag-drop']
  },
  'MenuEditor': {
    cssFiles: ['pages/Menus/MenuEditor.css', 'components/Menu/MealEditor.css'],
    jsxFiles: ['pages/Menus/MenuEditor.jsx', 'components/Menu/MealEditor.jsx'],
    criticalIssues: ['forms', 'recipe-selection']
  },
  
  // AI Chat
  'AIChat': {
    cssFiles: ['pages/Chat/AIChat.css'],
    jsxFiles: ['pages/Chat/AIChat.jsx'],
    criticalIssues: ['fixed-position', 'input-field', 'message-list', 'keyboard-avoidance']
  },
  
  // Login/Auth
  'Login': {
    cssFiles: ['pages/Login/Login.css'],
    jsxFiles: ['pages/Login/Login.jsx'],
    criticalIssues: ['forms', 'inputs', 'buttons']
  },
  
  // Dashboard
  'Dashboard': {
    cssFiles: ['pages/Dashboard/Dashboard.css'],
    jsxFiles: ['pages/Dashboard/Dashboard.jsx'],
    criticalIssues: ['grid-layout', 'cards', 'navigation']
  }
};

// Common mobile CSS issues to check
const MOBILE_CSS_ISSUES = {
  viewportOverflow: {
    patterns: [
      /width:\s*(\d+)(px|vw)/g,
      /min-width:\s*(\d+)px/g,
      /left:\s*-?\d+px/g,
      /right:\s*-?\d+px/g,
      /margin-left:\s*-?\d+px/g,
      /margin-right:\s*-?\d+px/g
    ],
    validate: (match, value, unit) => {
      if (unit === 'px') {
        const px = parseInt(value);
        return px > MOBILE_VIEWPORT.width ? `Width ${px}px exceeds mobile viewport ${MOBILE_VIEWPORT.width}px` : null;
      }
      if (unit === 'vw') {
        const vw = parseInt(value);
        return vw > 100 ? `Width ${vw}vw exceeds viewport` : null;
      }
      return null;
    }
  },
  
  touchTargetSize: {
    patterns: [
      /\.[\w-]+\s*\{[^}]*(?:height|width):\s*(\d+)px[^}]*\}/g,
      /(?:button|a|input|select|textarea)[^{]*\{[^}]*(?:height|width):\s*(\d+)px[^}]*\}/g
    ],
    validate: (match, value) => {
      const size = parseInt(value);
      return size < 44 ? `Touch target size ${size}px is below recommended 44px minimum` : null;
    }
  },
  
  fixedPositioning: {
    patterns: [
      /position:\s*fixed/g,
      /position:\s*sticky/g
    ],
    validate: (match) => {
      return `Fixed/sticky positioning detected - may cause issues with mobile keyboards and safe areas`;
    }
  },
  
  fontSizes: {
    patterns: [
      /font-size:\s*(\d+)px/g
    ],
    validate: (match, value) => {
      const size = parseInt(value);
      return size < 14 ? `Font size ${size}px may be too small for mobile readability` : null;
    }
  },
  
  horizontalScroll: {
    patterns: [
      /overflow-x:\s*scroll/g,
      /overflow:\s*scroll/g,
      /white-space:\s*nowrap/g
    ],
    validate: (match) => {
      return `Horizontal scrolling detected - consider responsive alternatives`;
    }
  },
  
  absolutePositioning: {
    patterns: [
      /position:\s*absolute[^}]*(?:left|right):\s*-?\d+px/g
    ],
    validate: (match) => {
      return `Absolute positioning with fixed pixel values - may cause overflow on mobile`;
    }
  },
  
  zIndexIssues: {
    patterns: [
      /z-index:\s*(\d+)/g
    ],
    validate: (match, value) => {
      const zIndex = parseInt(value);
      return zIndex > 9999 ? `Very high z-index ${zIndex} detected - may conflict with mobile UI elements` : null;
    }
  }
};

// Safe area CSS checks (iOS)
const SAFE_AREA_CHECKS = {
  patterns: [
    /env\(safe-area-inset/g,
    /constant\(safe-area-inset/g
  ],
  missingIn: []
};

// Mobile-specific media query checks
const MEDIA_QUERY_CHECKS = {
  hasResponsiveQueries: false,
  queries: [],
  breakpoints: []
};

class MobileUITester {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.suggestions = [];
  }

  // Read and analyze CSS files
  analyzeCSSFile(filePath) {
    try {
      const fullPath = path.join(__dirname, '..', filePath);
      if (!fs.existsSync(fullPath)) {
        this.warnings.push(`CSS file not found: ${filePath}`);
        return;
      }

      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check for mobile CSS issues
      Object.entries(MOBILE_CSS_ISSUES).forEach(([issueType, config]) => {
        config.patterns.forEach(pattern => {
          const matches = content.matchAll(pattern);
          for (const match of matches) {
            const issue = config.validate(match[0], match[1], match[2]);
            if (issue) {
              this.issues.push({
                file: filePath,
                type: issueType,
                issue: issue,
                line: this.getLineNumber(content, match.index)
              });
            }
          }
        });
      });

      // Check for media queries
      const mediaQueryPattern = /@media[^{]+\{/g;
      const mediaQueries = content.match(mediaQueryPattern) || [];
      if (mediaQueries.length > 0) {
        MEDIA_QUERY_CHECKS.hasResponsiveQueries = true;
        MEDIA_QUERY_CHECKS.queries.push(...mediaQueries);
      }

      // Check for safe area usage
      const hasSafeArea = SAFE_AREA_CHECKS.patterns.some(pattern => 
        pattern.test(content)
      );
      if (!hasSafeArea && filePath.includes('Layout')) {
        SAFE_AREA_CHECKS.missingIn.push(filePath);
      }

      // Check for viewport units
      const viewportUnits = content.match(/\d+(vh|vw)/g) || [];
      viewportUnits.forEach(unit => {
        const value = parseInt(unit);
        if (value === 100) {
          this.warnings.push({
            file: filePath,
            type: 'viewportUnit',
            issue: `100${unit.slice(-2)} used - consider safe areas and browser UI`,
            suggestion: `Use calc(100${unit.slice(-2)} - env(safe-area-inset-*)) for better mobile support`
          });
        }
      });

    } catch (error) {
      this.warnings.push(`Error analyzing ${filePath}: ${error.message}`);
    }
  }

  // Analyze JSX files for mobile-specific issues
  analyzeJSXFile(filePath) {
    try {
      const fullPath = path.join(__dirname, '..', filePath);
      if (!fs.existsSync(fullPath)) {
        this.warnings.push(`JSX file not found: ${filePath}`);
        return;
      }

      const content = fs.readFileSync(fullPath, 'utf8');

      // Check for touch event handlers
      const hasTouchHandlers = /onTouch(Start|Move|End)/.test(content);
      const hasClickHandlers = /onClick/.test(content);
      
      if (hasClickHandlers && !hasTouchHandlers) {
        this.suggestions.push({
          file: filePath,
          type: 'touchEvents',
          suggestion: 'Consider adding touch event handlers for better mobile experience'
        });
      }

      // Check for input types
      const inputPattern = /<input[^>]*type=["']([^"']+)["']/g;
      const inputs = content.matchAll(inputPattern);
      for (const match of inputs) {
        const inputType = match[1];
        if (inputType === 'text') {
          // Check if it should be a more specific type
          const nameAttr = match[0].match(/name=["']([^"']+)["']/);
          if (nameAttr) {
            const fieldName = nameAttr[1].toLowerCase();
            if (fieldName.includes('email')) {
              this.suggestions.push({
                file: filePath,
                type: 'inputType',
                suggestion: `Consider using type="email" for ${fieldName} field`,
                line: this.getLineNumber(content, match.index)
              });
            }
            if (fieldName.includes('phone') || fieldName.includes('tel')) {
              this.suggestions.push({
                file: filePath,
                type: 'inputType',
                suggestion: `Consider using type="tel" for ${fieldName} field`,
                line: this.getLineNumber(content, match.index)
              });
            }
          }
        }
      }

      // Check for viewport meta tag usage
      if (filePath.includes('index.html') || filePath.includes('App.jsx')) {
        const hasViewportMeta = /viewport/.test(content);
        if (!hasViewportMeta && filePath.includes('App.jsx')) {
          this.suggestions.push({
            file: filePath,
            type: 'viewport',
            suggestion: 'Ensure viewport meta tag is set in public/index.html'
          });
        }
      }

    } catch (error) {
      this.warnings.push(`Error analyzing ${filePath}: ${error.message}`);
    }
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  generateReport() {
    console.log('\n========================================');
    console.log('MOBILE UI TEST REPORT');
    console.log('========================================\n');

    console.log(`Test Configuration:`);
    console.log(`- Viewport: ${MOBILE_VIEWPORT.width}x${MOBILE_VIEWPORT.height}`);
    console.log(`- Device Scale Factor: ${MOBILE_VIEWPORT.deviceScaleFactor}`);
    console.log(`- Components Tested: ${Object.keys(COMPONENTS_TO_TEST).length}\n`);

    // Critical Issues
    if (this.issues.length > 0) {
      console.log('❌ CRITICAL ISSUES FOUND:\n');
      const groupedIssues = this.groupByType(this.issues);
      Object.entries(groupedIssues).forEach(([type, issues]) => {
        console.log(`\n${type.toUpperCase()} (${issues.length} issues):`);
        issues.forEach(issue => {
          console.log(`  - ${issue.file}:${issue.line || '?'}`);
          console.log(`    ${issue.issue}`);
        });
      });
    } else {
      console.log('✅ No critical mobile issues found!\n');
    }

    // Warnings
    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:\n');
      this.warnings.forEach(warning => {
        if (typeof warning === 'string') {
          console.log(`  - ${warning}`);
        } else {
          console.log(`  - ${warning.file}: ${warning.issue}`);
          if (warning.suggestion) {
            console.log(`    💡 ${warning.suggestion}`);
          }
        }
      });
    }

    // Suggestions
    if (this.suggestions.length > 0) {
      console.log('\n💡 SUGGESTIONS FOR IMPROVEMENT:\n');
      const groupedSuggestions = this.groupByType(this.suggestions);
      Object.entries(groupedSuggestions).forEach(([type, suggestions]) => {
        console.log(`\n${type}:`);
        suggestions.forEach(suggestion => {
          console.log(`  - ${suggestion.file}: ${suggestion.suggestion}`);
        });
      });
    }

    // Safe Area Report
    if (SAFE_AREA_CHECKS.missingIn.length > 0) {
      console.log('\n📱 SAFE AREA HANDLING:\n');
      console.log('Components missing safe area considerations:');
      SAFE_AREA_CHECKS.missingIn.forEach(file => {
        console.log(`  - ${file}`);
      });
    }

    // Media Query Report
    console.log('\n📐 RESPONSIVE DESIGN:\n');
    if (MEDIA_QUERY_CHECKS.hasResponsiveQueries) {
      console.log(`✅ Found ${MEDIA_QUERY_CHECKS.queries.length} media queries`);
      const breakpoints = new Set();
      MEDIA_QUERY_CHECKS.queries.forEach(query => {
        const widthMatch = query.match(/max-width:\s*(\d+)px/);
        if (widthMatch) {
          breakpoints.add(parseInt(widthMatch[1]));
        }
      });
      if (breakpoints.size > 0) {
        console.log(`   Breakpoints: ${Array.from(breakpoints).sort((a, b) => a - b).join(', ')}px`);
      }
    } else {
      console.log('❌ No responsive media queries found!');
    }

    // Component-specific recommendations
    console.log('\n🔧 COMPONENT-SPECIFIC RECOMMENDATIONS:\n');
    Object.entries(COMPONENTS_TO_TEST).forEach(([component, config]) => {
      const componentIssues = this.issues.filter(issue => 
        config.cssFiles.some(file => issue.file.includes(file))
      );
      
      if (componentIssues.length > 0 || config.criticalIssues.length > 0) {
        console.log(`${component}:`);
        config.criticalIssues.forEach(area => {
          console.log(`  - Review ${area} for mobile usability`);
        });
        if (componentIssues.length > 0) {
          console.log(`  - ${componentIssues.length} mobile issues detected`);
        }
      }
    });

    // Summary
    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================\n');
    console.log(`Total Issues: ${this.issues.length}`);
    console.log(`Total Warnings: ${this.warnings.length}`);
    console.log(`Total Suggestions: ${this.suggestions.length}`);
    
    const priority = this.calculatePriority();
    console.log(`\nPriority: ${priority}`);
    
    if (priority === 'HIGH') {
      console.log('\n🚨 IMMEDIATE ACTION REQUIRED:');
      console.log('1. Fix viewport overflow issues');
      console.log('2. Increase touch target sizes');
      console.log('3. Review fixed positioning elements');
      console.log('4. Add safe area handling for iOS devices');
    }
  }

  groupByType(items) {
    return items.reduce((acc, item) => {
      const type = item.type || 'general';
      if (!acc[type]) acc[type] = [];
      acc[type].push(item);
      return acc;
    }, {});
  }

  calculatePriority() {
    const criticalTypes = ['viewportOverflow', 'touchTargetSize', 'fixedPositioning'];
    const hasCritical = this.issues.some(issue => criticalTypes.includes(issue.type));
    
    if (hasCritical || this.issues.length > 10) return 'HIGH';
    if (this.issues.length > 5 || this.warnings.length > 10) return 'MEDIUM';
    return 'LOW';
  }

  run() {
    console.log('Starting Mobile UI Test...\n');

    // Test each component
    Object.entries(COMPONENTS_TO_TEST).forEach(([component, config]) => {
      console.log(`Testing ${component}...`);
      
      config.cssFiles.forEach(cssFile => {
        this.analyzeCSSFile(cssFile);
      });
      
      config.jsxFiles.forEach(jsxFile => {
        this.analyzeJSXFile(jsxFile);
      });
    });

    // Check global styles
    console.log('Testing global styles...');
    this.analyzeCSSFile('index.css');
    this.analyzeCSSFile('App.css');

    // Generate and display report
    this.generateReport();
  }
}

// Run the test
if (require.main === module) {
  const tester = new MobileUITester();
  tester.run();
}

module.exports = MobileUITester;