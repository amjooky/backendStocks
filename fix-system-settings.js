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
    // Create system_settings table
    db.run(`
        CREATE TABLE IF NOT EXISTS system_settings (
            setting_key TEXT PRIMARY KEY,
            setting_value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creating table:', err);
        } else {
            console.log('✅ system_settings table created');
        }
    });

    // Insert default currency setting
    db.run(`
        INSERT OR IGNORE INTO system_settings (setting_key, setting_value)
        VALUES ('currency', 'USD')
    `, (err) => {
        if (err) {
            console.error('Error inserting default currency:', err);
        } else {
            console.log('✅ Default currency setting added');
        }
    });
});

db.close((err) => {
    if (err) {
        console.error('Error closing database:', err);
    } else {
        console.log('✅ Database migration completed');
    }
});
