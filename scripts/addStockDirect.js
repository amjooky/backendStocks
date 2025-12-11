const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/stock_management.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding stock directly to database...');

db.serialize(() => {
  // Products to add stock to
  const products = [
    { id: 1, quantity: 100 },
    { id: 2, quantity: 75 },
    { id: 3, quantity: 50 },
    { id: 4, quantity: 25 },
    { id: 5, quantity: 30 },
    { id: 6, quantity: 20 },
    { id: 7, quantity: 80 }
  ];

  products.forEach(product => {
    // First, check if inventory record exists
    db.get('SELECT id, current_stock FROM inventory WHERE product_id = ?', [product.id], (err, row) => {
      if (err) {
        console.error(`Error checking inventory for product ${product.id}:`, err);
        return;
      }

      if (row) {
        // Update existing inventory
        const newStock = row.current_stock + product.quantity;
        db.run('UPDATE inventory SET current_stock = ?, last_updated = CURRENT_TIMESTAMP WHERE product_id = ?', 
               [newStock, product.id], (err) => {
          if (err) {
            console.error(`Error updating inventory for product ${product.id}:`, err);
          } else {
            console.log(`✅ Updated product ${product.id}: ${row.current_stock} → ${newStock} (+${product.quantity})`);
          }
        });

        // Add stock movement record
        db.run(`INSERT INTO stock_movements (product_id, movement_type, quantity, previous_stock, new_stock, reference, notes, user_id) 
                VALUES (?, 'in', ?, ?, ?, 'INITIAL_STOCK', 'Adding initial stock for testing', 1)`,
               [product.id, product.quantity, row.current_stock, newStock], (err) => {
          if (err) {
            console.error(`Error creating stock movement for product ${product.id}:`, err);
          }
        });
      } else {
        // Create new inventory record
        db.run('INSERT INTO inventory (product_id, current_stock, last_updated) VALUES (?, ?, CURRENT_TIMESTAMP)', 
               [product.id, product.quantity], (err) => {
          if (err) {
            console.error(`Error creating inventory for product ${product.id}:`, err);
          } else {
            console.log(`✅ Created inventory for product ${product.id}: 0 → ${product.quantity} (+${product.quantity})`);
          }
        });

        // Add stock movement record
        db.run(`INSERT INTO stock_movements (product_id, movement_type, quantity, previous_stock, new_stock, reference, notes, user_id) 
                VALUES (?, 'in', ?, 0, ?, 'INITIAL_STOCK', 'Adding initial stock for testing', 1)`,
               [product.id, product.quantity, product.quantity], (err) => {
          if (err) {
            console.error(`Error creating stock movement for product ${product.id}:`, err);
          }
        });
      }
    });
  });

  // Wait a bit then check final results
  setTimeout(() => {
    console.log('\nFinal inventory status:');
    db.all(`SELECT p.id, p.name, p.sku, i.current_stock 
            FROM products p 
            LEFT JOIN inventory i ON p.id = i.product_id 
            WHERE p.id IN (1,2,3,4,5,6,7) 
            ORDER BY p.id`, (err, rows) => {
      if (err) {
        console.error('Error fetching final inventory:', err);
      } else {
        console.table(rows);
      }
      
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Stock addition completed!');
        }
      });
    });
  }, 1000);
});
