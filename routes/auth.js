const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { runQuery, getRow } = require('../config/database');
const { authenticateToken, handleLoginAttempt, logAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and authorization
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - username
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           example: admin
 *         password:
 *           type: string
 *           format: password
 *           example: admin123
 *     LoginResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Login successful
 *         token:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         user:
 *           $ref: '#/components/schemas/User'
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *         - firstName
 *         - lastName
 *         - role
 *       properties:
 *         username:
 *           type: string
 *           example: john_doe
 *         email:
 *           type: string
 *           format: email
 *           example: john@example.com
 *         password:
 *           type: string
 *           format: password
 *           example: password123
 *         firstName:
 *           type: string
 *           example: John
 *         lastName:
 *           type: string
 *           example: Doe
 *         role:
 *           type: string
 *           enum: [admin, manager, cashier]
 *           example: cashier
 *     ChangePasswordRequest:
 *       type: object
 *       required:
 *         - currentPassword
 *         - newPassword
 *       properties:
 *         currentPassword:
 *           type: string
 *           format: password
 *           example: admin123
 *         newPassword:
 *           type: string
 *           format: password
 *           example: newpassword123
 *     ForgotPasswordRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: admin@stocksystem.com
 *     ResetPasswordRequest:
 *       type: object
 *       required:
 *         - token
 *         - newPassword
 *       properties:
 *         token:
 *           type: string
 *           example: reset-token-123
 *         newPassword:
 *           type: string
 *           format: password
 *           example: newpassword123
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: User login
 *     description: Authenticate user and return JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid credentials
 *       500:
 *         description: Server error
 */
// Simple working login route
router.post('/login', async (req, res) => {
    try {
        console.log('Login attempt:', req.body?.username);
        
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
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login failed', error: error.message });
    }
});

// Register (admin only in production, but open for initial setup)
router.post('/register', [
    body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('role').isIn(['admin', 'manager', 'cashier']).withMessage('Valid role is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, email, password, firstName, lastName, role } = req.body;

        // Check if user already exists
        const existingUser = await getRow(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUser) {
            return res.status(409).json({ message: 'Username or email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        const result = await runQuery(
            `INSERT INTO users (username, email, password, first_name, last_name, role) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [username, email, hashedPassword, firstName, lastName, role]
        );

        res.status(201).json({
            message: 'User registered successfully',
            userId: result.id
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     tags: [Authentication]
 *     summary: Get current user profile
 *     description: Get the profile information of the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Invalid token
 *       403:
 *         description: Forbidden - Token expired
 */
router.get('/profile', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh JWT token
 *     description: Generate a new JWT token using the current valid token
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid token
 */
router.post('/refresh-token', authenticateToken, (req, res) => {
    const token = jwt.sign(
        { 
            userId: req.user.id, 
            username: req.user.username, 
            role: req.user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    res.json({
        message: 'Token refreshed successfully',
        token
    });
});

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     tags: [Authentication]
 *     summary: Change user password
 *     description: Change the password for the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid current password or validation error
 *       401:
 *         description: Authentication required
 */
router.put('/change-password', authenticateToken, [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        // Get current password hash
        const user = await getRow(
            'SELECT password FROM users WHERE id = ?',
            [userId]
        );

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await runQuery(
            'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hashedNewPassword, userId]
        );

        res.json({ message: 'Password changed successfully' });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Error changing password' });
    }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: User logout
 *     description: Logout user (client-side token removal)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', authenticateToken, (req, res) => {
    // In a stateless JWT system, logout is primarily handled client-side
    // by removing the token. For enhanced security, you could implement
    // a token blacklist here.
    res.json({ message: 'Logout successful' });
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Request password reset
 *     description: Send password reset email to user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: Reset email sent (if user exists)
 *       400:
 *         description: Validation error
 */
router.post('/forgot-password', [
    body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email } = req.body;

        // Check if user exists
        const user = await getRow(
            'SELECT id, username FROM users WHERE email = ? AND is_active = 1',
            [email]
        );

        // Always return success to prevent email enumeration
        // In real implementation, send email if user exists
        res.json({ 
            message: 'If an account with that email exists, a password reset link has been sent.' 
        });

        // TODO: Implement actual email sending and reset token generation
        if (user) {
            console.log(`Password reset requested for user: ${user.username}`);
            // Generate reset token and send email
        }

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Error processing password reset request' });
    }
});

/**
 * @swagger
 * /api/auth/verify-token:
 *   get:
 *     tags: [Authentication]
 *     summary: Verify token validity
 *     description: Check if the current token is valid and return user info
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Token is invalid or expired
 */
router.get('/verify-token', authenticateToken, (req, res) => {
    res.json({
        valid: true,
        user: req.user
    });
});

module.exports = router;
