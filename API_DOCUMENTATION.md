# Stock Management System API Documentation

## 📋 Overview
Complete REST API for Stock Management System with Point of Sale functionality.

**Base URL:** `http://localhost:5000`  
**Swagger Documentation:** `http://localhost:5000/api-docs`  
**API Health Check:** `http://localhost:5000/health`

## 🔐 Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Default Credentials
- **Username:** `admin`
- **Password:** `admin123`
- **Role:** `admin`

---

## 🔑 Authentication Endpoints

### POST /api/auth/login
**Description:** Authenticate user and receive JWT token  
**Access:** Public  
**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```
**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@stocksystem.com",
    "first_name": "System",
    "last_name": "Administrator",
    "role": "admin",
    "is_active": 1
  }
}
```

### GET /api/auth/profile
**Description:** Get current user profile  
**Access:** Authenticated users  
**Headers:** `Authorization: Bearer <token>`  
**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@stocksystem.com",
    "first_name": "System",
    "last_name": "Administrator",
    "role": "admin"
  }
}
```

### POST /api/auth/register
**Description:** Register new user  
**Access:** Admin only  
**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "cashier"
}
```

---

## 📦 Categories Management

### GET /api/categories
**Description:** Get all active categories  
**Access:** Authenticated users  
**Response:**
```json
[
  {
    "id": 1,
    "name": "Electronics",
    "description": "Electronic devices and accessories",
    "is_active": 1,
    "created_at": "2025-09-08 08:24:44",
    "updated_at": "2025-09-08 08:24:44"
  }
]
```

### POST /api/categories
**Description:** Create new category  
**Access:** Manager+ only  
**Request Body:**
```json
{
  "name": "New Category",
  "description": "Category description"
}
```

### PUT /api/categories/:id
**Description:** Update category  
**Access:** Manager+ only  

### DELETE /api/categories/:id
**Description:** Delete category (soft delete)  
**Access:** Manager+ only  

---

## 🏪 Suppliers Management

### GET /api/suppliers
**Description:** Get all active suppliers  
**Access:** Authenticated users  

### POST /api/suppliers
**Description:** Create new supplier  
**Access:** Manager+ only  
**Request Body:**
```json
{
  "name": "Tech Wholesale Co.",
  "contactPerson": "John Smith",
  "email": "john@techwholesale.com",
  "phone": "+1234567890",
  "address": "123 Tech Street, City"
}
```

### PUT /api/suppliers/:id
**Description:** Update supplier  
**Access:** Manager+ only  

### DELETE /api/suppliers/:id
**Description:** Delete supplier (soft delete)  
**Access:** Manager+ only  

---

## 📱 Products Management

### GET /api/products
**Description:** Get products with pagination and filtering  
**Access:** Authenticated users  
**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 20, max: 100)
- `search` (string): Search by name, SKU, or barcode
- `category` (integer): Filter by category ID
- `supplier` (integer): Filter by supplier ID
- `lowStock` (boolean): Show only low stock items

**Example:** `/api/products?page=1&limit=10&search=electronics&lowStock=true`

