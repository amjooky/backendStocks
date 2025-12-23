const express = require('express');
const { getAllRows, getRow } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Debug endpoint to check caisse session linking (no auth for debugging)
router.get('/session-sales', async (req, res) => {
    try {
        // Get all sessions with their sales
        const sessionsWithSales = await getAllRows(`
            SELECT 
                cs.*,
                COUNT(s.id) as linked_sales,
                COALESCE(SUM(s.total_amount), 0) as total_revenue
            FROM caisse_sessions cs
            LEFT JOIN sales s ON cs.id = s.caisse_session_id
            GROUP BY cs.id
            ORDER BY cs.opened_at DESC
        `);

        // Get sales without session ID
        const orphanSales = await getAllRows(`
            SELECT id, sale_number, total_amount, created_at
            FROM sales 
            WHERE caisse_session_id IS NULL
            ORDER BY created_at DESC
            LIMIT 10
        `);

        res.json({
            sessions_with_sales: sessionsWithSales,
            orphan_sales: orphanSales,
            debug_info: {
                message: 'This shows sessions with their linked sales and orphaned sales'
            }
        });
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Link orphaned sales to most recent active session (no auth for debugging)
router.post('/link-orphan-sales', async (req, res) => {
    try {
        const { runQuery } = require('../config/database');

        // Get the most recent active session (for any user since we're debugging)
        const activeSession = await getRow(`
            SELECT id FROM caisse_sessions 
            WHERE status = 'active'
            ORDER BY opened_at DESC
            LIMIT 1
        `);

        if (!activeSession) {
            return res.status(400).json({ message: 'No active session found' });
        }

        // Link recent orphaned sales to this session (sales from today)
        const today = new Date().toISOString().split('T')[0];
        const result = await runQuery(`
            UPDATE sales 
            SET caisse_session_id = ?
            WHERE caisse_session_id IS NULL 
            AND DATE(created_at) = ?
        `, [activeSession.id, today]);

        res.json({
            message: 'Orphaned sales linked to active session',
            session_id: activeSession.id,
            affected_rows: result.changes
        });
    } catch (error) {
        console.error('Link error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
