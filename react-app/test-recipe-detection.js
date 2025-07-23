#!/usr/bin/env node

// Test script to debug recipe detection regex with curly quotes

const testText = "You'll need: - One cup heavy cream - Half a cup whole milk - Half a cup sugar";

console.log('Testing recipe detection patterns');
console.log('=================================\n');

console.log('Test text:', testText);
console.log('Character analysis of "You\'ll":');
const chars = testText.substring(0, 6).split('');
chars.forEach((char, i) => {
  console.log(`  Position ${i}: "${char}" (charCode: ${char.charCodeAt(0)})`);
});

console.log('\n\nTesting regex patterns:');
console.log('-----------------------\n');

const patterns = [
  { name: "Basic pattern", regex: /you'll\s+need/i },
  { name: "With character class for quotes", regex: /you['']ll\s+need/i },
  { name: "With dot wildcard", regex: /you.ll\s+need/i },
  { name: "With flexible wildcard", regex: /you.{1,2}ll\s+need/i },
  { name: "Unicode-aware pattern", regex: /you[\u0027\u2019]ll\s+need/i },
  { name: "All quotes pattern", regex: /you[''\u0027\u2019\u201C\u201D]ll\s+need/i },
];

patterns.forEach(({ name, regex }) => {
  const match = testText.match(regex);
  console.log(`${name}:`);
  console.log(`  Pattern: ${regex}`);
  console.log(`  Match: ${match ? 'YES' : 'NO'}`);
  if (match) {
    console.log(`  Matched text: "${match[0]}"`);
  }
  console.log();
});

// Additional test: Check what type of quote is in the text
console.log('\nQuote character detection:');
const quoteChar = testText[3]; // The quote in "You'll"
console.log(`Quote character: "${quoteChar}"`);
console.log(`Character code: ${quoteChar.charCodeAt(0)}`);
console.log(`Is regular apostrophe (39): ${quoteChar.charCodeAt(0) === 39}`);
console.log(`Is right single quotation mark (8217): ${quoteChar.charCodeAt(0) === 8217}`);

// Test with explicit curly quote
console.log('\n\nTesting with explicit curly quote:');
const curlyQuotePattern = new RegExp("you['']ll\\s+need", 'i');
console.log(`Pattern source: ${curlyQuotePattern.source}`);
console.log(`Matches: ${curlyQuotePattern.test(testText)}`);