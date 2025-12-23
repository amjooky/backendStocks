const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { runQuery, getAllRows, getRow, runTransaction } = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management with advanced features
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ProductCreate:
 *       type: object
 *       required:
 *         - name
 *         - sku
 *         - categoryId
 *         - costPrice
 *         - sellingPrice
 *       properties:
 *         name:
 *           type: string
 *           example: "Laptop Computer"
 *           description: Product name
 *         description:
 *           type: string
 *           example: "High-performance laptop for business use"
 *         sku:
 *           type: string
 *           example: "LAPTOP001"
 *           description: Stock Keeping Unit (unique identifier)
 *         barcode:
 *           type: string
 *           example: "1234567890123"
 *         categoryId:
 *           type: integer
 *           example: 1
 *           description: Category ID (must exist in categories table)
 *         supplierId:
 *           type: integer
 *           example: 1
 *           description: Supplier ID (optional)
 *         costPrice:
 *           type: number
 *           format: float
 *           example: 500.00
 *           description: Cost price (what you pay to supplier)
 *         sellingPrice:
 *           type: number
 *           format: float
 *           example: 750.00
 *           description: Selling price (what customer pays)
 *         minStockLevel:
 *           type: integer
 *           example: 5
 *           description: Minimum stock level for alerts
 *         initialStock:
 *           type: integer
 *           example: 10
 *           description: Initial stock quantity
 *     ProductUpdate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "Updated Laptop Computer"
 *         description:
 *           type: string
 *           example: "Updated description"
 *         sku:
 *           type: string
 *           example: "LAPTOP001_V2"
 *         barcode:
 *           type: string
 *           example: "1234567890124"
 *         categoryId:
 *           type: integer
 *           example: 1
 *         supplierId:
 *           type: integer
 *           example: 2
 *         costPrice:
 *           type: number
 *           format: float
 *           example: 520.00
 *         sellingPrice:
 *           type: number
 *           format: float
 *           example: 780.00
 *         minStockLevel:
 *           type: integer
 *           example: 8
 *     ProductResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: "Laptop Computer"
 *         description:
 *           type: string
 *           example: "High-performance laptop for business use"
 *         sku:
 *           type: string
 *           example: "LAPTOP001"
 *         barcode:
 *           type: string
 *           example: "1234567890123"
 *         category_id:
 *           type: integer
 *           example: 1
 *         supplier_id:
 *           type: integer
 *           example: 1
 *         cost_price:
 *           type: number
 *           format: float
 *           example: 500.00
 *         selling_price:
 *           type: number
 *           format: float
 *           example: 750.00
 *         price:
 *           type: number
 *           format: float
 *           example: 750.00
 *         min_stock_level:
 *           type: integer
 *           example: 5
 *         current_stock:
 *           type: integer
 *           example: 10
 *         reserved_stock:
 *           type: integer
 *           example: 0
 *         is_low_stock:
 *           type: boolean
 *           example: false
 *         category_name:
 *           type: string
 *           example: "Electronics"
 *         supplier_name:
 *           type: string
 *           example: "Tech Wholesale Co."
 *         is_active:
 *           type: boolean
 *           example: true
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: "2024-01-01T12:00:00Z"
 *         updated_at:
 *           type: string
 *           format: date-time
 *           example: "2024-01-01T12:00:00Z"
 *     ProductList:
 *       type: object
 *       properties:
 *         products:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductResponse'
 *         pagination:
 *           type: object
 *           properties:
 *             page:
 *               type: integer
 *               example: 1
 *             limit:
 *               type: integer
 *               example: 20
 *             total:
 *               type: integer
 *               example: 100
 *             totalPages:
 *               type: integer
 *               example: 5
 */

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: Get all products with pagination, filtering and search
 *     description: Retrieve a paginated list of products with optional filtering by category, supplier, low stock status, and search functionality
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of products per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter by name, SKU, or barcode
 *       - in: query
 *         name: category
 *         schema:
 *           type: integer
 *         description: Filter by category ID
 *       - in: query
 *         name: supplier
 *         schema:
 *           type: integer
 *         description: Filter by supplier ID
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: boolean
 *         description: Filter products with low stock (at or below minimum level)
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductList'
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                         example: "Page must be a positive integer"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Server error
 */
