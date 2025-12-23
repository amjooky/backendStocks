const express = require('express');
const { body, validationResult } = require('express-validator');
const { runQuery, getAllRows, getRow } = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all categories
router.get('/', async (req, res) => {
    try {
        const categories = await getAllRows(
            'SELECT * FROM categories WHERE is_active = 1 ORDER BY name ASC'
        );
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Error fetching categories' });
    }
});

// Get category by ID
router.get('/:id', async (req, res) => {
    try {
        const category = await getRow(
            'SELECT * FROM categories WHERE id = ? AND is_active = 1',
            [req.params.id]
        );
        
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        
        res.json(category);
    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({ message: 'Error fetching category' });
    }
});

// Create new category (Manager+ only)
router.post('/', requireManager, [
    body('name').notEmpty().withMessage('Category name is required'),
    body('description').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, description } = req.body;

        // Check if category name already exists
        const existingCategory = await getRow(
            'SELECT id FROM categories WHERE name = ? AND is_active = 1',
            [name]
        );

        if (existingCategory) {
            return res.status(409).json({ message: 'Category name already exists' });
        }

        const result = await runQuery(
            'INSERT INTO categories (name, description) VALUES (?, ?)',
            [name, description || null]
        );

        res.status(201).json({
            message: 'Category created successfully',
            id: result.id,
            category: { id: result.id, name, description }
        });

    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ message: 'Error creating category' });
    }
});

// Update category (Manager+ only)
router.put('/:id', requireManager, [
    body('name').notEmpty().withMessage('Category name is required'),
    body('description').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { name, description } = req.body;

        // Check if category exists
        const existingCategory = await getRow(
            'SELECT id FROM categories WHERE id = ? AND is_active = 1',
            [id]
        );

        if (!existingCategory) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Check if new name conflicts with another category
        const nameConflict = await getRow(
            'SELECT id FROM categories WHERE name = ? AND id != ? AND is_active = 1',
            [name, id]
        );

        if (nameConflict) {
            return res.status(409).json({ message: 'Category name already exists' });
        }

        await runQuery(
            'UPDATE categories SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [name, description || null, id]
        );

        res.json({
            message: 'Category updated successfully',
            category: { id: parseInt(id), name, description }
        });

    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ message: 'Error updating category' });
    }
});

// Delete category (soft delete - Manager+ only)
router.delete('/:id', requireManager, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if category exists
        const category = await getRow(
            'SELECT id FROM categories WHERE id = ? AND is_active = 1',
            [id]
        );

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Check if category is being used by products
        const productsCount = await getRow(
            'SELECT COUNT(*) as count FROM products WHERE category_id = ? AND is_active = 1',
            [id]
        );

        if (productsCount.count > 0) {
            return res.status(409).json({ 
                message: 'Cannot delete category. It is being used by products.' 
            });
        }

        // Soft delete
        await runQuery(
            'UPDATE categories SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );

        res.json({ message: 'Category deleted successfully' });

    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ message: 'Error deleting category' });
    }
});

module.exports = router;
