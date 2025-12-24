const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../database/stock_management.db');

// Open the database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    console.log('Connected to the SQLite database.');
});

// Generate random number between min and max
function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate random date in the last 30 days
function randomDateInLast30Days() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const randomTime = thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime());
    return new Date(randomTime);
}

// Generate sale number
function generateSaleNumber(index) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    return `SALE-${dateStr}-${String(index).padStart(4, '0')}`;
}

// Payment methods array
const paymentMethods = ['cash', 'card', 'mobile'];

async function createSampleSales() {
    try {
        // Get available products with inventory
        const products = await new Promise((resolve, reject) => {
            db.all(`
                SELECT p.id, p.name, p.selling_price, p.cost_price, i.current_stock 
                FROM products p 
                JOIN inventory i ON p.id = i.product_id 
                WHERE i.current_stock > 0 
                ORDER BY p.id
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log(`Found ${products.length} products with stock`);

        // Get user IDs for cashiers
        const userIds = [1, 3, 6, 10]; // admin and cashiers
        const customerIds = [1, 2, null]; // customers + walk-ins

        const salesData = [];
        const saleItemsData = [];
        let saleCounter = 1;

        // Generate 50-75 sales over the past 30 days
        const totalSales = randomBetween(50, 75);
        console.log(`Creating ${totalSales} sample sales...`);

        for (let i = 0; i < totalSales; i++) {
            const saleDate = randomDateInLast30Days();
            const customerId = customerIds[Math.floor(Math.random() * customerIds.length)];
            const cashierId = userIds[Math.floor(Math.random() * userIds.length)];
            const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
            
            // Generate 1-5 items per sale
            const itemCount = randomBetween(1, 5);
            const selectedProducts = [];
            let totalAmount = 0;
            let discountAmount = 0;

            // Select random products for this sale
            for (let j = 0; j < itemCount; j++) {
                const randomProduct = products[Math.floor(Math.random() * products.length)];
                const quantity = randomBetween(1, 3);
                const unitPrice = parseFloat(randomProduct.selling_price);
                
                // Small chance for a discount (10%)
                const hasDiscount = Math.random() < 0.1;
                const itemDiscountAmount = hasDiscount ? unitPrice * quantity * 0.1 : 0;
                
                const totalPrice = (unitPrice * quantity) - itemDiscountAmount;
                totalAmount += totalPrice;
                discountAmount += itemDiscountAmount;

                selectedProducts.push({
                    productId: randomProduct.id,
                    quantity: quantity,
                    unitPrice: unitPrice,
                    discountAmount: itemDiscountAmount,
                    totalPrice: totalPrice
                });
            }

            // Round amounts
            totalAmount = Math.round(totalAmount * 100) / 100;
            discountAmount = Math.round(discountAmount * 100) / 100;
            const taxAmount = Math.round(totalAmount * 0.1 * 100) / 100; // 10% tax
            const subtotal = totalAmount + taxAmount; // Subtotal is before tax

            const sale = {
                saleNumber: generateSaleNumber(saleCounter++),
                customerId: customerId,
                cashierId: cashierId,
                subtotal: subtotal,
                totalAmount: totalAmount,
                discountAmount: discountAmount,
                taxAmount: taxAmount,
                paymentMethod: paymentMethod,
                createdAt: saleDate.toISOString()
            };

            salesData.push(sale);
            
            // Store items with sale index for later reference
            selectedProducts.forEach(item => {
                saleItemsData.push({
                    ...item,
                    saleIndex: i
                });
            });
        }

        console.log('Inserting sales data...');

        // Insert sales data
        await new Promise((resolve, reject) => {
            db.serialize(() => {
                const stmt = db.prepare(`
                    INSERT INTO sales (sale_number, customer_id, cashier_id, subtotal, total_amount, 
                                     discount_amount, tax_amount, payment_method, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);

                salesData.forEach(sale => {
                    stmt.run([
                        sale.saleNumber,
                        sale.customerId,
                        sale.cashierId,
                        sale.subtotal,
                        sale.totalAmount,
                        sale.discountAmount,
                        sale.taxAmount,
                        sale.paymentMethod,
                        sale.createdAt
                    ]);
                });

                stmt.finalize((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });

        console.log('Inserting sale items...');

        // Get the inserted sale IDs
        const insertedSales = await new Promise((resolve, reject) => {
            db.all('SELECT id, sale_number FROM sales ORDER BY id', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // Insert sale items
        await new Promise((resolve, reject) => {
            db.serialize(() => {
                const stmt = db.prepare(`
                    INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, 
                                          discount_amount, total_price)
                    VALUES (?, ?, ?, ?, ?, ?)
                `);

                saleItemsData.forEach(item => {
                    const saleId = insertedSales[item.saleIndex].id;
                    stmt.run([
                        saleId,
                        item.productId,
                        item.quantity,
                        item.unitPrice,
                        item.discountAmount,
                        item.totalPrice
                    ]);
                });

                stmt.finalize((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });

        console.log('Sample sales data created successfully!');
        
        // Show summary
        const summary = await new Promise((resolve, reject) => {
            db.get(`
                SELECT 
                    COUNT(*) as total_sales,
                    SUM(total_amount) as total_revenue,
                    AVG(total_amount) as avg_sale
                FROM sales
            `, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        console.log('Sales Summary:');
        console.log(`- Total Sales: ${summary.total_sales}`);
        console.log(`- Total Revenue: $${summary.total_revenue.toFixed(2)}`);
        console.log(`- Average Sale: $${summary.avg_sale.toFixed(2)}`);

    } catch (error) {
        console.error('Error creating sample sales:', error);
    }
}

// Create the sample sales and close database
createSampleSales().then(() => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
    });
});
