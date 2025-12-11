const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { runQuery, getAllRows, getRow, runTransaction } = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');
const { 
    enforceAgencyIsolation, 
    addAgencyFilter, 
    validateResourceOwnership, 
    addAgencyToCreateData,
    logDataAccess,
    validateAgencyLimits
} = require('../middleware/tenant');

const router = express.Router();

// Transform database fields to frontend expected format
const transformPromotionData = (promotion) => {
    return {
        ...promotion,
        discount_type: promotion.type === 'fixed' ? 'fixed_amount' : promotion.type,
        discount_value: promotion.value,
        minimum_purchase: promotion.min_quantity || 0,
        usage_limit: promotion.max_uses || 0,
        usage_count: promotion.current_uses || 0,
        start_date: promotion.start_date,
        end_date: promotion.end_date,
        applicable_to: 'all', // This would need more logic for specific categories/products
        applicable_categories: '',
        applicable_products: promotion.applicable_products || ''
    };
};

// All routes require authentication
router.use(authenticateToken);

// Get all active promotions
router.get('/', async (req, res) => {
    try {
        const promotions = await getAllRows(`
            SELECT 
                p.*,
                GROUP_CONCAT(pr.name) as applicable_products
            FROM promotions p
            LEFT JOIN promotion_products pp ON p.id = pp.promotion_id
            LEFT JOIN products pr ON pp.product_id = pr.id
            WHERE p.is_active = 1 
            AND p.start_date <= DATE('now')
            AND p.end_date >= DATE('now')
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `);
        
        res.json(promotions);
    } catch (error) {
        console.error('Error fetching promotions:', error);
        res.status(500).json({ message: 'Error fetching promotions' });
    }
});

// Get all promotions (including inactive) - Manager only
router.get('/all', requireManager, async (req, res) => {
    try {
        const promotions = await getAllRows(`
            SELECT 
                p.*,
                GROUP_CONCAT(pr.name) as applicable_products,
                CASE 
                    WHEN p.start_date > DATE('now') THEN 'upcoming'
                    WHEN p.end_date < DATE('now') THEN 'expired'
                    WHEN p.is_active = 0 THEN 'inactive'
                    ELSE 'active'
                END as status
            FROM promotions p
            LEFT JOIN promotion_products pp ON p.id = pp.promotion_id
            LEFT JOIN products pr ON pp.product_id = pr.id
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `);
        
        // Transform the data to match frontend expectations
        const transformedPromotions = promotions.map(transformPromotionData);
        res.json(transformedPromotions);
    } catch (error) {
        console.error('Error fetching all promotions:', error);
        res.status(500).json({ message: 'Error fetching all promotions' });
    }
});

// Get promotion by ID
router.get('/:id', async (req, res) => {
    try {
        const promotion = await getRow(
            'SELECT * FROM promotions WHERE id = ?',
            [req.params.id]
        );
        
        if (!promotion) {
            return res.status(404).json({ message: 'Promotion not found' });
        }

        // Get applicable products
        const products = await getAllRows(`
            SELECT p.id, p.name, p.sku, p.selling_price
            FROM products p
            INNER JOIN promotion_products pp ON p.id = pp.product_id
            WHERE pp.promotion_id = ? AND p.is_active = 1
        `, [req.params.id]);

        res.json({
            ...promotion,
            applicable_products: products
        });
    } catch (error) {
        console.error('Error fetching promotion:', error);
        res.status(500).json({ message: 'Error fetching promotion' });
    }
});

