const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { runQuery, getAllRows, getRow } = require('../config/database');
const { authenticateToken, requireSuperadmin } = require('../middleware/auth');
const { logDataAccess } = require('../middleware/tenant');
const bcrypt = require('bcryptjs');

const router = express.Router();

// All routes require superadmin authentication
router.use(authenticateToken);
router.use(requireSuperadmin);

// ==================== AGENCIES MANAGEMENT ====================

// Get all agencies with stats
router.get('/agencies', logDataAccess('read', 'agencies'), async (req, res) => {
    try {
        const agencies = await getAllRows(`
            SELECT * FROM agencies WHERE is_active = 1 ORDER BY created_at DESC
        `);
        
        res.json(agencies);
    } catch (error) {
        console.error('Error fetching agencies:', error);
        res.status(500).json({ message: 'Error fetching agencies' });
    }
});

// Get specific agency details
router.get('/agencies/:id', logDataAccess('read', 'agencies'), async (req, res) => {
    try {
        const agency = await getRow(`
            SELECT 
                a.*,
                COUNT(DISTINCT u.id) as user_count,
                COUNT(DISTINCT p.id) as product_count,
                COUNT(DISTINCT s.id) as supplier_count,
                COUNT(DISTINCT c.id) as customer_count
            FROM agencies a
            LEFT JOIN users u ON a.id = u.agency_id AND u.is_active = 1
            LEFT JOIN products p ON a.id = p.agency_id AND p.is_active = 1
            LEFT JOIN suppliers s ON a.id = s.agency_id AND s.is_active = 1
            LEFT JOIN customers c ON a.id = c.agency_id AND c.is_active = 1
            WHERE a.id = ? AND a.is_active = 1
            GROUP BY a.id
        `, [req.params.id]);

        if (!agency) {
            return res.status(404).json({ message: 'Agency not found' });
        }

        // Get recent activity
        const recentActivity = await getAllRows(`
            SELECT 
                'sale' as type, 
                id, 
                total_amount as amount,
                created_at
            FROM sales 
            WHERE agency_id = ?
            UNION ALL
            SELECT 
                'user_login' as type,
                user_id as id,
                null as amount,
                created_at
            FROM audit_log
            WHERE agency_id = ? AND action = 'login'
            ORDER BY created_at DESC
            LIMIT 20
        `, [req.params.id, req.params.id]);

        res.json({
            ...agency,
            recent_activity: recentActivity
        });
    } catch (error) {
        console.error('Error fetching agency details:', error);
        res.status(500).json({ message: 'Error fetching agency details' });
    }
});

