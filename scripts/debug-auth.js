const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { runQuery, getAllRows, getRow } = require('../config/database');
require('dotenv').config();

async function debugAuth() {
    console.log('=== JWT Authentication Debug ===\n');
    
    // Check JWT_SECRET
    console.log('1. Checking JWT_SECRET:');
    if (!process.env.JWT_SECRET) {
        console.error('❌ JWT_SECRET is not set in environment variables!');
        console.log('   Please check your .env file');
        return;
    } else {
        console.log('✅ JWT_SECRET is configured');
        console.log(`   Length: ${process.env.JWT_SECRET.length} characters\n`);
    }
    
    // Test database connection
    console.log('2. Testing database connection:');
    try {
        const users = await getAllRows('SELECT id, username, role, is_active FROM users LIMIT 5');
        console.log('✅ Database connection successful');
        console.log(`   Found ${users.length} users\n`);
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return;
    }
    
    // Test admin user
    console.log('3. Checking admin user:');
    try {
        const adminUser = await getRow(
            'SELECT * FROM users WHERE username = ? AND is_active = 1', 
            ['admin']
        );
        
        if (adminUser) {
            console.log('✅ Admin user found');
            console.log(`   ID: ${adminUser.id}`);
            console.log(`   Username: ${adminUser.username}`);
            console.log(`   Role: ${adminUser.role}`);
            console.log(`   Active: ${adminUser.is_active}`);
            
            // Test password verification
            const isPasswordValid = await bcrypt.compare('admin123', adminUser.password);
            console.log(`   Password check: ${isPasswordValid ? '✅ Valid' : '❌ Invalid'}\n`);
            
            if (isPasswordValid) {
                // Test JWT token generation
                console.log('4. Testing JWT token generation:');
                try {
                    const testToken = jwt.sign(
                        { 
                            userId: adminUser.id, 
                            username: adminUser.username, 
                            role: adminUser.role 
                        },
                        process.env.JWT_SECRET,
                        { expiresIn: '24h' }
                    );
                    console.log('✅ JWT token generated successfully');
                    console.log(`   Token preview: ${testToken.substring(0, 50)}...\n`);
                    
                    // Test JWT token verification
                    console.log('5. Testing JWT token verification:');
                    try {
                        const decoded = jwt.verify(testToken, process.env.JWT_SECRET);
                        console.log('✅ JWT token verified successfully');
                        console.log(`   Decoded user ID: ${decoded.userId}`);
                        console.log(`   Decoded username: ${decoded.username}`);
                        console.log(`   Decoded role: ${decoded.role}`);
                        console.log(`   Token expires: ${new Date(decoded.exp * 1000).toLocaleString()}\n`);
                        
                        console.log('🎉 All authentication tests passed!');
                        console.log('\nIf you\'re still experiencing issues, check:');
                        console.log('- Frontend localStorage for corrupted tokens');
                        console.log('- Network requests in browser dev tools');
                        console.log('- Server console logs during API calls');
                        console.log('- CORS configuration if frontend/backend are on different ports');
                        
                    } catch (verifyError) {
                        console.error('❌ JWT token verification failed:', verifyError.message);
                    }
                } catch (signError) {
                    console.error('❌ JWT token generation failed:', signError.message);
                }
            }
        } else {
            console.error('❌ Admin user not found or inactive');
            console.log('   Run: npm run init-db to initialize the database');
        }
    } catch (error) {
        console.error('❌ Error checking admin user:', error.message);
    }
}

// Run the debug script
debugAuth().catch(error => {
    console.error('Debug script failed:', error);
    process.exit(1);
});