router.get('/', [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('search').optional().isString(),
    query('category').optional().isInt(),
    query('supplier').optional().isInt(),
    query('lowStock').optional().isBoolean()
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
        const categoryId = req.query.category;
        const supplierId = req.query.supplier;
        const lowStock = req.query.lowStock === 'true';

        let whereClause = 'WHERE p.is_active = 1';
        const params = [];

        // Build WHERE clause based on filters
        if (search) {
            whereClause += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        if (categoryId) {
            whereClause += ' AND p.category_id = ?';
            params.push(categoryId);
        }

        if (supplierId) {
            whereClause += ' AND p.supplier_id = ?';
            params.push(supplierId);
        }

        if (lowStock) {
            whereClause += ' AND i.current_stock <= p.min_stock_level';
        }

        const query = `
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
            ${whereClause}
            ORDER BY p.name ASC
            LIMIT ? OFFSET ?
        `;

        params.push(limit, offset);
        const products = await getAllRows(query, params);

        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(*) as total
            FROM products p
            LEFT JOIN inventory i ON p.id = i.product_id
            ${whereClause}
        `;
        const countParams = params.slice(0, -2); // Remove limit and offset
        const countResult = await getRow(countQuery, countParams);
        const total = countResult.total;

        res.json({
            products,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'Error fetching products' });
    }
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get product by ID
 *     description: Retrieve a single product with all its details including stock information
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductResponse'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Product not found"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/products/search/{term}:
 *   get:
 *     tags: [Products]
 *     summary: Search products by name, SKU, or barcode (POS optimized)
 *     description: Quick search for products by name, SKU, or barcode - optimized for POS systems, returns only products with stock
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: term
 *         required: true
 *         schema:
 *           type: string
 *         description: Search term (name, SKU, or barcode)
 *         example: "LAPTOP001"
 *     responses:
 *       200:
 *         description: Products found
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProductResponse'
 *               maxItems: 10
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Server error
 */
router.get('/search/:term', async (req, res) => {
    try {
        const searchTerm = `%${req.params.term}%`;
        const products = await getAllRows(`
            SELECT 
                p.*,
                p.selling_price as price,
                c.name as category_name,
                COALESCE(i.current_stock, 0) as current_stock,
                (COALESCE(i.current_stock, 0) <= p.min_stock_level) as is_low_stock
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN inventory i ON p.id = i.product_id
            WHERE p.is_active = 1 
            AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)
            AND i.current_stock > 0
            ORDER BY p.name ASC
            LIMIT 10
        `, [searchTerm, searchTerm, searchTerm]);
        
        res.json(products);
    } catch (error) {
        console.error('Error searching products:', error);
        res.status(500).json({ message: 'Error searching products' });
    }
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     tags: [Products]
 *     summary: Create new product (Manager+ only)
 *     description: Create a new product with automatic inventory initialization and optional initial stock
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductCreate'
 *           example:
 *             name: "Wireless Mouse"
 *             description: "Ergonomic wireless mouse with USB receiver"
 *             sku: "MOUSE001"
 *             barcode: "1234567890123"
 *             categoryId: 1
 *             supplierId: 2
 *             costPrice: 15.00
 *             sellingPrice: 29.99
 *             minStockLevel: 10
 *             initialStock: 50
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Product created successfully"
 *                 id:
 *                   type: integer
 *                   example: 123
 *                 product:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 123
 *                     name:
 *                       type: string
 *                       example: "Wireless Mouse"
 *                     sku:
 *                       type: string
 *                       example: "MOUSE001"
 *                     current_stock:
 *                       type: integer
 *                       example: 50
 *       400:
 *         description: Validation errors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                         example: "Product name is required"
 *       404:
 *         description: Category or supplier not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Category not found"
 *       409:
 *         description: SKU or barcode already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "SKU already exists"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         description: Server error
 */
router.post('/', requireManager, [
    body('name').notEmpty().withMessage('Product name is required'),
    body('sku').notEmpty().withMessage('SKU is required'),
    body('barcode').optional().isString(),
    body('categoryId').isInt().withMessage('Valid category ID is required'),
    body('supplierId').optional().isInt(),
    body('costPrice').isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),
    body('sellingPrice').isFloat({ min: 0 }).withMessage('Selling price must be a positive number'),
    body('minStockLevel').optional().isInt({ min: 0 }).withMessage('Minimum stock level must be non-negative'),
    body('description').optional().isString(),
    body('initialStock').optional().isInt({ min: 0 }).withMessage('Initial stock must be non-negative')
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

        // Check if barcode already exists (if provided)
        if (barcode) {
            const existingBarcode = await getRow(
                'SELECT id FROM products WHERE barcode = ? AND is_active = 1',
                [barcode]
            );

            if (existingBarcode) {
                return res.status(409).json({ message: 'Barcode already exists' });
            }
        }

        // Check if category exists
        const category = await getRow(
            'SELECT id FROM categories WHERE id = ? AND is_active = 1',
            [categoryId]
        );

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Check if supplier exists (if provided)
        if (supplierId) {
            const supplier = await getRow(
                'SELECT id FROM suppliers WHERE id = ? AND is_active = 1',
                [supplierId]
            );

            if (!supplier) {
                return res.status(404).json({ message: 'Supplier not found' });
            }
        }

        // Create product and inventory record in a transaction
        const queries = [
            {
                query: `INSERT INTO products (name, description, sku, barcode, category_id, supplier_id, cost_price, selling_price, min_stock_level) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                params: [
                    name, description || null, sku, barcode || null, 
                    categoryId, supplierId || null, costPrice, sellingPrice, 
                    minStockLevel || 0
                ]
            }
        ];

        const results = await runTransaction(queries);
        const productId = results[0].id;

        // Create inventory record
        const stockLevel = initialStock || 0;
        await runQuery(
            'INSERT INTO inventory (product_id, current_stock) VALUES (?, ?)',
            [productId, stockLevel]
        );

        // Create initial stock movement if there's initial stock
        if (stockLevel > 0) {
            await runQuery(
                `INSERT INTO stock_movements (product_id, movement_type, quantity, previous_stock, new_stock, reference, user_id) 
                 VALUES (?, 'in', ?, 0, ?, 'Initial stock', ?)`,
                [productId, stockLevel, stockLevel, req.user.id]
            );
        }

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
        res.status(500).json({ message: 'Error creating product' });
    }
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Update product (Manager+ only)
 *     description: Update an existing product's information. Does not affect stock levels.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductUpdate'
 *           example:
 *             name: "Updated Wireless Mouse"
 *             description: "Updated description for wireless mouse"
 *             sku: "MOUSE001_V2"
 *             barcode: "1234567890124"
 *             categoryId: 1
 *             supplierId: 3
 *             costPrice: 16.50
 *             sellingPrice: 32.99
 *             minStockLevel: 15
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Product updated successfully"
 *                 product:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 123
 *                     name:
 *                       type: string
 *                       example: "Updated Wireless Mouse"
 *                     sku:
 *                       type: string
 *                       example: "MOUSE001_V2"
 *       400:
 *         description: Validation errors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                         example: "Product name is required"
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Product not found"
 *       409:
 *         description: SKU or barcode already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "SKU already exists"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         description: Server error
 *   delete:
 *     tags: [Products]
 *     summary: Delete product (soft delete - Manager+ only)
 *     description: Soft delete a product. Product must have zero stock to be deleted.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID to delete
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Product deleted successfully"
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Product not found"
 *       409:
 *         description: Cannot delete product with remaining stock
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Cannot delete product with remaining stock. Please adjust stock to zero first."
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         description: Server error
 */
