#!/usr/bin/env node

/**
 * Test script to verify Italian translation setup
 * This script checks if the Italian translation file is properly structured
 */

const fs = require('fs');
const path = require('path');

// Read the translation files
const enPath = path.join(__dirname, 'frontend', 'src', 'locales', 'en', 'translation.json');
const itPath = path.join(__dirname, 'frontend', 'src', 'locales', 'it', 'translation.json');

console.log('🔍 Testing Italian Translation Setup...\n');

try {
  // Read English translation (reference)
  const enTranslation = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  
  // Read Italian translation
  const itTranslation = JSON.parse(fs.readFileSync(itPath, 'utf8'));
  
  // Check if files exist
  console.log('✅ Translation files found:');
  console.log(`   English: ${enPath}`);
  console.log(`   Italian: ${itPath}\n`);
  
  // Compare structure
  const enKeys = getAllKeys(enTranslation);
  const itKeys = getAllKeys(itTranslation);
  
  console.log('📊 Translation Statistics:');
  console.log(`   English keys: ${enKeys.length}`);
  console.log(`   Italian keys: ${itKeys.length}`);
  console.log(`   Coverage: ${Math.round((itKeys.length / enKeys.length) * 100)}%\n`);
  
  // Find missing keys
  const missingKeys = enKeys.filter(key => !itKeys.includes(key));
  
  if (missingKeys.length === 0) {
    console.log('🎉 Perfect! All English keys have Italian translations.');
  } else {
    console.log('⚠️  Missing Italian translations:');
    missingKeys.forEach(key => console.log(`   - ${key}`));
  }
  
  // Test sample translations
  console.log('\n🔤 Sample Italian translations:');
  console.log(`   Dashboard: ${itTranslation.navigation?.dashboard}`);
  console.log(`   Products: ${itTranslation.navigation?.products}`);
  console.log(`   Welcome: ${itTranslation.login?.welcomeMessage}`);
  console.log(`   Add Product: ${itTranslation.products?.addProduct}`);
  
  console.log('\n✅ Italian translation setup test completed successfully!');
  
} catch (error) {
  console.error('❌ Error testing Italian translation:', error.message);
  process.exit(1);
}

// Helper function to get all keys from nested object
function getAllKeys(obj, prefix = '') {
  let keys = [];
  
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}