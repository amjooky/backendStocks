const express = require('express');
const router = express.Router();
const { resetVapeStoreDatabase } = require('../resetVapeStore');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Apply authentication to all admin routes
router.use(authenticateToken);
// Apply admin role check to all admin routes
router.use(requireAdmin);

/**
 * @swagger
 * /api/admin/reset-database:
 *   post:
 *     tags: [Admin]
 *     summary: Reset database to default state
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Database reset successful
 */
router.post('/reset-database', async (req, res) => {
    try {
        const { confirmReset } = req.body;

        if (confirmReset !== 'YES_RESET_ALL_DATA') {
            return res.status(400).json({
                message: 'Invalid confirmation token'
            });
        }

        console.log('🚀 Starting Database Reset via API...');
        await resetVapeStoreDatabase();

        res.status(200).json({
            message: 'Database reset successful. All data restored to default state.'
        });
    } catch (error) {
        console.error('Reset Error:', error);
        res.status(500).json({
            message: 'Database reset failed',
            error: error.message
        });
    }
});

module.exports = router;
