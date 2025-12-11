const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../database/stock_management.db');

// Test data
const testProduct = {
    name: `Test Product ${Date.now()}`,
    sku: `SKU-${Math.floor(10000 + Math.random() * 90000)}`,
    barcode: `BC-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    description: 'Test product for CRUD operations',
    category_id: 1, // Assuming category with ID 1 exists
    supplier_id: 1, // Assuming supplier with ID 1 exists
    cost_price: 10.99,
    selling_price: 19.99,
    tax_rate: 0.2,
    reorder_point: 10,
    initial_stock: 100,
    unit: 'pcs'
};

// Open database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        process.exit(1);
    }
    
    console.log('✅ Connected to database');
    runTests();
});

// Test functions
async function runTests() {
    try {
        console.log('🚀 Starting Product CRUD Tests\n');
        
        // 1. Create a new product
        console.log('1. Creating a new product...');
        const productId = await createProduct(testProduct);
        
        if (!productId) {
            throw new Error('Failed to create product');
        }
        
        // 2. Get the created product
        console.log('\n2. Getting the created product...');
        const product = await getProduct(productId);
        
        // 3. Update the product
        console.log('\n3. Updating the product...');
        const updatedProduct = { ...product, 
            name: `${product.name} - UPDATED`,
            selling_price: 24.99,
            description: 'Updated description'
        };
        await updateProduct(productId, updatedProduct);
        
        // 4. Test inventory operations
        console.log('\n4. Testing inventory operations...');
        
        // 4.1 Add stock
        console.log('   Adding stock...');
        await adjustInventory(productId, 50, 'in', 'Test stock addition');
        
        // 4.2 Remove stock
        console.log('   Removing stock...');
        await adjustInventory(productId, 10, 'out', 'Test stock removal');
        
        // 5. Get inventory history
        console.log('\n5. Getting inventory history...');
        const history = await getInventoryHistory(productId);
        console.log(`   Found ${history.length} inventory movements`);
        
        // 6. Get current stock
        console.log('\n6. Getting current stock...');
        const stock = await getCurrentStock(productId);
        console.log(`   Current stock: ${stock.quantity} ${stock.unit}`);
        
        // 7. List all products
        console.log('\n7. Listing all products...');
        const products = await getAllProducts();
        console.log(`   Found ${products.length} products in total`);
        
        // 8. Delete the test product (soft delete)
        console.log('\n8. Deleting the test product...');
        await deleteProduct(productId);
        
        console.log('\n🎉 All tests completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
    } finally {
        // Close the database connection
        db.close();
    }
}

// Database operation functions
function createProduct(productData) {
    return new Promise((resolve, reject) => {
        const { 
            name, sku, barcode, description, category_id, supplier_id,
            cost_price, selling_price, tax_rate, reorder_point, initial_stock, unit
        } = productData;
        
        const sql = `
            INSERT INTO products (
                name, sku, barcode, description, category_id, supplier_id,
                cost_price, selling_price, tax_rate, reorder_point, stock_quantity, unit
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            name, sku, barcode, description, category_id, supplier_id,
            cost_price, selling_price, tax_rate, reorder_point, initial_stock, unit
        ];
        
        db.run(sql, params, function(err) {
            if (err) {
                console.error('❌ Error creating product:', err.message);
                return reject(err);
            }
            
            const productId = this.lastID;
            console.log(`✅ Product created with ID: ${productId}`);
            resolve(productId);
        });
    });
}

function getProduct(productId) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM products WHERE id = ?';
        
        db.get(sql, [productId], (err, row) => {
            if (err) {
                console.error('❌ Error getting product:', err.message);
                return reject(err);
            }
            
            if (!row) {
                const error = new Error(`Product with ID ${productId} not found`);
                console.error(`❌ ${error.message}`);
                return reject(error);
            }
            
            console.log('✅ Product details:', {
                id: row.id,
                name: row.name,
                sku: row.sku,
                stock: row.stock_quantity,
                price: row.selling_price
            });
            
            resolve(row);
        });
    });
}

