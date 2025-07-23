#!/usr/bin/env node

/**
 * AI Test Runner
 * Executes all AI-related tests and generates a report
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const testFiles = [
  'AIApprovalDialog.test.js',
  'aiActionServiceEnhanced.test.js', 
  'aiNameGenerator.test.js',
  'integration/aiApprovalFlow.test.js'
];

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

console.log(`${colors.blue}🤖 Mountain Medicine Kitchen - AI Test Suite${colors.reset}\n`);

const results = {
  passed: [],
  failed: [],
  skipped: []
};

// Run each test file
testFiles.forEach(testFile => {
  console.log(`${colors.yellow}Running ${testFile}...${colors.reset}`);
  
  try {
    const output = execSync(
      `npm test -- --testPathPattern="${testFile}" --coverage --coverageReporters=text --no-coverage-summary`,
      { 
        encoding: 'utf8',
        stdio: 'pipe'
      }
    );
    
    // Parse test results
    const passMatch = output.match(/Tests:\s+(\d+) passed/);
    const failMatch = output.match(/Tests:\s+(\d+) failed/);
    const totalMatch = output.match(/Tests:.*,\s+(\d+) total/);
    
    if (passMatch || totalMatch) {
      results.passed.push({
        file: testFile,
        tests: passMatch ? parseInt(passMatch[1]) : parseInt(totalMatch[1]),
        output: output
      });
      console.log(`${colors.green}✓ ${testFile} passed${colors.reset}`);
    }
  } catch (error) {
    results.failed.push({
      file: testFile,
      error: error.message,
      output: error.stdout || error.stderr
    });
    console.log(`${colors.red}✗ ${testFile} failed${colors.reset}`);
  }
  
  console.log('');
});

// Generate report
console.log(`\n${colors.blue}📊 Test Summary${colors.reset}`);
console.log(`${colors.green}Passed: ${results.passed.length} test files${colors.reset}`);
console.log(`${colors.red}Failed: ${results.failed.length} test files${colors.reset}`);

// Detailed results
if (results.passed.length > 0) {
  console.log(`\n${colors.green}✅ Passed Tests:${colors.reset}`);
  results.passed.forEach(result => {
    console.log(`  - ${result.file} (${result.tests} tests)`);
  });
}

if (results.failed.length > 0) {
  console.log(`\n${colors.red}❌ Failed Tests:${colors.reset}`);
  results.failed.forEach(result => {
    console.log(`  - ${result.file}`);
    console.log(`    Error: ${result.error.split('\n')[0]}`);
  });
}

// Coverage summary
console.log(`\n${colors.blue}📈 Coverage Report${colors.reset}`);
try {
  const coverageOutput = execSync(
    'npm test -- --coverage --coverageReporters=text-summary --watchAll=false --testPathPattern="AI|ai"',
    { encoding: 'utf8', stdio: 'pipe' }
  );
  
  const lines = coverageOutput.split('\n').filter(line => 
    line.includes('Statements') || 
    line.includes('Branches') || 
    line.includes('Functions') || 
    line.includes('Lines')
  );
  
  lines.forEach(line => console.log(line));
} catch (error) {
  console.log('Coverage report not available');
}

// Generate HTML report
const reportHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>AI Test Report - Mountain Medicine Kitchen</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #6b46c1; }
    .summary { display: flex; gap: 20px; margin: 20px 0; }
    .stat { padding: 20px; border-radius: 8px; flex: 1; text-align: center; }
    .stat.passed { background: #d4edda; color: #155724; }
    .stat.failed { background: #f8d7da; color: #721c24; }
    .test-list { margin: 20px 0; }
    .test-item { padding: 10px; margin: 5px 0; border-radius: 5px; }
    .test-item.passed { background: #e7f5e7; border-left: 4px solid #28a745; }
    .test-item.failed { background: #fde8e8; border-left: 4px solid #dc3545; }
    pre { background: #f8f9fa; padding: 10px; border-radius: 5px; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🤖 AI Test Report</h1>
    <p>Generated on ${new Date().toLocaleString()}</p>
    
    <div class="summary">
      <div class="stat passed">
        <h2>${results.passed.length}</h2>
        <p>Tests Passed</p>
      </div>
      <div class="stat failed">
        <h2>${results.failed.length}</h2>
        <p>Tests Failed</p>
      </div>
    </div>
    
    <div class="test-list">
      <h2>Test Results</h2>
      ${results.passed.map(r => `
        <div class="test-item passed">
          <strong>✅ ${r.file}</strong>
          <p>${r.tests} tests passed</p>
        </div>
      `).join('')}
      
      ${results.failed.map(r => `
        <div class="test-item failed">
          <strong>❌ ${r.file}</strong>
          <pre>${r.error}</pre>
        </div>
      `).join('')}
    </div>
    
    <div class="test-list">
      <h2>Test Coverage Areas</h2>
      <ul>
        <li>✅ AI Approval Dialog Component</li>
        <li>✅ AI Action Service with Approval Flow</li>
        <li>✅ AI Name Generator (Witty Names)</li>
        <li>✅ Integration Tests for Complete Flows</li>
        <li>✅ Mock Data for Realistic Testing</li>
      </ul>
    </div>
  </div>
</body>
</html>
`;

const reportPath = path.join(__dirname, 'ai-test-report.html');
fs.writeFileSync(reportPath, reportHtml);
console.log(`\n${colors.blue}📄 HTML report generated: ${reportPath}${colors.reset}`);

// Exit with appropriate code
process.exit(results.failed.length > 0 ? 1 : 0);