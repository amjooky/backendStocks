const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { runQuery, getAllRows, getRow, runTransaction } = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all products
router.get('/', async (req, res) => {
    try {
        const products = await getAllRows(`
            SELECT 
                p.*,
                p.selling_price as price,
                c.name as category_name,
                s.name as supplier_name,
                COALESCE(i.current_stock, 0) as current_stock,
                COALESCE(i.reserved_stock, 0) as reserved_stock,
                (COALESCE(i.current_stock, 0) <= p.min_stock_level) as is_low_stock
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            LEFT JOIN inventory i ON p.id = i.product_id
            WHERE p.is_active = 1
            ORDER BY p.name ASC
        `);
        
        res.json({ products });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'Error fetching products' });
    }
});

// Get product by barcode
router.get('/barcode/:barcode', async (req, res) => {
    try {
        const product = await getRow(`
            SELECT 
                p.*,
                p.selling_price as price,
                c.name as category_name,
                s.name as supplier_name,
                COALESCE(i.current_stock, 0) as current_stock,
                COALESCE(i.reserved_stock, 0) as reserved_stock,
                (COALESCE(i.current_stock, 0) <= p.min_stock_level) as is_low_stock
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            LEFT JOIN inventory i ON p.id = i.product_id
            WHERE p.barcode = ? AND p.is_active = 1
        `, [req.params.barcode]);
        
        if (!product) {
            return res.status(404).json({ message: 'Product not found with this barcode' });
        }
        
        res.json(product);
    } catch (error) {
        console.error('Error fetching product by barcode:', error);
        res.status(500).json({ message: 'Error fetching product by barcode' });
    }
});

// Get product by ID
router.get('/:id', async (req, res) => {
    try {
        const product = await getRow(`
            SELECT 
                p.*,
                p.selling_price as price,
                c.name as category_name,
                s.name as supplier_name,
                COALESCE(i.current_stock, 0) as current_stock,
                COALESCE(i.reserved_stock, 0) as reserved_stock,
                (COALESCE(i.current_stock, 0) <= p.min_stock_level) as is_low_stock
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            LEFT JOIN inventory i ON p.id = i.product_id
            WHERE p.id = ? AND p.is_active = 1
        `, [req.params.id]);
        
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        res.json(product);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ message: 'Error fetching product' });
    }
});

// Create new product
router.post('/', requireManager, [
    body('name').notEmpty().withMessage('Product name is required'),
    body('sku').notEmpty().withMessage('SKU is required'),
    body('categoryId').optional().isInt().withMessage('Category ID must be an integer'),
    body('supplierId').optional().isInt().withMessage('Supplier ID must be an integer'),
    body('costPrice').isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),
    body('sellingPrice').isFloat({ min: 0 }).withMessage('Selling price must be a positive number'),
    body('minStockLevel').optional().isInt({ min: 0 }).withMessage('Min stock level must be non-negative'),
    body('initialStock').optional().isInt({ min: 0 }).withMessage('Initial stock must be non-negative'),
    body('barcode').optional().isString(),
    body('description').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            name, sku, barcode, categoryId, supplierId, costPrice, 
            sellingPrice, minStockLevel, description, initialStock
        } = req.body;

        // Check if SKU already exists
        const existingSku = await getRow(
            'SELECT id FROM products WHERE sku = ? AND is_active = 1',
            [sku]
        );

        if (existingSku) {
            return res.status(409).json({ message: 'SKU already exists' });
        }

        // Create product with all required fields
        const result = await runQuery(
            `INSERT INTO products (name, description, sku, barcode, category_id, supplier_id, cost_price, selling_price, min_stock_level, agency_id, is_active, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
                name, 
                description || null, 
                sku, 
                barcode || null, 
                categoryId, 
                supplierId || null, 
                costPrice, 
                sellingPrice, 
                minStockLevel || 0,
                1, // default agency_id
                1  // is_active = true
            ]
        );

        const productId = result.id;

        // Create inventory record
        const stockLevel = initialStock || 0;
        await runQuery(
            'INSERT INTO inventory (product_id, current_stock) VALUES (?, ?)',
            [productId, stockLevel]
        );

        res.status(201).json({
            message: 'Product created successfully',
            id: productId,
            product: { 
                id: productId, 
                name, 
                sku, 
                current_stock: stockLevel 
            }
        });

    } catch (error) {
        console.error('Error creating product:', error);
        console.error('Request body:', req.body);
        
        // Provide more specific error messages
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ message: 'Product with this SKU already exists' });
        }
        if (error.message.includes('NOT NULL constraint failed')) {
            const field = error.message.split('.')[1] || 'unknown field';
            return res.status(400).json({ message: `Missing required field: ${field}` });
        }
        if (error.message.includes('FOREIGN KEY constraint failed')) {
            return res.status(400).json({ message: 'Invalid category or supplier ID' });
        }
        
        res.status(500).json({ 
            message: 'Error creating product',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

module.exports = router;