const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'database/stock_management.db');

console.log('=== Database Verification ===');
console.log('Database path:', DB_PATH);

// Check if database file exists
if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Error: Database file does not exist');
    console.log('Please run: node scripts/create-fresh-db.js');
    process.exit(1);
}

console.log('✅ Database file exists');

// Try to open the database
const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
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
        
        // Check admin user
        db.get("SELECT * FROM users WHERE username = 'admin';", [], (err, user) => {
            if (err) {
                console.error('❌ Error checking admin user:', err.message);
                process.exit(1);
            }
            
            if (!user) {
                console.error('❌ Error: Admin user not found');
                process.exit(1);
            }
            
            console.log('✅ Admin user found:', {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                is_active: user.is_active
            });
            
            console.log('\n✅ Database verification successful!');
            console.log('🎉 You can now start the server with: node server.js');
            
            // Close the database connection
            db.close();
        });
    });
});
