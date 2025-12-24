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
    // Add caisse_session_id column to sales table
    db.run(`
        ALTER TABLE sales ADD COLUMN caisse_session_id TEXT
    `, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('✅ Column already exists');
            } else {
                console.error('Error adding column:', err);
            }
        } else {
            console.log('✅ caisse_session_id column added to sales table');
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
