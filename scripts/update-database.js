const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../database/stock_management.db');

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Check if database file exists
if (!fs.existsSync(dbPath)) {
    console.error('Database file does not exist. Run initDatabase.js first.');
    process.exit(1);
}

const db = new sqlite3.Database(dbPath);

console.log('Updating database schema...');

db.serialize(() => {
    // Add caisse_session_id to sales table if it doesn't exist
    db.run(`PRAGMA foreign_keys = OFF;`);
    
    // Create a temporary sales table with the new column
    db.run(`CREATE TABLE IF NOT EXISTS temp_sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_number VARCHAR(20) UNIQUE NOT NULL,
        customer_id INTEGER,
        cashier_id INTEGER NOT NULL,
        caisse_session_id TEXT,
        subtotal DECIMAL(10, 2) NOT NULL,
        discount_amount DECIMAL(10, 2) DEFAULT 0,
        tax_amount DECIMAL(10, 2) DEFAULT 0,
        total_amount DECIMAL(10, 2) NOT NULL,
        payment_method TEXT CHECK(payment_method IN ('cash', 'card', 'mobile', 'mixed')) NOT NULL,
        payment_status TEXT CHECK(payment_status IN ('pending', 'completed', 'refunded')) DEFAULT 'completed',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Check if sales table exists
    db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='sales'`, (err, row) => {
        if (err) {
            console.error('Error checking sales table:', err);
            return;
        }

        if (row) {
            // Copy data from sales to temp_sales
            db.run(`INSERT INTO temp_sales (
                id, sale_number, customer_id, cashier_id, subtotal, 
                discount_amount, tax_amount, total_amount, payment_method, 
                payment_status, notes, created_at
            ) SELECT 
                id, sale_number, customer_id, cashier_id, subtotal, 
                discount_amount, tax_amount, total_amount, payment_method, 
                payment_status, notes, created_at 
            FROM sales`);
            
            // Drop old sales table
            db.run(`DROP TABLE sales`);
            
            // Rename temp_sales to sales
            db.run(`ALTER TABLE temp_sales RENAME TO sales`);
            
            console.log('Sales table updated with caisse_session_id column');
        } else {
            console.log('Sales table does not exist, skipping');
        }
    });

    // Create caisse_sessions table
    db.run(`CREATE TABLE IF NOT EXISTS caisse_sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        session_name VARCHAR(100) NOT NULL,
        opening_amount DECIMAL(10, 2) NOT NULL,
        current_amount DECIMAL(10, 2) NOT NULL,
        closing_amount DECIMAL(10, 2),
        expected_amount DECIMAL(10, 2),
        difference DECIMAL(10, 2),
        status TEXT CHECK(status IN ('active', 'closed')) DEFAULT 'active',
        description TEXT,
        closing_notes TEXT,
        opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Update Foreign Keys
    db.run(`PRAGMA foreign_keys = ON;`);

    // Create indices
    db.run(`CREATE INDEX IF NOT EXISTS idx_caisse_sessions_user ON caisse_sessions (user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_caisse_sessions_status ON caisse_sessions (status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_sales_caisse_session ON sales (caisse_session_id)`);

    console.log('Caisse sessions table and related updates created successfully.');
});

// Update customers table to include first_name and last_name instead of name
db.serialize(() => {
    // Check if customers table exists and has first_name column
    db.get(`PRAGMA table_info(customers)`, (err, rows) => {
        if (err) {
            console.error('Error checking customers table:', err);
            return;
        }

        // If first_name column doesn't exist, update the table
        let hasFirstName = false;
        for (const row of rows || []) {
            if (row.name === 'first_name') {
                hasFirstName = true;
                break;
            }
        }

        if (!hasFirstName) {
            console.log('Updating customers table with first_name and last_name...');
            
            // Create temporary table with new structure
            db.run(`CREATE TABLE temp_customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name VARCHAR(50) NOT NULL,
                last_name VARCHAR(50) NOT NULL,
                email VARCHAR(100),
                phone VARCHAR(20),
                address TEXT,
                loyalty_points INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
            
            // Copy data from old table to new one, splitting name into first_name and last_name
            db.run(`INSERT INTO temp_customers (
                id, first_name, last_name, email, phone, address, 
                loyalty_points, is_active, created_at, updated_at
            ) SELECT 
                id, 
                CASE WHEN instr(name, ' ') > 0 
                    THEN substr(name, 1, instr(name, ' ') - 1) 
                    ELSE name END as first_name,
                CASE WHEN instr(name, ' ') > 0 
                    THEN substr(name, instr(name, ' ') + 1) 
                    ELSE '' END as last_name,
                email, phone, address, loyalty_points, is_active, created_at, updated_at
            FROM customers`);
            
            // Drop old table and rename new one
            db.run(`DROP TABLE customers`);
            db.run(`ALTER TABLE temp_customers RENAME TO customers`);
            
            console.log('Customers table updated successfully.');
        } else {
            console.log('Customers table already has first_name column, no update needed.');
        }
    });
});

// Close the database connection
db.close((err) => {
    if (err) {
        console.error('Error closing database:', err.message);
    } else {
        console.log('Database update completed successfully.');
    }
});
