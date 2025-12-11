const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../database/stock_management.db');

console.log('=== Checking Database Tables ===');

// Check if database file exists
if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Error: Database file does not exist');
    process.exit(1);
}

// Open database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        process.exit(1);
    }
    
    console.log('✅ Connected to database');
    
    // Get all tables
    db.all("SELECT name FROM sqlite_master WHERE type='table';", [], (err, tables) => {
        if (err) {
            console.error('❌ Error getting tables:', err.message);
            process.exit(1);
        }
        
        console.log('\n📋 Tables in database:');
        tables.forEach((table, index) => {
            console.log(`${index + 1}. ${table.name}`);
        });
        
        // Check admin user
        db.get("SELECT * FROM users WHERE username = 'admin';", (err, user) => {
            if (err) {
                console.error('❌ Error checking admin user:', err.message);
                process.exit(1);
            }
            
            console.log('\n👤 Admin user:');
            if (user) {
                console.log('✅ Admin user exists');
                console.log(`   Username: ${user.username}`);
                console.log(`   Email: ${user.email}`);
                console.log(`   Role: ${user.role}`);
            } else {
                console.error('❌ Admin user not found');
            }
            
            // Check products table
            db.get("SELECT COUNT(*) as count FROM products;", (err, result) => {
                if (err) {
                    console.error('❌ Error counting products:', err.message);
                    process.exit(1);
                }
                
                console.log(`\n📦 Products in database: ${result.count}`);
                
                // Close database connection
                db.close();
                console.log('\n✅ Database check completed');
            });
        });
    });
});
