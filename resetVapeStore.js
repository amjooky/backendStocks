const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'stock_management.db');
const db = new sqlite3.Database(dbPath);

// Enable WAL mode for better concurrency
db.run('PRAGMA journal_mode=WAL');
db.run('PRAGMA synchronous=NORMAL');

console.log('🔄 Starting vape store database reset...');

// First, let's see what tables we have
function examineDatabase() {
    return new Promise((resolve) => {
        db.all(`SELECT name FROM sqlite_master WHERE type='table'`, (err, tables) => {
            if (err) {
                console.error('❌ Error getting tables:', err);
                return resolve();
            }
            
            console.log('📋 Current tables:');
            tables.forEach(table => console.log('  -', table.name));
            
            // Count records in main tables
            const promises = tables
                .filter(t => !t.name.startsWith('sqlite_'))
                .map(table => {
                    return new Promise((resolveCount) => {
                        db.get(`SELECT COUNT(*) as count FROM ${table.name}`, (err, result) => {
                            if (!err) {
                                console.log(`  📊 ${table.name}: ${result.count} records`);
                            }
                            resolveCount();
                        });
                    });
                });
            
            Promise.all(promises).then(() => resolve());
        });
    });
}

// Clear all product-related data but preserve users and settings
function clearProductData() {
    return new Promise((resolve) => {
        console.log('🧹 Clearing existing product data...');
        
        db.serialize(() => {
            // Clear tables in proper order (respecting foreign keys)
            db.run('DELETE FROM stock_movements');
            db.run('DELETE FROM sale_items');
            db.run('DELETE FROM sales');
            db.run('DELETE FROM promotion_products');
            db.run('DELETE FROM promotions');
            db.run('DELETE FROM inventory');
            db.run('DELETE FROM products');
            db.run('DELETE FROM categories');
            db.run('DELETE FROM suppliers');
            db.run('DELETE FROM caisse_sessions');
            
            // Reset auto-increment counters
            db.run('DELETE FROM sqlite_sequence WHERE name IN ("products", "categories", "suppliers", "inventory", "sales", "promotions")');
            
            console.log('✅ Product data cleared successfully');
            resolve();
        });
    });
}

// Create vape store categories
const vapeCategories = [
    {
        name: 'E-Liquids',
        description: 'Vape juices and e-liquids in various flavors and nicotine strengths'
    },
    {
        name: 'Devices',
        description: 'Vaping devices including mods, pods, and starter kits'
    },
    {
        name: 'Coils & Atomizers',
        description: 'Replacement coils, atomizers, and tank components'
    },
    {
        name: 'Batteries',
        description: 'Rechargeable batteries and charging accessories'
    },
    {
        name: 'Accessories',
        description: 'Drip tips, cases, stands, and other vaping accessories'
    },
    {
        name: 'DIY Supplies',
        description: 'Base liquids, flavor concentrates, and mixing supplies'
    },
    {
        name: 'CBD Products',
        description: 'CBD vape oils and cartridges'
    }
];

function createCategories() {
    return new Promise((resolve) => {
        console.log('📂 Creating vape store categories...');
        
        const categoryIds = {};
        let completed = 0;
        
        vapeCategories.forEach((category, index) => {
            db.run(
                'INSERT INTO categories (name, description) VALUES (?, ?)',
                [category.name, category.description],
                function(err) {
                    if (err) {
                        console.error('❌ Error creating category:', category.name, err);
                    } else {
                        categoryIds[category.name] = this.lastID;
                        console.log(`✅ Created category: ${category.name} (ID: ${this.lastID})`);
                    }
                    
                    completed++;
                    if (completed === vapeCategories.length) {
                        resolve(categoryIds);
                    }
                }
            );
        });
    });
}

// Create suppliers for vape store
const vapeSuppliers = [
    {
        name: 'VapeWholesale Co.',
        contact_name: 'Mike Johnson',
        email: 'orders@vapewholesale.com',
        phone: '+1-555-0101',
        address: '123 Vape Street, Smoke City, SC 12345'
    },
    {
        name: 'Premium Liquids Ltd',
        contact_name: 'Sarah Wilson',
        email: 'sales@premiumliquids.com',
        phone: '+1-555-0102',
        address: '456 Flavor Ave, Taste Town, TT 67890'
    },
    {
        name: 'Hardware Direct',
        contact_name: 'Alex Chen',
        email: 'orders@hardwaredirect.com',
        phone: '+1-555-0103',
        address: '789 Device Drive, Mod City, MC 11223'
    }
];

