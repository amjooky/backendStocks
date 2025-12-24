const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { runQuery, getAllRows, getRow } = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all customers with pagination and search
router.get('/', [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
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
        const search = req.query.search;

        let whereClause = 'WHERE is_active = 1';
        const params = [];

        if (search) {
            whereClause += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        const customers = await getAllRows(`
            SELECT * FROM customers 
            ${whereClause}
            ORDER BY name ASC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        res.json(customers);

    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ message: 'Error fetching customers' });
    }
});

// Get customer by ID
router.get('/:id', async (req, res) => {
    try {
        const customer = await getRow(
            'SELECT * FROM customers WHERE id = ? AND is_active = 1',
            [req.params.id]
        );
        
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        // Get customer's purchase history
        const purchases = await getAllRows(`
            SELECT 
                s.id, s.sale_number, s.total_amount, s.created_at,
                COUNT(si.id) as items_count
            FROM sales s
            LEFT JOIN sale_items si ON s.id = si.sale_id
            WHERE s.customer_id = ?
            GROUP BY s.id
            ORDER BY s.created_at DESC
            LIMIT 10
        `, [req.params.id]);

        res.json({
            ...customer,
            recent_purchases: purchases
        });
    } catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).json({ message: 'Error fetching customer' });
    }
});

// Search customers by name, email, or phone (for POS)
router.get('/search/:term', async (req, res) => {
    try {
        const searchTerm = `%${req.params.term}%`;
        const customers = await getAllRows(`
            SELECT id, name, email, phone, loyalty_points
            FROM customers
            WHERE is_active = 1
            AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)
            ORDER BY name ASC
            LIMIT 10
        `, [searchTerm, searchTerm, searchTerm]);
        
        res.json(customers);
    } catch (error) {
        console.error('Error searching customers:', error);
        res.status(500).json({ message: 'Error searching customers' });
    }
});

// Create new customer
router.post('/', [
    body('name').notEmpty().withMessage('Customer name is required'),
    body('email').custom((value) => {
        if (value && value.trim() !== '') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                throw new Error('Valid email is required');
            }
        }
        return true;
    }),
    body('phone').optional().isString(),
    body('address').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, phone, address } = req.body;

        // Check if customer with same email already exists (if email provided)
        if (email) {
            const existingCustomer = await getRow(
                'SELECT id FROM customers WHERE email = ? AND is_active = 1',
                [email]
            );

            if (existingCustomer) {
                return res.status(409).json({ message: 'Customer with this email already exists' });
            }
        }

        const result = await runQuery(
            'INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)',
            [name, email || null, phone || null, address || null]
        );

        res.status(201).json({
            message: 'Customer created successfully',
            id: result.id,
            customer: { 
                id: result.id, 
                name, 
                email, 
                phone, 
                address,
                loyalty_points: 0
            }
        });

    } catch (error) {
        console.error('Error creating customer:', error);
        res.status(500).json({ message: 'Error creating customer' });
    }
});

// Update customer
router.put('/:id', [
    body('name').notEmpty().withMessage('Customer name is required'),
    body('email').custom((value) => {
        if (value && value.trim() !== '') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                throw new Error('Valid email is required');
            }
        }
        return true;
    }),
    body('phone').optional().isString(),
    body('address').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { name, email, phone, address } = req.body;

        // Check if customer exists
        const existingCustomer = await getRow(
            'SELECT id FROM customers WHERE id = ? AND is_active = 1',
            [id]
        );

        if (!existingCustomer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        // Check if new email conflicts with another customer (if provided)
        if (email) {
            const emailConflict = await getRow(
                'SELECT id FROM customers WHERE email = ? AND id != ? AND is_active = 1',
                [email, id]
            );

            if (emailConflict) {
                return res.status(409).json({ message: 'Customer with this email already exists' });
            }
        }

        await runQuery(
            'UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [name, email || null, phone || null, address || null, id]
        );

        res.json({
            message: 'Customer updated successfully',
            customer: { id: parseInt(id), name, email, phone, address }
        });

    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).json({ message: 'Error updating customer' });
    }
});

// Delete customer (soft delete - Manager+ only)
router.delete('/:id', requireManager, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if customer exists
        const customer = await getRow(
            'SELECT id FROM customers WHERE id = ? AND is_active = 1',
            [id]
        );

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        // Check if customer has any sales
        const salesCount = await getRow(
            'SELECT COUNT(*) as count FROM sales WHERE customer_id = ?',
            [id]
        );

        if (salesCount.count > 0) {
            return res.status(409).json({ 
                message: 'Cannot delete customer with existing sales records. Consider deactivating instead.' 
            });
        }

        // Soft delete
        await runQuery(
            'UPDATE customers SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );

        res.json({ message: 'Customer deleted successfully' });

    } catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).json({ message: 'Error deleting customer' });
    }
});

module.exports = router;