// Create new agency
router.post('/agencies', logDataAccess('create', 'agencies'), [
    body('name').notEmpty().withMessage('Agency name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').optional().isString(),
    body('address').optional().isString(),
    body('city').optional().isString(),
    body('subscription_plan').isIn(['basic', 'pro', 'enterprise']).withMessage('Valid subscription plan required'),
    body('max_users').isInt({ min: 1 }).withMessage('Max users must be at least 1'),
    body('max_products').isInt({ min: 1 }).withMessage('Max products must be at least 1')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { 
            name, 
            email, 
            phone, 
            address,
            city, 
            subscription_plan,
            max_users,
            max_products
        } = req.body;

        // Check if agency name already exists
        const existingAgency = await getRow(
            'SELECT id FROM agencies WHERE name = ? AND is_active = 1',
            [name]
        );

        if (existingAgency) {
            return res.status(409).json({ message: 'Agency name already exists' });
        }

        // Check if email already exists
        const existingEmail = await getRow(
            'SELECT id FROM agencies WHERE email = ? AND is_active = 1',
            [email]
        );

        if (existingEmail) {
            return res.status(409).json({ message: 'Email address already exists' });
        }

        const result = await runQuery(`
            INSERT INTO agencies (
                name, 
                email, 
                phone, 
                address,
                city, 
                subscription_plan, 
                max_users, 
                max_products
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [name, email, phone || null, address || null, city || null, subscription_plan, max_users, max_products]);

        res.status(201).json({
            message: 'Agency created successfully',
            id: result.id,
            agency: { 
                id: result.id, 
                name, 
                email,
                phone,
                address,
                city,
                subscription_plan,
                max_users,
                max_products
            }
        });

    } catch (error) {
        console.error('Error creating agency:', error);
        
        // Handle specific SQLite constraint errors
        if (error.code === 'SQLITE_CONSTRAINT') {
            if (error.message.includes('agencies.email')) {
                return res.status(409).json({ message: 'Email address already exists' });
            }
            if (error.message.includes('agencies.name')) {
                return res.status(409).json({ message: 'Agency name already exists' });
            }
            return res.status(409).json({ message: 'Constraint violation: duplicate data' });
        }
        
        res.status(500).json({ message: 'Error creating agency' });
    }
});

// Update agency
router.put('/agencies/:id', logDataAccess('update', 'agencies'), [
    body('name').notEmpty().withMessage('Agency name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').optional().isString(),
    body('address').optional().isString(),
    body('city').optional().isString(),
    body('subscription_plan').isIn(['basic', 'pro', 'enterprise']).withMessage('Valid subscription plan required'),
    body('max_users').isInt({ min: 1 }).withMessage('Max users must be at least 1'),
    body('max_products').isInt({ min: 1 }).withMessage('Max products must be at least 1'),
    body('is_active').optional().isBoolean()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { 
            name, 
            email, 
            phone, 
            address,
            city, 
            subscription_plan,
            max_users,
            max_products,
            is_active
        } = req.body;

        // Check if agency exists
        const existingAgency = await getRow(
            'SELECT id FROM agencies WHERE id = ?',
            [id]
        );

        if (!existingAgency) {
            return res.status(404).json({ message: 'Agency not found' });
        }

        // Check if new name conflicts with another agency
        const nameConflict = await getRow(
            'SELECT id FROM agencies WHERE name = ? AND id != ? AND is_active = 1',
            [name, id]
        );

        if (nameConflict) {
            return res.status(409).json({ message: 'Agency name already exists' });
        }

        // Check if new email conflicts with another agency
        const emailConflict = await getRow(
            'SELECT id FROM agencies WHERE email = ? AND id != ? AND is_active = 1',
            [email, id]
        );

        if (emailConflict) {
            return res.status(409).json({ message: 'Email address already exists' });
        }

        await runQuery(`
            UPDATE agencies SET 
                name = ?, 
                email = ?, 
                phone = ?, 
                address = ?,
                city = ?, 
                subscription_plan = ?,
                max_users = ?,
                max_products = ?,
                is_active = COALESCE(?, is_active),
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `, [name, email, phone, address, city, subscription_plan, max_users, max_products, is_active, id]);

        res.json({
            message: 'Agency updated successfully',
            agency: { 
                id: parseInt(id), 
                name, 
                email,
                phone,
                address,
                city,
                subscription_plan,
                max_users,
                max_products,
                is_active
            }
        });

    } catch (error) {
        console.error('Error updating agency:', error);
        res.status(500).json({ message: 'Error updating agency' });
    }
});

// Suspend/Reactivate agency
router.patch('/agencies/:id/status', logDataAccess('update', 'agencies'), [
    body('is_active').isBoolean().withMessage('Status must be boolean'),
    body('reason').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { is_active, reason } = req.body;

        const agency = await getRow('SELECT * FROM agencies WHERE id = ?', [id]);
        if (!agency) {
            return res.status(404).json({ message: 'Agency not found' });
        }

        await runQuery(
            'UPDATE agencies SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [is_active, id]
        );

        // Log the action
        await runQuery(`
            INSERT INTO audit_log (
                user_id, agency_id, action, resource_type, resource_id, new_values, ip_address
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            req.user.id, 
            null, 
            is_active ? 'agency_reactivated' : 'agency_suspended',
            'agencies', 
            id, 
            JSON.stringify({ reason, is_active }),
            req.ip
        ]);

        res.json({
            message: `Agency ${is_active ? 'reactivated' : 'suspended'} successfully`,
            agency_id: parseInt(id),
            status: is_active
        });

    } catch (error) {
        console.error('Error updating agency status:', error);
        res.status(500).json({ message: 'Error updating agency status' });
    }
});

// ==================== USERS MANAGEMENT ====================

