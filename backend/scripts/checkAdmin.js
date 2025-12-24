const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../database/stock_management.db');

console.log('Checking database at:', dbPath);

// Check if database file exists
const fs = require('fs');
if (!fs.existsSync(dbPath)) {
    console.error('Error: Database file does not exist at', dbPath);
    process.exit(1);
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
        return;
    }
    console.log('Connected to SQLite database');
    
    // Check users table
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='users';", [], (err, rows) => {
        if (err) {
            console.error('Error checking users table:', err);
            return;
        }
        
        if (rows.length === 0) {
            console.error('Error: Users table does not exist');
            return;
        }
        
        console.log('Users table exists');
        
        // Check admin user
        db.get("SELECT id, username, email, role, is_active FROM users WHERE username = 'admin';", [], (err, row) => {
            if (err) {
                console.error('Error checking admin user:', err);
                return;
            }
            
            if (!row) {
                console.error('Error: Admin user not found');
                return;
            }
            
            console.log('Admin user found:', row);
            
            // Check password
            db.get("SELECT password FROM users WHERE username = 'admin';", [], (err, pwdRow) => {
                if (err) {
                    console.error('Error getting admin password:', err);
                    return;
                }
                
                console.log('Admin password hash:', pwdRow.password);
                console.log('To verify password, use: bcrypt.compareSync("admin123", "' + pwdRow.password + '")');
                
                // Close the database connection
                db.close();
            });
        });
    });
});
