const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult, query } = require('express-validator');
const { runQuery, getAllRows, getRow } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticateToken);

// Get all users (Admin only)
router.get('/', requireAdmin, [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('role').optional().isIn(['admin', 'manager', 'cashier']),
    query('active').optional().isBoolean()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const { role, active } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (role) {
            whereClause += ' AND role = ?';
            params.push(role);
        }

        if (active !== undefined) {
            whereClause += ' AND is_active = ?';
            params.push(active === 'true' ? 1 : 0);
        }

        const users = await getAllRows(`
            SELECT 
                id, username, email, first_name, last_name, role, is_active, 
                created_at, updated_at
            FROM users 
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        // Get total count
        const countResult = await getRow(`
            SELECT COUNT(*) as total FROM users ${whereClause}
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

// Get user by ID (Admin only)
router.get('/:id', requireAdmin, async (req, res) => {
    try {
        const user = await getRow(
            'SELECT id, username, email, first_name, last_name, role, is_active, created_at, updated_at FROM users WHERE id = ?',
            [req.params.id]
        );
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get user's recent activity (sales made)
        const recentSales = await getAllRows(`
            SELECT 
                id, sale_number, total_amount, created_at
            FROM sales 
            WHERE cashier_id = ?
            ORDER BY created_at DESC
            LIMIT 10
        `, [req.params.id]);

        // Get user's performance stats
        const performanceStats = await getRow(`
            SELECT 
                COUNT(*) as total_sales,
                SUM(total_amount) as total_revenue,
                AVG(total_amount) as average_sale_amount
            FROM sales 
            WHERE cashier_id = ?
        `, [req.params.id]);

        res.json({
            ...user,
            recentSales,
            performanceStats
        });

    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Error fetching user' });
    }
});

// Create new user (Admin only)
router.post('/', requireAdmin, [
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

        // Check if username already exists
        const existingUsername = await getRow(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );

        if (existingUsername) {
            return res.status(409).json({ message: 'Username already exists' });
        }

        // Check if email already exists
        const existingEmail = await getRow(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingEmail) {
            return res.status(409).json({ message: 'Email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const result = await runQuery(
            `INSERT INTO users (username, email, password, first_name, last_name, role) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [username, email, hashedPassword, firstName, lastName, role]
        );

        res.status(201).json({
            message: 'User created successfully',
            id: result.id,
            user: { 
                id: result.id, 
                username, 
                email, 
                firstName, 
                lastName, 
                role 
            }
        });

    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Error creating user' });
    }
});

// Update user (Admin only)
router.put('/:id', requireAdmin, [
    body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('role').isIn(['admin', 'manager', 'cashier']).withMessage('Valid role is required'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { username, email, firstName, lastName, role, password } = req.body;

        // Check if user exists
        const existingUser = await getRow(
            'SELECT id FROM users WHERE id = ?',
            [id]
        );

        if (!existingUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent admin from changing their own role if they're the only admin
        if (parseInt(id) === req.user.id && req.user.role === 'admin' && role !== 'admin') {
            const adminCount = await getRow(
                'SELECT COUNT(*) as count FROM users WHERE role = "admin" AND is_active = 1'
            );

            if (adminCount.count <= 1) {
                return res.status(400).json({ 
                    message: 'Cannot change role - you are the only active admin' 
                });
            }
        }

        // Check if new username conflicts with another user
        const usernameConflict = await getRow(
            'SELECT id FROM users WHERE username = ? AND id != ?',
            [username, id]
        );

        if (usernameConflict) {
            return res.status(409).json({ message: 'Username already exists' });
        }

        // Check if new email conflicts with another user
        const emailConflict = await getRow(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [email, id]
        );

        if (emailConflict) {
            return res.status(409).json({ message: 'Email already exists' });
        }

        // Prepare update query
        let updateQuery = `
            UPDATE users SET 
                username = ?, email = ?, first_name = ?, last_name = ?, role = ?, 
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `;
        let updateParams = [username, email, firstName, lastName, role, id];

        // Update password if provided
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateQuery = `
                UPDATE users SET 
                    username = ?, email = ?, password = ?, first_name = ?, last_name = ?, role = ?, 
                    updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `;
            updateParams = [username, email, hashedPassword, firstName, lastName, role, id];
        }

        await runQuery(updateQuery, updateParams);

        res.json({
            message: 'User updated successfully',
            user: { 
                id: parseInt(id), 
                username, 
                email, 
                firstName, 
                lastName, 
                role 
            }
        });

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Error updating user' });
    }
});

// Toggle user active status (Admin only)
router.patch('/:id/toggle', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user exists
        const user = await getRow(
            'SELECT id, is_active, role FROM users WHERE id = ?',
            [id]
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent admin from deactivating themselves if they're the only admin
        if (parseInt(id) === req.user.id && user.role === 'admin' && user.is_active === 1) {
            const adminCount = await getRow(
                'SELECT COUNT(*) as count FROM users WHERE role = "admin" AND is_active = 1'
            );

            if (adminCount.count <= 1) {
                return res.status(400).json({ 
                    message: 'Cannot deactivate - you are the only active admin' 
                });
            }
        }

        const newStatus = user.is_active ? 0 : 1;

        await runQuery(
            'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newStatus, id]
        );

        res.json({
            message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
            isActive: Boolean(newStatus)
        });

    } catch (error) {
        console.error('Error toggling user status:', error);
        res.status(500).json({ message: 'Error toggling user status' });
    }
});

// Delete user (Admin only) - Soft delete only if no sales history
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user exists
        const user = await getRow(
            'SELECT id, role FROM users WHERE id = ?',
            [id]
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent admin from deleting themselves if they're the only admin
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        if (user.role === 'admin') {
            const adminCount = await getRow(
                'SELECT COUNT(*) as count FROM users WHERE role = "admin" AND is_active = 1'
            );

            if (adminCount.count <= 1) {
                return res.status(400).json({ 
                    message: 'Cannot delete the only active admin account' 
                });
            }
        }

        // Check if user has sales history
        const salesCount = await getRow(
            'SELECT COUNT(*) as count FROM sales WHERE cashier_id = ?',
            [id]
        );

        if (salesCount.count > 0) {
            return res.status(409).json({ 
                message: 'Cannot delete user with sales history. Consider deactivating instead.' 
            });
        }

        // Check if user has created stock movements
        const movementsCount = await getRow(
            'SELECT COUNT(*) as count FROM stock_movements WHERE user_id = ?',
            [id]
        );

        if (movementsCount.count > 0) {
            return res.status(409).json({ 
                message: 'Cannot delete user with stock movement history. Consider deactivating instead.' 
            });
        }

        // Safe to delete (no historical data)
        await runQuery('DELETE FROM users WHERE id = ?', [id]);

        res.json({ message: 'User deleted successfully' });

    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error deleting user' });
    }
});

// Change user password (Admin only)
router.post('/:id/change-password', requireAdmin, [
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { newPassword } = req.body;

        // Check if user exists
        const user = await getRow(
            'SELECT id FROM users WHERE id = ?',
            [id]
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await runQuery(
            'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hashedPassword, id]
        );

        res.json({
            message: 'Password changed successfully',
            userId: parseInt(id)
        });

    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ message: 'Error changing password' });
    }
});

// Get user performance statistics (Admin only)
router.get('/:id/performance', requireAdmin, [
    query('startDate').optional().isDate(),
    query('endDate').optional().isDate()
], async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;

        // Check if user exists
        const user = await getRow(
            'SELECT id, username, first_name, last_name FROM users WHERE id = ?',
            [id]
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        let whereClause = 'WHERE cashier_id = ?';
        let params = [id];

        if (startDate) {
            whereClause += ' AND DATE(created_at) >= ?';
            params.push(startDate);
        }

        if (endDate) {
            whereClause += ' AND DATE(created_at) <= ?';
            params.push(endDate);
        }

        // Get performance statistics
        const performance = await getRow(`
            SELECT 
                COUNT(*) as total_sales,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COALESCE(AVG(total_amount), 0) as average_sale_amount,
                COALESCE(SUM(discount_amount), 0) as total_discounts,
                MIN(created_at) as first_sale,
                MAX(created_at) as last_sale
            FROM sales 
            ${whereClause}
        `, params);

        // Get daily performance breakdown
        const dailyPerformance = await getAllRows(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as sales_count,
                SUM(total_amount) as daily_revenue
            FROM sales 
            ${whereClause}
            GROUP BY DATE(created_at)
            ORDER BY date DESC
            LIMIT 30
        `, params);

        // Get top selling products by this user
        const topProducts = await getAllRows(`
            SELECT 
                p.name,
                p.sku,
                SUM(si.quantity) as total_sold,
                SUM(si.total_price) as total_revenue
            FROM sale_items si
            LEFT JOIN products p ON si.product_id = p.id
            LEFT JOIN sales s ON si.sale_id = s.id
            ${whereClause.replace('cashier_id', 's.cashier_id')}
            GROUP BY p.id, p.name, p.sku
            ORDER BY total_sold DESC
            LIMIT 10
        `, params);

        res.json({
            user,
            performance,
            dailyPerformance,
            topProducts,
            period: startDate && endDate ? { startDate, endDate } : 'all_time'
        });

    } catch (error) {
        console.error('Error fetching user performance:', error);
        res.status(500).json({ message: 'Error fetching user performance' });
    }
});

module.exports = router;
