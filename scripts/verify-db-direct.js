const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../database/stock_management.db');

console.log('=== Database Verification ===');
console.log('Database path:', DB_PATH);

// Check if database file exists
if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Error: Database file does not exist');
    process.exit(1);
}

console.log('✅ Database file exists');
console.log('File size:', fs.statSync(DB_PATH).size, 'bytes');

// Try to open the database
const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        process.exit(1);
    }
    
    console.log('✅ Successfully connected to the database');
    
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
        
        // If no tables, the database might be empty
        if (tables.length === 0) {
            console.log('\nℹ️  Database is empty. You may need to run the initialization script.');
            console.log('   Try running: node scripts/initDatabase.js');
            process.exit(1);
        }
        
        // Check if users table exists
        db.get("SELECT * FROM sqlite_master WHERE type='table' AND name='users';", (err, usersTable) => {
            if (err) {
                console.error('❌ Error checking users table:', err.message);
                process.exit(1);
            }
            
            if (!usersTable) {
                console.error('❌ Users table does not exist');
                process.exit(1);
            }
            
            console.log('\n✅ Users table exists');
            
            // Check admin user
            db.get("SELECT * FROM users WHERE username = 'admin';", (err, adminUser) => {
                if (err) {
                    console.error('❌ Error checking admin user:', err.message);
                    process.exit(1);
                }
                
                if (!adminUser) {
                    console.error('❌ Admin user not found');
                    process.exit(1);
                }
                
                console.log('✅ Admin user exists');
                console.log('\n👤 Admin user details:');
                console.log(`   Username: ${adminUser.username}`);
                console.log(`   Email: ${adminUser.email}`);
                console.log(`   Role: ${adminUser.role}`);
                
                // Check products table
                db.get("SELECT * FROM sqlite_master WHERE type='table' AND name='products';", (err, productsTable) => {
                    if (err) {
                        console.error('❌ Error checking products table:', err.message);
                        process.exit(1);
                    }
                    
                    if (!productsTable) {
                        console.error('❌ Products table does not exist');
                        process.exit(1);
                    }
                    
                    console.log('\n✅ Products table exists');
                    
                    // Count products
                    db.get("SELECT COUNT(*) as count FROM products;", (err, result) => {
                        if (err) {
                            console.error('❌ Error counting products:', err.message);
                            process.exit(1);
                        }
                        
                        console.log(`📦 Number of products: ${result.count}`);
                        
                        // Close the database connection
                        db.close();
                        console.log('\n✅ Database verification completed successfully!');
                    });
                });
            });
        });
    });
});
