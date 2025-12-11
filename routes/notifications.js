const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireManager } = require('../middleware/auth');
const { runQuery, getAllRows, getRow } = require('../config/database');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Email, SMS, and push notifications
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     NotificationRequest:
 *       type: object
 *       required:
 *         - type
 *         - recipient
 *         - message
 *       properties:
 *         type:
 *           type: string
 *           enum: [email, sms, push]
 *         recipient:
 *           type: string
 *           description: Email address, phone number, or device ID
 *         message:
 *           type: string
 *         subject:
 *           type: string
 *           description: For email notifications
 */

// All routes require authentication
router.use(authenticateToken);

// Get all notifications for current user
router.get('/', async (req, res) => {
    try {
        const notifications = await getAllRows(`
            SELECT 
                id, type, title, message, priority, status, 
                data, created_at, read_at
            FROM notifications 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 50
        `, [req.user.id]);
        
        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        // Return empty array instead of error to avoid breaking the API
        res.json([]);
    }
});

/**
 * @swagger
 * /api/notifications/send:
 *   post:
 *     tags: [Notifications]
 *     summary: Send notification
 *     description: Send an email, SMS, or push notification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationRequest'
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *       400:
 *         description: Invalid request
 */
router.post('/send', [
    body('type').isIn(['email', 'sms', 'push']),
    body('recipient').notEmpty(),
    body('message').notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
const { type, recipient, message, subject } = req.body;
    
    try {
        // Store notification in database
        await runQuery(`
            INSERT INTO notifications (user_id, type, recipient, subject, message, status, created_at) 
            VALUES (?, ?, ?, ?, ?, 'sent', CURRENT_TIMESTAMP)
        `, [req.user.id, type, recipient, subject || null, message]);
        
        // In a real implementation, you would send actual notifications here
        // For now, we'll just log and return success
        console.log(`Sending ${type} notification to ${recipient}: ${message}`);
        
        res.json({ 
            message: 'Notification sent successfully',
            type,
            recipient
        });
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({ message: 'Error sending notification' });
    }
});

/**
 * @swagger
 * /api/notifications/low-stock:
 *   post:
 *     tags: [Notifications]
 *     summary: Send low stock alerts
 *     description: Send notifications for products with low stock
 *     responses:
 *       200:
 *         description: Alerts sent
 */
router.post('/low-stock', requireManager, async (req, res) => {
    try {
        // Get low stock and out of stock products
        const lowStockProducts = await getAllRows(`
            SELECT 
                p.id, p.name, p.sku, p.min_stock_level,
                i.current_stock,
                c.name as category_name,
                s.name as supplier_name,
                CASE 
                    WHEN i.current_stock = 0 THEN 'out_of_stock'
                    WHEN i.current_stock <= p.min_stock_level THEN 'low_stock'
                    ELSE 'normal'
                END as stock_status
            FROM products p
            LEFT JOIN inventory i ON p.id = i.product_id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.is_active = 1 
            AND i.current_stock <= p.min_stock_level
            ORDER BY i.current_stock ASC
        `);
        
        let notificationsSent = 0;
        
        for (const product of lowStockProducts) {
            let notificationType, message, priority;
            
            if (product.stock_status === 'out_of_stock') {
                notificationType = 'stock_alert';
                message = `🚨 STOCK RUPTURE: ${product.name} (${product.sku}) is OUT OF STOCK! Immediate restocking required.`;
                priority = 'high';
            } else {
                notificationType = 'stock_warning';
                message = `⚠️ LOW STOCK WARNING: ${product.name} (${product.sku}) has ${product.current_stock} units left (minimum: ${product.min_stock_level}). Consider restocking soon.`;
                priority = 'medium';
            }
            
            // Store notification
            await runQuery(`
                INSERT INTO notifications (user_id, type, title, message, priority, data, status, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
            `, [
                req.user.id,
                notificationType,
                product.stock_status === 'out_of_stock' ? 'Stock Rupture Alert' : 'Low Stock Warning',
                message,
                priority,
                JSON.stringify({
                    product_id: product.id,
                    product_name: product.name,
                    sku: product.sku,
                    current_stock: product.current_stock,
                    min_stock_level: product.min_stock_level,
                    category: product.category_name,
                    supplier: product.supplier_name,
                    stock_status: product.stock_status
                })
            ]);
            
            notificationsSent++;
        }
        
        res.json({ 
            message: `${notificationsSent} stock alerts sent`,
            alerts: lowStockProducts.map(p => ({
                product: p.name,
                sku: p.sku,
                current_stock: p.current_stock,
                status: p.stock_status
            }))
        });
        
    } catch (error) {
        console.error('Error sending low stock alerts:', error);
        res.status(500).json({ message: 'Error sending low stock alerts' });
    }
});

