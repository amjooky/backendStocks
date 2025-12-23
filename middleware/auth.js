const jwt = require('jsonwebtoken');
const { getRow } = require('../config/database');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    try {
        // Check if JWT_SECRET exists
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not set in environment variables');
            return res.status(500).json({ message: 'Server configuration error' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user details from database
        const user = await getRow(
            'SELECT id, username, email, first_name, last_name, role, is_active FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (!user || !user.is_active) {
            return res.status(401).json({ message: 'Invalid or inactive user' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('JWT verification error:', error.message);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token has expired', expired: true });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        } else if (error.name === 'NotBeforeError') {
            return res.status(401).json({ message: 'Token not active yet' });
        }
        return res.status(403).json({ message: 'Token verification failed' });
    }
};

// Middleware to check user roles
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Access denied. Required role: ${roles.join(' or ')}` 
            });
        }

        next();
    };
};

// Middleware to check if user is admin
const requireAdmin = requireRole('admin');

// Middleware to check if user is admin or manager
const requireManager = requireRole('admin', 'manager');

module.exports = {
    authenticateToken,
    requireRole,
    requireAdmin,
    requireManager
};
