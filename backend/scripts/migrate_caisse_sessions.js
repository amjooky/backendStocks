const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/stock_management.db');
const db = new sqlite3.Database(dbPath);

console.log('Starting caisse sessions migration...');

db.serialize(() => {
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
    )`, function(err) {
        if (err) {
            console.error('Error creating caisse_sessions table:', err);
        } else {
            console.log('Caisse sessions table created successfully');
        }
    });

    // Check if caisse_session_id column exists in sales table
    db.all("PRAGMA table_info(sales)", (err, columns) => {
        if (err) {
            console.error('Error checking sales table structure:', err);
            return;
        }

        const hasSessionId = columns.some(col => col.name === 'caisse_session_id');
        
        if (!hasSessionId) {
            console.log('Adding caisse_session_id to sales table...');
            
            // Add caisse_session_id column to sales table
            db.run(`ALTER TABLE sales ADD COLUMN caisse_session_id TEXT`, function(err) {
                if (err) {
                    console.error('Error adding caisse_session_id column:', err);
                } else {
                    console.log('Added caisse_session_id column to sales table');
                }
            });

            // Add foreign key constraint (this will be checked at application level)
            // SQLite doesn't support adding foreign key constraints to existing tables
        } else {
            console.log('caisse_session_id column already exists in sales table');
        }
    });

    // Create indexes for better performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_caisse_sessions_user ON caisse_sessions (user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_caisse_sessions_status ON caisse_sessions (status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_caisse_sessions_opened ON caisse_sessions (opened_at)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_sales_session ON sales (caisse_session_id)`);

    console.log('Migration completed successfully!');

    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed.');
        }
    });
});
