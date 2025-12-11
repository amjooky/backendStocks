const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult, query } = require('express-validator');
const { runQuery, getAllRows, getRow } = require('../../config/database');
const { requireSuperadmin, logAuth } = require('../../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Superadmin - Users
 *   description: User management across all agencies for superadmin
 */

// All routes require superadmin role
router.use(requireSuperadmin);

/**
 * @swagger
 * /api/superadmin/users:
 *   get:
 *     tags: [Superadmin - Users]
 *     summary: Get all users across agencies with filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: agencyId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, manager, cashier]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, locked]
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
router.get('/', [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('agencyId').optional().isInt(),
    query('role').optional().isIn(['admin', 'manager', 'cashier']),
    query('search').optional().isString(),
    query('status').optional().isIn(['active', 'inactive', 'locked'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const agencyId = req.query.agencyId;
        const role = req.query.role;
        const search = req.query.search;
        const status = req.query.status;

        let whereClause = 'WHERE u.role != "superadmin"'; // Exclude superadmin users
        const params = [];

        if (agencyId) {
            whereClause += ' AND u.agency_id = ?';
            params.push(agencyId);
        }

        if (role) {
            whereClause += ' AND u.role = ?';
            params.push(role);
        }

        if (search) {
            whereClause += ' AND (u.username LIKE ? OR u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        if (status) {
            if (status === 'active') {
                whereClause += ' AND u.is_active = 1 AND (u.locked_until IS NULL OR u.locked_until < CURRENT_TIMESTAMP)';
            } else if (status === 'inactive') {
                whereClause += ' AND u.is_active = 0';
            } else if (status === 'locked') {
                whereClause += ' AND u.locked_until IS NOT NULL AND u.locked_until > CURRENT_TIMESTAMP';
            }
        }

        const query = `
            SELECT 
                u.id, u.username, u.email, u.first_name, u.last_name, u.role,
                u.is_active, u.last_login, u.login_attempts, u.locked_until,
                u.created_at, u.preferred_language, u.timezone,
                a.name as agency_name, a.subscription_status as agency_status
            FROM users u
            LEFT JOIN agencies a ON u.agency_id = a.id
            ${whereClause}
            ORDER BY u.last_login DESC, u.created_at DESC
            LIMIT ? OFFSET ?
        `;

        params.push(limit, offset);
        const users = await getAllRows(query, params);

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM users u
            LEFT JOIN agencies a ON u.agency_id = a.id
            ${whereClause}
        `;
        const countParams = params.slice(0, -2);
        const countResult = await getRow(countQuery, countParams);

        await logAuth(req.user.id, null, 'USERS_LIST', {
            filters: { page, limit, agencyId, role, search, status },
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            users: users.map(user => ({
                ...user,
                // Don't expose sensitive data
                password: undefined,
                two_factor_secret: undefined
            })),
            pagination: {
                page,
                limit,
                total: countResult.total,
                totalPages: Math.ceil(countResult.total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
});

/**
 * @swagger
 * /api/superadmin/users/{id}:
 *   get:
 *     tags: [Superadmin - Users]
 *     summary: Get user details with activity history
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 */
router.get('/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        const user = await getRow(`
            SELECT 
                u.*, a.name as agency_name, a.subscription_status as agency_status,
                a.max_users as agency_max_users
            FROM users u
            LEFT JOIN agencies a ON u.agency_id = a.id
            WHERE u.id = ? AND u.role != 'superadmin'
        `, [userId]);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get user activity history
        const activityHistory = await getAllRows(`
            SELECT action, resource_type, timestamp, ip_address
            FROM audit_log
            WHERE user_id = ?
            ORDER BY timestamp DESC
            LIMIT 50
        `, [userId]);

        // Get user statistics
        const stats = await getRow(`
            SELECT 
                (SELECT COUNT(*) FROM sales WHERE created_by = ?) as sales_count,
                (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE created_by = ?) as total_sales_amount,
                (SELECT COUNT(*) FROM stock_movements WHERE user_id = ?) as stock_movements_count
        `, [userId, userId, userId]);

        await logAuth(req.user.id, user.agency_id, 'USER_VIEW', {
            targetUserId: userId,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            user: {
                ...user,
                password: undefined,
                two_factor_secret: undefined
            },
            statistics: stats,
            activityHistory
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Error fetching user' });
    }
});

/**
 * @swagger
 * /api/superadmin/users:
 *   post:
 *     tags: [Superadmin - Users]
 *     summary: Create user for any agency
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *               - role
 *               - agencyId
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, manager, cashier]
 *               agencyId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: User created successfully
 */
router.post('/', [
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('role').isIn(['admin', 'manager', 'cashier']).withMessage('Valid role is required'),
    body('agencyId').isInt().withMessage('Valid agency ID is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, email, password, firstName, lastName, role, agencyId } = req.body;

        // Check if agency exists and has space for more users
        const agency = await getRow('SELECT * FROM agencies WHERE id = ?', [agencyId]);
        if (!agency) {
            return res.status(404).json({ message: 'Agency not found' });
        }

        const currentUserCount = await getRow(
            'SELECT COUNT(*) as count FROM users WHERE agency_id = ? AND is_active = 1',
            [agencyId]
        );

        if (currentUserCount.count >= agency.max_users) {
            return res.status(403).json({ 
                message: 'Agency has reached maximum user limit',
                maxUsers: agency.max_users,
                currentUsers: currentUserCount.count
            });
        }

        // Check for duplicate username or email
        const existingUser = await getRow(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUser) {
            return res.status(409).json({ message: 'Username or email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        const result = await runQuery(`
            INSERT INTO users (
                username, email, password, first_name, last_name, role, agency_id,
                must_change_password, preferred_language, timezone,
                gdpr_consent, gdpr_consent_date, data_processing_consent
            ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, 'it', 'Europe/Rome', TRUE, CURRENT_TIMESTAMP, TRUE)
        `, [username, email, hashedPassword, firstName, lastName, role, agencyId]);

        await logAuth(req.user.id, agencyId, 'USER_CREATE', {
            newUserId: result.id,
            username, email, role, agencyId,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.status(201).json({
            message: 'User created successfully',
            userId: result.id
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Error creating user' });
    }
});

/**
 * @swagger
 * /api/superadmin/users/{id}:
 *   put:
 *     tags: [Superadmin - Users]
 *     summary: Update user information
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User updated successfully
 */
router.put('/:id', [
    body('username').optional().trim().isLength({ min: 3 }),
    body('email').optional().isEmail(),
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('role').optional().isIn(['admin', 'manager', 'cashier']),
    body('isActive').optional().isBoolean(),
    body('agencyId').optional().isInt()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const userId = req.params.id;
        const updates = req.body;

        // Check if user exists and is not superadmin
        const existingUser = await getRow(
            'SELECT * FROM users WHERE id = ? AND role != "superadmin"',
            [userId]
        );

        if (!existingUser) {
            return res.status(404).json({ message: 'User not found or cannot be modified' });
        }

        // Build update query dynamically
        const allowedFields = ['username', 'email', 'first_name', 'last_name', 'role', 'is_active', 'agency_id'];
        const updateFields = [];
        const updateValues = [];

        for (const field of allowedFields) {
            const camelField = field.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
            if (updates[camelField] !== undefined) {
                updateFields.push(`${field} = ?`);
                updateValues.push(updates[camelField]);
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'No valid fields to update' });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(userId);

        await runQuery(`
            UPDATE users 
            SET ${updateFields.join(', ')}
            WHERE id = ?
        `, updateValues);

        await logAuth(req.user.id, existingUser.agency_id, 'USER_UPDATE', {
            targetUserId: userId,
            oldValues: existingUser,
            newValues: updates,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Error updating user' });
    }
});

/**
 * @swagger
 * /api/superadmin/users/{id}/reset-password:
 *   post:
 *     tags: [Superadmin - Users]
 *     summary: Reset user password
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password reset successfully
 */
router.post('/:id/reset-password', [
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const userId = req.params.id;
        const { newPassword } = req.body;

        const user = await getRow(
            'SELECT * FROM users WHERE id = ? AND role != "superadmin"',
            [userId]
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        await runQuery(`
            UPDATE users 
            SET password = ?, must_change_password = TRUE, 
                password_changed_at = CURRENT_TIMESTAMP,
                login_attempts = 0, locked_until = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [hashedPassword, userId]);

        await logAuth(req.user.id, user.agency_id, 'USER_PASSWORD_RESET', {
            targetUserId: userId,
            targetUsername: user.username,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({ message: 'Password reset successfully. User must change password on next login.' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'Error resetting password' });
    }
});

