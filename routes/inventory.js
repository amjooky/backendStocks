const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { runQuery, getAllRows, getRow, runTransaction } = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get inventory overview
router.get('/overview', async (req, res) => {
    try {
        const stats = await getRow(`
            SELECT 
                COUNT(p.id) as total_products,
                SUM(CASE WHEN i.current_stock <= p.min_stock_level THEN 1 ELSE 0 END) as low_stock_products,
                SUM(CASE WHEN i.current_stock = 0 THEN 1 ELSE 0 END) as out_of_stock_products,
                SUM(i.current_stock * p.cost_price) as total_inventory_value
            FROM products p
            LEFT JOIN inventory i ON p.id = i.product_id
            WHERE p.is_active = 1
        `);

        // Get low stock products
        const lowStockProducts = await getAllRows(`
            SELECT 
                p.id, p.name, p.sku, i.current_stock, p.min_stock_level, 
                c.name as category_name
            FROM products p
            LEFT JOIN inventory i ON p.id = i.product_id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.is_active = 1 
            AND i.current_stock <= p.min_stock_level
            ORDER BY i.current_stock ASC
            LIMIT 10
        `);

        res.json({
            stats,
            lowStockProducts
        });

    } catch (error) {
        console.error('Error fetching inventory overview:', error);
        res.status(500).json({ message: 'Error fetching inventory overview' });
    }
});

