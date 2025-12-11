const { runQuery, getRow } = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * Reset the superadmin password to ensure it works for login
 */

async function resetSuperadminPassword() {
    try {
        console.log('🔄 Resetting superadmin password...');

        // Check if superadmin exists
        const superadmin = await getRow(
            'SELECT id, username FROM users WHERE username = ? AND role = ?',
            ['superadmin', 'superadmin']
        );

        if (!superadmin) {
            console.log('❌ Superadmin user not found');
            return;
        }

        console.log(`✅ Found superadmin user (ID: ${superadmin.id})`);

        // Hash the password
        const newPassword = 'superadmin123';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the password
        await runQuery(
            'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hashedPassword, superadmin.id]
        );

        console.log('✅ Superadmin password has been reset successfully!');
        console.log('');
        console.log('🔑 Updated Credentials:');
        console.log('   Username: superadmin');
        console.log('   Password: superadmin123');
        console.log('');
        console.log('🧪 Test the login:');
        console.log('   curl -X POST http://localhost:5000/api/auth/login \\');
        console.log('     -H "Content-Type: application/json" \\');
        console.log('     -d \'{"username":"superadmin","password":"superadmin123"}\'');

    } catch (error) {
        console.error('❌ Error resetting superadmin password:', error);
    }
}

// Run if called directly
if (require.main === module) {
    resetSuperadminPassword().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error(error);
        process.exit(1);
    });
}

module.exports = { resetSuperadminPassword };