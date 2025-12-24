const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5001; // Using a different port to avoid conflicts

// Simple CORS setup
app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Test server is working!' });
});

// Check if database exists
const dbPath = path.join(__dirname, 'database/stock_management.db');
app.get('/check-db', (req, res) => {
    const dbExists = fs.existsSync(dbPath);
    res.json({
        dbExists,
        dbPath,
        message: dbExists ? 'Database file exists' : 'Database file not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Test server running on http://localhost:${PORT}`);
    console.log(`- Test endpoint: http://localhost:${PORT}/test`);
    console.log(`- Check DB: http://localhost:${PORT}/check-db`);
    console.log('\nPress Ctrl+C to stop the server');
});