// Get stock movements with pagination
router.get('/movements', [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('productId').optional().isInt(),
    query('movementType').optional().isIn(['in', 'out', 'adjustment'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const productId = req.query.productId;
        const movementType = req.query.movementType;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (productId) {
            whereClause += ' AND sm.product_id = ?';
            params.push(productId);
        }

        if (movementType) {
            whereClause += ' AND sm.movement_type = ?';
            params.push(movementType);
        }

        const movements = await getAllRows(`
            SELECT 
                sm.*,
                p.name as product_name,
                p.sku,
                u.username as user_name
            FROM stock_movements sm
            LEFT JOIN products p ON sm.product_id = p.id
            LEFT JOIN users u ON sm.user_id = u.id
            ${whereClause}
            ORDER BY sm.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        // Get total count
        const countResult = await getRow(`
            SELECT COUNT(*) as total
            FROM stock_movements sm
            ${whereClause}
        `, params);

        res.json({
            movements,
            pagination: {
                page,
                limit,
                total: countResult.total,
                totalPages: Math.ceil(countResult.total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching stock movements:', error);
        res.status(500).json({ message: 'Error fetching stock movements' });
    }
});

// Stock in (receiving stock) - Manager+ only
router.post('/stock-in', requireManager, [
    body('productId').isInt().withMessage('Valid product ID is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('costPerUnit').optional().isFloat({ min: 0 }),
    body('reference').optional().isString(),
    body('notes').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { productId, quantity, costPerUnit, reference, notes } = req.body;

        // Check if product exists
        const product = await getRow(
            'SELECT id FROM products WHERE id = ? AND is_active = 1',
            [productId]
        );

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Get current stock
        let currentInventory = await getRow(
            'SELECT current_stock FROM inventory WHERE product_id = ?',
            [productId]
        );

        if (!currentInventory) {
            // Create inventory record if it doesn't exist
            await runQuery(
                'INSERT INTO inventory (product_id, current_stock) VALUES (?, 0)',
                [productId]
            );
            currentInventory = { current_stock: 0 };
        }

        const previousStock = currentInventory.current_stock;
        const newStock = previousStock + quantity;

        // Update inventory and create stock movement in a transaction
        const queries = [
            {
                query: 'UPDATE inventory SET current_stock = ?, last_updated = CURRENT_TIMESTAMP WHERE product_id = ?',
                params: [newStock, productId]
            },
            {
                query: `INSERT INTO stock_movements (product_id, movement_type, quantity, previous_stock, new_stock, cost_per_unit, reference, notes, user_id) 
                        VALUES (?, 'in', ?, ?, ?, ?, ?, ?, ?)`,
                params: [productId, quantity, previousStock, newStock, costPerUnit, reference, notes, req.user.id]
            }
        ];

        await runTransaction(queries);

        res.json({
            message: 'Stock added successfully',
            productId,
            quantity,
            previousStock,
            newStock
        });

    } catch (error) {
        console.error('Error adding stock:', error);
        res.status(500).json({ message: 'Error adding stock' });
    }
});

// Stock out (manual stock removal) - Manager+ only
router.post('/stock-out', requireManager, [
    body('productId').isInt().withMessage('Valid product ID is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('reference').optional().isString(),
    body('notes').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { productId, quantity, reference, notes } = req.body;

        // Check if product exists
        const product = await getRow(
            'SELECT id FROM products WHERE id = ? AND is_active = 1',
            [productId]
        );

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Get current stock
        const currentInventory = await getRow(
            'SELECT current_stock FROM inventory WHERE product_id = ?',
            [productId]
        );

        if (!currentInventory || currentInventory.current_stock < quantity) {
            return res.status(400).json({ 
                message: 'Insufficient stock',
                available: currentInventory ? currentInventory.current_stock : 0
            });
        }

        const previousStock = currentInventory.current_stock;
        const newStock = previousStock - quantity;

        // Update inventory and create stock movement in a transaction
        const queries = [
            {
                query: 'UPDATE inventory SET current_stock = ?, last_updated = CURRENT_TIMESTAMP WHERE product_id = ?',
                params: [newStock, productId]
            },
            {
                query: `INSERT INTO stock_movements (product_id, movement_type, quantity, previous_stock, new_stock, reference, notes, user_id) 
                        VALUES (?, 'out', ?, ?, ?, ?, ?, ?)`,
                params: [productId, quantity, previousStock, newStock, reference, notes, req.user.id]
            }
        ];

        await runTransaction(queries);

        res.json({
            message: 'Stock removed successfully',
            productId,
            quantity,
            previousStock,
            newStock
        });

    } catch (error) {
        console.error('Error removing stock:', error);
        res.status(500).json({ message: 'Error removing stock' });
    }
});

// Stock adjustment - Manager+ only
router.post('/adjustment', requireManager, [
    body('productId').isInt().withMessage('Valid product ID is required'),
    body('newStock').isInt({ min: 0 }).withMessage('New stock must be non-negative'),
    body('reference').optional().isString(),
    body('notes').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { productId, newStock, reference, notes } = req.body;

        // Check if product exists
        const product = await getRow(
            'SELECT id FROM products WHERE id = ? AND is_active = 1',
            [productId]
        );

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Get current stock
        let currentInventory = await getRow(
            'SELECT current_stock FROM inventory WHERE product_id = ?',
            [productId]
        );

        if (!currentInventory) {
            // Create inventory record if it doesn't exist
            await runQuery(
                'INSERT INTO inventory (product_id, current_stock) VALUES (?, 0)',
                [productId]
            );
            currentInventory = { current_stock: 0 };
        }

        const previousStock = currentInventory.current_stock;
        const adjustmentQuantity = newStock - previousStock;

        if (adjustmentQuantity === 0) {
            return res.json({
                message: 'No adjustment needed - stock is already at the specified level',
                currentStock: previousStock
            });
        }

        // Update inventory and create stock movement in a transaction
        const queries = [
            {
                query: 'UPDATE inventory SET current_stock = ?, last_updated = CURRENT_TIMESTAMP WHERE product_id = ?',
                params: [newStock, productId]
            },
            {
                query: `INSERT INTO stock_movements (product_id, movement_type, quantity, previous_stock, new_stock, reference, notes, user_id) 
                        VALUES (?, 'adjustment', ?, ?, ?, ?, ?, ?)`,
                params: [productId, adjustmentQuantity, previousStock, newStock, reference, notes, req.user.id]
            }
        ];

        await runTransaction(queries);

        res.json({
            message: 'Stock adjusted successfully',
            productId,
            previousStock,
            newStock,
            adjustment: adjustmentQuantity
        });

    } catch (error) {
        console.error('Error adjusting stock:', error);
        res.status(500).json({ message: 'Error adjusting stock' });
    }
});

// Get low stock alerts
router.get('/low-stock', async (req, res) => {
    try {
        const lowStockProducts = await getAllRows(`
            SELECT 
                p.id, p.name, p.sku, p.min_stock_level,
                i.current_stock,
                c.name as category_name,
                s.name as supplier_name,
                (p.min_stock_level - i.current_stock) as shortage
            FROM products p
            LEFT JOIN inventory i ON p.id = i.product_id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.is_active = 1 
            AND i.current_stock <= p.min_stock_level
            ORDER BY (p.min_stock_level - i.current_stock) DESC
        `);

        res.json(lowStockProducts);

    } catch (error) {
        console.error('Error fetching low stock products:', error);
        res.status(500).json({ message: 'Error fetching low stock products' });
    }
});

// Get stock by product ID
router.get('/product/:productId', async (req, res) => {
    try {
        const { productId } = req.params;

        const stockInfo = await getRow(`
            SELECT 
                p.id, p.name, p.sku, p.min_stock_level,
                COALESCE(i.current_stock, 0) as current_stock,
                COALESCE(i.reserved_stock, 0) as reserved_stock,
                i.last_updated
            FROM products p
            LEFT JOIN inventory i ON p.id = i.product_id
            WHERE p.id = ? AND p.is_active = 1
        `, [productId]);

        if (!stockInfo) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json(stockInfo);

    } catch (error) {
        console.error('Error fetching stock info:', error);
        res.status(500).json({ message: 'Error fetching stock info' });
    }
});

module.exports = router;
