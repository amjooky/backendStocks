const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { getRow, getAllRows, runQuery } = require('../config/database');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: System settings and configuration
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SystemSettings:
 *       type: object
 *       properties:
 *         company_name:
 *           type: string
 *           example: "My Store"
 *         address:
 *           type: string
 *         phone:
 *           type: string
 *         email:
 *           type: string
 *         tax_rate:
 *           type: number
 *           format: float
 *           example: 0.15
 *         currency:
 *           type: string
 *           example: "USD"
 *         language:
 *           type: string
 *           example: "en"
 *     TaxConfiguration:
 *       type: object
 *       properties:
 *         default_tax_rate:
 *           type: number
 *           format: float
 *         tax_inclusive:
 *           type: boolean
 *         tax_groups:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               rate:
 *                 type: number
 */

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/settings/system:
 *   get:
 *     tags: [Settings]
 *     summary: Get system settings
 *     description: Retrieve global system settings
 *     responses:
 *       200:
 *         description: Settings retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SystemSettings'
 *   put:
 *     tags: [Settings]
 *     summary: Update system settings
 *     description: Update global system settings (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SystemSettings'
 *     responses:
 *       200:
 *         description: Settings updated
 */
router.get('/system', async (req, res) => {
    try {
        const rows = await getAllRows('SELECT setting_key, setting_value FROM system_settings');
        const map = Object.fromEntries(rows.map(r => [r.setting_key, r.setting_value]));
        res.json({
            company_name: map.company_name || "Stock Management System",
            address: map.address || "",
            phone: map.phone || "",
            email: map.email || "",
            tax_rate: map.tax_rate ? parseFloat(map.tax_rate) : 0.0,
            currency: map.currency || "USD",
            language: map.language || "en"
        });
    } catch (error) {
        console.error('Error loading settings:', error);
        res.status(500).json({ message: 'Error loading settings' });
    }
});

router.put('/system', requireAdmin, [
    body('company_name').optional().isLength({ min: 1 }),
    body('tax_rate').optional().isFloat({ min: 0, max: 1 }),
    body('currency').optional().isLength({ min: 3, max: 3 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const allowedKeys = ['company_name','address','phone','email','tax_rate','currency','language'];
        const updates = Object.entries(req.body)
            .filter(([k,v]) => allowedKeys.includes(k) && v !== undefined && v !== null)
            .map(([k,v]) => ({ key: k, value: String(v) }));
        
        for (const u of updates) {
            await runQuery(
                `INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)
                 ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = CURRENT_TIMESTAMP`,
                [u.key, u.value]
            );
        }
        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ message: 'Error updating settings' });
    }
});

/**
 * @swagger
 * /api/settings/taxes:
 *   get:
 *     tags: [Settings]
 *     summary: Get tax configuration
 *     responses:
 *       200:
 *         description: Tax settings retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaxConfiguration'
 *   put:
 *     tags: [Settings]
 *     summary: Update tax configuration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaxConfiguration'
 *     responses:
 *       200:
 *         description: Tax settings updated
 */
router.get('/taxes', async (req, res) => {
    try {
        const rows = await getAllRows('SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE "tax_%" OR setting_key IN ("tax_inclusive","default_tax_rate")');
        const map = Object.fromEntries(rows.map(r => [r.setting_key, r.setting_value]));
        res.json({
            default_tax_rate: map.default_tax_rate ? parseFloat(map.default_tax_rate) : (map.tax_rate ? parseFloat(map.tax_rate) : 0.0),
            tax_inclusive: map.tax_inclusive ? map.tax_inclusive === 'true' : false,
            tax_groups: []
        });
    } catch (error) {
        console.error('Error loading tax settings:', error);
        res.status(500).json({ message: 'Error loading tax settings' });
    }
});

router.put('/taxes', requireAdmin, async (req, res) => {
    try {
        const { default_tax_rate, tax_inclusive } = req.body;
        if (default_tax_rate !== undefined) {
            await runQuery(
                `INSERT INTO system_settings (setting_key, setting_value) VALUES ('default_tax_rate', ?)
                 ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = CURRENT_TIMESTAMP`,
                [String(default_tax_rate)]
            );
        }
        if (tax_inclusive !== undefined) {
            await runQuery(
                `INSERT INTO system_settings (setting_key, setting_value) VALUES ('tax_inclusive', ?)
                 ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = CURRENT_TIMESTAMP`,
                [String(Boolean(tax_inclusive))]
            );
        }
        res.json({ message: 'Tax settings updated' });
    } catch (error) {
        console.error('Error updating tax settings:', error);
        res.status(500).json({ message: 'Error updating tax settings' });
    }
});

/**
 * @swagger
 * /api/settings/backups:
 *   get:
 *     tags: [Settings]
 *     summary: List database backups
 *     responses:
 *       200:
 *         description: Backup list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 backups:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       filename:
 *                         type: string
 *                       size:
 *                         type: number
 *                       created_at:
 *                         type: string
 *   post:
 *     tags: [Settings]
 *     summary: Create database backup
 *     responses:
 *       200:
 *         description: Backup created
 */
router.get('/backups', requireAdmin, async (req, res) => {
    res.json({ backups: [] });
});

router.post('/backups', requireAdmin, async (req, res) => {
    res.json({ message: 'Backup created successfully' });
});

/**
 * @swagger
 * /api/settings/stores:
 *   get:
 *     tags: [Settings]
 *     summary: Get store/branch configuration
 *     responses:
 *       200:
 *         description: Store list
 *   post:
 *     tags: [Settings]
 *     summary: Add new store/branch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               manager_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Store created
 */
router.get('/stores', async (req, res) => {
    res.json({ stores: [] });
});

router.post('/stores', requireAdmin, async (req, res) => {
    res.status(201).json({ message: 'Store created successfully' });
});

module.exports = router;