function updateProduct(productId, productData) {
    return new Promise((resolve, reject) => {
        const { 
            name, sku, barcode, description, category_id, supplier_id,
            cost_price, selling_price, tax_rate, reorder_point, unit
        } = productData;
        
        const sql = `
            UPDATE products 
            SET name = ?, sku = ?, barcode = ?, description = ?, 
                category_id = ?, supplier_id = ?, cost_price = ?, 
                selling_price = ?, tax_rate = ?, reorder_point = ?, unit = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        const params = [
            name, sku, barcode, description, category_id, supplier_id,
            cost_price, selling_price, tax_rate, reorder_point, unit, productId
        ];
        
        db.run(sql, params, function(err) {
            if (err) {
                console.error('❌ Error updating product:', err.message);
                return reject(err);
            }
            
            if (this.changes === 0) {
                const error = new Error(`No product found with ID ${productId}`);
                console.error(`❌ ${error.message}`);
                return reject(error);
            }
            
            console.log(`✅ Product updated successfully`);
            resolve();
        });
    });
}

function adjustInventory(productId, quantity, type, reason, reference = 'TEST') {
    return new Promise((resolve, reject) => {
        // Start a transaction
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            // 1. Update product stock
            const updateStockSql = `
                UPDATE products 
                SET stock_quantity = stock_quantity ${type === 'in' ? '+' : '-'} ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                RETURNING stock_quantity as new_quantity
            `;
            
            db.get(updateStockSql, [quantity, productId], (err, row) => {
                if (err) {
                    return db.run('ROLLBACK', () => {
                        console.error('❌ Error updating stock:', err.message);
                        reject(err);
                    });
                }
                
                if (!row) {
                    return db.run('ROLLBACK', () => {
                        const error = new Error(`Product with ID ${productId} not found`);
                        console.error(`❌ ${error.message}`);
                        reject(error);
                    });
                }
                
                // 2. Record the movement
                const movementSql = `
                    INSERT INTO stock_movements (
                        product_id, quantity, type, reference, reason, balance_after
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `;
                
                db.run(movementSql, [
                    productId, 
                    quantity, 
                    type, 
                    reference, 
                    reason, 
                    row.new_quantity
                ], function(err) {
                    if (err) {
                        return db.run('ROLLBACK', () => {
                            console.error('❌ Error recording stock movement:', err.message);
                            reject(err);
                        });
                    }
                    
                    // Commit the transaction
                    db.run('COMMIT', (err) => {
                        if (err) {
                            return db.run('ROLLBACK', () => {
                                console.error('❌ Error committing transaction:', err.message);
                                reject(err);
                            });
                        }
                        
                        console.log(`✅ Stock ${type === 'in' ? 'added' : 'removed'} successfully`);
                        console.log(`   New quantity: ${row.new_quantity}`);
                        resolve(row.new_quantity);
                    });
                });
            });
        });
    });
}

function getInventoryHistory(productId) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT id, movement_date, quantity, type, reference, reason, balance_after
            FROM stock_movements
            WHERE product_id = ?
            ORDER BY movement_date DESC
        `;
        
        db.all(sql, [productId], (err, rows) => {
            if (err) {
                console.error('❌ Error getting inventory history:', err.message);
                return reject(err);
            }
            
            resolve(rows || []);
        });
    });
}

function getCurrentStock(productId) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT stock_quantity as quantity, unit FROM products WHERE id = ?';
        
        db.get(sql, [productId], (err, row) => {
            if (err) {
                console.error('❌ Error getting current stock:', err.message);
                return reject(err);
            }
            
            if (!row) {
                const error = new Error(`Product with ID ${productId} not found`);
                console.error(`❌ ${error.message}`);
                return reject(error);
            }
            
            resolve(row);
        });
    });
}

function getAllProducts() {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT id, name, sku, stock_quantity, selling_price FROM products WHERE is_active = 1';
        
        db.all(sql, [], (err, rows) => {
            if (err) {
                console.error('❌ Error getting all products:', err.message);
                return reject(err);
            }
            
            resolve(rows || []);
        });
    });
}

function deleteProduct(productId) {
    return new Promise((resolve, reject) => {
        // Soft delete (set is_active = 0)
        const sql = 'UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        
        db.run(sql, [productId], function(err) {
            if (err) {
                console.error('❌ Error deleting product:', err.message);
                return reject(err);
            }
            
            if (this.changes === 0) {
                const error = new Error(`No product found with ID ${productId}`);
                console.error(`❌ ${error.message}`);
                return reject(error);
            }
            
            console.log('✅ Product marked as deleted (soft delete)');
            resolve();
        });
    });
}
