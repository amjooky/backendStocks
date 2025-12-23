const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../database/stock_management.db');

console.log('Database path:', dbPath);

if (!fs.existsSync(dbPath)) {
    console.error('Database file does not exist. Run initDatabase.js first.');
    process.exit(1);
}

const db = new sqlite3.Database(dbPath);

console.log('Adding caisse tables to database...');

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
    )`, (err) => {
        if (err) {
            console.error('Error creating caisse_sessions table:', err);
        } else {
            console.log('✓ caisse_sessions table created successfully');
        }
    });

    // Create indices
    db.run(`CREATE INDEX IF NOT EXISTS idx_caisse_sessions_user ON caisse_sessions (user_id)`, (err) => {
        if (err) {
            console.error('Error creating index:', err);
        } else {
            console.log('✓ caisse_sessions user index created');
        }
    });

    db.run(`CREATE INDEX IF NOT EXISTS idx_caisse_sessions_status ON caisse_sessions (status)`, (err) => {
        if (err) {
            console.error('Error creating index:', err);
        } else {
            console.log('✓ caisse_sessions status index created');
        }
    });

    // Check if sales table has caisse_session_id column
    db.all(`PRAGMA table_info(sales)`, (err, columns) => {
        if (err) {
            console.error('Error checking sales table:', err);
            return;
        }

        const hasSessionColumn = columns.some(col => col.name === 'caisse_session_id');
        
        if (!hasSessionColumn) {
            console.log('Adding caisse_session_id column to sales table...');
            db.run(`ALTER TABLE sales ADD COLUMN caisse_session_id TEXT`, (err) => {
                if (err) {
                    console.error('Error adding caisse_session_id column:', err);
                } else {
                    console.log('✓ caisse_session_id column added to sales table');
                }
            });
        } else {
            console.log('✓ sales table already has caisse_session_id column');
        }
    });

    // Update customers table structure
    db.all(`PRAGMA table_info(customers)`, (err, columns) => {
        if (err) {
            console.error('Error checking customers table:', err);
            return;
        }

        const hasFirstName = columns.some(col => col.name === 'first_name');
        
        if (!hasFirstName) {
            console.log('Updating customers table structure...');
            
            // Add first_name and last_name columns
            db.run(`ALTER TABLE customers ADD COLUMN first_name VARCHAR(50)`, (err) => {
                if (err) {
                    console.error('Error adding first_name column:', err);
                } else {
                    console.log('✓ first_name column added to customers');
                }
            });
            
            db.run(`ALTER TABLE customers ADD COLUMN last_name VARCHAR(50)`, (err) => {
                if (err) {
                    console.error('Error adding last_name column:', err);
                } else {
                    console.log('✓ last_name column added to customers');
                }
            });
            
            // Update existing records by splitting name
            db.run(`UPDATE customers 
                    SET first_name = CASE WHEN instr(name, ' ') > 0 
                                         THEN substr(name, 1, instr(name, ' ') - 1) 
                                         ELSE name END,
                        last_name = CASE WHEN instr(name, ' ') > 0 
                                        THEN substr(name, instr(name, ' ') + 1) 
                                        ELSE '' END
                    WHERE first_name IS NULL`, (err) => {
                if (err) {
                    console.error('Error updating customer names:', err);
                } else {
                    console.log('✓ Customer names updated');
                }
            });
        } else {
            console.log('✓ customers table already has first_name column');
        }
    });
});

// Close database connection after all operations
setTimeout(() => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database update completed successfully.');
        }
    });
}, 2000);