// Check applicable promotions for products
router.post('/check', [
    body('items').isArray().withMessage('Items must be an array'),
    body('items.*.productId').isInt().withMessage('Product ID must be an integer'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('items.*.price').isFloat({ min: 0 }).withMessage('Price must be non-negative')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { items } = req.body;
        const applicablePromotions = [];

        // Get all active promotions
        const activePromotions = await getAllRows(`
            SELECT * FROM promotions 
            WHERE is_active = 1 
            AND start_date <= DATE('now')
            AND end_date >= DATE('now')
            AND (max_uses IS NULL OR current_uses < max_uses)
        `);

        for (const promotion of activePromotions) {
            // Check if promotion is applicable to any items
            const promotionProducts = await getAllRows(
                'SELECT product_id FROM promotion_products WHERE promotion_id = ?',
                [promotion.id]
            );

            const promotionProductIds = promotionProducts.map(pp => pp.product_id);
            
            // If no specific products, promotion applies to all
            const applicableItems = promotionProductIds.length === 0 
                ? items 
                : items.filter(item => promotionProductIds.includes(item.productId));

            if (applicableItems.length === 0) continue;

            let discountAmount = 0;
            let canApply = false;

            // Calculate discount based on promotion type
            switch (promotion.type) {
                case 'percentage':
                    const subtotal = applicableItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    discountAmount = (subtotal * promotion.value) / 100;
                    canApply = true;
                    break;

                case 'fixed':
                    discountAmount = promotion.value;
                    canApply = true;
                    break;

                case 'buy_x_get_y':
                    // Simple buy X get Y logic - for each item that meets min quantity
                    const totalQuantity = applicableItems.reduce((sum, item) => sum + item.quantity, 0);
                    if (totalQuantity >= promotion.min_quantity) {
                        // Get the cheapest item price for the free items
                        const cheapestPrice = Math.min(...applicableItems.map(item => item.price));
                        const freeItems = Math.floor(totalQuantity / promotion.min_quantity) * promotion.value;
                        discountAmount = freeItems * cheapestPrice;
                        canApply = true;
                    }
                    break;
            }

            if (canApply && discountAmount > 0) {
                applicablePromotions.push({
                    id: promotion.id,
                    name: promotion.name,
                    type: promotion.type,
                    value: promotion.value,
                    discountAmount: Math.round(discountAmount * 100) / 100,
                    applicableItems: applicableItems.map(item => item.productId)
                });
            }
        }

        res.json({ applicablePromotions });

    } catch (error) {
        console.error('Error checking promotions:', error);
        res.status(500).json({ message: 'Error checking promotions' });
    }
});

