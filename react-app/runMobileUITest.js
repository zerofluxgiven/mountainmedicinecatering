#!/usr/bin/env node

/**
 * Mobile UI Test Runner
 * 
 * This script runs the mobile UI test suite and generates a comprehensive report
 * of mobile usability issues across the Mountain Medicine Kitchen application.
 * 
 * Usage: node runMobileUITest.js
 */

const path = require('path');

// Set up the environment
process.env.NODE_ENV = 'test';

// Load and run the test
const MobileUITester = require('./src/__tests__/mobileUITest');

console.log('Mountain Medicine Kitchen - Mobile UI Test Suite');
console.log('================================================\n');

const tester = new MobileUITester();
tester.run();

console.log('\nTest completed. Review the report above for mobile UI issues and recommendations.');