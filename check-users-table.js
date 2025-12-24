const { getAllRows, getRow } = require('./backend/config/database');

async function checkUsersTable() {
    try {
        console.log('📊 Users Table Schema:');
        
        // Get table info
        const tableInfo = await getAllRows("PRAGMA table_info(users)");
        console.log('\nColumns:', tableInfo.map(col => `${col.name} (${col.type})`));
        
        // Get table creation SQL
        const tableSQL = await getRow("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'");
        console.log('\nTable Creation SQL:');
        console.log(tableSQL.sql);
        
        // Check existing users
        const users = await getAllRows("SELECT id, username, role FROM users");
        console.log('\nExisting users:');
        console.log(users);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkUsersTable();