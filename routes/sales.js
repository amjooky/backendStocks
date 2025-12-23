const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { runQuery, getAllRows, getRow, runTransaction } = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all sales with pagination
router.get('/', [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('startDate').optional().isDate(),
    query('endDate').optional().isDate(),
    query('cashierId').optional().isInt(),
    query('customerId').optional().isInt()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const { startDate, endDate, cashierId, customerId } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (startDate) {
            whereClause += ' AND DATE(s.created_at) >= ?';
            params.push(startDate);
        }

        if (endDate) {
            whereClause += ' AND DATE(s.created_at) <= ?';
            params.push(endDate);
        }

        if (cashierId) {
            whereClause += ' AND s.cashier_id = ?';
            params.push(cashierId);
        }

        if (customerId) {
            whereClause += ' AND s.customer_id = ?';
            params.push(customerId);
        }

        const sales = await getAllRows(`
            SELECT 
                s.*,
                c.name as customer_name,
                u.username as cashier_name,
                COUNT(si.id) as items_count
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN users u ON s.cashier_id = u.id
            LEFT JOIN sale_items si ON s.id = si.sale_id
            ${whereClause}
            GROUP BY s.id
            ORDER BY s.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        // Get total count
        const countResult = await getRow(`
            SELECT COUNT(*) as total FROM sales s ${whereClause}
        `, params);

        res.json({
            sales,
            pagination: {
                page,
                limit,
                total: countResult.total,
                totalPages: Math.ceil(countResult.total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching sales:', error);
        res.status(500).json({ message: 'Error fetching sales' });
    }
});

// Get sale by ID with full details
router.get('/:id', async (req, res) => {
    try {
        const sale = await getRow(`
            SELECT 
                s.*,
                c.name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                u.username as cashier_name,
                u.first_name as cashier_first_name,
                u.last_name as cashier_last_name
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN users u ON s.cashier_id = u.id
            WHERE s.id = ?
        `, [req.params.id]);

        if (!sale) {
            return res.status(404).json({ message: 'Sale not found' });
        }

        // Get sale items
        const items = await getAllRows(`
            SELECT 
                si.*,
                p.name as product_name,
                p.sku,
                p.barcode
            FROM sale_items si
            LEFT JOIN products p ON si.product_id = p.id
            WHERE si.sale_id = ?
            ORDER BY si.id
        `, [req.params.id]);

        // Get applied promotions
        const promotions = await getAllRows(`
            SELECT 
                sp.*,
                pr.name as promotion_name,
                pr.type as promotion_type
            FROM sale_promotions sp
            LEFT JOIN promotions pr ON sp.promotion_id = pr.id
            WHERE sp.sale_id = ?
        `, [req.params.id]);

        res.json({
            ...sale,
            items,
            promotions
        });

    } catch (error) {
        console.error('Error fetching sale:', error);
        res.status(500).json({ message: 'Error fetching sale' });
    }
});

// Generate sale number
const generateSaleNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const time = now.getTime().toString().slice(-6);
    return `S${year}${month}${day}-${time}`;
};

// Create new sale (Process POS transaction)
router.post('/', [
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.productId').isInt().withMessage('Product ID must be an integer'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be positive'),
    body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be non-negative'),
    body('items.*.discountAmount').optional().isFloat({ min: 0 }),
    body('customerId').optional().isInt(),
    body('caisseSessionId').optional().isString(),
    body('paymentMethod').isIn(['cash', 'card', 'mobile', 'mixed']).withMessage('Valid payment method required'),
    body('appliedPromotions').optional().isArray(),
    body('appliedPromotions.*.promotionId').optional().isInt(),
    body('appliedPromotions.*.discountAmount').optional().isFloat({ min: 0 }),
    body('loyaltyPointsRedeemed').optional().isInt({ min: 0 }),
    body('notes').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { 
            items, customerId, caisseSessionId, paymentMethod, appliedPromotions, 
            loyaltyPointsRedeemed, notes 
        } = req.body;

        // Generate unique sale number
        const saleNumber = generateSaleNumber();

        // Validate stock availability for all items
        for (const item of items) {
            const inventory = await getRow(
                'SELECT current_stock FROM inventory WHERE product_id = ?',
                [item.productId]
            );

            if (!inventory || inventory.current_stock < item.quantity) {
                const product = await getRow('SELECT name FROM products WHERE id = ?', [item.productId]);
                return res.status(400).json({ 
                    message: `Insufficient stock for ${product?.name || 'product'}`,
                    productId: item.productId,
                    available: inventory?.current_stock || 0,
                    requested: item.quantity
                });
            }
        }

        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
        const itemDiscounts = items.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
        const promotionDiscounts = (appliedPromotions || []).reduce((sum, promo) => sum + promo.discountAmount, 0);
        const loyaltyDiscount = loyaltyPointsRedeemed || 0;
        const totalDiscounts = itemDiscounts + promotionDiscounts + loyaltyDiscount;
        const taxAmount = 0; // Could be calculated based on tax rate
        const totalAmount = subtotal - totalDiscounts + taxAmount;

        if (totalAmount < 0) {
            return res.status(400).json({ message: 'Total amount cannot be negative' });
        }

        // Validate customer and loyalty points if provided
        if (customerId) {
            const customer = await getRow(
                'SELECT id, loyalty_points FROM customers WHERE id = ? AND is_active = 1',
                [customerId]
            );

            if (!customer) {
                return res.status(404).json({ message: 'Customer not found' });
            }

            if (loyaltyPointsRedeemed && customer.loyalty_points < loyaltyPointsRedeemed) {
                return res.status(400).json({ 
                    message: 'Insufficient loyalty points',
                    available: customer.loyalty_points
                });
            }
        }

        // Start transaction
        const transactionQueries = [];

        // 1. Create sale record
        transactionQueries.push({
            query: `INSERT INTO sales (sale_number, customer_id, cashier_id, caisse_session_id, subtotal, discount_amount, 
                    tax_amount, total_amount, payment_method, notes) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            params: [saleNumber, customerId || null, req.user.id, caisseSessionId || null, subtotal, totalDiscounts, 
                    taxAmount, totalAmount, paymentMethod, notes || null]
        });

        const saleResult = await runTransaction(transactionQueries);
        const saleId = saleResult[0].id;

        // 2. Create sale items and update inventory
        const itemQueries = [];
        const inventoryQueries = [];

        for (const item of items) {
            // Add sale item
            itemQueries.push({
                query: `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount_amount, total_price) 
                        VALUES (?, ?, ?, ?, ?, ?)`,
                params: [saleId, item.productId, item.quantity, item.unitPrice, 
                        item.discountAmount || 0, (item.unitPrice * item.quantity) - (item.discountAmount || 0)]
            });

            // Update inventory
            const currentInventory = await getRow('SELECT current_stock FROM inventory WHERE product_id = ?', [item.productId]);
            const newStock = currentInventory.current_stock - item.quantity;
            
            inventoryQueries.push({
                query: 'UPDATE inventory SET current_stock = ?, last_updated = CURRENT_TIMESTAMP WHERE product_id = ?',
                params: [newStock, item.productId]
            });

            // Create stock movement
            inventoryQueries.push({
                query: `INSERT INTO stock_movements (product_id, movement_type, quantity, previous_stock, new_stock, reference, user_id) 
                        VALUES (?, 'out', ?, ?, ?, ?, ?)`,
                params: [item.productId, item.quantity, currentInventory.current_stock, newStock, saleNumber, req.user.id]
            });
        }

        await runTransaction(itemQueries);
        await runTransaction(inventoryQueries);

        // 3. Handle applied promotions
        if (appliedPromotions && appliedPromotions.length > 0) {
            const promotionQueries = [];

            for (const promotion of appliedPromotions) {
                promotionQueries.push({
                    query: 'INSERT INTO sale_promotions (sale_id, promotion_id, discount_amount) VALUES (?, ?, ?)',
                    params: [saleId, promotion.promotionId, promotion.discountAmount]
                });

                // Increment promotion usage
                promotionQueries.push({
                    query: 'UPDATE promotions SET current_uses = current_uses + 1 WHERE id = ?',
                    params: [promotion.promotionId]
                });
            }

            await runTransaction(promotionQueries);
        }

        // 4. Handle customer loyalty points
        if (customerId) {
            const loyaltyQueries = [];

            // Deduct redeemed points
            if (loyaltyPointsRedeemed > 0) {
                loyaltyQueries.push({
                    query: 'UPDATE customers SET loyalty_points = loyalty_points - ? WHERE id = ?',
                    params: [loyaltyPointsRedeemed, customerId]
                });
            }

            // Award points for purchase (1 point per dollar spent)
            const earnedPoints = Math.floor(totalAmount);
            if (earnedPoints > 0) {
                loyaltyQueries.push({
                    query: 'UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id = ?',
                    params: [earnedPoints, customerId]
                });
            }

            if (loyaltyQueries.length > 0) {
                await runTransaction(loyaltyQueries);
            }
        }

        // Get complete sale data for response with items
        const completeSale = await getRow(`
            SELECT 
                s.*,
                c.name as customer_name,
                u.username as cashier_name
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN users u ON s.cashier_id = u.id
            WHERE s.id = ?
        `, [saleId]);

        // Get sale items with product details
        const saleItems = await getAllRows(`
            SELECT 
                si.*,
                p.name as product_name,
                p.sku,
                si.quantity * si.unit_price as subtotal
            FROM sale_items si
            LEFT JOIN products p ON si.product_id = p.id
            WHERE si.sale_id = ?
            ORDER BY si.id
        `, [saleId]);

        // Get applied promotions if any
        const salePromotions = await getAllRows(`
            SELECT 
                sp.*,
                pr.name as promotion_name
            FROM sale_promotions sp
            LEFT JOIN promotions pr ON sp.promotion_id = pr.id
            WHERE sp.sale_id = ?
        `, [saleId]);

        // Calculate change for cash payments
        let changeGiven = 0;
        if (paymentMethod === 'cash' && notes) {
            const amountPaidMatch = notes.match(/Amount Paid: \$(\d+\.?\d*)/);
            if (amountPaidMatch) {
                const amountPaid = parseFloat(amountPaidMatch[1]);
                changeGiven = Math.max(0, amountPaid - totalAmount);
            }
        }

        // Build complete response with all receipt data
        const receiptData = {
            ...completeSale,
            items: saleItems,
            promotions: salePromotions,
            change_given: changeGiven,
            // Format the response to match frontend expectations
            id: saleId,
            subtotal: subtotal,
            discount_amount: totalDiscounts,
            total_amount: totalAmount,
            created_at: new Date().toISOString()
        };

        res.status(201).json(receiptData);

    } catch (error) {
        console.error('Error creating sale:', error);
        res.status(500).json({ message: 'Error processing sale' });
    }
});

