const { getAllRows } = require('../config/database');

async function checkSchema() {
    try {
        console.log('📋 Checking database schema...\n');

        // Check tables
        const tables = await getAllRows("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('📊 Available tables:');
        tables.forEach(table => console.log(`  - ${table.name}`));
        console.log('');

        // Check products table schema specifically
        if (tables.find(t => t.name === 'products')) {
            console.log('🛍️ Products table schema:');
            const columns = await getAllRows("PRAGMA table_info(products)");
            columns.forEach(col => {
                console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
            });
            console.log('');
        } else {
            console.log('⚠️  Products table not found');
        }

        // Check agencies table schema
        if (tables.find(t => t.name === 'agencies')) {
            console.log('🏢 Agencies table schema:');
            const columns = await getAllRows("PRAGMA table_info(agencies)");
            columns.forEach(col => {
                console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
            });
            console.log('');
        } else {
            console.log('⚠️  Agencies table not found');
        }

        console.log('✅ Schema check completed');
    } catch (error) {
        console.error('❌ Schema check failed:', error);
    }
}

// Run if called directly
if (require.main === module) {
    checkSchema().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error(error);
        process.exit(1);
    });
}

module.exports = { checkSchema };