const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../database/stock_management.db');
console.log('Database path:', dbPath);
console.log('Directory exists:', fs.existsSync(path.dirname(dbPath)));
console.log('Database file exists before:', fs.existsSync(dbPath));

if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    console.log('Database file size:', stats.size, 'bytes');
}

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Error opening database:', err);
        return;
    }
    console.log('Database connection opened');
});

db.run('CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, name TEXT)', (err) => {
    if (err) {
        console.error('Error creating test table:', err);
        return;
    }
    console.log('Test table created');
    
    db.run('INSERT INTO test_table (name) VALUES (?)', ['test'], (err) => {
        if (err) {
            console.error('Error inserting test data:', err);
            return;
        }
        console.log('Test data inserted');
        
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
                return;
            }
            console.log('Database connection closed');
            
            // Check file size after operations
            if (fs.existsSync(dbPath)) {
                const stats = fs.statSync(dbPath);
                console.log('Database file size after operations:', stats.size, 'bytes');
            }
        });
    });
});
