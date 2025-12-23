const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { runQuery, getAllRows, getRow, runTransaction } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Caisse
 *   description: Cash register session management
 */

/**
 * @swagger
 * /api/caisse/sessions:
 *   get:
 *     tags: [Caisse]
 *     summary: Get user's caisse sessions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of caisse sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   session_name:
 *                     type: string
 *                   status:
 *                     type: string
 *                     enum: [active, closed]
 *                   opening_amount:
 *                     type: number
 *                   current_amount:
 *                     type: number
 *                   opened_at:
 *                     type: string
 *                     format: date-time
 */

// Get user's caisse sessions
router.get('/sessions', async (req, res) => {
    try {
        const userId = req.user.id;
        
        const sessions = await getAllRows(`
            SELECT 
                cs.*,
                (SELECT COUNT(*) FROM sales WHERE caisse_session_id = cs.id) as total_sales,
                (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE caisse_session_id = cs.id) as total_revenue
            FROM caisse_sessions cs
            WHERE cs.user_id = ?
            ORDER BY cs.opened_at DESC
        `, [userId]);

        res.json(sessions);
    } catch (error) {
        console.error('Error fetching caisse sessions:', error);
        res.status(500).json({ message: 'Error fetching caisse sessions' });
    }
});

/**
 * @swagger
 * /api/caisse/sessions:
 *   post:
 *     tags: [Caisse]
 *     summary: Create new caisse session
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionName
 *               - openingAmount
 *             properties:
 *               sessionName:
 *                 type: string
 *                 example: "Caisse Matin - Jean"
 *               openingAmount:
 *                 type: number
 *                 example: 500.00
 *               description:
 *                 type: string
 *                 example: "Session du matin"
 */

// Create new caisse session
router.post('/sessions', [
    body('sessionName').notEmpty().withMessage('Session name is required'),
    body('openingAmount').isFloat({ min: 0 }).withMessage('Opening amount must be non-negative'),
    body('description').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const userId = req.user.id;
        const { sessionName, openingAmount, description } = req.body;

        // Check if user has an active session
        const activeSession = await getRow(
            'SELECT id FROM caisse_sessions WHERE user_id = ? AND status = "active"',
            [userId]
        );

        if (activeSession) {
            return res.status(400).json({ 
                message: 'You already have an active caisse session. Please close it before opening a new one.' 
            });
        }

        // Create new session
        const sessionId = uuidv4();
        const result = await runQuery(`
            INSERT INTO caisse_sessions (
                id, user_id, session_name, opening_amount, current_amount, 
                status, description, opened_at, created_at
            ) VALUES (?, ?, ?, ?, ?, 'active', ?, datetime('now'), datetime('now'))
        `, [sessionId, userId, sessionName, openingAmount, openingAmount, description]);

        const newSession = await getRow(
            'SELECT * FROM caisse_sessions WHERE id = ?',
            [sessionId]
        );

        res.status(201).json({
            message: 'Caisse session created successfully',
            session: newSession
        });

    } catch (error) {
        console.error('Error creating caisse session:', error);
        res.status(500).json({ message: 'Error creating caisse session' });
    }
});

/**
 * @swagger
 * /api/caisse/sessions/{id}/close:
 *   put:
 *     tags: [Caisse]
 *     summary: Close caisse session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - closingAmount
 *             properties:
 *               closingAmount:
 *                 type: number
 *               notes:
 *                 type: string
 */

