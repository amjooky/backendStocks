const { runQuery, runTransaction } = require('./config/database');

async function addSampleProducts() {
    try {
        const products = [
            ['Laptop Computer', 'High-performance laptop', 'LAP001', '123456789001', 1, 1, 999.99, 1299.99, 5],
            ['Wireless Mouse', 'Ergonomic wireless mouse', 'MSE001', '123456789002', 1, 1, 15.99, 29.99, 10],
            ['Coffee Mug', 'Ceramic coffee mug', 'MUG001', '123456789003', 3, 2, 3.99, 12.99, 20],
            ['Notebook', 'Spiral bound notebook', 'NTB001', '123456789004', 4, 2, 1.99, 5.99, 50],
            ['USB Cable', '2m USB-C cable', 'USB001', '123456789005', 1, 1, 8.99, 19.99, 25],
            ['Water Bottle', 'Stainless steel water bottle', 'WTR001', '123456789006', 3, 2, 12.99, 24.99, 15],
            ['Desk Lamp', 'LED desk lamp', 'LMP001', '123456789007', 1, 1, 45.99, 79.99, 8]
        ];

        const transactions = [];
        
        // Add products and inventory
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            
            // Insert product
            transactions.push({
                query: `INSERT INTO products (name, description, sku, barcode, category_id, supplier_id, cost_price, selling_price, min_stock_level) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                params: product
            });
            
            // Insert inventory
            const productId = i + 1; // Assuming sequential IDs starting from 1
            const stockLevel = Math.floor(Math.random() * 100) + 20; // Random stock between 20-119
            
            transactions.push({
                query: `INSERT INTO inventory (product_id, current_stock) VALUES (?, ?)`,
                params: [productId, stockLevel]
            });
        }

        await runTransaction(transactions);
        
        console.log('Sample products and inventory added successfully!');
        console.log(`Added ${products.length} products with inventory`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error adding sample products:', error);
        process.exit(1);
    }
}

addSampleProducts();
