const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Configuration
const DB_PATH = path.join(__dirname, 'database/stock_management.db');
const TEST_USER = {
    username: 'admin',
    password: 'admin123'
};

console.log('=== Starting System Test ===\n');

// 1. Check if database file exists
console.log('1. Checking database file...');
if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Error: Database file does not exist at', DB_PATH);
    console.log('\n💡 Please run: node scripts/initDatabase.js');
    process.exit(1);
}
console.log(`✅ Database file exists at ${DB_PATH}`);

// 2. Test database connection
console.log('\n2. Testing database connection...');
const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('❌ Error connecting to database:', err.message);
        process.exit(1);
    }
    console.log('✅ Successfully connected to the database');
    
    // 3. Check users table
    console.log('\n3. Checking users table...');
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users';", [], (err, row) => {
        if (err) {
            console.error('❌ Error checking users table:', err.message);
            process.exit(1);
        }
        
        if (!row) {
            console.error('❌ Error: Users table does not exist');
            console.log('\n💡 The database may be corrupted. Try deleting it and reinitializing:');
            console.log('1. Delete the database: del database\\stock_management.db');
            console.log('2. Reinitialize: node scripts/initDatabase.js');
            process.exit(1);
        }
        console.log('✅ Users table exists');
        
        // 4. Check admin user
        console.log('\n4. Checking admin user...');
        db.get("SELECT * FROM users WHERE username = ?", [TEST_USER.username], async (err, user) => {
            if (err) {
                console.error('❌ Error checking admin user:', err.message);
                process.exit(1);
            }
            
            if (!user) {
                console.error(`❌ Error: User '${TEST_USER.username}' not found`);
                console.log('\n💡 The admin user does not exist. Try reinitializing the database:');
                console.log('1. Delete the database: del database\\stock_management.db');
                console.log('2. Reinitialize: node scripts/initDatabase.js');
                process.exit(1);
            }
            
            console.log('✅ Admin user found:', {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                is_active: user.is_active
            });
            
            // 5. Test password
            console.log('\n5. Testing password...');
            const isPasswordValid = await bcrypt.compare(TEST_USER.password, user.password);
            
            if (!isPasswordValid) {
                console.error('❌ Error: Password does not match');
                console.log('\n💡 Try resetting the admin password:');
                console.log('1. Delete the database: del database\\stock_management.db');
                console.log('2. Reinitialize: node scripts/initDatabase.js');
                process.exit(1);
            }
            
            console.log('✅ Password is valid');
            
            // 6. Test login endpoint
            console.log('\n6. Testing login endpoint...');
            const http = require('http');
            
            const postData = JSON.stringify({
                username: TEST_USER.username,
                password: TEST_USER.password
            });
            
            const options = {
                hostname: 'localhost',
                port: 5000,
                path: '/api/auth/login',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': postData.length
                }
            };
            
            const req = http.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        if (res.statusCode === 200) {
                            console.log('✅ Login successful!');
                            console.log('Response:', {
                                status: res.statusCode,
                                message: response.message,
                                token: response.token ? '***TOKEN_RECEIVED***' : 'NO_TOKEN',
                                user: response.user ? {
                                    id: response.user.id,
                                    username: response.user.username,
                                    role: response.user.role
                                } : 'NO_USER_DATA'
                            });
                            console.log('\n🎉 All tests passed successfully!');
                        } else {
                            console.error(`❌ Login failed with status ${res.statusCode}:`, response);
                        }
                    } catch (e) {
                        console.error('❌ Error parsing response:', e.message);
                        console.log('Raw response:', data);
                    }
                    
                    // Close database connection
                    db.close();
                });
            });
            
            req.on('error', (error) => {
                console.error('❌ Error making login request:', error.message);
                console.log('\n💡 Make sure the server is running:');
                console.log('1. Start the server: node server.js');
                console.log('2. Then run this test again');
                db.close();
            });
            
            req.write(postData);
            req.end();
        });
    });
});