// Close caisse session
router.put('/sessions/:id/close', [
    body('closingAmount').isFloat({ min: 0 }).withMessage('Closing amount must be non-negative'),
    body('notes').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const userId = req.user.id;
        const sessionId = req.params.id;
        const { closingAmount, notes } = req.body;

        // Check if session exists and belongs to user
        const session = await getRow(
            'SELECT * FROM caisse_sessions WHERE id = ? AND user_id = ? AND status = "active"',
            [sessionId, userId]
        );

        if (!session) {
            return res.status(404).json({ message: 'Active session not found' });
        }

        // Calculate session summary
        const salesSummary = await getRow(`
            SELECT 
                COUNT(*) as total_transactions,
                COALESCE(SUM(total_amount), 0) as total_sales,
                COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_sales,
                COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END), 0) as card_sales,
                COALESCE(SUM(CASE WHEN payment_method = 'mobile' THEN total_amount ELSE 0 END), 0) as mobile_sales
            FROM sales 
            WHERE caisse_session_id = ?
        `, [sessionId]);

        const expectedCashAmount = parseFloat(session.opening_amount) + parseFloat(salesSummary.cash_sales);
        const difference = parseFloat(closingAmount) - expectedCashAmount;

        // Close session
        await runQuery(`
            UPDATE caisse_sessions 
            SET 
                status = 'closed',
                closing_amount = ?,
                expected_amount = ?,
                difference = ?,
                closing_notes = ?,
                closed_at = datetime('now')
            WHERE id = ?
        `, [closingAmount, expectedCashAmount, difference, notes, sessionId]);

        // Get updated session
        const closedSession = await getRow(
            'SELECT * FROM caisse_sessions WHERE id = ?',
            [sessionId]
        );

        res.json({
            message: 'Caisse session closed successfully',
            session: closedSession,
            summary: {
                ...salesSummary,
                expected_cash: expectedCashAmount,
                actual_cash: closingAmount,
                difference: difference
            }
        });

    } catch (error) {
        console.error('Error closing caisse session:', error);
        res.status(500).json({ message: 'Error closing caisse session' });
    }
});

// Get active session for current user
router.get('/active-session', async (req, res) => {
    try {
        const userId = req.user.id;
        
        const session = await getRow(`
            SELECT 
                cs.*,
                u.username,
                u.first_name,
                u.last_name
            FROM caisse_sessions cs
            JOIN users u ON cs.user_id = u.id
            WHERE cs.user_id = ? AND cs.status = 'active'
        `, [userId]);

        if (!session) {
            return res.status(404).json({ message: 'No active session found' });
        }

        // Get session statistics
        const stats = await getRow(`
            SELECT 
                COUNT(*) as transactions_count,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_revenue
            FROM sales 
            WHERE caisse_session_id = ?
        `, [session.id]);

        res.json({
            ...session,
            statistics: stats
        });

    } catch (error) {
        console.error('Error fetching active session:', error);
        res.status(500).json({ message: 'Error fetching active session' });
    }
});

// Get session details with sales
router.get('/sessions/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const sessionId = req.params.id;

        // Check if session belongs to user or user is admin/manager
        let whereClause = 'WHERE cs.id = ?';
        let params = [sessionId];

        if (req.user.role === 'cashier') {
            whereClause += ' AND cs.user_id = ?';
            params.push(userId);
        }

        const session = await getRow(`
            SELECT 
                cs.*,
                u.username,
                u.first_name,
                u.last_name
            FROM caisse_sessions cs
            JOIN users u ON cs.user_id = u.id
            ${whereClause}
        `, params);

        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        // Get sales for this session
        const sales = await getAllRows(`
            SELECT 
                s.*,
                c.first_name as customer_first_name,
                c.last_name as customer_last_name
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            WHERE s.caisse_session_id = ?
            ORDER BY s.created_at DESC
        `, [sessionId]);

        // Get session summary
        const summary = await getRow(`
            SELECT 
                COUNT(*) as total_transactions,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_revenue,
                COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END), 0) as card_revenue,
                COALESCE(SUM(CASE WHEN payment_method = 'mobile' THEN total_amount ELSE 0 END), 0) as mobile_revenue,
                COALESCE(AVG(total_amount), 0) as average_transaction
            FROM sales 
            WHERE caisse_session_id = ?
        `, [sessionId]);

        res.json({
            session,
            sales,
            summary
        });

    } catch (error) {
        console.error('Error fetching session details:', error);
        res.status(500).json({ message: 'Error fetching session details' });
    }
});

module.exports = router;
