const jwt = require('jsonwebtoken');
const { getRow, runQuery } = require('../config/database');

/**
 * Enhanced authentication middleware for multi-tenant system
 * Supports role-based access control and audit logging
 */

// Log authentication and authorization activities (disabled for now)
const logAuth = async (userId, agencyId, action, details = {}) => {
    // Skip logging for now (no audit_log table)
    return;
};

// Simplified authentication middleware
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ 
            message: 'Access token required',
            expired: false 
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
        
        // Get user data from database
        const user = await getRow('SELECT * FROM users WHERE id = ? AND is_active = 1', [decoded.userId]);

        if (!user) {
            return res.status(401).json({ 
                message: 'User not found or inactive',
                expired: false 
            });
        }

        // Add user info to request
        req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            firstName: user.first_name,
            lastName: user.last_name
        };

        next();
    } catch (error) {
        console.error('Auth middleware error:', error.message);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                message: 'Token expired',
                expired: true 
            });
        }
        
        return res.status(403).json({ 
            message: 'Invalid token',
            expired: false 
        });
    }
};

// Role-based authorization middleware
const requireRole = (roles) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const userRoles = Array.isArray(roles) ? roles : [roles];
        
        if (!userRoles.includes(req.user.role)) {
            await logAuth(req.user.id, req.user.agencyId, 'ACCESS_DENIED', {
                requiredRoles: userRoles,
                userRole: req.user.role,
                resource: req.originalUrl,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            return res.status(403).json({ 
                message: `Access denied. Required role(s): ${userRoles.join(', ')}`,
                userRole: req.user.role,
                requiredRoles: userRoles
            });
        }

        next();
    };
};

// Specific role middleware functions
const requireSuperadmin = requireRole('superadmin');
const requireAdmin = requireRole(['superadmin', 'admin']);
const requireManager = requireRole(['superadmin', 'admin', 'manager']);
const requireAnyRole = requireRole(['superadmin', 'admin', 'manager', 'cashier']);

// Agency-specific access control (users can only access their agency's data)
const requireAgencyAccess = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    // Superadmin can access any agency
    if (req.user.role === 'superadmin') {
        return next();
    }

    // For other users, ensure they can only access their agency's data
    const agencyId = req.params.agencyId || req.query.agencyId || req.body.agencyId;
    
    if (agencyId && parseInt(agencyId) !== req.user.agencyId) {
        await logAuth(req.user.id, req.user.agencyId, 'AGENCY_ACCESS_DENIED', {
            requestedAgencyId: agencyId,
            userAgencyId: req.user.agencyId,
            resource: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        return res.status(403).json({ 
            message: 'Access denied. You can only access your own agency data.',
            requestedAgency: agencyId,
            userAgency: req.user.agencyId
        });
    }

    next();
};

// Middleware to add agency context to queries (for data isolation)
const addAgencyContext = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    // Superadmin can specify agency or get all agencies
    if (req.user.role === 'superadmin') {
        req.agencyId = req.query.agencyId || req.body.agencyId || null; // null means all agencies
    } else {
        // Other users are restricted to their agency
        req.agencyId = req.user.agencyId;
    }

    next();
};

// Account lockout middleware (after failed login attempts)
const handleLoginAttempt = async (username, success, req) => {
    const user = await getRow('SELECT id, login_attempts, locked_until FROM users WHERE username = ?', [username]);
    
    if (!user) return;

    if (success) {
        // Reset login attempts on successful login
        await runQuery('UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = ?', [user.id]);
        
        // Skip login success logging
    } else {
        const attempts = (user.login_attempts || 0) + 1;
        let lockedUntil = null;
        
        // Lock account after 5 failed attempts for 15 minutes
        if (attempts >= 5) {
            lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
        }
        
        await runQuery(
            'UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?',
            [attempts, lockedUntil, user.id]
        );
        
        // Skip login failed logging
    }
};

module.exports = {
    authenticateToken,
    requireRole,
    requireSuperadmin,
    requireAdmin,
    requireManager,
    requireAnyRole,
    requireAgencyAccess,
    addAgencyContext,
    handleLoginAttempt,
    logAuth
};