**Response:**
```json
{
  "products": [
    {
      "id": 1,
      "name": "iPhone 14",
      "description": "Latest iPhone model",
      "sku": "IPH-14-128",
      "barcode": "1234567890123",
      "category_id": 1,
      "supplier_id": 1,
      "cost_price": 800.00,
      "selling_price": 999.00,
      "min_stock_level": 10,
      "current_stock": 25,
      "category_name": "Electronics",
      "supplier_name": "Tech Wholesale Co.",
      "is_low_stock": false,
      "is_active": 1
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

### GET /api/products/:id
**Description:** Get single product by ID  
**Access:** Authenticated users  

### GET /api/products/search/:term
**Description:** Search products for POS (only in-stock items)  
**Access:** Authenticated users  

### POST /api/products
**Description:** Create new product  
**Access:** Manager+ only  
**Request Body:**
```json
{
  "name": "iPhone 14",
  "description": "Latest iPhone model",
  "sku": "IPH-14-128",
  "barcode": "1234567890123",
  "categoryId": 1,
  "supplierId": 1,
  "costPrice": 800.00,
  "sellingPrice": 999.00,
  "minStockLevel": 10,
  "initialStock": 25
}
```

### PUT /api/products/:id
**Description:** Update product  
**Access:** Manager+ only  

### DELETE /api/products/:id
**Description:** Delete product (soft delete)  
**Access:** Manager+ only  

---

## 📊 Inventory Management

### GET /api/inventory/overview
**Description:** Get inventory overview statistics  
**Access:** Authenticated users  
**Response:**
```json
{
  "stats": {
    "total_products": 150,
    "low_stock_products": 5,
    "out_of_stock_products": 2,
    "total_inventory_value": 25000.00
  },
  "lowStockProducts": [
    {
      "id": 1,
      "name": "iPhone 14",
      "sku": "IPH-14-128",
      "current_stock": 3,
      "min_stock_level": 10,
      "category_name": "Electronics"
    }
  ]
}
```

### GET /api/inventory/movements
**Description:** Get stock movements with pagination  
**Access:** Authenticated users  
**Query Parameters:**
- `page`, `limit` (pagination)
- `productId` (integer): Filter by product
- `movementType` (string): Filter by type (in, out, adjustment)

### GET /api/inventory/low-stock
**Description:** Get all low stock products  
**Access:** Authenticated users  

### GET /api/inventory/product/:productId
**Description:** Get stock info for specific product  
**Access:** Authenticated users  

### POST /api/inventory/stock-in
**Description:** Add stock (receiving inventory)  
**Access:** Manager+ only  
**Request Body:**
```json
{
  "productId": 1,
  "quantity": 50,
  "costPerUnit": 800.00,
  "reference": "PO-2025-001",
  "notes": "Weekly restock"
}
```

### POST /api/inventory/stock-out
**Description:** Remove stock manually  
**Access:** Manager+ only  
**Request Body:**
```json
{
  "productId": 1,
  "quantity": 2,
  "reference": "DAMAGE-001",
  "notes": "Damaged items"
}
```

### POST /api/inventory/adjustment
**Description:** Adjust stock to specific level  
**Access:** Manager+ only  
**Request Body:**
```json
{
  "productId": 1,
  "newStock": 25,
  "reference": "INV-COUNT-2025",
  "notes": "Physical inventory count"
}
```

---

## 👥 Customer Management

### GET /api/customers
**Description:** Get customers with pagination and search  
**Access:** Authenticated users  
**Query Parameters:**
- `page`, `limit` (pagination)
- `search` (string): Search by name, email, or phone

### GET /api/customers/:id
**Description:** Get customer with purchase history  
**Access:** Authenticated users  

### GET /api/customers/search/:term
**Description:** Search customers for POS  
**Access:** Authenticated users  

### POST /api/customers
**Description:** Create new customer  
**Access:** Authenticated users  
**Request Body:**
```json
{
  "name": "John Customer",
  "email": "john@customer.com",
  "phone": "+1234567890",
  "address": "123 Customer St, City"
}
```

### PUT /api/customers/:id
**Description:** Update customer  
**Access:** Authenticated users  

### DELETE /api/customers/:id
**Description:** Delete customer (soft delete)  
**Access:** Manager+ only  

### POST /api/customers/:id/add-points
**Description:** Add loyalty points  
**Access:** Authenticated users  
**Request Body:**
```json
{
  "points": 100,
  "reason": "Purchase reward"
}
```

### POST /api/customers/:id/redeem-points
**Description:** Redeem loyalty points  
**Access:** Authenticated users  
**Request Body:**
```json
{
  "points": 50
}
```

---

## 🎯 Promotions Management

### GET /api/promotions
**Description:** Get all active promotions  
**Access:** Authenticated users  

### GET /api/promotions/all
**Description:** Get all promotions (including inactive)  
**Access:** Manager+ only  

### GET /api/promotions/:id
**Description:** Get promotion with applicable products  
**Access:** Authenticated users  

### POST /api/promotions/check
**Description:** Check applicable promotions for cart items  
**Access:** Authenticated users  
**Request Body:**
```json
{
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "price": 999.00
    }
  ]
}
```

### POST /api/promotions
**Description:** Create new promotion  
**Access:** Manager+ only  
**Request Body:**
```json
{
  "name": "Summer Sale",
  "description": "20% off electronics",
  "type": "percentage",
  "value": 20.00,
  "minQuantity": 1,
  "maxUses": 100,
  "startDate": "2025-06-01",
  "endDate": "2025-08-31",
  "productIds": [1, 2, 3]
}
```

**Promotion Types:**
- `percentage`: Discount by percentage
- `fixed`: Fixed amount discount
- `buy_x_get_y`: Buy X items, get Y items free

### PUT /api/promotions/:id
**Description:** Update promotion  
**Access:** Manager+ only  

### PATCH /api/promotions/:id/toggle
**Description:** Activate/deactivate promotion  
**Access:** Manager+ only  

### DELETE /api/promotions/:id
**Description:** Delete promotion  
**Access:** Manager+ only  

---

## 💰 Sales & POS

### GET /api/sales
**Description:** Get sales with pagination and filtering  
**Access:** Authenticated users  
**Query Parameters:**
- `page`, `limit` (pagination)
- `startDate`, `endDate` (date filtering)
- `cashierId`, `customerId` (filtering)

### GET /api/sales/:id
**Description:** Get sale with full details  
**Access:** Authenticated users  

### POST /api/sales
**Description:** Process a complete sale transaction  
**Access:** Authenticated users  
**Request Body:**
```json
{
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "unitPrice": 999.00,
      "discountAmount": 0
    }
  ],
  "customerId": 1,
  "paymentMethod": "card",
  "appliedPromotions": [
    {
      "promotionId": 1,
      "discountAmount": 199.80
    }
  ],
  "loyaltyPointsRedeemed": 0,
  "notes": "Customer requested gift wrap"
}
```

**Payment Methods:** `cash`, `card`, `mobile`, `mixed`

**Response:**
```json
{
  "message": "Sale completed successfully",
  "saleId": 123,
  "saleNumber": "S25090808-123456",
  "totalAmount": 1798.20,
  "itemsCount": 2,
  "sale": {
    "id": 123,
    "sale_number": "S25090808-123456",
    "customer_id": 1,
    "customer_name": "John Customer",
    "cashier_id": 1,
    "cashier_name": "admin",
    "subtotal": 1998.00,
    "discount_amount": 199.80,
    "tax_amount": 0,
    "total_amount": 1798.20,
    "payment_method": "card",
    "created_at": "2025-09-08T08:45:30.000Z"
  }
}
```

### GET /api/sales/summary/today
**Description:** Get today's sales summary  
**Access:** Authenticated users  
**Response:**
```json
{
  "summary": {
    "total_sales": 15,
    "total_revenue": 12500.00,
    "total_discounts": 1250.00,
    "average_sale": 833.33
  },
  "paymentMethods": [
    {
      "payment_method": "card",
      "count": 10,
      "total": 8500.00
    },
    {
      "payment_method": "cash",
      "count": 5,
      "total": 4000.00
    }
  ],
  "topProducts": [
    {
      "name": "iPhone 14",
      "sku": "IPH-14-128",
      "total_quantity": 8,
      "total_revenue": 7992.00
    }
  ]
}
```

### GET /api/sales/range/:startDate/:endDate
**Description:** Get sales summary by date range  
**Access:** Authenticated users  

### POST /api/sales/:id/refund
**Description:** Process sale refund  
**Access:** Manager+ only  
**Request Body:**
```json
{
  "reason": "Customer return",
  "refundItems": [
    {
      "itemId": 1,
      "quantity": 1
    }
  ]
}
```

---

## 📈 Reports & Analytics

### GET /api/reports/dashboard
**Description:** Get dashboard overview  
**Access:** Authenticated users  
**Response:**
```json
{
  "today": {
    "total_sales": 15,
    "total_revenue": 12500.00,
    "total_discounts": 1250.00
  },
  "month": {
    "total_sales": 450,
    "total_revenue": 275000.00,
    "total_discounts": 25000.00
  },
  "inventory": {
    "total_products": 150,
    "low_stock_count": 5,
    "out_of_stock_count": 2,
    "total_inventory_value": 125000.00
  },
  "topProducts": [...],
  "recentSales": [...],
  "lowStockProducts": [...]
}
```

### GET /api/reports/sales
**Description:** Generate sales report  
**Access:** Authenticated users  
**Query Parameters:**
- `startDate`, `endDate` (required)
- `groupBy` (optional): `day`, `week`, `month`

### GET /api/reports/inventory
**Description:** Generate inventory report  
**Access:** Authenticated users  

### GET /api/reports/product-performance
**Description:** Product performance analysis  
**Access:** Authenticated users  
**Query Parameters:**
- `startDate`, `endDate` (required)

### GET /api/reports/customers
**Description:** Customer analytics report  
**Access:** Manager+ only  
**Query Parameters:**
- `startDate`, `endDate` (required)

### GET /api/reports/financial
**Description:** Financial analysis report  
**Access:** Manager+ only  
**Query Parameters:**
- `startDate`, `endDate` (required)

---

## 👤 User Management

### GET /api/users
**Description:** Get all users with pagination  
**Access:** Admin only  
**Query Parameters:**
- `page`, `limit` (pagination)
- `role` (string): Filter by role
- `active` (boolean): Filter by active status

### GET /api/users/:id
**Description:** Get user with performance stats  
**Access:** Admin only  

### POST /api/users
**Description:** Create new user  
**Access:** Admin only  

### PUT /api/users/:id
**Description:** Update user  
**Access:** Admin only  

### PATCH /api/users/:id/toggle
**Description:** Activate/deactivate user  
**Access:** Admin only  

### DELETE /api/users/:id
**Description:** Delete user (if no history)  
**Access:** Admin only  

### POST /api/users/:id/change-password
**Description:** Change user password  
**Access:** Admin only  

### GET /api/users/:id/performance
**Description:** Get user performance statistics  
**Access:** Admin only  
**Query Parameters:**
- `startDate`, `endDate` (optional)

---

## 🚨 Error Handling

### Standard Error Response
```json
{
  "message": "Error description",
  "errors": [
    {
      "msg": "Username is required",
      "param": "username",
      "location": "body"
    }
  ]
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `500` - Internal Server Error

---

## 🔒 User Roles & Permissions

### Admin
- Full system access
- User management
- All CRUD operations
- All reports

### Manager  
- Inventory management
- Product/supplier management
- Promotion creation
- Sales and inventory reports
- Customer management

### Cashier
- POS operations
- Customer management  
- Basic sales reports
- View inventory levels

---

## 🛠️ Technical Details

### Authentication
- JWT tokens with 24-hour expiration
- Bearer token authentication
- Role-based access control

### Database
- SQLite database
- Automatic foreign key constraints
- Indexed for performance
- Transaction support with rollback

### Features
- Input validation with express-validator
- Rate limiting (100 requests per 15 minutes)
- CORS enabled
- Security headers with Helmet
- Comprehensive error handling
- Automatic stock deduction on sales
- Loyalty points system
- Promotion engine
- Comprehensive reporting

### Performance
- Pagination on all list endpoints
- Database indexing on frequently queried fields
- Efficient SQL queries with JOINs
- Connection pooling

---

## 🧪 Testing the API

### Using curl:
```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Get products (with token)
curl -X GET http://localhost:5000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Using PowerShell:
```powershell
# Login
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Headers @{"Content-Type"="application/json"} -Body '{"username":"admin","password":"admin123"}'
$token = $response.token

# Get dashboard
Invoke-RestMethod -Uri "http://localhost:5000/api/reports/dashboard" -Headers @{"Authorization"="Bearer $token"}
```

---

**📚 For interactive testing, visit:** http://localhost:5000/api-docs

This Swagger UI provides a complete interactive interface to test all API endpoints with proper authentication and validation.