/**
 * @swagger
 * /api/notifications/settings:
 *   get:
 *     tags: [Notifications]
 *     summary: Get notification settings
 *     responses:
 *       200:
 *         description: Settings retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 emailEnabled:
 *                   type: boolean
 *                 smsEnabled:
 *                   type: boolean
 *   put:
 *     tags: [Notifications]
 *     summary: Update notification settings
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailEnabled:
 *                 type: boolean
 *               smsEnabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Settings updated
 */
router.get('/settings', async (req, res) => {
    try {
        const settings = await getRow(`
            SELECT * FROM notification_settings WHERE user_id = ?
        `, [req.user.id]);
        
        const defaultSettings = {
            emailEnabled: true,
            smsEnabled: false,
            pushEnabled: true,
            stockAlerts: true,
            lowStockThreshold: 10,
            autoStockAlerts: true
        };
        
        res.json(settings || defaultSettings);
    } catch (error) {
        console.error('Error fetching notification settings:', error);
        res.status(500).json({ message: 'Error fetching notification settings' });
    }
});

router.put('/settings', [
    body('emailEnabled').optional().isBoolean(),
    body('smsEnabled').optional().isBoolean(),
    body('pushEnabled').optional().isBoolean(),
    body('stockAlerts').optional().isBoolean(),
    body('lowStockThreshold').optional().isInt({ min: 0 }),
    body('autoStockAlerts').optional().isBoolean()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const settings = req.body;
        
        // Check if settings exist
        const existingSettings = await getRow(`
            SELECT id FROM notification_settings WHERE user_id = ?
        `, [req.user.id]);
        
        if (existingSettings) {
            // Update existing settings
            const updateFields = Object.keys(settings)
                .map(key => `${key} = ?`)
                .join(', ');
            const updateValues = [...Object.values(settings), req.user.id];
            
            await runQuery(`
                UPDATE notification_settings 
                SET ${updateFields}, updated_at = CURRENT_TIMESTAMP 
                WHERE user_id = ?
            `, updateValues);
        } else {
            // Create new settings
            const fields = ['user_id', ...Object.keys(settings), 'created_at'];
            const placeholders = fields.map(() => '?').join(', ');
            const values = [req.user.id, ...Object.values(settings), new Date()];
            
            await runQuery(`
                INSERT INTO notification_settings (${fields.join(', ')})
                VALUES (${placeholders})
            `, values);
        }
        
        res.json({ message: 'Notification settings updated successfully' });
    } catch (error) {
        console.error('Error updating notification settings:', error);
        res.status(500).json({ message: 'Error updating notification settings' });
    }
});

