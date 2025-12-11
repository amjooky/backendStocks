const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../database/stock_management.db');

console.log('=== Testing Database Connection ===');
console.log('Database path:', DB_PATH);

// Check if database file exists
if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Error: Database file does not exist');
    console.log('Please run: node scripts/initDatabase.js');
    process.exit(1);
}

console.log('✅ Database file exists');

// Try to open the database
const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('❌ Error connecting to database:', err.message);
        process.exit(1);
    }
    
    console.log('✅ Successfully connected to the database');
    
    // Check if users table exists
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users';", [], (err, row) => {
        if (err) {
            console.error('❌ Error checking users table:', err.message);
            process.exit(1);
        }
        
        if (!row) {
            console.error('❌ Error: Users table does not exist');
            process.exit(1);
        }
        
        console.log('✅ Users table exists');
        
        // Check if products table exists
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='products';", [], (err, row) => {
            if (err) {
                console.error('❌ Error checking products table:', err.message);
                process.exit(1);
            }
            
            if (!row) {
                console.error('❌ Error: Products table does not exist');
                process.exit(1);
            }
            
            console.log('✅ Products table exists');
            
            // List all tables in the database
            db.all("SELECT name FROM sqlite_master WHERE type='table';", [], (err, tables) => {
                if (err) {
                    console.error('❌ Error listing tables:', err.message);
                    process.exit(1);
                }
                
                console.log('\n📋 Database tables:');
                tables.forEach(table => {
                    console.log(`- ${table.name}`);
                });
                
                // Close the database connection
                db.close();
                console.log('\n✅ Database test completed successfully!');
            });
        });
    });
});
