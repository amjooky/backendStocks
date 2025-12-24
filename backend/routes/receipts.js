const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { runQuery, getRow, getAllRows } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Generate receipt number
const generateReceiptNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    return `RCP-${year}${month}${day}-${timestamp}`;
};

// Create receipt
router.post('/', authenticateToken, async (req, res) => {
    try {
        const {
            items,
            subtotal,
            tax = 0,
            discount = 0,
            total,
            paymentMethod,
            cashAmount = 0,
            changeAmount = 0,
            notes = '',
            customer = null,
            appliedPromotions = [],
            loyaltyPointsRedeemed = 0
        } = req.body;

        // Validate required fields
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Items are required' });
        }

        if (!total || !paymentMethod) {
            return res.status(400).json({ message: 'Total and payment method are required' });
        }

        const receiptId = uuidv4();
        const receiptNumber = req.body.receiptNumber || generateReceiptNumber();
        const timestamp = new Date().toISOString();

        // Create receipt
        await runQuery(`
            INSERT INTO receipts (
                id, receiptNumber, timestamp, subtotal, tax, discount, total,
                paymentMethod, cashAmount, changeAmount, notes, customerId,
                appliedPromotions, loyaltyPointsRedeemed, items
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            receiptId,
            receiptNumber,
            timestamp,
            subtotal,
            tax,
            discount,
            total,
            paymentMethod,
            cashAmount,
            changeAmount,
            notes,
            customer?.id || null,
            JSON.stringify(appliedPromotions),
            loyaltyPointsRedeemed,
            JSON.stringify(items)
        ]);

        // Return created receipt
        const createdReceipt = await getRow('SELECT * FROM receipts WHERE id = ?', [receiptId]);
        
        res.status(201).json({
            message: 'Receipt created successfully',
            receipt: {
                ...createdReceipt,
                items: JSON.parse(createdReceipt.items),
                appliedPromotions: JSON.parse(createdReceipt.appliedPromotions || '[]')
            }
        });
    } catch (error) {
        console.error('Error creating receipt:', error);
        res.status(500).json({ message: 'Failed to create receipt', error: error.message });
    }
});

// Get all receipts with pagination and filters
router.get('/', authenticateToken, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            from_date,
            to_date,
            payment_method,
            customer_id
        } = req.query;

        let whereConditions = [];
        let params = [];

        if (from_date) {
            whereConditions.push('timestamp >= ?');
            params.push(from_date);
        }

        if (to_date) {
            whereConditions.push('timestamp <= ?');
            params.push(to_date);
        }

        if (payment_method) {
            whereConditions.push('paymentMethod = ?');
            params.push(payment_method);
        }

        if (customer_id) {
            whereConditions.push('customerId = ?');
            params.push(customer_id);
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
        
        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM receipts ${whereClause}`;
        const countResult = await getRow(countQuery, params);
        const total = countResult.total;

        // Get receipts with pagination
        const offset = (page - 1) * limit;
        const receiptsQuery = `
            SELECT * FROM receipts ${whereClause} 
            ORDER BY timestamp DESC 
            LIMIT ? OFFSET ?
        `;
        const receipts = await getAllRows(receiptsQuery, [...params, limit, offset]);

        // Parse JSON fields
        const parsedReceipts = receipts.map(receipt => ({
            ...receipt,
            items: JSON.parse(receipt.items),
            appliedPromotions: JSON.parse(receipt.appliedPromotions || '[]')
        }));

        res.json({
            receipts: parsedReceipts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching receipts:', error);
        res.status(500).json({ message: 'Failed to fetch receipts', error: error.message });
    }
});

// Get specific receipt
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const receipt = await getRow('SELECT * FROM receipts WHERE id = ?', [id]);
        
        if (!receipt) {
            return res.status(404).json({ message: 'Receipt not found' });
        }

        res.json({
            ...receipt,
            items: JSON.parse(receipt.items),
            appliedPromotions: JSON.parse(receipt.appliedPromotions || '[]')
        });
    } catch (error) {
        console.error('Error fetching receipt:', error);
        res.status(500).json({ message: 'Failed to fetch receipt', error: error.message });
    }
});

