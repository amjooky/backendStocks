const { runQuery, getAllRows, getRow } = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * Seed test data for multi-tenant system
 * Creates agencies, users, and sample data for testing
 */

const seedTestData = async () => {
    try {
        console.log('🌱 Starting test data seeding...');

        // Check if we already have agencies
        const existingAgencies = await getRow('SELECT COUNT(*) as count FROM agencies');
        if (existingAgencies.count > 1) { // More than just the default agency
            console.log('⚠️  Test data already exists. Skipping seeding.');
            return;
        }

        // Create test agencies
        const agencies = [
            {
                name: 'VapeShop Milano',
                email: 'admin@vapeshop-milano.it',
                phone: '+39 02 1234567',
                address: 'Via Milano 123, 20100 Milano, Italy',
                city: 'Milano',
                subscription_plan: 'pro',
                max_users: 10,
                max_products: 500
            },
            {
                name: 'Tobacco Store Roma',
                email: 'manager@tobacco-roma.it',
                phone: '+39 06 9876543',
                address: 'Via Roma 456, 00100 Roma, Italy',
                city: 'Roma',
                subscription_plan: 'basic',
                max_users: 5,
                max_products: 200
            },
            {
                name: 'Premium Vapes Napoli',
                email: 'info@premiumvapes-napoli.it',
                phone: '+39 081 5555555',
                address: 'Via Napoli 789, 80100 Napoli, Italy',
                city: 'Napoli',
                subscription_plan: 'enterprise',
                max_users: 25,
                max_products: 1000
            }
        ];

        const agencyIds = [];
        for (const agency of agencies) {
            const result = await runQuery(`
                INSERT INTO agencies (
                    name, email, phone, address, city,
                    subscription_plan, max_users, max_products
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                agency.name,
                agency.email,
                agency.phone,
                agency.address,
                agency.city,
                agency.subscription_plan,
                agency.max_users,
                agency.max_products
            ]);
            agencyIds.push(result.id);
            console.log(`✅ Created agency: ${agency.name} (ID: ${result.id})`);
        }

        // Create test users for each agency
        const testUsers = [
            // Milano agency users
            {
                agency_id: agencyIds[0],
                username: 'milano_admin',
                email: 'admin@vapeshop-milano.it',
                password: 'admin123',
                first_name: 'Marco',
                last_name: 'Rossi',
                role: 'admin'
            },
            {
                agency_id: agencyIds[0],
                username: 'milano_manager',
                email: 'manager@vapeshop-milano.it',
                password: 'manager123',
                first_name: 'Lucia',
                last_name: 'Bianchi',
                role: 'manager'
            },
            {
                agency_id: agencyIds[0],
                username: 'milano_cashier',
                email: 'cashier@vapeshop-milano.it',
                password: 'cashier123',
                first_name: 'Giuseppe',
                last_name: 'Verde',
                role: 'cashier'
            },
            // Roma agency users
            {
                agency_id: agencyIds[1],
                username: 'roma_admin',
                email: 'admin@tobacco-roma.it',
                password: 'admin123',
                first_name: 'Anna',
                last_name: 'Ferrari',
                role: 'admin'
            },
            {
                agency_id: agencyIds[1],
                username: 'roma_cashier',
                email: 'cashier@tobacco-roma.it',
                password: 'cashier123',
                first_name: 'Paolo',
                last_name: 'Nero',
                role: 'cashier'
            },
            // Napoli agency users
            {
                agency_id: agencyIds[2],
                username: 'napoli_admin',
                email: 'admin@premiumvapes-napoli.it',
                password: 'admin123',
                first_name: 'Sofia',
                last_name: 'Marino',
                role: 'admin'
            },
            {
                agency_id: agencyIds[2],
                username: 'napoli_manager',
                email: 'manager@premiumvapes-napoli.it',
                password: 'manager123',
                first_name: 'Francesco',
                last_name: 'Giallo',
                role: 'manager'
            }
        ];

        for (const user of testUsers) {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            const result = await runQuery(`
                INSERT INTO users (
                    username, email, password, first_name, last_name, role, agency_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                user.username,
                user.email,
                hashedPassword,
                user.first_name,
                user.last_name,
                user.role,
                user.agency_id
            ]);
            console.log(`✅ Created user: ${user.username} (${user.role}) for agency ${user.agency_id}`);
        }

        // Create sample categories for each agency
        const categories = [
            { name: 'E-Liquids', description: 'Electronic cigarette liquids' },
            { name: 'Devices', description: 'Vaping devices and hardware' },
            { name: 'Accessories', description: 'Vaping accessories and parts' },
            { name: 'Tobacco', description: 'Traditional tobacco products' },
            { name: 'Papers', description: 'Rolling papers and filters' }
        ];

        for (const agencyId of agencyIds) {
            for (const category of categories) {
                await runQuery(`
                    INSERT INTO categories (name, description, agency_id)
                    VALUES (?, ?, ?)
                `, [category.name, category.description, agencyId]);
            }
            console.log(`✅ Created categories for agency ${agencyId}`);
        }

        // Create sample suppliers for each agency
        const suppliers = [
            {
                name: 'Italian Vapes Distributor',
                contact_person: 'Mario Distributore',
                email: 'sales@italianvapes.it',
                phone: '+39 02 1111111',
                address: 'Via Distribuzione 1, Milano'
            },
            {
                name: 'European Tobacco Supply',
                contact_person: 'Hans Supplier',
                email: 'orders@eurpotobacco.com',
                phone: '+49 30 2222222',
                address: 'Hauptstraße 123, Berlin'
            },
            {
                name: 'Premium E-Juice Co.',
                contact_person: 'John Smith',
                email: 'wholesale@premiumejuice.com',
                phone: '+1 555 3333333',
                address: '123 Main St, Los Angeles, CA'
            }
        ];

        for (const agencyId of agencyIds) {
            for (const supplier of suppliers) {
                await runQuery(`
                    INSERT INTO suppliers (
                        name, contact_person, email, phone, address, agency_id
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    supplier.name,
                    supplier.contact_person,
                    supplier.email,
                    supplier.phone,
                    supplier.address,
                    agencyId
                ]);
            }
            console.log(`✅ Created suppliers for agency ${agencyId}`);
        }

        // Create sample customers for each agency
        const customers = [
            {
                name: 'Giovanni Cliente',
                email: 'giovanni@email.it',
                phone: '+39 333 1111111',
                address: 'Via Cliente 1, Milano'
            },
            {
                name: 'Maria Consumatrice',
                email: 'maria@email.it',
                phone: '+39 333 2222222',
                address: 'Via Consumo 2, Roma'
            },
            {
                name: 'Luca Acquirente',
                email: 'luca@email.it',
                phone: '+39 333 3333333',
                address: 'Via Acquisto 3, Napoli'
            }
        ];

        for (const agencyId of agencyIds) {
            for (const customer of customers) {
                await runQuery(`
                    INSERT INTO customers (name, email, phone, address, agency_id)
                    VALUES (?, ?, ?, ?, ?)
                `, [customer.name, customer.email, customer.phone, customer.address, agencyId]);
            }
            console.log(`✅ Created customers for agency ${agencyId}`);
        }

        // Create sample products for each agency
        for (const agencyId of agencyIds) {
            const categoryResults = await getAllRows('SELECT id FROM categories WHERE agency_id = ?', [agencyId]);
            const supplierResults = await getAllRows('SELECT id FROM suppliers WHERE agency_id = ?', [agencyId]);
            
            if (categoryResults.length > 0 && supplierResults.length > 0) {
                const products = [
                    {
                        name: 'Premium E-Liquid Strawberry',
                        description: 'High quality strawberry flavored e-liquid',
                        sku: `ELIQ-STR-${agencyId}`,
                        barcode: `123456789${agencyId}01`,
                        category_id: categoryResults[0].id,
                        supplier_id: supplierResults[0].id,
                        cost_price: 8.50,
                        selling_price: 15.00,
                        min_stock_level: 10,
                        initial_stock: 50
                    },
                    {
                        name: 'Starter Vape Kit',
                        description: 'Complete starter kit for beginners',
                        sku: `KIT-START-${agencyId}`,
                        barcode: `123456789${agencyId}02`,
                        category_id: categoryResults[1].id,
                        supplier_id: supplierResults[1].id,
                        cost_price: 25.00,
                        selling_price: 45.00,
                        min_stock_level: 5,
                        initial_stock: 25
                    },
                    {
                        name: 'Replacement Coils (5 pack)',
                        description: 'Pack of 5 replacement coils',
                        sku: `COIL-5PK-${agencyId}`,
                        barcode: `123456789${agencyId}03`,
                        category_id: categoryResults[2].id,
                        supplier_id: supplierResults[0].id,
                        cost_price: 12.00,
                        selling_price: 20.00,
                        min_stock_level: 20,
                        initial_stock: 100
                    }
                ];

                for (const product of products) {
                    // Create product
                    const productResult = await runQuery(`
                        INSERT INTO products (
                            name, description, sku, barcode, category_id, supplier_id,
                            cost_price, selling_price, min_stock_level, agency_id
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        product.name,
                        product.description,
                        product.sku,
                        product.barcode,
                        product.category_id,
                        product.supplier_id,
                        product.cost_price,
                        product.selling_price,
                        product.min_stock_level,
                        agencyId
                    ]);
                    
                    // Create inventory record
                    await runQuery(`
                        INSERT INTO inventory (product_id, quantity, last_updated, agency_id)
                        VALUES (?, ?, CURRENT_TIMESTAMP, ?)
                    `, [productResult.id, product.initial_stock, agencyId]);
                    
                    // Create initial stock movement
                    await runQuery(`
                        INSERT INTO stock_movements (
                            product_id, movement_type, quantity, reason, notes, agency_id
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    `, [productResult.id, 'in', product.initial_stock, 'initial_stock', 'Initial inventory setup', agencyId]);
                }
                console.log(`✅ Created products for agency ${agencyId}`);
            }
        }

        console.log('\n🎉 Test data seeding completed successfully!');
        console.log('\n📋 Test Accounts Created:');
        console.log('=====================================');
        
        // Superadmin account info
        console.log('🔑 SUPERADMIN:');
        console.log('   Username: superadmin');
        console.log('   Password: superadmin123');
        console.log('   Access: All agencies and system management');
        console.log('');

        // Agency accounts
        const agencyUsers = [
            { agency: 'VapeShop Milano', users: ['milano_admin/admin123', 'milano_manager/manager123', 'milano_cashier/cashier123'] },
            { agency: 'Tobacco Store Roma', users: ['roma_admin/admin123', 'roma_cashier/cashier123'] },
            { agency: 'Premium Vapes Napoli', users: ['napoli_admin/admin123', 'napoli_manager/manager123'] }
        ];

        agencyUsers.forEach((agency, index) => {
            console.log(`🏢 ${agency.agency.toUpperCase()} (ID: ${agencyIds[index]}):`);
            agency.users.forEach(userInfo => {
                const [username, password] = userInfo.split('/');
                console.log(`   Username: ${username} | Password: ${password}`);
            });
            console.log('');
        });

        console.log('🌐 API Endpoints:');
        console.log('   Base URL: http://localhost:5000/api');
        console.log('   Superadmin: /api/superadmin/*');
        console.log('   Auth: /api/auth/login');
        console.log('   Documentation: http://localhost:5000/api-docs');
        console.log('');

    } catch (error) {
        console.error('❌ Error seeding test data:', error);
        throw error;
    }
};

// Run if called directly
if (require.main === module) {
    seedTestData().then(() => {
        console.log('✅ Test data seeding script completed');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Test data seeding failed:', error);
        process.exit(1);
    });
}

module.exports = { seedTestData };