// Get today's sales summary
router.get('/summary/today', async (req, res) => {
    try {
        const summary = await getRow(`
            SELECT 
                COUNT(*) as total_sales,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COALESCE(SUM(discount_amount), 0) as total_discounts,
                COALESCE(AVG(total_amount), 0) as average_sale
            FROM sales 
            WHERE DATE(created_at) = DATE('now')
        `);

        // Get payment method breakdown
        const paymentMethods = await getAllRows(`
            SELECT 
                payment_method,
                COUNT(*) as count,
                SUM(total_amount) as total
            FROM sales 
            WHERE DATE(created_at) = DATE('now')
            GROUP BY payment_method
        `);

        // Get top products sold today
        const topProducts = await getAllRows(`
            SELECT 
                p.name,
                p.sku,
                SUM(si.quantity) as total_quantity,
                SUM(si.total_price) as total_revenue
            FROM sale_items si
            LEFT JOIN products p ON si.product_id = p.id
            LEFT JOIN sales s ON si.sale_id = s.id
            WHERE DATE(s.created_at) = DATE('now')
            GROUP BY p.id
            ORDER BY total_quantity DESC
            LIMIT 5
        `);

        res.json({
            summary,
            paymentMethods,
            topProducts
        });

    } catch (error) {
        console.error('Error fetching today\'s summary:', error);
        res.status(500).json({ message: 'Error fetching today\'s summary' });
    }
});