// Search receipts
router.get('/search', authenticateToken, async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q) {
            return res.status(400).json({ message: 'Search query is required' });
        }

        const receipts = await getAllRows(`
            SELECT * FROM receipts 
            WHERE receiptNumber LIKE ? OR notes LIKE ? 
            ORDER BY timestamp DESC 
            LIMIT 50
        `, [`%${q}%`, `%${q}%`]);

        const parsedReceipts = receipts.map(receipt => ({
            ...receipt,
            items: JSON.parse(receipt.items),
            appliedPromotions: JSON.parse(receipt.appliedPromotions || '[]')
        }));

        res.json({ receipts: parsedReceipts });
    } catch (error) {
        console.error('Error searching receipts:', error);
        res.status(500).json({ message: 'Failed to search receipts', error: error.message });
    }
});

// Get receipt statistics
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        // Total receipts
        const totalReceipts = await getRow('SELECT COUNT(*) as count FROM receipts');
        
        // Total revenue
        const totalRevenue = await getRow('SELECT SUM(total) as revenue FROM receipts');
        
        // Today's receipts
        const today = new Date().toISOString().split('T')[0];
        const todayReceipts = await getRow(`
            SELECT COUNT(*) as count, SUM(total) as revenue 
            FROM receipts 
            WHERE DATE(timestamp) = ?
        `, [today]);
        
        // Average transaction value
        const avgTransaction = await getRow('SELECT AVG(total) as avg FROM receipts');
        
        // Payment method breakdown
        const paymentMethods = await getAllRows(`
            SELECT paymentMethod, COUNT(*) as count, SUM(total) as total
            FROM receipts 
            GROUP BY paymentMethod
        `);

        res.json({
            totalReceipts: totalReceipts.count,
            totalRevenue: totalRevenue.revenue || 0,
            todayReceipts: todayReceipts.count,
            todayRevenue: todayReceipts.revenue || 0,
            averageTransaction: avgTransaction.avg || 0,
            paymentMethods
        });
    } catch (error) {
        console.error('Error fetching receipt stats:', error);
        res.status(500).json({ message: 'Failed to fetch receipt statistics', error: error.message });
    }
});

// Generate receipt number
router.post('/generate-number', authenticateToken, async (req, res) => {
    try {
        const receiptNumber = generateReceiptNumber();
        res.json({ receiptNumber });
    } catch (error) {
        console.error('Error generating receipt number:', error);
        res.status(500).json({ message: 'Failed to generate receipt number', error: error.message });
    }
});

// Update receipt
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            items,
            subtotal,
            tax = 0,
            discount = 0,
            total,
            paymentMethod,
            cashAmount = 0,
            changeAmount = 0,
            notes = '',
            appliedPromotions = [],
            loyaltyPointsRedeemed = 0
        } = req.body;

        // Check if receipt exists
        const existingReceipt = await getRow('SELECT * FROM receipts WHERE id = ?', [id]);
        if (!existingReceipt) {
            return res.status(404).json({ message: 'Receipt not found' });
        }

        // Update receipt
        await runQuery(`
            UPDATE receipts SET 
                subtotal = ?, tax = ?, discount = ?, total = ?,
                paymentMethod = ?, cashAmount = ?, changeAmount = ?, 
                notes = ?, appliedPromotions = ?, loyaltyPointsRedeemed = ?, 
                items = ?
            WHERE id = ?
        `, [
            subtotal,
            tax,
            discount,
            total,
            paymentMethod,
            cashAmount,
            changeAmount,
            notes,
            JSON.stringify(appliedPromotions),
            loyaltyPointsRedeemed,
            JSON.stringify(items),
            id
        ]);

        // Return updated receipt
        const updatedReceipt = await getRow('SELECT * FROM receipts WHERE id = ?', [id]);
        
        res.json({
            message: 'Receipt updated successfully',
            receipt: {
                ...updatedReceipt,
                items: JSON.parse(updatedReceipt.items),
                appliedPromotions: JSON.parse(updatedReceipt.appliedPromotions || '[]')
            }
        });
    } catch (error) {
        console.error('Error updating receipt:', error);
        res.status(500).json({ message: 'Failed to update receipt', error: error.message });
    }
});

// Delete receipt
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if receipt exists
        const existingReceipt = await getRow('SELECT * FROM receipts WHERE id = ?', [id]);
        if (!existingReceipt) {
            return res.status(404).json({ message: 'Receipt not found' });
        }

        await runQuery('DELETE FROM receipts WHERE id = ?', [id]);
        
        res.json({ message: 'Receipt deleted successfully' });
    } catch (error) {
        console.error('Error deleting receipt:', error);
        res.status(500).json({ message: 'Failed to delete receipt', error: error.message });
    }
});

module.exports = router;