const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { runQuery, getAllRows, getRow } = require('../../config/database');
const { requireSuperadmin, logAuth } = require('../../middleware/auth');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Superadmin - Agencies
 *   description: Agency management for superadmin users
 */

// All routes require superadmin role
router.use(requireSuperadmin);

/**
 * @swagger
 * /api/superadmin/agencies:
 *   get:
 *     tags: [Superadmin - Agencies]
 *     summary: Get all agencies with pagination and filtering
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, suspended, cancelled]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of agencies retrieved successfully
 */
router.get('/', [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['active', 'suspended', 'cancelled']),
    query('search').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const status = req.query.status;
        const search = req.query.search;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (status) {
            whereClause += ' AND subscription_status = ?';
            params.push(status);
        }

        if (search) {
            whereClause += ' AND (name LIKE ? OR email LIKE ? OR city LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        // Get agencies with user counts
        const query = `
            SELECT 
                a.*,
                COUNT(u.id) as user_count,
                MAX(u.last_login) as last_user_login,
                (SELECT COUNT(*) FROM products WHERE agency_id = a.id) as product_count,
                (SELECT COUNT(*) FROM sales WHERE agency_id = a.id) as sales_count
            FROM agencies a
            LEFT JOIN users u ON a.id = u.agency_id AND u.is_active = 1
            ${whereClause}
            GROUP BY a.id
            ORDER BY a.created_at DESC
            LIMIT ? OFFSET ?
        `;

        params.push(limit, offset);
        const agencies = await getAllRows(query, params);

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM agencies a
            ${whereClause}
        `;
        const countParams = params.slice(0, -2); // Remove limit and offset
        const countResult = await getRow(countQuery, countParams);

        await logAuth(req.user.id, null, 'AGENCIES_LIST', {
            page, limit, status, search,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            agencies,
            pagination: {
                page,
                limit,
                total: countResult.total,
                totalPages: Math.ceil(countResult.total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching agencies:', error);
        res.status(500).json({ message: 'Error fetching agencies' });
    }
});

/**
 * @swagger
 * /api/superadmin/agencies/{id}:
 *   get:
 *     tags: [Superadmin - Agencies]
 *     summary: Get agency by ID with detailed statistics
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
 *         description: Agency details retrieved successfully
 */
router.get('/:id', async (req, res) => {
    try {
        const agencyId = req.params.id;

        const agency = await getRow(`
            SELECT 
                a.*,
                COUNT(u.id) as user_count,
                MAX(u.last_login) as last_user_login
            FROM agencies a
            LEFT JOIN users u ON a.id = u.agency_id AND u.is_active = 1
            WHERE a.id = ?
            GROUP BY a.id
        `, [agencyId]);

        if (!agency) {
            return res.status(404).json({ message: 'Agency not found' });
        }

        // Get detailed statistics
        const stats = await getRow(`
            SELECT 
                (SELECT COUNT(*) FROM products WHERE agency_id = ?) as product_count,
                (SELECT COUNT(*) FROM sales WHERE agency_id = ?) as sales_count,
                (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE agency_id = ?) as total_revenue,
                (SELECT COUNT(*) FROM customers WHERE agency_id = ?) as customer_count,
                (SELECT COUNT(*) FROM stock_movements WHERE agency_id = ?) as stock_movements_count
        `, [agencyId, agencyId, agencyId, agencyId, agencyId]);

        // Get recent activity
        const recentActivity = await getAllRows(`
            SELECT action, resource_type, timestamp, 
                   u.username, u.first_name, u.last_name
            FROM audit_log al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.agency_id = ?
            ORDER BY al.timestamp DESC
            LIMIT 10
        `, [agencyId]);

        await logAuth(req.user.id, null, 'AGENCY_VIEW', {
            agencyId,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            agency,
            statistics: stats,
            recentActivity
        });
    } catch (error) {
        console.error('Error fetching agency:', error);
        res.status(500).json({ message: 'Error fetching agency' });
    }
});

/**
 * @swagger
 * /api/superadmin/agencies:
 *   post:
 *     tags: [Superadmin - Agencies]
 *     summary: Create a new agency
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               country:
 *                 type: string
 *               taxCode:
 *                 type: string
 *               vatNumber:
 *                 type: string
 *               subscriptionPlan:
 *                 type: string
 *                 enum: [basic, premium, enterprise]
 *               maxUsers:
 *                 type: integer
 *               maxProducts:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Agency created successfully
 */
router.post('/', [
    body('name').trim().notEmpty().withMessage('Agency name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').optional().isMobilePhone(),
    body('address').optional().trim(),
    body('city').optional().trim(),
    body('postalCode').optional().trim(),
    body('country').optional().trim(),
    body('taxCode').optional().trim(),
    body('vatNumber').optional().trim(),
    body('subscriptionPlan').optional().isIn(['basic', 'premium', 'enterprise']),
    body('maxUsers').optional().isInt({ min: 1 }),
    body('maxProducts').optional().isInt({ min: 1 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            name, email, phone, address, city, postalCode, country,
            taxCode, vatNumber, subscriptionPlan, maxUsers, maxProducts
        } = req.body;

        // Check if agency with same name or email already exists
        const existingAgency = await getRow(
            'SELECT id FROM agencies WHERE name = ? OR email = ?',
            [name, email]
        );

        if (existingAgency) {
            return res.status(409).json({ message: 'Agency with this name or email already exists' });
        }

        const result = await runQuery(`
            INSERT INTO agencies (
                name, email, phone, address, city, postal_code, country,
                tax_code, vat_number, subscription_plan, max_users, max_products,
                subscription_start_date, gdpr_consent, gdpr_consent_date,
                privacy_policy_accepted, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_DATE, TRUE, CURRENT_TIMESTAMP, TRUE, ?)
        `, [
            name, email, phone || null, address || null, city || null,
            postalCode || null, country || 'Italy', taxCode || null,
            vatNumber || null, subscriptionPlan || 'basic',
            maxUsers || 10, maxProducts || 1000, req.user.id
        ]);

        const agencyId = result.id;

        // Generate admin username and password
        const adminUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '') + '_admin';
        const temporaryPassword = crypto.randomBytes(8).toString('hex'); // 16 character hex string
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

        // Create default admin user for the agency
        const adminUserResult = await runQuery(`
            INSERT INTO users (
                username, email, password, first_name, last_name, role, agency_id,
                is_active, password_change_required, created_at
            ) VALUES (?, ?, ?, ?, ?, 'admin', ?, TRUE, TRUE, CURRENT_TIMESTAMP)
        `, [
            adminUsername,
            email, // Use agency email as admin email initially
            hashedPassword,
            'Agency', // Default first name
            'Administrator', // Default last name
            agencyId
        ]);

        await logAuth(req.user.id, null, 'AGENCY_CREATE', {
            agencyId: agencyId,
            agencyName: name,
            adminUserId: adminUserResult.id,
            adminUsername: adminUsername,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.status(201).json({
            message: 'Agency and admin user created successfully',
            agencyId: agencyId,
            adminCredentials: {
                username: adminUsername,
                password: temporaryPassword,
                email: email,
                changePasswordRequired: true
            }
        });
    } catch (error) {
        console.error('Error creating agency:', error);
        res.status(500).json({ message: 'Error creating agency' });
    }
});

/**
 * @swagger
 * /api/superadmin/agencies/{id}:
 *   put:
 *     tags: [Superadmin - Agencies]
 *     summary: Update agency information
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Agency updated successfully
 */
router.put('/:id', [
    body('name').optional().trim().notEmpty(),
    body('email').optional().isEmail(),
    body('subscriptionStatus').optional().isIn(['active', 'suspended', 'cancelled']),
    body('subscriptionPlan').optional().isIn(['basic', 'premium', 'enterprise']),
    body('maxUsers').optional().isInt({ min: 1 }),
    body('maxProducts').optional().isInt({ min: 1 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const agencyId = req.params.id;
        const updates = req.body;

        // Check if agency exists
        const existingAgency = await getRow('SELECT * FROM agencies WHERE id = ?', [agencyId]);
        if (!existingAgency) {
            return res.status(404).json({ message: 'Agency not found' });
        }

        // Build update query dynamically
        const allowedFields = [
            'name', 'email', 'phone', 'address', 'city', 'postal_code', 'country',
            'tax_code', 'vat_number', 'subscription_plan', 'subscription_status',
            'max_users', 'max_products', 'data_retention_days'
        ];

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
        updateValues.push(agencyId);

        await runQuery(`
            UPDATE agencies 
            SET ${updateFields.join(', ')}
            WHERE id = ?
        `, updateValues);

        await logAuth(req.user.id, agencyId, 'AGENCY_UPDATE', {
            oldValues: existingAgency,
            newValues: updates,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({ message: 'Agency updated successfully' });
    } catch (error) {
        console.error('Error updating agency:', error);
        res.status(500).json({ message: 'Error updating agency' });
    }
});

/**
 * @swagger
 * /api/superadmin/agencies/{id}/suspend:
 *   post:
 *     tags: [Superadmin - Agencies]
 *     summary: Suspend agency account
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
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Agency suspended successfully
 */
router.post('/:id/suspend', [
    body('reason').optional().trim()
], async (req, res) => {
    try {
        const agencyId = req.params.id;
        const reason = req.body.reason || 'Suspended by superadmin';

        const agency = await getRow('SELECT * FROM agencies WHERE id = ?', [agencyId]);
        if (!agency) {
            return res.status(404).json({ message: 'Agency not found' });
        }

        await runQuery(
            'UPDATE agencies SET subscription_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['suspended', agencyId]
        );

        await logAuth(req.user.id, agencyId, 'AGENCY_SUSPEND', {
            reason,
            previousStatus: agency.subscription_status,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({ message: 'Agency suspended successfully' });
    } catch (error) {
        console.error('Error suspending agency:', error);
        res.status(500).json({ message: 'Error suspending agency' });
    }
});

/**
 * @swagger
 * /api/superadmin/agencies/{id}/activate:
 *   post:
 *     tags: [Superadmin - Agencies]
 *     summary: Activate suspended agency
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
 *         description: Agency activated successfully
 */
router.post('/:id/activate', async (req, res) => {
    try {
        const agencyId = req.params.id;

        const agency = await getRow('SELECT * FROM agencies WHERE id = ?', [agencyId]);
        if (!agency) {
            return res.status(404).json({ message: 'Agency not found' });
        }

        await runQuery(
            'UPDATE agencies SET subscription_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['active', agencyId]
        );

        await logAuth(req.user.id, agencyId, 'AGENCY_ACTIVATE', {
            previousStatus: agency.subscription_status,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({ message: 'Agency activated successfully' });
    } catch (error) {
        console.error('Error activating agency:', error);
        res.status(500).json({ message: 'Error activating agency' });
    }
});

module.exports = router;