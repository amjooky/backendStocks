const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database/stock_management.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    }
    console.log('Connected to database');
});

db.serialize(() => {
    db.run('DROP TABLE IF EXISTS caisse_sessions', (err) => {
        if (err) console.error('Error dropping table:', err);
    });

    db.run(`
        CREATE TABLE caisse_sessions (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            session_name TEXT NOT NULL,
            opening_amount REAL NOT NULL DEFAULT 0,
            current_amount REAL NOT NULL DEFAULT 0,
            closing_amount REAL,
            expected_amount REAL,
            difference REAL,
            status TEXT NOT NULL DEFAULT 'active',
            description TEXT,
            closing_notes TEXT,
            opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            closed_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `, (err) => {
        if (err) {
            console.error('Error creating caisse_sessions table:', err);
        } else {
            console.log('✅ caisse_sessions table created with all columns');
        }
    });
});

db.close((err) => {
    if (err) {
        console.error('Error closing database:', err);
    } else {
        console.log('✅ Migration completed');
    }
});
