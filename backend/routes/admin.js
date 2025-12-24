const express = require('express');
const router = express.Router();
const { resetVapeStoreDatabase } = require('../resetVapeStore');
const logger = require('../utils/logger');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Apply authentication to all admin routes
router.use(authenticateToken);
// Apply admin role check to all admin routes
router.use(requireAdmin);

// POST /api/admin/reset-database
// Resets the entire database to default seed data
// Requires confirmation string to prevent accidental resets
router.post('/reset-database', async (req, res) => {
    try {
        const { confirmReset } = req.body;

        if (confirmReset !== 'YES_RESET_ALL_DATA') {
            return res.status(400).json({
                message: 'Invalid confirmation token. Database reset aborted.'
            });
        }

        logger.info('ADMIN', '⚠️ DATABASE RESET INITIATED BY ADMIN ⚠️');

        await resetVapeStoreDatabase();

        logger.info('ADMIN', '✅ Database reset completed successfully');

        res.status(200).json({
            message: 'Database reset successfully. All data has been restored to default state.'
        });

    } catch (error) {
        logger.error('ADMIN', 'Database reset failed', error);
        res.status(500).json({
            message: 'Failed to reset database',
            error: error.message
        });
    }
});

module.exports = router;
