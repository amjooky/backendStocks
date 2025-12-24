const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { runQuery } = require('../config/database');

const dbPath = path.join(__dirname, '../database/stock_management.db');

// Function to initialize database
const initializeDatabase = async () => {
    return new Promise((resolve, reject) => {
        console.log('🔄 Initializing database...');

        // Ensure database directory exists
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
            console.log('📁 Database directory created');
        }

        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('❌ Error opening database:', err);
                reject(err);
                return;
            }
            console.log('✅ Database connection opened');
        });

        db.serialize(() => {
            // Users table
            db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        role TEXT CHECK(role IN ('admin', 'manager', 'cashier')) DEFAULT 'cashier',
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

            // Categories table
            db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

            // Suppliers table
            db.run(`CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        contact_person VARCHAR(100),
        email VARCHAR(100),
        phone VARCHAR(20),
        address TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

            // Products table
            db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        sku VARCHAR(50) UNIQUE NOT NULL,
        barcode VARCHAR(50) UNIQUE,
        category_id INTEGER,
        supplier_id INTEGER,
        cost_price DECIMAL(10, 2) NOT NULL,
        selling_price DECIMAL(10, 2) NOT NULL,
        min_stock_level INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories (id),
        FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
    )`);

            // Inventory table
            db.run(`CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        current_stock INTEGER NOT NULL DEFAULT 0,
        reserved_stock INTEGER DEFAULT 0,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products (id)
    )`);

            // Stock movements table
            db.run(`CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        movement_type TEXT CHECK(movement_type IN ('in', 'out', 'adjustment')) NOT NULL,
        quantity INTEGER NOT NULL,
        previous_stock INTEGER NOT NULL,
        new_stock INTEGER NOT NULL,
        cost_per_unit DECIMAL(10, 2),
        reference VARCHAR(100),
        notes TEXT,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

            // Customers table
            db.run(`CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        phone VARCHAR(20),
        address TEXT,
        loyalty_points INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

            // Promotions table
            db.run(`CREATE TABLE IF NOT EXISTS promotions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        type TEXT CHECK(type IN ('percentage', 'fixed', 'buy_x_get_y')) NOT NULL,
        value DECIMAL(10, 2) NOT NULL,
        min_quantity INTEGER DEFAULT 1,
        max_uses INTEGER,
        current_uses INTEGER DEFAULT 0,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

            // Promotion products (for product-specific promotions)
            db.run(`CREATE TABLE IF NOT EXISTS promotion_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        promotion_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        FOREIGN KEY (promotion_id) REFERENCES promotions (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
    )`);

            // Sales table
            db.run(`CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_number VARCHAR(20) UNIQUE NOT NULL,
        customer_id INTEGER,
        cashier_id INTEGER NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL,
        discount_amount DECIMAL(10, 2) DEFAULT 0,
        tax_amount DECIMAL(10, 2) DEFAULT 0,
        total_amount DECIMAL(10, 2) NOT NULL,
        payment_method TEXT CHECK(payment_method IN ('cash', 'card', 'mobile', 'mixed')) NOT NULL,
        payment_status TEXT CHECK(payment_status IN ('pending', 'completed', 'refunded')) DEFAULT 'completed',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers (id),
        FOREIGN KEY (cashier_id) REFERENCES users (id)
    )`);

            // Sale items table
            db.run(`CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        discount_amount DECIMAL(10, 2) DEFAULT 0,
        total_price DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
    )`);

            // Sale promotions applied
            db.run(`CREATE TABLE IF NOT EXISTS sale_promotions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        promotion_id INTEGER NOT NULL,
        discount_amount DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales (id),
        FOREIGN KEY (promotion_id) REFERENCES promotions (id)
    )`);

            // System settings table
            db.run(`CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

            // Receipts table
            db.run(`CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        receiptNumber VARCHAR(50) UNIQUE NOT NULL,
        timestamp DATETIME NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL,
        tax DECIMAL(10, 2) DEFAULT 0,
        discount DECIMAL(10, 2) DEFAULT 0,
        total DECIMAL(10, 2) NOT NULL,
        paymentMethod TEXT CHECK(paymentMethod IN ('cash', 'card', 'digitalWallet', 'bankTransfer', 'split')) NOT NULL,
        cashAmount DECIMAL(10, 2) DEFAULT 0,
        changeAmount DECIMAL(10, 2) DEFAULT 0,
        notes TEXT,
        customerId INTEGER,
        appliedPromotions TEXT DEFAULT '[]',
        loyaltyPointsRedeemed INTEGER DEFAULT 0,
        items TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customerId) REFERENCES customers (id)
    )`);

            // Indexes for better performance
            db.run(`CREATE INDEX IF NOT EXISTS idx_products_sku ON products (sku)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_products_barcode ON products (barcode)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_sales_date ON sales (created_at)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements (created_at)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory (product_id)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts (timestamp)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_receipts_number ON receipts (receiptNumber)`);

            console.log('Database schema created successfully.');

            // Insert default admin user
            const hashedPassword = bcrypt.hashSync('admin123', 10);
            db.run(`INSERT OR IGNORE INTO users (username, email, password, first_name, last_name, role) 
            VALUES ('admin', 'admin@stocksystem.com', ?, 'System', 'Administrator', 'admin')`,
                [hashedPassword], function (err) {
                    if (err) {
                        console.error('Error creating admin user:', err);
                    } else {
                        console.log('Default admin user created (username: admin, password: admin123)');
                    }
                });

            // Insert sample categories
            const categories = [
                ['Electronics', 'Electronic devices and accessories'],
                ['Clothing', 'Apparel and fashion items'],
                ['Food & Beverages', 'Consumable food and drink products'],
                ['Books', 'Books and educational materials'],
                ['Home & Garden', 'Household and garden items']
            ];

            const categoryStmt = db.prepare(`INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)`);
            categories.forEach(category => {
                categoryStmt.run(category);
            });
            categoryStmt.finalize();

            // Insert sample suppliers
            const suppliers = [
                ['Tech Wholesale Co.', 'John Smith', 'john@techwholesale.com', '+1234567890', '123 Tech Street, City'],
                ['Fashion Distributors', 'Sarah Johnson', 'sarah@fashiondist.com', '+1234567891', '456 Fashion Ave, City'],
                ['Food & Beverage Supply', 'Mike Brown', 'mike@foodsupply.com', '+1234567892', '789 Supply Rd, City']
            ];

            const supplierStmt = db.prepare(`INSERT OR IGNORE INTO suppliers (name, contact_person, email, phone, address) VALUES (?, ?, ?, ?, ?)`);
            suppliers.forEach(supplier => {
                supplierStmt.run(supplier);
            });
            supplierStmt.finalize();

            // Insert default system settings
            const defaultSettings = [
                ['company_name', 'Stock Management System'],
                ['tax_rate', '0.0'],
                ['currency', 'USD'],
                ['language', 'en']
            ];
            const settingsStmt = db.prepare(`INSERT OR IGNORE INTO system_settings (setting_key, setting_value) VALUES (?, ?)`);
            defaultSettings.forEach(setting => {
                settingsStmt.run(setting);
            });
            settingsStmt.finalize();

            console.log('📦 Sample data inserted successfully.');
            console.log('✅ Database initialization completed!');

            db.close((err) => {
                if (err) {
                    console.error('❌ Error closing database:', err);
                    reject(err);
                } else {
                    console.log('🔐 Database connection closed.');
                    resolve();
                }
            });
        });
    });
};

// Run initialization if this file is executed directly
if (require.main === module) {
    initializeDatabase()
        .then(() => {
            console.log('✅ Direct initialization completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Direct initialization failed:', error);
            process.exit(1);
        });
}

module.exports = { initializeDatabase };