// Create new promotion (Manager+ only)
router.post('/', requireManager, [
    body('name').notEmpty().withMessage('Promotion name is required'),
    body('description').optional().isString(),
    body('type').isIn(['percentage', 'fixed', 'buy_x_get_y']).withMessage('Valid promotion type is required'),
    body('value').isFloat({ min: 0 }).withMessage('Value must be non-negative'),
    body('minQuantity').optional().isInt({ min: 1 }),
    body('maxUses').optional().isInt({ min: 1 }),
    body('startDate').isDate().withMessage('Valid start date is required'),
    body('endDate').isDate().withMessage('Valid end date is required'),
    body('productIds').optional().isArray()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            name, description, type, value, minQuantity, maxUses,
            startDate, endDate, productIds, isActive
        } = req.body;

        // Validate date range
        if (new Date(startDate) >= new Date(endDate)) {
            return res.status(400).json({ message: 'End date must be after start date' });
        }

        // Create promotion
        const promotionResult = await runQuery(
            `INSERT INTO promotions (name, description, type, value, min_quantity, max_uses, start_date, end_date, is_active) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, description, type, value, minQuantity || 1, maxUses, startDate, endDate, isActive !== undefined ? (isActive ? 1 : 0) : 1]
        );

        const promotionId = promotionResult.id;

        // Add product associations if provided
        if (productIds && productIds.length > 0) {
            const queries = productIds.map(productId => ({
                query: 'INSERT INTO promotion_products (promotion_id, product_id) VALUES (?, ?)',
                params: [promotionId, productId]
            }));

            await runTransaction(queries);
        }

        res.status(201).json({
            message: 'Promotion created successfully',
            id: promotionId,
            promotion: { id: promotionId, name, type, value }
        });

    } catch (error) {
        console.error('Error creating promotion:', error);
        res.status(500).json({ message: 'Error creating promotion' });
    }
});

// Update promotion (Manager+ only)
router.put('/:id', requireManager, [
    body('name').notEmpty().withMessage('Promotion name is required'),
    body('description').optional().isString(),
    body('type').isIn(['percentage', 'fixed', 'buy_x_get_y']).withMessage('Valid promotion type is required'),
    body('value').isFloat({ min: 0 }).withMessage('Value must be non-negative'),
    body('minQuantity').optional().isInt({ min: 1 }),
    body('maxUses').optional().isInt({ min: 1 }),
    body('startDate').isDate().withMessage('Valid start date is required'),
    body('endDate').isDate().withMessage('Valid end date is required'),
    body('productIds').optional().isArray()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const {
            name, description, type, value, minQuantity, maxUses,
            startDate, endDate, productIds, isActive
        } = req.body;

        // Check if promotion exists
        const existingPromotion = await getRow(
            'SELECT id FROM promotions WHERE id = ?',
            [id]
        );

        if (!existingPromotion) {
            return res.status(404).json({ message: 'Promotion not found' });
        }

        // Validate date range
        if (new Date(startDate) >= new Date(endDate)) {
            return res.status(400).json({ message: 'End date must be after start date' });
        }

        // Update promotion
        await runQuery(
            `UPDATE promotions SET 
                name = ?, description = ?, type = ?, value = ?, min_quantity = ?, max_uses = ?,
                start_date = ?, end_date = ?, is_active = ?
             WHERE id = ?`,
            [name, description, type, value, minQuantity || 1, maxUses, startDate, endDate, isActive !== undefined ? (isActive ? 1 : 0) : 1, id]
        );

        // Update product associations
        if (productIds !== undefined) {
            // Remove existing associations
            await runQuery('DELETE FROM promotion_products WHERE promotion_id = ?', [id]);

            // Add new associations
            if (productIds.length > 0) {
                const queries = productIds.map(productId => ({
                    query: 'INSERT INTO promotion_products (promotion_id, product_id) VALUES (?, ?)',
                    params: [id, productId]
                }));

                await runTransaction(queries);
            }
        }

        res.json({
            message: 'Promotion updated successfully',
            promotion: { id: parseInt(id), name, type, value }
        });

    } catch (error) {
        console.error('Error updating promotion:', error);
        res.status(500).json({ message: 'Error updating promotion' });
    }
});

// Toggle promotion status (Manager+ only)
router.patch('/:id/toggle', requireManager, async (req, res) => {
    try {
        const { id } = req.params;

        // Get current status
        const promotion = await getRow(
            'SELECT id, is_active FROM promotions WHERE id = ?',
            [id]
        );

        if (!promotion) {
            return res.status(404).json({ message: 'Promotion not found' });
        }

        const newStatus = promotion.is_active ? 0 : 1;

        await runQuery(
            'UPDATE promotions SET is_active = ? WHERE id = ?',
            [newStatus, id]
        );

        res.json({
            message: `Promotion ${newStatus ? 'activated' : 'deactivated'} successfully`,
            isActive: Boolean(newStatus)
        });

    } catch (error) {
        console.error('Error toggling promotion:', error);
        res.status(500).json({ message: 'Error toggling promotion' });
    }
});

// Delete promotion (Manager+ only)
router.delete('/:id', requireManager, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if promotion exists
        const promotion = await getRow(
            'SELECT id FROM promotions WHERE id = ?',
            [id]
        );

        if (!promotion) {
            return res.status(404).json({ message: 'Promotion not found' });
        }

        // Check if promotion has been used in sales
        const usageCount = await getRow(
            'SELECT COUNT(*) as count FROM sale_promotions WHERE promotion_id = ?',
            [id]
        );

        if (usageCount.count > 0) {
            return res.status(409).json({ 
                message: 'Cannot delete promotion that has been used in sales. Consider deactivating it instead.' 
            });
        }

        // Delete promotion and its product associations
        const queries = [
            { query: 'DELETE FROM promotion_products WHERE promotion_id = ?', params: [id] },
            { query: 'DELETE FROM promotions WHERE id = ?', params: [id] }
        ];

        await runTransaction(queries);

        res.json({ message: 'Promotion deleted successfully' });

    } catch (error) {
        console.error('Error deleting promotion:', error);
        res.status(500).json({ message: 'Error deleting promotion' });
    }
});

// Increment promotion usage (internal use during sales)
router.post('/:id/increment-usage', async (req, res) => {
    try {
        const { id } = req.params;

        await runQuery(
            'UPDATE promotions SET current_uses = current_uses + 1 WHERE id = ?',
            [id]
        );

        res.json({ message: 'Promotion usage incremented' });

    } catch (error) {
        console.error('Error incrementing promotion usage:', error);
        res.status(500).json({ message: 'Error incrementing promotion usage' });
    }
});

module.exports = router;