// Get all users across agencies
router.get('/users', [
    query('agency_id').optional().isInt(),
    query('role').optional().isIn(['cashier', 'manager', 'admin', 'superadmin']),
    query('status').optional().isIn(['active', 'inactive', 'locked']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
], logDataAccess('read', 'users'), async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const { agency_id, role, status } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (agency_id) {
            whereClause += ' AND u.agency_id = ?';
            params.push(agency_id);
        }

        if (role) {
            whereClause += ' AND u.role = ?';
            params.push(role);
        }

        if (status) {
            if (status === 'active') {
                whereClause += ' AND u.is_active = 1 AND u.locked_until IS NULL';
            } else if (status === 'inactive') {
                whereClause += ' AND u.is_active = 0';
            } else if (status === 'locked') {
                whereClause += ' AND u.locked_until IS NOT NULL AND u.locked_until > CURRENT_TIMESTAMP';
            }
        }

        const users = await getAllRows(`
            SELECT 
                u.id, u.username, u.email, u.first_name, u.last_name, 
                u.role, u.is_active, u.locked_until, u.last_login, u.created_at,
                a.name as agency_name, a.subscription_plan
            FROM users u
            LEFT JOIN agencies a ON u.agency_id = a.id
            ${whereClause}
            ORDER BY u.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        // Get total count
        const countResult = await getRow(`
            SELECT COUNT(*) as total 
            FROM users u
            LEFT JOIN agencies a ON u.agency_id = a.id
            ${whereClause}
        `, params);

        res.json({
            users,
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

// Create user for any agency
router.post('/users', logDataAccess('create', 'users'), [
    body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('first_name').notEmpty().withMessage('First name is required'),
    body('last_name').notEmpty().withMessage('Last name is required'),
    body('role').isIn(['cashier', 'manager', 'admin']).withMessage('Valid role required'),
    body('agency_id').isInt().withMessage('Agency ID is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, email, password, first_name, last_name, role, agency_id } = req.body;

        // Check if agency exists and is active
        const agency = await getRow(
            'SELECT id, max_users FROM agencies WHERE id = ? AND is_active = 1',
            [agency_id]
        );

        if (!agency) {
            return res.status(400).json({ message: 'Invalid or inactive agency' });
        }

        // Check agency user limit
        const userCount = await getRow(
            'SELECT COUNT(*) as count FROM users WHERE agency_id = ? AND is_active = 1',
            [agency_id]
        );

        if (userCount.count >= agency.max_users) {
            return res.status(409).json({ 
                message: 'Agency has reached maximum user limit',
                limit: agency.max_users,
                current: userCount.count
            });
        }

        // Check if username already exists
        const existingUser = await getRow(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );

        if (existingUser) {
            return res.status(409).json({ message: 'Username already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await runQuery(`
            INSERT INTO users (
                username, email, password, first_name, last_name, role, agency_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [username, email, hashedPassword, first_name, last_name, role, agency_id]);

        res.status(201).json({
            message: 'User created successfully',
            id: result.id,
            user: { 
                id: result.id, 
                username, 
                email, 
                first_name, 
                last_name, 
                role, 
                agency_id 
            }
        });

    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Error creating user' });
    }
});

// Update user (any agency)
router.put('/users/:id', logDataAccess('update', 'users'), [
    body('email').optional().isEmail(),
    body('first_name').optional().notEmpty(),
    body('last_name').optional().notEmpty(),
    body('role').optional().isIn(['cashier', 'manager', 'admin']),
    body('is_active').optional().isBoolean(),
    body('agency_id').optional().isInt()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const updates = req.body;

        // Check if user exists
        const user = await getRow('SELECT * FROM users WHERE id = ?', [id]);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // If changing agency, verify new agency exists and has capacity
        if (updates.agency_id && updates.agency_id !== user.agency_id) {
            const newAgency = await getRow(
                'SELECT id, max_users FROM agencies WHERE id = ? AND is_active = 1',
                [updates.agency_id]
            );

            if (!newAgency) {
                return res.status(400).json({ message: 'Invalid or inactive agency' });
            }

            const userCount = await getRow(
                'SELECT COUNT(*) as count FROM users WHERE agency_id = ? AND is_active = 1',
                [updates.agency_id]
            );

            if (userCount.count >= newAgency.max_users) {
                return res.status(409).json({ 
                    message: 'Target agency has reached maximum user limit' 
                });
            }
        }

        // Build update query
        const updateFields = [];
        const params = [];

        Object.keys(updates).forEach(key => {
            if (['email', 'first_name', 'last_name', 'role', 'is_active', 'agency_id'].includes(key)) {
                updateFields.push(`${key} = ?`);
                params.push(updates[key]);
            }
        });

        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'No valid fields to update' });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);

        await runQuery(`
            UPDATE users SET ${updateFields.join(', ')} WHERE id = ?
        `, params);

        res.json({ message: 'User updated successfully' });

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Error updating user' });
    }
});