router.put('/:id', requireManager, [
    body('name').notEmpty().withMessage('Product name is required'),
    body('sku').notEmpty().withMessage('SKU is required'),
    body('barcode').optional().isString(),
    body('categoryId').isInt().withMessage('Valid category ID is required'),
    body('supplierId').optional().isInt(),
    body('costPrice').isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),
    body('sellingPrice').isFloat({ min: 0 }).withMessage('Selling price must be a positive number'),
    body('minStockLevel').optional().isInt({ min: 0 }).withMessage('Minimum stock level must be non-negative'),
    body('description').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Product update validation errors:', errors.array());
            console.log('Request body:', req.body);
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const {
            name, sku, barcode, categoryId, supplierId, 
            costPrice, sellingPrice, minStockLevel, description
        } = req.body;

        // Check if product exists
        const existingProduct = await getRow(
            'SELECT id FROM products WHERE id = ? AND is_active = 1',
            [id]
        );

        if (!existingProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if new SKU conflicts with another product
        const skuConflict = await getRow(
            'SELECT id FROM products WHERE sku = ? AND id != ? AND is_active = 1',
            [sku, id]
        );

        if (skuConflict) {
            return res.status(409).json({ message: 'SKU already exists' });
        }

        // Check if new barcode conflicts with another product (if provided)
        if (barcode) {
            const barcodeConflict = await getRow(
                'SELECT id FROM products WHERE barcode = ? AND id != ? AND is_active = 1',
                [barcode, id]
            );

            if (barcodeConflict) {
                return res.status(409).json({ message: 'Barcode already exists' });
            }
        }

        await runQuery(
            `UPDATE products SET 
                name = ?, description = ?, sku = ?, barcode = ?, category_id = ?, supplier_id = ?, 
                cost_price = ?, selling_price = ?, min_stock_level = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [
                name, description || null, sku, barcode || null, categoryId, 
                supplierId || null, costPrice, sellingPrice, minStockLevel || 0, id
            ]
        );

        res.json({
            message: 'Product updated successfully',
            product: { id: parseInt(id), name, sku }
        });

    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Error updating product' });
    }
});

// Delete product (soft delete - Manager+ only)
router.delete('/:id', requireManager, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Delete request for product ID: ${id}, User: ${req.user?.username}, Role: ${req.user?.role}`);

        // Check if product exists
        const product = await getRow(
            'SELECT id FROM products WHERE id = ? AND is_active = 1',
            [id]
        );

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check current stock
        const inventory = await getRow(
            'SELECT current_stock FROM inventory WHERE product_id = ?',
            [id]
        );

        if (inventory && inventory.current_stock > 0) {
            return res.status(409).json({ 
                message: 'Cannot delete product with remaining stock. Please adjust stock to zero first.' 
            });
        }

        // Soft delete
        await runQuery(
            'UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );

        res.json({ message: 'Product deleted successfully' });

    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: 'Error deleting product' });
    }
});