// Get sales by date range
router.get('/range/:startDate/:endDate', async (req, res) => {
    try {
        const { startDate, endDate } = req.params;

        const sales = await getAllRows(`
            SELECT 
                DATE(created_at) as sale_date,
                COUNT(*) as total_sales,
                SUM(total_amount) as total_revenue,
                SUM(discount_amount) as total_discounts
            FROM sales 
            WHERE DATE(created_at) BETWEEN ? AND ?
            GROUP BY DATE(created_at)
            ORDER BY sale_date DESC
        `, [startDate, endDate]);

        res.json(sales);

    } catch (error) {
        console.error('Error fetching sales by date range:', error);
        res.status(500).json({ message: 'Error fetching sales by date range' });
    }
});

// Refund sale (Manager+ only)
router.post('/:id/refund', requireManager, [
    body('reason').notEmpty().withMessage('Refund reason is required'),
    body('refundItems').optional().isArray(),
    body('refundItems.*.itemId').optional().isInt(),
    body('refundItems.*.quantity').optional().isInt({ min: 1 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { reason, refundItems } = req.body;

        // Get sale details
        const sale = await getRow(
            'SELECT * FROM sales WHERE id = ? AND payment_status != "refunded"',
            [id]
        );

        if (!sale) {
            return res.status(404).json({ message: 'Sale not found or already refunded' });
        }

        // Get sale items
        const saleItems = await getAllRows(
            'SELECT * FROM sale_items WHERE sale_id = ?',
            [id]
        );

        const refundQueries = [];

        // If partial refund
        if (refundItems && refundItems.length > 0) {
            // Handle partial refund logic
            for (const refundItem of refundItems) {
                const saleItem = saleItems.find(si => si.id === refundItem.itemId);
                if (saleItem && refundItem.quantity <= saleItem.quantity) {
                    // Restore inventory
                    refundQueries.push({
                        query: 'UPDATE inventory SET current_stock = current_stock + ? WHERE product_id = ?',
                        params: [refundItem.quantity, saleItem.product_id]
                    });

                    // Create stock movement
                    refundQueries.push({
                        query: `INSERT INTO stock_movements (product_id, movement_type, quantity, previous_stock, new_stock, reference, notes, user_id) 
                                SELECT product_id, 'in', ?, current_stock - ?, current_stock, ?, ?, ?
                                FROM inventory WHERE product_id = ?`,
                        params: [refundItem.quantity, refundItem.quantity, `REFUND-${sale.sale_number}`, reason, req.user.id, saleItem.product_id]
                    });
                }
            }
        } else {
            // Full refund - restore all inventory
            for (const saleItem of saleItems) {
                refundQueries.push({
                    query: 'UPDATE inventory SET current_stock = current_stock + ? WHERE product_id = ?',
                    params: [saleItem.quantity, saleItem.product_id]
                });

                // Create stock movement
                refundQueries.push({
                    query: `INSERT INTO stock_movements (product_id, movement_type, quantity, previous_stock, new_stock, reference, notes, user_id) 
                            SELECT product_id, 'in', ?, current_stock - ?, current_stock, ?, ?, ?
                            FROM inventory WHERE product_id = ?`,
                    params: [saleItem.quantity, saleItem.quantity, `REFUND-${sale.sale_number}`, reason, req.user.id, saleItem.product_id]
                });
            }

            // Mark sale as refunded
            refundQueries.push({
                query: 'UPDATE sales SET payment_status = "refunded", notes = COALESCE(notes, "") || ? WHERE id = ?',
                params: [`\nREFUNDED: ${reason}`, id]
            });
        }

        await runTransaction(refundQueries);

        res.json({
            message: refundItems ? 'Partial refund processed successfully' : 'Full refund processed successfully',
            saleId: id,
            reason
        });

    } catch (error) {
        console.error('Error processing refund:', error);
        res.status(500).json({ message: 'Error processing refund' });
    }
});

module.exports = router;
