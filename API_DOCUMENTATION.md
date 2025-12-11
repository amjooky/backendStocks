# Stock Management System API Documentation

## Overview
This is a comprehensive REST API for a stock management system with point-of-sale (POS) capabilities, inventory tracking, customer management, and analytics. The system supports multi-role authentication (Admin, Manager, Cashier) with role-based access control.

## Base URLs
- **Production**: `https://backend-production-cde7.up.railway.app`
- **Development**: `http://localhost:5000`

## Authentication
All endpoints (except login/register) require JWT authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Default Admin Credentials
- **Username**: `admin`
- **Password**: `admin123`

## User Roles & Permissions
- **Admin**: Full system access, user management
- **Manager**: Product management, inventory operations, reports  
- **Cashier**: POS operations, basic customer management

---

## 📚 API Endpoints Reference

### 🔐 Authentication & Users

#### **POST** `/api/auth/login`
**Purpose**: Authenticate user and receive JWT token
```json
{
  "username": "admin",
  "password": "admin123"
}
```
**Response**: 
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "first_name": "System",
    "last_name": "Administrator"
  }
}
```

#### **POST** `/api/auth/register`
**Purpose**: Create new user account
**Access**: Open for initial setup, Admin only in production
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

#### **GET** `/api/auth/profile`
**Purpose**: Get current user profile information
**Auth**: Required

#### **POST** `/api/auth/refresh-token`
**Purpose**: Refresh JWT token
**Auth**: Required

#### **PUT** `/api/auth/change-password`
**Purpose**: Change user password
**Auth**: Required
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

#### **POST** `/api/auth/logout`
**Purpose**: Logout user (client-side token removal)
**Auth**: Required

#### **GET** `/api/auth/verify-token`
**Purpose**: Verify if current token is valid
**Auth**: Required

### 👥 User Management (Admin Only)

#### **GET** `/api/users`
**Purpose**: Get all users with pagination and filtering
**Auth**: Admin required
**Query Parameters**:
- `page` (int): Page number (default: 1)
- `limit` (int): Items per page (default: 20, max: 100)
- `role` (string): Filter by role (admin/manager/cashier)
- `active` (boolean): Filter by active status

#### **GET** `/api/users/{id}`
**Purpose**: Get user by ID with performance stats
**Auth**: Admin required

#### **POST** `/api/users`
**Purpose**: Create new user
**Auth**: Admin required
```json
{
  "username": "cashier1",
  "email": "cashier1@company.com",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Smith", 
  "role": "cashier"
}
```

#### **PUT** `/api/users/{id}`
**Purpose**: Update user information
**Auth**: Admin required

#### **DELETE** `/api/users/{id}`
**Purpose**: Soft delete user (deactivate)
**Auth**: Admin required

---

### 📦 Product Management

#### **GET** `/api/products`
**Purpose**: Get all products with advanced filtering and pagination
**Auth**: Required
**Query Parameters**:
- `page` (int): Page number (default: 1)
- `limit` (int): Items per page (default: 20, max: 100)
- `search` (string): Search by name, SKU, or barcode
- `category` (int): Filter by category ID
- `supplier` (int): Filter by supplier ID
- `lowStock` (boolean): Filter products with low stock

**Example Response**:
```json
{
  "products": [
    {
      "id": 1,
      "name": "Laptop Computer",
      "sku": "LAPTOP001",
      "barcode": "1234567890123",
      "cost_price": 500.00,
      "selling_price": 750.00,
      "price": 750.00,
      "current_stock": 10,
      "min_stock_level": 5,
      "is_low_stock": false,
      "category_name": "Electronics",
      "supplier_name": "Tech Wholesale Co.",
      "is_active": true,
      "created_at": "2024-01-01T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

#### **GET** `/api/products/{id}`
**Purpose**: Get single product with full details
**Auth**: Required

#### **GET** `/api/products/search/{term}`
**Purpose**: Quick product search for POS (returns only products with stock)
**Auth**: Required
**Example**: `/api/products/search/laptop`

#### **POST** `/api/products`
**Purpose**: Create new product with automatic inventory initialization
**Auth**: Manager+ required
```json
{
  "name": "Wireless Mouse",
  "description": "Ergonomic wireless mouse with USB receiver",
  "sku": "MOUSE001",
  "barcode": "1234567890123",
  "categoryId": 1,
  "supplierId": 2,
  "costPrice": 15.00,
  "sellingPrice": 29.99,
  "minStockLevel": 10,
  "initialStock": 50
}
```

#### **PUT** `/api/products/{id}`
**Purpose**: Update product information (does not affect stock)
**Auth**: Manager+ required

#### **DELETE** `/api/products/{id}`
**Purpose**: Soft delete product (must have zero stock)
**Auth**: Manager+ required

#### **POST** `/api/products/bulk/import`
**Purpose**: Bulk import products from array
**Auth**: Manager+ required
```json
{
  "products": [
    {
      "name": "Product 1",
      "sku": "PROD001", 
      "categoryId": 1,
      "costPrice": 10.00,
      "sellingPrice": 20.00
    }
  ]
}
```

#### **GET** `/api/products/bulk/export`
**Purpose**: Export products to CSV or JSON
**Auth**: Required
**Query Parameters**:
- `format` (string): 'json' or 'csv' (default: json)
- `category` (int): Filter by category

#### **GET** `/api/products/{id}/analytics`
**Purpose**: Get product sales analytics and performance metrics
**Auth**: Required
**Query Parameters**:
- `days` (int): Number of days for analysis (default: 30)

---

### 📊 Inventory Management

#### **GET** `/api/inventory/overview`
**Purpose**: Get inventory overview with key statistics
**Auth**: Required
**Response**:
```json
{
  "stats": {
    "total_products": 150,
    "low_stock_products": 8,
    "out_of_stock_products": 2,
    "total_inventory_value": 45000.00
  },
  "lowStockProducts": [
    {
      "id": 1,
      "name": "Product Name",
      "sku": "PROD001",
      "current_stock": 2,
      "min_stock_level": 5,
      "category_name": "Electronics"
    }
  ]
}
```

#### **GET** `/api/inventory/movements`
**Purpose**: Get stock movement history with pagination
**Auth**: Required
**Query Parameters**:
- `page` (int): Page number
- `limit` (int): Items per page (max: 100)
- `productId` (int): Filter by specific product
- `movementType` (string): 'in', 'out', 'adjustment'

#### **POST** `/api/inventory/stock-in`
**Purpose**: Add stock to inventory (receiving)
**Auth**: Manager+ required
```json
{
  "productId": 1,
  "quantity": 50,
  "costPerUnit": 15.00,
  "reference": "PO-2024-001",
  "notes": "Received from supplier"
}
```

#### **POST** `/api/inventory/stock-out`
**Purpose**: Remove stock from inventory (manual adjustment)
**Auth**: Manager+ required
```json
{
  "productId": 1,
  "quantity": 5,
  "reference": "ADJ-001",
  "notes": "Damaged goods removal"
}
```

#### **POST** `/api/inventory/stock-adjustment`
**Purpose**: Adjust stock to specific quantity
**Auth**: Manager+ required
```json
{
  "productId": 1,
  "newQuantity": 25,
  "reason": "Physical count adjustment",
  "notes": "Annual inventory count"
}
```

---

### 🛒 Sales & Point of Sale

#### **GET** `/api/sales`
**Purpose**: Get all sales with filtering and pagination
**Auth**: Required
**Query Parameters**:
- `page` (int): Page number
- `limit` (int): Items per page
- `startDate` (date): Filter sales from date (YYYY-MM-DD)
- `endDate` (date): Filter sales to date
- `cashierId` (int): Filter by cashier
- `customerId` (int): Filter by customer

#### **GET** `/api/sales/{id}`
**Purpose**: Get sale details with items and promotions
**Auth**: Required

#### **POST** `/api/sales`
**Purpose**: Process new sale/transaction (POS)
**Auth**: Required
```json
{
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "unitPrice": 29.99,
      "discountAmount": 0
    },
    {
      "productId": 2,
      "quantity": 1, 
      "unitPrice": 15.00,
      "discountAmount": 2.00
    }
  ],
  "customerId": 5,
  "paymentMethod": "card",
  "appliedPromotions": [
    {
      "promotionId": 1,
      "discountAmount": 5.00
    }
  ],
  "loyaltyPointsRedeemed": 100,
  "notes": "Customer requested gift receipt"
}
```

**Response**:
```json
{
  "message": "Sale completed successfully",
  "saleId": 123,
  "saleNumber": "S240110-456789",
  "totalAmount": 67.98,
  "receipt": {
    "sale": { /* sale details */ },
    "items": [ /* sale items */ ],
    "customer": { /* customer info */ }
  }
}
```

---

### 🏪 Categories & Suppliers

#### **GET** `/api/categories`
**Purpose**: Get all active categories
**Auth**: Required

#### **POST** `/api/categories`
**Purpose**: Create new category
**Auth**: Manager+ required
```json
{
  "name": "Electronics",
  "description": "Electronic devices and accessories"
}
```

#### **PUT** `/api/categories/{id}`
**Purpose**: Update category
**Auth**: Manager+ required

#### **DELETE** `/api/categories/{id}`
**Purpose**: Delete category (must not be used by products)
**Auth**: Manager+ required

#### **GET** `/api/suppliers`
**Purpose**: Get all active suppliers
**Auth**: Required

#### **POST** `/api/suppliers`
**Purpose**: Create new supplier
**Auth**: Manager+ required
```json
{
  "name": "Tech Wholesale Co.",
  "contactPerson": "John Smith",
  "email": "orders@techwholesale.com",
  "phone": "+1-555-0123",
  "address": "123 Business St, City, State 12345"
}
```

---

### 👤 Customer Management

#### **GET** `/api/customers`
**Purpose**: Get all customers with search and pagination
**Auth**: Required
**Query Parameters**:
- `page` (int): Page number
- `limit` (int): Items per page  
- `search` (string): Search by name, email, or phone

#### **GET** `/api/customers/{id}`
**Purpose**: Get customer details with purchase history
**Auth**: Required

#### **GET** `/api/customers/search/{term}`
**Purpose**: Quick customer search for POS
**Auth**: Required
**Example**: `/api/customers/search/john`

#### **POST** `/api/customers`
**Purpose**: Create new customer
**Auth**: Required
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1-555-0123",
  "address": "123 Main St, City, State 12345"
}
```

#### **PUT** `/api/customers/{id}`
**Purpose**: Update customer information
**Auth**: Required

#### **POST** `/api/customers/{id}/loyalty/add`
**Purpose**: Add loyalty points to customer
**Auth**: Required
```json
{
  "points": 100,
  "reason": "Purchase bonus"
}
```

#### **POST** `/api/customers/{id}/loyalty/redeem`
**Purpose**: Redeem loyalty points
**Auth**: Required
```json
{
  "points": 50,
  "reason": "Discount redemption"
}
```

---

### 💰 Cash Register (Caisse) Management

#### **GET** `/api/caisse/sessions`
**Purpose**: Get cash register sessions
**Auth**: Required

#### **POST** `/api/caisse/sessions`
**Purpose**: Open new cash register session
**Auth**: Required
```json
{
  "startingCash": 200.00,
  "notes": "Morning shift opening"
}
```

#### **PUT** `/api/caisse/sessions/{id}/close`
**Purpose**: Close cash register session
**Auth**: Required
```json
{
  "endingCash": 847.50,
  "notes": "End of shift count"
}
```

#### **GET** `/api/caisse/sessions/{id}/summary`
**Purpose**: Get session summary with transactions
**Auth**: Required

---

### 🎯 Promotions & Discounts

#### **GET** `/api/promotions`
**Purpose**: Get active promotions
**Auth**: Required

#### **POST** `/api/promotions`
**Purpose**: Create new promotion
**Auth**: Manager+ required
```json
{
  "name": "Summer Sale",
  "description": "20% off all electronics",
  "type": "percentage",
  "value": 20.0,
  "minQuantity": 1,
  "maxUses": 100,
  "startDate": "2024-06-01",
  "endDate": "2024-08-31"
}
```

#### **PUT** `/api/promotions/{id}`
**Purpose**: Update promotion
**Auth**: Manager+ required

#### **DELETE** `/api/promotions/{id}`
**Purpose**: Deactivate promotion
**Auth**: Manager+ required

---

### 📈 Reports & Analytics

#### **GET** `/api/reports/sales-summary`
**Purpose**: Get sales summary report
**Auth**: Required
**Query Parameters**:
- `startDate` (date): Report start date
- `endDate` (date): Report end date
- `groupBy` (string): 'day', 'week', 'month'

#### **GET** `/api/reports/inventory-valuation`
**Purpose**: Get inventory valuation report
**Auth**: Manager+ required

#### **GET** `/api/reports/top-selling-products`
**Purpose**: Get top-selling products report
**Auth**: Required
**Query Parameters**:
- `days` (int): Number of days to analyze (default: 30)
- `limit` (int): Number of products to return (default: 10)

#### **GET** `/api/reports/low-stock`
**Purpose**: Get low stock products report
**Auth**: Required

#### **GET** `/api/analytics/dashboard`
**Purpose**: Get dashboard analytics
**Auth**: Required
**Query Parameters**:
- `period` (string): 'today', 'week', 'month', 'year'

---

### 🔧 System & Settings

#### **GET** `/health`
**Purpose**: API health check
**Auth**: Not required
**Response**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-10T14:30:00Z",
  "environment": "production"
}
```

#### **GET** `/debug/db-status`
**Purpose**: Database status check
**Auth**: Not required (development only)

#### **GET** `/api/settings`
**Purpose**: Get system settings
**Auth**: Manager+ required

#### **PUT** `/api/settings`
**Purpose**: Update system settings
**Auth**: Admin required

---

## 🚨 Error Responses

All endpoints return consistent error responses:

```json
{
  "message": "Error description",
  "errors": [
    {
      "msg": "Field validation error",
      "param": "fieldName",
      "location": "body"
    }
  ]
}
```

### Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `500` - Internal Server Error

---

## 🔄 Typical Workflows

### **POS Transaction Flow**
1. `GET /api/customers/search/{term}` - Find customer (optional)
2. `GET /api/products/search/{term}` - Search products to add
3. `POST /api/sales` - Process complete sale
4. System automatically updates inventory

### **Inventory Management Flow**
1. `GET /api/inventory/overview` - Check current status
2. `POST /api/inventory/stock-in` - Receive new stock
3. `GET /api/inventory/movements` - Review stock movements

### **Product Management Flow** 
1. `GET /api/categories` - Get available categories
2. `GET /api/suppliers` - Get available suppliers
3. `POST /api/products` - Create product with initial stock
4. `GET /api/products` - View products with stock levels

### **Reporting Flow**
1. `GET /api/analytics/dashboard` - Get overview metrics
2. `GET /api/reports/sales-summary` - Detailed sales reports
3. `GET /api/reports/top-selling-products` - Product performance

---

## 📱 Integration Notes

### **Authentication Flow**
1. Store JWT token securely after login
2. Include in all subsequent requests: `Authorization: Bearer <token>`
3. Handle 401 responses by redirecting to login
4. Refresh token periodically using `/api/auth/refresh-token`

### **Error Handling**
- Always check response status codes
- Parse error messages for user feedback
- Handle validation errors by highlighting affected fields

### **Data Pagination**
- Most list endpoints support pagination
- Include `page` and `limit` query parameters
- Use returned `pagination` object for UI controls

### **Real-time Updates**
- Inventory levels update immediately after sales
- Stock movements are logged for all changes
- Consider implementing WebSocket connections for live updates

---

## 🔗 Interactive Documentation

Visit the full interactive API documentation with testing capabilities:
- **Production**: https://backend-production-cde7.up.railway.app/api-docs
- **Development**: http://localhost:5000/api-docs

The Swagger interface allows you to:
- Test all endpoints interactively
- View detailed request/response schemas
- Use the "Authorize" button to set your Bearer token for all requests

---

*This documentation covers all major endpoints and workflows. For the most up-to-date information, always refer to the interactive Swagger documentation.*