/**
 * @swagger
 * /api/products/bulk/import:
 *   post:
 *     tags: [Products]
 *     summary: Bulk import products
 *     description: Import multiple products from CSV or JSON data
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               products:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Products imported successfully
 *       400:
 *         description: Invalid data format
 */
router.post('/bulk/import', requireManager, async (req, res) => {
    try {
        const { products } = req.body;
        
        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ message: 'Products array is required' });
        }

        const results = {
            successful: 0,
            failed: 0,
            errors: []
        };

        for (let i = 0; i < products.length; i++) {
            try {
                const product = products[i];
                // Basic validation
                if (!product.name || !product.sku || !product.categoryId) {
                    results.failed++;
                    results.errors.push(`Row ${i + 1}: Missing required fields`);
                    continue;
                }

                // Check for duplicates
                const existing = await getRow(
                    'SELECT id FROM products WHERE sku = ? AND is_active = 1',
                    [product.sku]
                );

                if (existing) {
                    results.failed++;
                    results.errors.push(`Row ${i + 1}: SKU '${product.sku}' already exists`);
                    continue;
                }

                // Insert product (simplified version)
                await runQuery(
                    `INSERT INTO products (name, sku, category_id, cost_price, selling_price, min_stock_level) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        product.name,
                        product.sku,
                        product.categoryId,
                        product.costPrice || 0,
                        product.sellingPrice || 0,
                        product.minStockLevel || 0
                    ]
                );

                results.successful++;
            } catch (error) {
                results.failed++;
                results.errors.push(`Row ${i + 1}: ${error.message}`);
            }
        }

        res.json({
            message: 'Bulk import completed',
            results
        });

    } catch (error) {
        console.error('Error in bulk import:', error);
        res.status(500).json({ message: 'Error importing products' });
    }
});

/**
 * @swagger
 * /api/products/bulk/export:
 *   get:
 *     tags: [Products]
 *     summary: Export products to CSV
 *     description: Export all or filtered products to CSV format
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *       - in: query
 *         name: category
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Products exported
 */
router.get('/bulk/export', async (req, res) => {
    try {
        const format = req.query.format || 'json';
        const categoryId = req.query.category;

        let whereClause = 'WHERE p.is_active = 1';
        const params = [];

        if (categoryId) {
            whereClause += ' AND p.category_id = ?';
            params.push(categoryId);
        }

        const products = await getAllRows(`
            SELECT 
                p.id, p.name, p.sku, p.barcode, p.description,
                p.cost_price, p.selling_price, p.min_stock_level,
                c.name as category_name,
                s.name as supplier_name,
                COALESCE(i.current_stock, 0) as current_stock
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            LEFT JOIN inventory i ON p.id = i.product_id
            ${whereClause}
            ORDER BY p.name ASC
        `, params);

        if (format === 'csv') {
            // Convert to CSV format
            const csvHeader = 'ID,Name,SKU,Barcode,Description,Cost Price,Selling Price,Min Stock,Category,Supplier,Current Stock\n';
            const csvRows = products.map(p => 
                `${p.id},"${p.name}","${p.sku}","${p.barcode || ''}","${p.description || ''}",${p.cost_price},${p.selling_price},${p.min_stock_level},"${p.category_name || ''}","${p.supplier_name || ''}",${p.current_stock}`
            ).join('\n');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');
            res.send(csvHeader + csvRows);
        } else {
            res.json({ products });
        }

    } catch (error) {
        console.error('Error exporting products:', error);
        res.status(500).json({ message: 'Error exporting products' });
    }
});

/**
 * @swagger
 * /api/products/{id}/pricing/history:
 *   get:
 *     tags: [Products]
 *     summary: Get product pricing history
 *     description: Returns historical pricing changes for a product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Pricing history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 history:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       old_price:
 *                         type: number
 *                       new_price:
 *                         type: number
 *                       change_date:
 *                         type: string
 *                       changed_by:
 *                         type: string
 */
router.get('/:id/pricing/history', async (req, res) => {
    // Stub implementation - would require a price_history table
    res.json({ 
        message: 'Pricing history feature requires price_history table implementation',
        history: []
    });
});

/**
 * @swagger
 * /api/products/{id}/analytics:
 *   get:
 *     tags: [Products]
 *     summary: Get product analytics
 *     description: Returns sales analytics and performance metrics for a product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Product analytics
 */
router.get('/:id/analytics', async (req, res) => {
    try {
        const { id } = req.params;
        const days = parseInt(req.query.days) || 30;

        // Get sales data for the product
        const salesData = await getAllRows(`
            SELECT 
                DATE(s.created_at) as sale_date,
                SUM(si.quantity) as units_sold,
                SUM(si.total_price) as revenue
            FROM sale_items si
            LEFT JOIN sales s ON si.sale_id = s.id
            WHERE si.product_id = ? 
            AND s.created_at >= date('now', '-${days} days')
            GROUP BY DATE(s.created_at)
            ORDER BY sale_date ASC
        `, [id]);

        const totalUnits = salesData.reduce((sum, day) => sum + day.units_sold, 0);
        const totalRevenue = salesData.reduce((sum, day) => sum + day.revenue, 0);

        res.json({
            product_id: id,
            period_days: days,
            total_units_sold: totalUnits,
            total_revenue: totalRevenue,
            daily_sales: salesData,
            average_daily_sales: totalUnits / days
        });

    } catch (error) {
        console.error('Error fetching product analytics:', error);
        res.status(500).json({ message: 'Error fetching analytics' });
    }
});

module.exports = router;