// Lock/Unlock user
router.patch('/users/:id/lock', logDataAccess('update', 'users'), [
    body('locked').isBoolean().withMessage('Locked status required'),
    body('reason').optional().isString(),
    body('duration_hours').optional().isInt({ min: 1 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { locked, reason, duration_hours } = req.body;

        const user = await getRow('SELECT * FROM users WHERE id = ?', [id]);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        let lockedUntil = null;
        if (locked && duration_hours) {
            const lockDuration = new Date();
            lockDuration.setHours(lockDuration.getHours() + duration_hours);
            lockedUntil = lockDuration.toISOString();
        }

        await runQuery(
            'UPDATE users SET locked_until = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [lockedUntil, id]
        );

        // Log the action
        await runQuery(`
            INSERT INTO audit_log (
                user_id, agency_id, action, resource_type, resource_id, new_values, ip_address
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            req.user.id, 
            user.agency_id, 
            locked ? 'user_locked' : 'user_unlocked',
            'users', 
            id, 
            JSON.stringify({ reason, duration_hours, locked }),
            req.ip
        ]);

        res.json({
            message: `User ${locked ? 'locked' : 'unlocked'} successfully`,
            user_id: parseInt(id),
            locked_until: lockedUntil
        });

    } catch (error) {
        console.error('Error updating user lock status:', error);
        res.status(500).json({ message: 'Error updating user lock status' });
    }
});

// ==================== SYSTEM ANALYTICS ====================

// Get system-wide analytics
router.get('/analytics', logDataAccess('read', 'system'), async (req, res) => {
    try {
        // Get overall stats
        const stats = await getRow(`
            SELECT 
                (SELECT COUNT(*) FROM agencies WHERE is_active = 1) as total_agencies,
                (SELECT COUNT(*) FROM users WHERE is_active = 1) as total_users,
                (SELECT COUNT(*) FROM products WHERE is_active = 1) as total_products,
                (SELECT COUNT(*) FROM sales WHERE DATE(created_at) = DATE('now')) as today_sales,
                (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE DATE(created_at) = DATE('now')) as today_revenue,
                (SELECT COUNT(*) FROM sales WHERE DATE(created_at) >= DATE('now', '-7 days')) as week_sales,
                (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE DATE(created_at) >= DATE('now', '-7 days')) as week_revenue,
                (SELECT COUNT(*) FROM sales WHERE DATE(created_at) >= DATE('now', '-30 days')) as month_sales,
                (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE DATE(created_at) >= DATE('now', '-30 days')) as month_revenue
        `);

        // Get top agencies by revenue
        const topAgencies = await getAllRows(`
            SELECT 
                a.id, a.name, a.subscription_plan,
                COUNT(DISTINCT s.id) as sales_count,
                COALESCE(SUM(s.total_amount), 0) as total_revenue,
                COUNT(DISTINCT u.id) as user_count
            FROM agencies a
            LEFT JOIN sales s ON a.id = s.agency_id AND DATE(s.created_at) >= DATE('now', '-30 days')
            LEFT JOIN users u ON a.id = u.agency_id AND u.is_active = 1
            WHERE a.is_active = 1
            GROUP BY a.id
            ORDER BY total_revenue DESC
            LIMIT 10
        `);

        // Get subscription distribution
        const subscriptionStats = await getAllRows(`
            SELECT 
                subscription_plan,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM agencies WHERE is_active = 1), 2) as percentage
            FROM agencies 
            WHERE is_active = 1 
            GROUP BY subscription_plan
            ORDER BY count DESC
        `);

        // Get daily sales trend (last 30 days)
        const salesTrend = await getAllRows(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as sales_count,
                COALESCE(SUM(total_amount), 0) as revenue
            FROM sales
            WHERE DATE(created_at) >= DATE('now', '-30 days')
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `);

        res.json({
            overview: stats,
            top_agencies: topAgencies,
            subscription_distribution: subscriptionStats,
            sales_trend: salesTrend
        });

    } catch (error) {
        console.error('Error fetching system analytics:', error);
        res.status(500).json({ message: 'Error fetching system analytics' });
    }
});

// Get audit log
router.get('/audit-log', [
    query('agency_id').optional().isInt(),
    query('user_id').optional().isInt(),
    query('action').optional().isString(),
    query('resource_type').optional().isString(),
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
], logDataAccess('read', 'audit_log'), async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (req.query.agency_id) {
            whereClause += ' AND al.agency_id = ?';
            params.push(req.query.agency_id);
        }

        if (req.query.user_id) {
            whereClause += ' AND al.user_id = ?';
            params.push(req.query.user_id);
        }

        if (req.query.action) {
            whereClause += ' AND al.action LIKE ?';
            params.push(`%${req.query.action}%`);
        }

        if (req.query.resource_type) {
            whereClause += ' AND al.resource_type = ?';
            params.push(req.query.resource_type);
        }

        if (req.query.start_date) {
            whereClause += ' AND al.timestamp >= ?';
            params.push(req.query.start_date);
        }

        if (req.query.end_date) {
            whereClause += ' AND al.timestamp <= ?';
            params.push(req.query.end_date);
        }

        const auditLogs = await getAllRows(`
            SELECT 
                al.*,
                u.username, u.first_name, u.last_name,
                a.name as agency_name
            FROM audit_log al
            LEFT JOIN users u ON al.user_id = u.id
            LEFT JOIN agencies a ON al.agency_id = a.id
            ${whereClause}
            ORDER BY al.timestamp DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        // Get total count
        const countResult = await getRow(`
            SELECT COUNT(*) as total FROM audit_log al ${whereClause}
        `, params);

        res.json({
            logs: auditLogs,
            pagination: {
                page,
                limit,
                total: countResult.total,
                totalPages: Math.ceil(countResult.total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ message: 'Error fetching audit logs' });
    }
});

module.exports = router;