const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../database/stock_management.db');

console.log('Testing login functionality...');

// 1. Check if database exists
const fs = require('fs');
if (!fs.existsSync(dbPath)) {
    console.error('Error: Database file does not exist at', dbPath);
    process.exit(1);
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    }
    
    console.log('Connected to database');
    
    // 2. Check admin user
    db.get("SELECT * FROM users WHERE username = 'admin';", [], async (err, user) => {
        if (err) {
            console.error('Error fetching admin user:', err);
            process.exit(1);
        }
        
        if (!user) {
            console.error('Error: Admin user not found');
            process.exit(1);
        }
        
        console.log('Admin user found:', {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            is_active: user.is_active
        });
        
        // 3. Test password
        const testPassword = 'admin123';
        const isMatch = await bcrypt.compare(testPassword, user.password);
        
        if (isMatch) {
            console.log('✅ Password verification successful!');
            console.log('You can now log in with:');
            console.log('Username: admin');
            console.log('Password: admin123');
        } else {
            console.error('❌ Password verification failed!');
            console.log('Stored password hash:', user.password);
            console.log('To manually verify, use:');
            console.log(`bcrypt.compareSync("${testPassword}", "${user.password}")`);
        }
        
        db.close();
    });
});
