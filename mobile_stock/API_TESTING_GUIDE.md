# API Testing Guide - Missing Endpoints

Use these tests to validate your backend implementations once the endpoints are ready.

## Testing Tools

You can use any of these tools to test the endpoints:
- **Postman** (recommended)
- **curl** commands
- **Thunder Client** (VS Code extension)
- **Insomnia**

## Base URL
```
https://backend-production-cde7.up.railway.app/api
```

## Authentication
Include the JWT token in all requests:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 1. Test Analytics Dashboard Endpoint

### Basic Test
```bash
curl -X GET \
  "https://backend-production-cde7.up.railway.app/api/analytics/dashboard" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test with Period Parameter
```bash
curl -X GET \
  "https://backend-production-cde7.up.railway.app/api/analytics/dashboard?period=week" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Expected Response Structure
```json
{
  "success": true,
  "data": {
    "today": { /* DashboardStats */ },
    "month": { /* DashboardStats */ },
    "inventory": { /* InventoryStats */ },
    "topProducts": [ /* Array of TopProduct */ ],
    "lowStockProducts": [ /* Array of Product */ ]
  }
}
```

### Validation Checklist
- [ ] Returns 200 status code
- [ ] Response has `success: true`
- [ ] Contains all required fields in `data` object
- [ ] `today` and period stats contain numeric values
- [ ] `inventory` matches existing `/inventory/overview` format
- [ ] `topProducts` array contains products with sales data
- [ ] `lowStockProducts` matches existing low stock format

---

## 2. Test Product Performance Report

### Basic Test
```bash
curl -X GET \
  "https://backend-production-cde7.up.railway.app/api/reports/performance?start_date=2025-01-01&end_date=2025-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test with Limit
```bash
curl -X GET \
  "https://backend-production-cde7.up.railway.app/api/reports/performance?start_date=2025-01-01&end_date=2025-01-31&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Expected Response Structure
```json
{
  "success": true,
  "data": {
    "topProducts": [ /* Array of ProductSummary */ ],
    "lowPerforming": [ /* Array of ProductSummary */ ],
    "averageRevenue": 5520.33,
    "totalProducts": 8
  }
}
```

### Validation Checklist
- [ ] Returns 200 status code with valid date range
- [ ] Returns 400 status code with invalid dates
- [ ] `topProducts` ordered by revenue (highest first)
- [ ] `lowPerforming` ordered by profit (lowest first)
- [ ] Each product has: productId, name, sku, revenue, cost, profit, quantity
- [ ] Revenue = unit_price * quantity
- [ ] Profit = revenue - cost
- [ ] Respects limit parameter

---

## 3. Test Sales Summary / Financial Report

### Basic Test
```bash
curl -X GET \
  "https://backend-production-cde7.up.railway.app/api/reports/sales-summary?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test with Grouping
```bash
curl -X GET \
  "https://backend-production-cde7.up.railway.app/api/reports/sales-summary?startDate=2025-01-01&endDate=2025-01-31&groupBy=week" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Expected Response Structure
```json
{
  "success": true,
  "data": {
    "totalRevenue": 45230.75,
    "totalCost": 28650.20,
    "grossProfit": 16580.55,
    "profitMargin": 36.65,
    "dailySummary": [ /* Array of DailySummary */ ],
    "byCategory": [ /* Array of CategorySummary */ ],
    "topProducts": [ /* Array of ProductSummary */ ]
  }
}
```

### Validation Checklist
- [ ] Returns 200 status code
- [ ] Total calculations are correct: grossProfit = totalRevenue - totalCost
- [ ] Profit margin calculation: (grossProfit / totalRevenue) * 100
- [ ] `dailySummary` respects groupBy parameter (day/week/month)
- [ ] `byCategory` includes all categories with sales
- [ ] Date filtering works correctly
- [ ] All monetary values are properly formatted (2 decimal places)

---

## 4. Integration Tests with Flutter App

Once endpoints are implemented, test integration:

### Test Dashboard Screen
1. Open Flutter app and navigate to Dashboard
2. Check that loading spinner appears briefly
3. Verify real data appears instead of fallback messages
4. Check for these elements:
   - [ ] Real sales numbers in welcome section
   - [ ] Accurate inventory stats cards
   - [ ] Top products section populated
   - [ ] Charts showing real data

### Test Reports Screens
1. Navigate to Reports section
2. Generate performance report
3. Generate financial report
4. Verify:
   - [ ] Real data loads instead of empty states
   - [ ] Charts and graphs display correctly
   - [ ] Date filtering works
   - [ ] Export functionality works

---

## 5. Error Handling Tests

### Test Invalid Parameters
```bash
# Invalid date format
curl -X GET \
  "https://backend-production-cde7.up.railway.app/api/reports/performance?start_date=invalid&end_date=2025-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Missing required parameters
curl -X GET \
  "https://backend-production-cde7.up.railway.app/api/reports/performance" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Invalid period
curl -X GET \
  "https://backend-production-cde7.up.railway.app/api/analytics/dashboard?period=invalid" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Expected Error Responses
```json
{
  "success": false,
  "message": "Invalid date format. Use YYYY-MM-DD",
  "error": "VALIDATION_ERROR"
}
```

### Error Handling Checklist
- [ ] Returns appropriate HTTP status codes (400, 401, 500)
- [ ] Error messages are clear and helpful
- [ ] Missing parameters are properly validated
- [ ] Invalid date formats are rejected
- [ ] Authentication errors are handled correctly

---

## 6. Performance Tests

### Large Date Range Test
```bash
curl -X GET \
  "https://backend-production-cde7.up.railway.app/api/reports/sales-summary?startDate=2020-01-01&endDate=2025-12-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### High Limit Test  
```bash
curl -X GET \
  "https://backend-production-cde7.up.railway.app/api/reports/performance?start_date=2025-01-01&end_date=2025-01-31&limit=1000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Performance Checklist
- [ ] Responses return within acceptable time (< 5 seconds)
- [ ] Large date ranges don't timeout
- [ ] High limits are either handled or properly capped
- [ ] Database queries are optimized with indexes
- [ ] Memory usage remains stable

---

## 7. Sample Test Data Setup

To properly test the endpoints, you'll need some sample sales data:

```sql
-- Sample sales transactions
INSERT INTO sales_transactions (product_id, quantity, unit_price, total_amount, transaction_date) VALUES
(4, 10, 60.00, 600.00, '2025-01-15 10:30:00'),
(5, 5, 39.00, 195.00, '2025-01-15 11:45:00'),
(1, 2, 12.00, 24.00, '2025-01-14 09:15:00'),
(4, 15, 60.00, 900.00, '2025-01-14 14:20:00'),
(6, 3, 60.00, 180.00, '2025-01-13 16:00:00');

-- Or if using orders system:
INSERT INTO orders (total_amount, order_date, status) VALUES
(600.00, '2025-01-15 10:30:00', 'completed'),
(219.00, '2025-01-15 11:45:00', 'completed');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES
(1, 4, 10, 60.00, 600.00),
(2, 5, 5, 39.00, 195.00),
(2, 1, 2, 12.00, 24.00);
```

---

## Quick Validation Script

Save this as `test_endpoints.sh`:

```bash
#!/bin/bash

# Set your JWT token here
TOKEN="your_jwt_token_here"
BASE_URL="https://backend-production-cde7.up.railway.app/api"

echo "Testing Analytics Dashboard..."
curl -s -X GET "$BASE_URL/analytics/dashboard" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo -e "\n\nTesting Performance Report..."
curl -s -X GET "$BASE_URL/reports/performance?start_date=2025-01-01&end_date=2025-01-31" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo -e "\n\nTesting Sales Summary..."
curl -s -X GET "$BASE_URL/reports/sales-summary?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

Run with: `chmod +x test_endpoints.sh && ./test_endpoints.sh`

This comprehensive testing guide will help you validate that the backend endpoints work correctly with your Flutter app once they're implemented.