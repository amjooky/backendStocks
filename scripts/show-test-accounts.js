const { getAllRows, getRow } = require('../config/database');

/**
 * Display current test accounts and agencies in the system
 */

async function showTestAccounts() {
    try {
        console.log('🔍 Current Test Accounts and Agencies\n');
        console.log('=====================================\n');

        // Get agencies
        const agencies = await getAllRows(`
            SELECT id, name, email, subscription_plan, is_active, created_at
            FROM agencies 
            ORDER BY id
        `);

        if (agencies.length === 0) {
            console.log('⚠️  No agencies found in the database.\n');
            return;
        }

        console.log('🏢 AGENCIES:');
        agencies.forEach(agency => {
            const status = agency.is_active ? '✅' : '❌';
            console.log(`   ${status} ${agency.name} (ID: ${agency.id})`);
            console.log(`      Email: ${agency.email}`);
            console.log(`      Plan: ${agency.subscription_plan}`);
            console.log(`      Created: ${agency.created_at}`);
            console.log('');
        });

        // Get users by agency
        const users = await getAllRows(`
            SELECT 
                u.id, u.username, u.first_name, u.last_name, u.role, 
                u.is_active, u.agency_id, a.name as agency_name
            FROM users u
            LEFT JOIN agencies a ON u.agency_id = a.id
            ORDER BY u.agency_id, u.role DESC, u.username
        `);

        console.log('👥 USERS:');
        
        // Superadmin users (agency_id is null)
        const superadmins = users.filter(u => u.role === 'superadmin');
        if (superadmins.length > 0) {
            console.log('   🔑 SUPERADMINS:');
            superadmins.forEach(user => {
                const status = user.is_active ? '✅' : '❌';
                console.log(`      ${status} ${user.username} (${user.first_name} ${user.last_name})`);
                console.log(`         Role: ${user.role} | ID: ${user.id}`);
                console.log(`         Password: superadmin123 (default)`);
            });
            console.log('');
        }

        // Regular users by agency
        const regularUsers = users.filter(u => u.agency_id);
        const groupedUsers = {};
        regularUsers.forEach(user => {
            if (!groupedUsers[user.agency_id]) {
                groupedUsers[user.agency_id] = [];
            }
            groupedUsers[user.agency_id].push(user);
        });

        Object.keys(groupedUsers).forEach(agencyId => {
            const agencyUsers = groupedUsers[agencyId];
            const agencyName = agencyUsers[0].agency_name;
            
            console.log(`   🏢 ${agencyName.toUpperCase()} (Agency ID: ${agencyId}):`);
            agencyUsers.forEach(user => {
                const status = user.is_active ? '✅' : '❌';
                console.log(`      ${status} ${user.username} (${user.first_name} ${user.last_name})`);
                console.log(`         Role: ${user.role} | ID: ${user.id}`);
                
                // Provide default passwords for test accounts
                let defaultPassword = 'unknown';
                if (user.role === 'admin') defaultPassword = 'admin123';
                else if (user.role === 'manager') defaultPassword = 'manager123';
                else if (user.role === 'cashier') defaultPassword = 'cashier123';
                
                console.log(`         Password: ${defaultPassword} (default)`);
            });
            console.log('');
        });

        // Show sample data counts
        console.log('📊 DATA OVERVIEW:');
        const stats = await getRow(`
            SELECT 
                (SELECT COUNT(*) FROM agencies WHERE is_active = 1) as active_agencies,
                (SELECT COUNT(*) FROM users WHERE is_active = 1) as active_users,
                (SELECT COUNT(*) FROM products WHERE is_active = 1) as active_products,
                (SELECT COUNT(*) FROM categories WHERE 1=1) as categories,
                (SELECT COUNT(*) FROM suppliers WHERE is_active = 1) as suppliers,
                (SELECT COUNT(*) FROM customers WHERE is_active = 1) as customers
        `);

        console.log(`   Active Agencies: ${stats.active_agencies}`);
        console.log(`   Active Users: ${stats.active_users}`);
        console.log(`   Products: ${stats.active_products}`);
        console.log(`   Categories: ${stats.categories}`);
        console.log(`   Suppliers: ${stats.suppliers}`);
        console.log(`   Customers: ${stats.customers}`);
        console.log('');

        console.log('🌐 API ENDPOINTS:');
        console.log('   Base URL: http://localhost:5000/api');
        console.log('   Login: POST /api/auth/login');
        console.log('   Superadmin: GET /api/superadmin/agencies');
        console.log('   Documentation: http://localhost:5000/api-docs');
        console.log('   Health Check: http://localhost:5000/health');
        console.log('');

        console.log('🧪 TESTING SUGGESTIONS:');
        console.log('   1. Login as superadmin to access system management');
        console.log('   2. Login as agency admin to test regular features');
        console.log('   3. Test data isolation between agencies');
        console.log('   4. Test role-based access control');
        console.log('');

    } catch (error) {
        console.error('❌ Error retrieving test accounts:', error);
    }
}

// Run if called directly
if (require.main === module) {
    showTestAccounts().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error(error);
        process.exit(1);
    });
}

module.exports = { showTestAccounts };