/**
 * @swagger
 * /api/superadmin/users/{id}/unlock:
 *   post:
 *     tags: [Superadmin - Users]
 *     summary: Unlock locked user account
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User account unlocked successfully
 */
router.post('/:id/unlock', async (req, res) => {
    try {
        const userId = req.params.id;

        const user = await getRow(
            'SELECT * FROM users WHERE id = ? AND role != "superadmin"',
            [userId]
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await runQuery(`
            UPDATE users 
            SET login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [userId]);

        await logAuth(req.user.id, user.agency_id, 'USER_UNLOCK', {
            targetUserId: userId,
            targetUsername: user.username,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({ message: 'User account unlocked successfully' });
    } catch (error) {
        console.error('Error unlocking user:', error);
        res.status(500).json({ message: 'Error unlocking user' });
    }
});

/**
 * @swagger
 * /api/superadmin/users/{id}/impersonate:
 *   post:
 *     tags: [Superadmin - Users]
 *     summary: Generate impersonation token for user (admin purposes)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Impersonation token generated
 */
router.post('/:id/impersonate', async (req, res) => {
    try {
        const userId = req.params.id;

        const user = await getRow(
            'SELECT * FROM users WHERE id = ? AND role != "superadmin" AND is_active = 1',
            [userId]
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found or inactive' });
        }

        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { 
                userId: user.id, 
                role: user.role,
                impersonatedBy: req.user.id // Track who is impersonating
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1h' } // Short expiration for security
        );

        await logAuth(req.user.id, user.agency_id, 'USER_IMPERSONATE', {
            targetUserId: userId,
            targetUsername: user.username,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            message: 'Impersonation token generated',
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                agencyId: user.agency_id
            },
            expiresIn: '1h'
        });
    } catch (error) {
        console.error('Error generating impersonation token:', error);
        res.status(500).json({ message: 'Error generating impersonation token' });
    }
});

module.exports = router;