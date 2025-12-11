const { runQuery } = require('./config/database');

async function resetAdmin() {
    try {
        await runQuery(`
            UPDATE users 
            SET login_attempts = 0, locked_until = NULL 
            WHERE username = 'admin'
        `);
        console.log('✅ Admin account reset successfully');
    } catch (error) {
        console.error('❌ Error resetting admin:', error);
    }
}

resetAdmin();