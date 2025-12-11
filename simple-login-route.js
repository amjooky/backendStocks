const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getRow } = require('./config/database');

// Simple login route that works
const simpleLogin = async (req, res) => {
    try {
        console.log('Simple login attempt:', req.body);
        
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password required' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password too short' });
        }
        
        console.log('Looking for user:', username);
        const user = await getRow('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
        
        if (!user) {
            console.log('User not found');
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        console.log('User found, checking password');
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
            console.log('Password invalid');
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        console.log('Password valid, creating token');
        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'default-secret',
            { expiresIn: '24h' }
        );
        
        console.log('Token created, sending response');
        const { password: _, ...userWithoutPassword } = user;
        
        res.json({
            message: 'Login successful',
            token,
            user: userWithoutPassword
        });
        
    } catch (error) {
        console.error('Simple login error:', error);
        res.status(500).json({ message: 'Login failed', error: error.message });
    }
};

module.exports = { simpleLogin };