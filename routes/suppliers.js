const express = require('express');
const { body, validationResult } = require('express-validator');
const { runQuery, getAllRows, getRow } = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all suppliers
router.get('/', async (req, res) => {
    try {
        const suppliers = await getAllRows(
            'SELECT * FROM suppliers WHERE is_active = 1 ORDER BY name ASC'
        );
        res.json(suppliers);
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({ message: 'Error fetching suppliers' });
    }
});

// Get supplier by ID
router.get('/:id', async (req, res) => {
    try {
        const supplier = await getRow(
            'SELECT * FROM suppliers WHERE id = ? AND is_active = 1',
            [req.params.id]
        );
        
        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }
        
        res.json(supplier);
    } catch (error) {
        console.error('Error fetching supplier:', error);
        res.status(500).json({ message: 'Error fetching supplier' });
    }
});

// Create new supplier (Manager+ only)
router.post('/', requireManager, [
    body('name').notEmpty().withMessage('Supplier name is required'),
    body('contactPerson').optional().isString(),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('phone').optional().isString(),
    body('address').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, contactPerson, email, phone, address } = req.body;

        // Check if supplier name already exists
        const existingSupplier = await getRow(
            'SELECT id FROM suppliers WHERE name = ? AND is_active = 1',
            [name]
        );

        if (existingSupplier) {
            return res.status(409).json({ message: 'Supplier name already exists' });
        }

        const result = await runQuery(
            'INSERT INTO suppliers (name, contact_person, email, phone, address) VALUES (?, ?, ?, ?, ?)',
            [name, contactPerson || null, email || null, phone || null, address || null]
        );

        res.status(201).json({
            message: 'Supplier created successfully',
            id: result.id,
            supplier: { 
                id: result.id, 
                name, 
                contact_person: contactPerson, 
                email, 
                phone, 
                address 
            }
        });

    } catch (error) {
        console.error('Error creating supplier:', error);
        res.status(500).json({ message: 'Error creating supplier' });
    }
});

// Update supplier (Manager+ only)
router.put('/:id', requireManager, [
    body('name').notEmpty().withMessage('Supplier name is required'),
    body('contactPerson').optional().isString(),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('phone').optional().isString(),
    body('address').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { name, contactPerson, email, phone, address } = req.body;

        // Check if supplier exists
        const existingSupplier = await getRow(
            'SELECT id FROM suppliers WHERE id = ? AND is_active = 1',
            [id]
        );

        if (!existingSupplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }

        // Check if new name conflicts with another supplier
        const nameConflict = await getRow(
            'SELECT id FROM suppliers WHERE name = ? AND id != ? AND is_active = 1',
            [name, id]
        );

        if (nameConflict) {
            return res.status(409).json({ message: 'Supplier name already exists' });
        }

        await runQuery(
            'UPDATE suppliers SET name = ?, contact_person = ?, email = ?, phone = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [name, contactPerson || null, email || null, phone || null, address || null, id]
        );

        res.json({
            message: 'Supplier updated successfully',
            supplier: { 
                id: parseInt(id), 
                name, 
                contact_person: contactPerson, 
                email, 
                phone, 
                address 
            }
        });

    } catch (error) {
        console.error('Error updating supplier:', error);
        res.status(500).json({ message: 'Error updating supplier' });
    }
});

// Delete supplier (soft delete - Manager+ only)
router.delete('/:id', requireManager, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if supplier exists
        const supplier = await getRow(
            'SELECT id FROM suppliers WHERE id = ? AND is_active = 1',
            [id]
        );

        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }

        // Check if supplier is being used by products
        const productsCount = await getRow(
            'SELECT COUNT(*) as count FROM products WHERE supplier_id = ? AND is_active = 1',
            [id]
        );

        if (productsCount.count > 0) {
            return res.status(409).json({ 
                message: 'Cannot delete supplier. It is being used by products.' 
            });
        }

        // Soft delete
        await runQuery(
            'UPDATE suppliers SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );

        res.json({ message: 'Supplier deleted successfully' });

    } catch (error) {
        console.error('Error deleting supplier:', error);
        res.status(500).json({ message: 'Error deleting supplier' });
    }
});

module.exports = router;
