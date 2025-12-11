const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { runQuery, getRow } = require('./config/database');
const { handleLoginAttempt } = require('./middleware/auth');

async function testLoginRoute() {
    try {
        console.log('🧪 Testing login route logic...');
        
        const username = 'admin';
        const password = 'admin123';
        
        // Simulate validation
        console.log('\n1. Validation check...');
        if (!username || !password) {
            console.log('❌ Validation failed');
            return;
        }
        if (password.length < 6) {
            console.log('❌ Password too short');
            return;
        }
        console.log('✅ Validation passed');
        
        // Check JWT_SECRET
        console.log('\n2. JWT_SECRET check...');
        if (!process.env.JWT_SECRET) {
            console.log('❌ JWT_SECRET missing');
            return;
        }
        console.log('✅ JWT_SECRET exists');
        
        // Find user
        console.log('\n3. User lookup...');
        const user = await getRow(`
            SELECT * FROM users
            WHERE username = ? AND is_active = 1
        `, [username]);
        
        if (!user) {
            console.log('❌ User not found');
            return;
        }
        console.log('✅ User found:', user.username);
        
        // Check if locked
        console.log('\n4. Lock check...');
        if (user.locked_until && new Date() < new Date(user.locked_until)) {
            console.log('❌ Account locked until:', user.locked_until);
            return;
        }
        console.log('✅ Account not locked');
        
        // Check password
        console.log('\n5. Password check...');
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.log('❌ Password invalid');
            return;
        }
        console.log('✅ Password valid');
        
        // Handle login attempt
        console.log('\n6. Login attempt handling...');
        await handleLoginAttempt(username, true, { ip: '127.0.0.1', get: () => 'test' });
        console.log('✅ Login attempt handled');
        
        // Generate JWT
        console.log('\n7. JWT generation...');
        const token = jwt.sign(
            { 
                userId: user.id, 
                username: user.username, 
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        console.log('✅ JWT generated, length:', token.length);
        
        // Prepare response
        console.log('\n8. Response preparation...');
        const { password: _, two_factor_secret, ...userWithoutPassword } = user;
        
        const response = {
            message: 'Login successful',
            token,
            user: userWithoutPassword
        };
        
        console.log('✅ Response prepared');
        console.log('\n🎉 LOGIN ROUTE LOGIC SUCCESSFUL!');
        console.log('User:', response.user.username, 'Role:', response.user.role);
        console.log('Token exists:', !!response.token);
        
        return response;
        
    } catch (error) {
        console.error('❌ Login route test failed:', {
            message: error.message,
            stack: error.stack?.substring(0, 500)
        });
    }
}

testLoginRoute();