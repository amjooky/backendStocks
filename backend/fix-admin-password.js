const bcrypt = require('bcryptjs');
const { runQuery, getRow } = require('./config/database');

async function fixAdminPassword() {
    try {
        console.log('🔧 Fixing admin password...');
        
        // Hash the correct password
        const hashedPassword = await bcrypt.hash('admin123', 10);
        console.log('✅ Password hashed');
        
        // Update admin password
        await runQuery(`
            UPDATE users 
            SET password = ?, login_attempts = 0, locked_until = NULL
            WHERE username = 'admin'
        `, [hashedPassword]);
        
        console.log('✅ Admin password updated to: admin123');
        
        // Verify the update
        const user = await getRow('SELECT username, password FROM users WHERE username = ?', ['admin']);
        const isValid = await bcrypt.compare('admin123', user.password);
        
        console.log('✅ Password verification:', isValid ? 'SUCCESS' : 'FAILED');
        
        if (isValid) {
            console.log('🎉 Admin login should now work with admin/admin123');
        }
        
    } catch (error) {
        console.error('❌ Error fixing password:', error);
    }
}

fixAdminPassword();