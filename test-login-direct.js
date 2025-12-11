const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'database/stock_management.db');

// Test credentials
const TEST_USERNAME = 'admin';
const TEST_PASSWORD = 'admin123';

console.log('Testing login with direct database access...');

// Check if database file exists
const fs = require('fs');
if (!fs.existsSync(dbPath)) {
    console.error('❌ Error: Database file does not exist');
    process.exit(1);
}

// Open database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        process.exit(1);
    }
    
    console.log('✅ Connected to database');
    
    // Find user by username
    db.get(
        'SELECT * FROM users WHERE username = ?', 
        [TEST_USERNAME], 
        async (err, user) => {
            if (err) {
                console.error('❌ Database error:', err.message);
                process.exit(1);
            }
            
            if (!user) {
                console.error(`❌ User '${TEST_USERNAME}' not found`);
                process.exit(1);
            }
            
            console.log('\n🔍 User found in database:');
            console.log(`Username: ${user.username}`);
            console.log(`Email: ${user.email}`);
            console.log(`Role: ${user.role}`);
            console.log(`Active: ${user.is_active ? 'Yes' : 'No'}`);
            
            // Verify password
            const isPasswordValid = await bcrypt.compare(TEST_PASSWORD, user.password);
            console.log('\n🔑 Password check:');
            console.log(`Using password: '${TEST_PASSWORD}'`);
            console.log(`Password hash: ${user.password}`);
            console.log(`Password ${isPasswordValid ? '✅ matches' : '❌ does not match'}`);
            
            if (!isPasswordValid) {
                console.log('\n💡 Try resetting the admin password:');
                console.log('1. Run: node scripts/initDatabase.js --reset-admin');
                console.log('2. Use username: admin, password: admin123');
            } else {
                console.log('\n✅ Login should work with these credentials!');
            }
            
            // Close database connection
            db.close();
        }
    );
});
