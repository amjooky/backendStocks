const { getAllRows } = require('./config/database');

async function checkSchema() {
    try {
        console.log('Products table schema:');
        const columns = await getAllRows('PRAGMA table_info(products)');
        columns.forEach(col => {
            console.log(`  ${col.name}: ${col.type} (nullable: ${col.notnull === 0 ? 'YES' : 'NO'})`);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

checkSchema();