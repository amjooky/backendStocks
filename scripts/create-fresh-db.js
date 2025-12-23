const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../database/stock_management.db');

// Remove existing database file if it exists
if (fs.existsSync(DB_PATH)) {
    console.log('Removing existing database file...');
    fs.unlinkSync(DB_PATH);
}

// Create new database
console.log('Creating new database...');
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error creating database:', err.message);
        process.exit(1);
    }
    console.log('✅ Created new database');
    
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON;');
    
    // Create users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            first_name VARCHAR(50) NOT NULL,
            last_name VARCHAR(50) NOT NULL,
            role TEXT CHECK(role IN ('admin', 'manager', 'cashier')) DEFAULT 'cashier',
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `, (err) => {
        if (err) {
            console.error('Error creating users table:', err.message);
            process.exit(1);
        }
        console.log('✅ Created users table');
        
        // Create admin user
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.run(
            `INSERT INTO users (username, email, password, first_name, last_name, role) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            ['admin', 'admin@stocksystem.com', hashedPassword, 'System', 'Administrator', 'admin'],
            function(err) {
                if (err) {
                    console.error('Error creating admin user:', err.message);
                    process.exit(1);
                }
                console.log('✅ Created admin user');
                console.log('\n🔑 Admin credentials:');
                console.log('Username: admin');
                console.log('Password: admin123');
                console.log('\n✅ Database setup complete!');
                
                // Close the database connection
                db.close();
            }
        );
    });
});
