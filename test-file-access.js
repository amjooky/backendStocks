const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'database/stock_management.db');

console.log('Testing file access to:', filePath);

// Check if file exists
try {
    const exists = fs.existsSync(filePath);
    console.log('File exists:', exists);
    
    if (exists) {
        const stats = fs.statSync(filePath);
        console.log('File size:', stats.size, 'bytes');
        console.log('Created:', stats.birthtime);
        console.log('Last modified:', stats.mtime);
        
        // Try to read the first few bytes
        const fd = fs.openSync(filePath, 'r');
        const buffer = Buffer.alloc(100);
        const bytesRead = fs.readSync(fd, buffer, 0, 100, 0);
        fs.closeSync(fd);
        
        console.log('First 100 bytes (hex):', buffer.toString('hex'));
        console.log('First 100 bytes (ascii):', buffer.toString('ascii'));
    }
} catch (error) {
    console.error('Error accessing file:', error.message);
}