function createSuppliers() {
    return new Promise((resolve) => {
        console.log('🏭 Creating vape store suppliers...');
        
        const supplierIds = {};
        let completed = 0;
        
        vapeSuppliers.forEach((supplier) => {
            db.run(
                'INSERT INTO suppliers (name, contact_person, email, phone, address) VALUES (?, ?, ?, ?, ?)',
                [supplier.name, supplier.contact_name, supplier.email, supplier.phone, supplier.address],
                function(err) {
                    if (err) {
                        console.error('❌ Error creating supplier:', supplier.name, err);
                    } else {
                        supplierIds[supplier.name] = this.lastID;
                        console.log(`✅ Created supplier: ${supplier.name} (ID: ${this.lastID})`);
                    }
                    
                    completed++;
                    if (completed === vapeSuppliers.length) {
                        resolve(supplierIds);
                    }
                }
            );
        });
    });
}

// Create comprehensive vape store products
function createVapeProducts(categoryIds, supplierIds) {
    return new Promise((resolve) => {
        console.log('🛍️ Creating vape store products...');
        
        const products = [
            // E-Liquids
            { name: 'Strawberry Cream 12mg', sku: 'EL-SC-12', barcode: '1001001001', category: 'E-Liquids', supplier: 'Premium Liquids Ltd', price: 15.99, cost: 8.00, stock: 50 },
            { name: 'Blue Razz 6mg', sku: 'EL-BR-06', barcode: '1001001002', category: 'E-Liquids', supplier: 'Premium Liquids Ltd', price: 15.99, cost: 8.00, stock: 45 },
            { name: 'Mint Chocolate 18mg', sku: 'EL-MC-18', barcode: '1001001003', category: 'E-Liquids', supplier: 'Premium Liquids Ltd', price: 16.99, cost: 8.50, stock: 35 },
            { name: 'Vanilla Custard 3mg', sku: 'EL-VC-03', barcode: '1001001004', category: 'E-Liquids', supplier: 'Premium Liquids Ltd', price: 17.99, cost: 9.00, stock: 40 },
            { name: 'Tropical Punch 0mg', sku: 'EL-TP-00', barcode: '1001001005', category: 'E-Liquids', supplier: 'Premium Liquids Ltd', price: 14.99, cost: 7.50, stock: 55 },
            { name: 'Apple Pie 12mg', sku: 'EL-AP-12', barcode: '1001001006', category: 'E-Liquids', supplier: 'Premium Liquids Ltd', price: 16.99, cost: 8.50, stock: 30 },
            { name: 'Menthol Ice 18mg', sku: 'EL-MI-18', barcode: '1001001007', category: 'E-Liquids', supplier: 'Premium Liquids Ltd', price: 15.99, cost: 8.00, stock: 60 },
            { name: 'Caramel Latte 6mg', sku: 'EL-CL-06', barcode: '1001001008', category: 'E-Liquids', supplier: 'Premium Liquids Ltd', price: 17.99, cost: 9.00, stock: 25 },
            
            // Devices
            { name: 'VapeMaster Pro Kit', sku: 'DEV-VMP-001', barcode: '2002002001', category: 'Devices', supplier: 'Hardware Direct', price: 89.99, cost: 45.00, stock: 15 },
            { name: 'PodMax Mini', sku: 'DEV-PMM-001', barcode: '2002002002', category: 'Devices', supplier: 'Hardware Direct', price: 39.99, cost: 20.00, stock: 25 },
            { name: 'CloudChaser Mod', sku: 'DEV-CCM-001', barcode: '2002002003', category: 'Devices', supplier: 'VapeWholesale Co.', price: 129.99, cost: 65.00, stock: 12 },
            { name: 'Stealth Pod System', sku: 'DEV-SPS-001', barcode: '2002002004', category: 'Devices', supplier: 'Hardware Direct', price: 29.99, cost: 15.00, stock: 35 },
            { name: 'Variable Wattage Mod', sku: 'DEV-VWM-001', barcode: '2002002005', category: 'Devices', supplier: 'VapeWholesale Co.', price: 79.99, cost: 40.00, stock: 18 },
            { name: 'Beginner Starter Kit', sku: 'DEV-BSK-001', barcode: '2002002006', category: 'Devices', supplier: 'Hardware Direct', price: 24.99, cost: 12.50, stock: 40 },
            
            // Coils & Atomizers
            { name: '0.4Ω Mesh Coil (5pk)', sku: 'COIL-04-5PK', barcode: '3003003001', category: 'Coils & Atomizers', supplier: 'VapeWholesale Co.', price: 19.99, cost: 10.00, stock: 80 },
            { name: '0.6Ω Regular Coil (5pk)', sku: 'COIL-06-5PK', barcode: '3003003002', category: 'Coils & Atomizers', supplier: 'VapeWholesale Co.', price: 17.99, cost: 9.00, stock: 75 },
            { name: '1.2Ω MTL Coil (5pk)', sku: 'COIL-12-5PK', barcode: '3003003003', category: 'Coils & Atomizers', supplier: 'Hardware Direct', price: 16.99, cost: 8.50, stock: 65 },
            { name: 'Sub-Ohm Tank', sku: 'TANK-SOT-001', barcode: '3003003004', category: 'Coils & Atomizers', supplier: 'Hardware Direct', price: 34.99, cost: 17.50, stock: 20 },
            { name: 'RDA Rebuildable', sku: 'RDA-RB-001', barcode: '3003003005', category: 'Coils & Atomizers', supplier: 'VapeWholesale Co.', price: 49.99, cost: 25.00, stock: 15 },
            
            // Batteries
            { name: '18650 Battery 3000mAh', sku: 'BAT-18650-3K', barcode: '4004004001', category: 'Batteries', supplier: 'Hardware Direct', price: 12.99, cost: 6.50, stock: 100 },
            { name: '21700 Battery 4000mAh', sku: 'BAT-21700-4K', barcode: '4004004002', category: 'Batteries', supplier: 'Hardware Direct', price: 15.99, cost: 8.00, stock: 80 },
            { name: 'USB-C Charger', sku: 'CHG-USBC-001', barcode: '4004004003', category: 'Batteries', supplier: 'VapeWholesale Co.', price: 19.99, cost: 10.00, stock: 45 },
            { name: 'Dual Bay Charger', sku: 'CHG-DUAL-001', barcode: '4004004004', category: 'Batteries', supplier: 'Hardware Direct', price: 29.99, cost: 15.00, stock: 30 },
            { name: 'Portable Power Bank', sku: 'PWR-PORT-001', barcode: '4004004005', category: 'Batteries', supplier: 'VapeWholesale Co.', price: 39.99, cost: 20.00, stock: 20 },
            
            // Accessories
            { name: 'Delrin Drip Tip', sku: 'ACC-DT-DEL', barcode: '5005005001', category: 'Accessories', supplier: 'VapeWholesale Co.', price: 8.99, cost: 4.50, stock: 150 },
            { name: 'Stainless Steel Drip Tip', sku: 'ACC-DT-SS', barcode: '5005005002', category: 'Accessories', supplier: 'VapeWholesale Co.', price: 12.99, cost: 6.50, stock: 120 },
            { name: 'Vape Stand (4-slot)', sku: 'ACC-VS-4SL', barcode: '5005005003', category: 'Accessories', supplier: 'Hardware Direct', price: 24.99, cost: 12.50, stock: 25 },
            { name: 'Carrying Case', sku: 'ACC-CC-001', barcode: '5005005004', category: 'Accessories', supplier: 'Hardware Direct', price: 19.99, cost: 10.00, stock: 35 },
            { name: 'Cleaning Kit', sku: 'ACC-CK-001', barcode: '5005005005', category: 'Accessories', supplier: 'VapeWholesale Co.', price: 14.99, cost: 7.50, stock: 50 },
            
            // DIY Supplies
            { name: 'VG Base (500ml)', sku: 'DIY-VG-500', barcode: '6006006001', category: 'DIY Supplies', supplier: 'Premium Liquids Ltd', price: 19.99, cost: 10.00, stock: 30 },
            { name: 'PG Base (500ml)', sku: 'DIY-PG-500', barcode: '6006006002', category: 'DIY Supplies', supplier: 'Premium Liquids Ltd', price: 17.99, cost: 9.00, stock: 35 },
            { name: 'Nicotine Base 100mg', sku: 'DIY-NIC-100', barcode: '6006006003', category: 'DIY Supplies', supplier: 'Premium Liquids Ltd', price: 29.99, cost: 15.00, stock: 20 },
            { name: 'Flavor Concentrate - Strawberry', sku: 'DIY-FC-STR', barcode: '6006006004', category: 'DIY Supplies', supplier: 'Premium Liquids Ltd', price: 12.99, cost: 6.50, stock: 40 },
            { name: 'Empty Bottles (10pk)', sku: 'DIY-EB-10PK', barcode: '6006006005', category: 'DIY Supplies', supplier: 'VapeWholesale Co.', price: 9.99, cost: 5.00, stock: 60 },
            
            // CBD Products
            { name: 'CBD Vape Oil 500mg', sku: 'CBD-VO-500', barcode: '7007007001', category: 'CBD Products', supplier: 'Premium Liquids Ltd', price: 49.99, cost: 25.00, stock: 25 },
            { name: 'CBD Vape Oil 1000mg', sku: 'CBD-VO-1000', barcode: '7007007002', category: 'CBD Products', supplier: 'Premium Liquids Ltd', price: 79.99, cost: 40.00, stock: 18 },
            { name: 'CBD Cartridge 250mg', sku: 'CBD-CART-250', barcode: '7007007003', category: 'CBD Products', supplier: 'Premium Liquids Ltd', price: 29.99, cost: 15.00, stock: 30 },
            { name: 'Full Spectrum CBD Oil', sku: 'CBD-FS-001', barcode: '7007007004', category: 'CBD Products', supplier: 'Premium Liquids Ltd', price: 69.99, cost: 35.00, stock: 15 }
        ];
        
        let completed = 0;
        const productIds = [];
        
        products.forEach((product) => {
            const categoryId = categoryIds[product.category];
            const supplierId = supplierIds[product.supplier];
            
            db.run(
                `INSERT INTO products (name, description, sku, barcode, category_id, supplier_id, selling_price, cost_price, min_stock_level, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                [
                    product.name,
                    `High-quality ${product.name.toLowerCase()} for vaping enthusiasts`,
                    product.sku,
                    product.barcode,
                    categoryId,
                    supplierId,
                    product.price,
                    product.cost,
                    10 // min stock level
                ],
                function(err) {
                    if (err) {
                        console.error('❌ Error creating product:', product.name, err);
                    } else {
                        productIds.push(this.lastID);
                        console.log(`✅ Created product: ${product.name} (ID: ${this.lastID})`);
                        
                        // Create inventory record
                        db.run(
                            `INSERT INTO inventory (product_id, current_stock, reserved_stock, last_updated)
                             VALUES (?, ?, 0, datetime('now'))`,
                            [this.lastID, product.stock]
                        );
                    }
                    
                    completed++;
                    if (completed === products.length) {
                        resolve(productIds);
                    }
                }
            );
        });
    });
}

// Create some sample promotions for the vape store
function createPromotions(productIds) {
    return new Promise((resolve) => {
        console.log('🎯 Creating vape store promotions...');
        
        const promotions = [
            {
                name: 'Buy 3 E-Liquids Get 1 Free',
                description: 'Mix and match any e-liquids',
                type: 'buy_x_get_y',
                value: 1,
                min_quantity: 3,
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days
            },
            {
                name: '15% Off All Devices',
                description: 'Save on all vaping devices',
                type: 'percentage',
                value: 15,
                min_quantity: 1,
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 14 days
            },
            {
                name: '$10 Off Orders Over $100',
                description: 'Save $10 on large orders',
                type: 'fixed',
                value: 10,
                min_quantity: 1,
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 21 days
            }
        ];
        
        let completed = 0;
        
        promotions.forEach((promo) => {
            db.run(
                `INSERT INTO promotions (name, description, type, value, min_quantity, start_date, end_date, is_active, created_at, current_uses)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), 0)`,
                [promo.name, promo.description, promo.type, promo.value, promo.min_quantity, promo.start_date, promo.end_date],
                function(err) {
                    if (err) {
                        console.error('❌ Error creating promotion:', promo.name, err);
                    } else {
                        console.log(`✅ Created promotion: ${promo.name} (ID: ${this.lastID})`);
                    }
                    
                    completed++;
                    if (completed === promotions.length) {
                        resolve();
                    }
                }
            );
        });
    });
}

// Main execution
async function resetVapeStoreDatabase() {
    try {
        await examineDatabase();
        await clearProductData();
        
        console.log('\n🔄 Setting up vape store data...\n');
        
        const categoryIds = await createCategories();
        const supplierIds = await createSuppliers();
        const productIds = await createVapeProducts(categoryIds, supplierIds);
        await createPromotions(productIds);
        
        console.log('\n✅ Vape store database setup complete!');
        console.log(`📊 Created ${Object.keys(categoryIds).length} categories`);
        console.log(`🏭 Created ${Object.keys(supplierIds).length} suppliers`);
        console.log(`🛍️ Created ${productIds.length} products`);
        console.log('🎯 Created 3 promotions');
        
        // Final verification
        console.log('\n📋 Final database summary:');
        await examineDatabase();
        
    } catch (error) {
        console.error('❌ Error during database reset:', error);
    } finally {
        db.close((err) => {
            if (err) {
                console.error('❌ Error closing database:', err);
            } else {
                console.log('🔒 Database connection closed');
            }
        });
    }
}

// Run the reset
resetVapeStoreDatabase();
