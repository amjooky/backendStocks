const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use the correct database path from config
const dbPath = path.join(__dirname, 'database', 'stock_management.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Creating database schema...');

// Enable WAL mode and foreign keys
db.run('PRAGMA journal_mode=WAL');
db.run('PRAGMA synchronous=NORMAL');
db.run('PRAGMA foreign_keys=ON');

const createTables = () => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Users table
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    first_name VARCHAR(50),
                    last_name VARCHAR(50),
                    role VARCHAR(20) DEFAULT 'cashier' CHECK(role IN ('admin', 'manager', 'cashier')),
                    is_active BOOLEAN DEFAULT 1,
                    last_login DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Categories table
            db.run(`
                CREATE TABLE IF NOT EXISTS categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(100) UNIQUE NOT NULL,
                    description TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Suppliers table
            db.run(`
                CREATE TABLE IF NOT EXISTS suppliers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(100) NOT NULL,
                    contact_name VARCHAR(100),
                    email VARCHAR(100),
                    phone VARCHAR(20),
                    address TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Products table
            db.run(`
                CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(200) NOT NULL,
                    description TEXT,
                    sku VARCHAR(100) UNIQUE NOT NULL,
                    barcode VARCHAR(100),
                    category_id INTEGER,
                    supplier_id INTEGER,
                    cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                    selling_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                    min_stock_level INTEGER DEFAULT 0,
                    stock_quantity INTEGER DEFAULT 0,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (category_id) REFERENCES categories(id),
                    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
                )
            `);

            // Inventory table
            db.run(`
                CREATE TABLE IF NOT EXISTS inventory (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER NOT NULL,
                    quantity INTEGER NOT NULL DEFAULT 0,
                    current_stock INTEGER NOT NULL DEFAULT 0,
                    reserved_quantity INTEGER DEFAULT 0,
                    reserved_stock INTEGER DEFAULT 0,
                    cost_per_unit DECIMAL(10,2),
                    last_restocked DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
                )
            `);

            // Customers table
            db.run(`
                CREATE TABLE IF NOT EXISTS customers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    first_name VARCHAR(50) NOT NULL,
                    last_name VARCHAR(50) NOT NULL,
                    email VARCHAR(100),
                    phone VARCHAR(20),
                    address TEXT,
                    loyalty_points INTEGER DEFAULT 0,
                    total_purchases DECIMAL(10,2) DEFAULT 0,
                    last_purchase_date DATETIME,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Promotions table
            db.run(`
                CREATE TABLE IF NOT EXISTS promotions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(100) NOT NULL,
                    description TEXT,
                    type VARCHAR(20) NOT NULL CHECK(type IN ('percentage', 'fixed', 'buy_x_get_y')),
                    value DECIMAL(10,2) NOT NULL,
                    min_quantity INTEGER DEFAULT 1,
                    start_date DATE NOT NULL,
                    end_date DATE NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    usage_count INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Promotion Products linking table
            db.run(`
                CREATE TABLE IF NOT EXISTS promotion_products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    promotion_id INTEGER NOT NULL,
                    product_id INTEGER NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
                    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                    UNIQUE(promotion_id, product_id)
                )
            `);

            // Caisse Sessions table
            db.run(`
                CREATE TABLE IF NOT EXISTS caisse_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cashier_id INTEGER NOT NULL,
                    opening_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
                    closing_amount DECIMAL(10,2),
                    expected_amount DECIMAL(10,2),
                    discrepancy DECIMAL(10,2),
                    notes TEXT,
                    opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    closed_at DATETIME,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (cashier_id) REFERENCES users(id)
                )
            `);

            // Sales table
            db.run(`
                CREATE TABLE IF NOT EXISTS sales (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_id INTEGER,
                    cashier_id INTEGER NOT NULL,
                    session_id INTEGER,
                    subtotal DECIMAL(10,2) NOT NULL,
                    tax_amount DECIMAL(10,2) DEFAULT 0,
                    discount_amount DECIMAL(10,2) DEFAULT 0,
                    total_amount DECIMAL(10,2) NOT NULL,
                    payment_method VARCHAR(20) NOT NULL CHECK(payment_method IN ('cash', 'card', 'mobile')),
                    payment_status VARCHAR(20) DEFAULT 'completed' CHECK(payment_status IN ('pending', 'completed', 'refunded')),
                    status VARCHAR(20) DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'cancelled', 'refunded')),
                    loyalty_points_used INTEGER DEFAULT 0,
                    loyalty_points_earned INTEGER DEFAULT 0,
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (customer_id) REFERENCES customers(id),
                    FOREIGN KEY (cashier_id) REFERENCES users(id),
                    FOREIGN KEY (session_id) REFERENCES caisse_sessions(id)
                )
            `);

            // Sale Items table
            db.run(`
                CREATE TABLE IF NOT EXISTS sale_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sale_id INTEGER NOT NULL,
                    product_id INTEGER NOT NULL,
                    quantity INTEGER NOT NULL,
                    unit_price DECIMAL(10,2) NOT NULL,
                    total_price DECIMAL(10,2) NOT NULL,
                    promotion_discount DECIMAL(10,2) DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
                    FOREIGN KEY (product_id) REFERENCES products(id)
                )
            `);

            // Stock Movements table
            db.run(`
                CREATE TABLE IF NOT EXISTS stock_movements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER NOT NULL,
                    movement_type VARCHAR(20) NOT NULL CHECK(movement_type IN ('stock_in', 'stock_out', 'adjustment', 'sale', 'return')),
                    quantity INTEGER NOT NULL,
                    cost_per_unit DECIMAL(10,2),
                    reference VARCHAR(100),
                    notes TEXT,
                    user_id INTEGER,
                    sale_id INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (product_id) REFERENCES products(id),
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (sale_id) REFERENCES sales(id)
                )
            `);

            // Settings table
            db.run(`
                CREATE TABLE IF NOT EXISTS settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key VARCHAR(100) UNIQUE NOT NULL,
                    value TEXT,
                    description TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            console.log('✅ Database schema created successfully');
            resolve();
        });
    });
};

// Create indexes for better performance
const createIndexes = () => {
    return new Promise((resolve) => {
        db.serialize(() => {
            db.run('CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)');
            db.run('CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)');
            db.run('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at)');
            db.run('CREATE INDEX IF NOT EXISTS idx_sales_cashier ON sales(cashier_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at)');
            
            console.log('✅ Database indexes created successfully');
            resolve();
        });
    });
};

// Insert default admin user and basic settings
const insertDefaults = () => {
    return new Promise((resolve) => {
        const bcrypt = require('bcrypt');
        
        // Hash password for admin user
        bcrypt.hash('admin123', 10, (err, hashedPassword) => {
            if (err) {
                console.error('❌ Error hashing password:', err);
                resolve();
                return;
            }

            db.serialize(() => {
                // Insert default admin user
                db.run(`
                    INSERT OR IGNORE INTO users (username, email, password_hash, first_name, last_name, role)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, ['admin', 'admin@stocksystem.com', hashedPassword, 'System', 'Administrator', 'admin']);

                // Insert default settings
                db.run(`
                    INSERT OR IGNORE INTO settings (key, value, description)
                    VALUES (?, ?, ?)
                `, ['tax_rate', '10', 'Default tax rate percentage']);

                db.run(`
                    INSERT OR IGNORE INTO settings (key, value, description)
                    VALUES (?, ?, ?)
                `, ['currency', 'USD', 'Default currency symbol']);

                db.run(`
                    INSERT OR IGNORE INTO settings (key, value, description)
                `, ['store_name', 'VapeStore Pro', 'Store name for receipts and reports']);

                console.log('✅ Default admin user and settings created');
                console.log('🔑 Admin credentials: admin@stocksystem.com / admin123');
                resolve();
            });
        });
    });
};

// Main execution
async function createDatabaseSchema() {
    try {
        await createTables();
        await createIndexes();
        await insertDefaults();
        
        console.log('\n🎉 Database schema setup complete!');
        
    } catch (error) {
        console.error('❌ Error creating database schema:', error);
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

// Export for use by other scripts
module.exports = { createDatabaseSchema };

// Run if called directly
if (require.main === module) {
    createDatabaseSchema();
}