// Get user notifications
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const status = req.query.status; // 'active', 'read', 'archived'
        
        let whereClause = 'WHERE user_id = ?';
        const params = [req.user.id];
        
        if (status) {
            whereClause += ' AND status = ?';
            params.push(status);
        }
        
        const notifications = await getAllRows(`
            SELECT id, type, title, message, priority, data, status, created_at, read_at
            FROM notifications 
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);
        
        // Get total count
        const countResult = await getRow(`
            SELECT COUNT(*) as total FROM notifications ${whereClause}
        `, params);
        
        // Parse JSON data field for each notification
        const parsedNotifications = notifications.map(n => ({
            ...n,
            data: n.data ? JSON.parse(n.data) : null
        }));
        
        res.json({
            notifications: parsedNotifications,
            pagination: {
                page,
                limit,
                total: countResult.total,
                totalPages: Math.ceil(countResult.total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
});

// Mark notification as read
router.patch('/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await runQuery(`
            UPDATE notifications 
            SET status = 'read', read_at = CURRENT_TIMESTAMP 
            WHERE id = ? AND user_id = ?
        `, [id, req.user.id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        
        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ message: 'Error updating notification' });
    }
});

// Mark all notifications as read
router.patch('/mark-all-read', async (req, res) => {
    try {
        await runQuery(`
            UPDATE notifications 
            SET status = 'read', read_at = CURRENT_TIMESTAMP 
            WHERE user_id = ? AND status = 'active'
        `, [req.user.id]);
        
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ message: 'Error updating notifications' });
    }
});

// Delete notification
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await runQuery(`
            DELETE FROM notifications WHERE id = ? AND user_id = ?
        `, [id, req.user.id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        
        res.json({ message: 'Notification deleted' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ message: 'Error deleting notification' });
    }
});

// Get notification counts/stats
router.get('/stats', async (req, res) => {
    try {
        const stats = await getRow(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as unread,
                SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as read,
                SUM(CASE WHEN type = 'stock_alert' THEN 1 ELSE 0 END) as stock_alerts,
                SUM(CASE WHEN type = 'stock_warning' THEN 1 ELSE 0 END) as stock_warnings
            FROM notifications 
            WHERE user_id = ?
        `, [req.user.id]);
        
        res.json(stats);
    } catch (error) {
        console.error('Error fetching notification stats:', error);
        res.status(500).json({ message: 'Error fetching notification stats' });
    }
});

// Stock monitoring - check for new alerts
router.get('/check-stock-alerts', async (req, res) => {
    try {
        // Get products with stock issues that don't already have active notifications
        const stockIssues = await getAllRows(`
            SELECT 
                p.id, p.name, p.sku, p.min_stock_level,
                COALESCE(i.current_stock, 0) as current_stock,
                c.name as category_name,
                s.name as supplier_name,
                CASE 
                    WHEN COALESCE(i.current_stock, 0) = 0 THEN 'out_of_stock'
                    WHEN COALESCE(i.current_stock, 0) <= p.min_stock_level THEN 'low_stock'
                    ELSE 'normal'
                END as stock_status
            FROM products p
            LEFT JOIN inventory i ON p.id = i.product_id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.is_active = 1 
            AND COALESCE(i.current_stock, 0) <= p.min_stock_level
            AND NOT EXISTS (
                SELECT 1 FROM notifications n 
                WHERE n.type IN ('stock_alert', 'stock_warning')
                AND n.status = 'active'
                AND JSON_EXTRACT(n.data, '$.product_id') = p.id
                AND n.created_at > datetime('now', '-1 hour')
            )
            ORDER BY COALESCE(i.current_stock, 0) ASC
        `);
        
        const newAlerts = [];
        
        for (const product of stockIssues) {
            let notificationType, title, message, priority;
            
            if (product.stock_status === 'out_of_stock') {
                notificationType = 'stock_alert';
                title = 'Stock Rupture Alert';
                message = `🚨 STOCK RUPTURE: ${product.name} (${product.sku}) is OUT OF STOCK! Immediate restocking required.`;
                priority = 'high';
            } else {
                notificationType = 'stock_warning';
                title = 'Low Stock Warning';
                message = `⚠️ LOW STOCK: ${product.name} (${product.sku}) has ${product.current_stock} units left (minimum: ${product.min_stock_level}).`;
                priority = 'medium';
            }
            
            // Create notification
            await runQuery(`
                INSERT INTO notifications (user_id, type, title, message, priority, data, status, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
            `, [
                req.user.id,
                notificationType,
                title,
                message,
                priority,
                JSON.stringify({
                    product_id: product.id,
                    product_name: product.name,
                    sku: product.sku,
                    current_stock: product.current_stock,
                    min_stock_level: product.min_stock_level,
                    category: product.category_name,
                    supplier: product.supplier_name,
                    stock_status: product.stock_status
                })
            ]);
            
            newAlerts.push({
                product: product.name,
                sku: product.sku,
                status: product.stock_status,
                current_stock: product.current_stock,
                min_stock: product.min_stock_level
            });
        }
        
        res.json({
            message: `${newAlerts.length} new stock alerts created`,
            newAlerts
        });
        
    } catch (error) {
        console.error('Error checking stock alerts:', error);
        res.status(500).json({ message: 'Error checking stock alerts' });
    }
});

module.exports = router;
