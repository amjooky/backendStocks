# Missing Backend Endpoints - Implementation Guide

The Flutter app is currently using fallback mechanisms for these endpoints. Here are the exact specifications needed for your backend API.

## 1. Analytics Dashboard Endpoint

### `GET /api/analytics/dashboard`

**Query Parameters:**
- `period` (string, optional): 'day', 'week', 'month', 'year' (default: 'month')

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "today": {
      "totalSales": 1250.50,
      "totalOrders": 15,
      "averageOrderValue": 83.37,
      "newCustomers": 3
    },
    "month": {
      "totalSales": 45230.75,
      "totalOrders": 542,
      "averageOrderValue": 83.42,
      "newCustomers": 67
    },
    "inventory": {
      "totalProducts": 8,
      "lowStockItems": 1,
      "outOfStockItems": 1,
      "inventoryValue": 145725.0
    },
    "topProducts": [
      {
        "id": 4,
        "name": "Test scan",
        "sku": "5951146409392",
        "salesAmount": 15000.0,
        "quantitySold": 250
      },
      {
        "id": 5,
        "name": "Test",
        "sku": "6951749409392",
        "salesAmount": 8500.0,
        "quantitySold": 218
      }
    ],
    "lowStockProducts": [
      {
        "id": 8,
        "name": "Test Product",
        "sku": "TEST001",
        "current_stock": 0,
        "min_stock_level": 5,
        "category_name": "Electronics"
      }
    ]
  }
}
```

**Implementation Notes:**
- Calculate sales data from your transactions/orders table
- Get inventory stats from products table
- Top products should be based on sales volume or revenue
- Low stock products where current_stock <= min_stock_level

---

## 2. Product Performance Report Endpoint

### `GET /api/reports/performance`

**Query Parameters:**
- `start_date` (string, required): Date in YYYY-MM-DD format
- `end_date` (string, required): Date in YYYY-MM-DD format  
- `limit` (integer, optional): Number of products to return (default: 20)

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "topProducts": [
      {
        "productId": 4,
        "name": "Test scan",
        "sku": "5951146409392",
        "revenue": 15000.0,
        "cost": 4125.0,
        "profit": 10875.0,
        "quantity": 250
      },
      {
        "productId": 5,
        "name": "Test",
        "sku": "6951749409392", 
        "revenue": 8500.0,
        "cost": 5450.0,
        "profit": 3050.0,
        "quantity": 218
      }
    ],
    "lowPerforming": [
      {
        "productId": 1,
        "name": "testiiiii ypdate",
        "sku": "test",
        "revenue": 60.0,
        "cost": 100.0,
        "profit": -40.0,
        "quantity": 5
      }
    ],
    "averageRevenue": 5520.33,
    "totalProducts": 8
  }
}
```

**Implementation Notes:**
- Join products table with sales/transactions data
- Calculate revenue = selling_price * quantity_sold
- Calculate cost = cost_price * quantity_sold  
- Calculate profit = revenue - cost
- Filter by date range using transaction dates
- Order topProducts by revenue DESC
- Order lowPerforming by profit ASC (losses first)

---

## 3. Sales Summary / Financial Report Endpoint

### `GET /api/reports/sales-summary`

**Query Parameters:**
- `startDate` (string, required): Date in YYYY-MM-DD format
- `endDate` (string, required): Date in YYYY-MM-DD format
- `groupBy` (string, optional): 'day', 'week', 'month' (default: 'day')

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 45230.75,
    "totalCost": 28650.20,
    "grossProfit": 16580.55,
    "profitMargin": 36.65,
    "dailySummary": [
      {
        "date": "2025-01-15",
        "revenue": 1250.50,
        "cost": 780.25,
        "profit": 470.25,
        "transactions": 15
      },
      {
        "date": "2025-01-14", 
        "revenue": 890.75,
        "cost": 567.30,
        "profit": 323.45,
        "transactions": 12
      }
    ],
    "byCategory": [
      {
        "categoryId": 3,
        "name": "Food & Beverages",
        "revenue": 18500.0,
        "cost": 11200.0,
        "profit": 7300.0,
        "transactions": 185
      },
      {
        "categoryId": 2,
        "name": "Clothing",
        "revenue": 12750.0,
        "cost": 8100.0,
        "profit": 4650.0,
        "transactions": 98
      }
    ],
    "topProducts": [
      {
        "productId": 4,
        "name": "Test scan",
        "sku": "5951146409392",
        "revenue": 15000.0,
        "cost": 4125.0,
        "profit": 10875.0,
        "quantity": 250
      }
    ]
  }
}
```

**Implementation Notes:**
- Aggregate sales data by the specified groupBy period
- Calculate totals across the date range
- Group by categories for breakdown analysis
- Include top performing products by revenue
- Profit margin = (grossProfit / totalRevenue) * 100

---

## Database Schema Requirements

You'll need these tables to support the endpoints:

### Sales/Transactions Table
```sql
CREATE TABLE sales_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    transaction_date DATETIME NOT NULL,
    customer_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### Sales Items Table (if using order-based system)
```sql
CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL, 
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    order_date DATETIME NOT NULL,
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Implementation Priority

1. **START WITH**: `/api/analytics/dashboard` - Most important for the main dashboard
2. **THEN**: `/api/reports/sales-summary` - Needed for financial reporting  
3. **FINALLY**: `/api/reports/performance` - Nice to have for detailed analysis

---

## Sample Backend Implementation (Node.js/Express)

```javascript
// GET /api/analytics/dashboard
app.get('/api/analytics/dashboard', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Calculate date ranges based on period
    const now = new Date();
    let startDate, endDate = now;
    
    switch(period) {
      case 'day':
        startDate = new Date(now.setHours(0,0,0,0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
    }

    // Get sales data for today
    const todayStats = await getTodaySalesStats();
    
    // Get sales data for period
    const periodStats = await getPeriodSalesStats(startDate, endDate);
    
    // Get inventory stats (reuse existing logic)
    const inventoryStats = await getInventoryOverview();
    
    // Get top products by sales
    const topProducts = await getTopProductsBySales(startDate, endDate, 5);
    
    // Get low stock products (reuse existing logic) 
    const lowStockProducts = await getLowStockProducts(10);

    res.json({
      success: true,
      data: {
        today: todayStats,
        [period]: periodStats,
        inventory: inventoryStats.stats,
        topProducts,
        lowStockProducts
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

async function getTodaySalesStats() {
  const today = new Date();
  today.setHours(0,0,0,0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const result = await db.query(`
    SELECT 
      COALESCE(SUM(total_amount), 0) as totalSales,
      COUNT(*) as totalOrders,
      COALESCE(AVG(total_amount), 0) as averageOrderValue,
      COUNT(DISTINCT customer_id) as newCustomers
    FROM sales_transactions 
    WHERE transaction_date >= ? AND transaction_date < ?
  `, [today, tomorrow]);
  
  return result[0];
}

async function getTopProductsBySales(startDate, endDate, limit) {
  const result = await db.query(`
    SELECT 
      p.id,
      p.name,
      p.sku,
      SUM(st.total_amount) as salesAmount,
      SUM(st.quantity) as quantitySold
    FROM products p
    JOIN sales_transactions st ON p.id = st.product_id
    WHERE st.transaction_date >= ? AND st.transaction_date <= ?
    GROUP BY p.id, p.name, p.sku
    ORDER BY salesAmount DESC
    LIMIT ?
  `, [startDate, endDate, limit]);
  
  return result;
}
```

This guide provides everything needed to implement the missing endpoints on your backend. Once implemented, the Flutter app will automatically use the real data instead of the fallback mechanisms.