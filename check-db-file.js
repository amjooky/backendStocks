const fs = require('fs');
const path = require('path');

console.log('=== Checking Database File ===');

const dbPath = path.join(__dirname, 'database/stock_management.db');
console.log('Database path:', dbPath);

try {
    // Check if file exists
    if (!fs.existsSync(dbPath)) {
        console.log('❌ Database file does not exist');
        console.log('Please run: node scripts/create-fresh-db.js');
        process.exit(1);
    }
    
    console.log('✅ Database file exists');
    
    // Get file stats
    const stats = fs.statSync(dbPath);
    console.log('\n📊 File information:');
    console.log(`- Size: ${stats.size} bytes`);
    console.log(`- Created: ${stats.birthtime}`);
    console.log(`- Modified: ${stats.mtime}`);
    
    // Check file permissions
    console.log('\n🔒 Checking file permissions...');
    try {
        fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
        console.log('✅ Read/Write permissions are OK');
    } catch (err) {
        console.error('❌ Permission error:', err.message);
    }
    
    // Try to read the file
    console.log('\n🔍 Reading file content...');
    try {
        const fd = fs.openSync(dbPath, 'r');
        const buffer = Buffer.alloc(16);
        const bytesRead = fs.readSync(fd, buffer, 0, 16, 0);
        fs.closeSync(fd);
        
        console.log(`✅ Successfully read ${bytesRead} bytes`);
        console.log('File header (hex):', buffer.toString('hex'));
        console.log('File header (ascii):', buffer.toString('ascii'));
        
        // Check if it's a valid SQLite database
        if (buffer.toString('ascii', 0, 16) === 'SQLite format 3\0') {
            console.log('\n✅ Valid SQLite database file detected');
        } else {
            console.log('\n⚠️  Warning: File does not appear to be a valid SQLite database');
        }
    } catch (err) {
        console.error('❌ Error reading file:', err.message);
    }
    
} catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
}
