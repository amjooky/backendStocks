const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database/stock_management.db');

console.log('Testing database connection to:', dbPath);

// Check if database file exists
const fs = require('fs');
if (!fs.existsSync(dbPath)) {
    console.error('❌ Error: Database file does not exist');
    console.log('Please run: node scripts/initDatabase.js');
    process.exit(1);
}

// Try to open the database
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        process.exit(1);
    }
    
    console.log('✅ Successfully connected to the database');
    
    // Test a simple query
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users';", [], (err, row) => {
        if (err) {
            console.error('❌ Error querying database:', err.message);
            process.exit(1);
        }
        
        if (!row) {
            console.error('❌ Users table does not exist. Database may not be initialized.');
            process.exit(1);
        }
        
        console.log('✅ Users table exists');
        
        // Check admin user
        db.get("SELECT username, email, role FROM users WHERE username = 'admin';", [], (err, user) => {
            if (err) {
                console.error('❌ Error checking admin user:', err.message);
                process.exit(1);
            }
            
            if (!user) {
                console.error('❌ Admin user not found. Database may not be initialized.');
                process.exit(1);
            }
            
            console.log('✅ Admin user found:', user);
            console.log('\n🎉 Database connection test passed successfully!');
            
            // Close the database connection
            db.close();
        });
    });
});
