# Stock Management System - Multi-Tenant API Documentation

## Overview

This is a complete multi-tenant stock management system with superadmin capabilities, built with Node.js, Express, and SQLite. The system supports multiple agencies with data isolation and role-based access control.

## Base URL
```
http://localhost:5000/api
```

## Authentication

All API endpoints require authentication using JWT tokens, except for the login endpoint.

### Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## Roles & Permissions

### Role Hierarchy
1. **Superadmin** - System-wide access, can manage all agencies
2. **Admin** - Full access within their agency  
3. **Manager** - Limited management access within their agency
4. **Cashier** - Basic operational access within their agency

### Data Isolation
- All data is isolated by agency (multi-tenancy)
- Users can only access data from their assigned agency
- Superadmins have access to all agencies

## Test Accounts

### Superadmin Account
```json
{
  "username": "superadmin",
  "password": "superadmin123"
}
```

### Agency Test Accounts

#### VapeShop Milano (Agency ID: 2)
```json
[
  { "username": "milano_admin", "password": "admin123", "role": "admin" },
  { "username": "milano_manager", "password": "manager123", "role": "manager" },
  { "username": "milano_cashier", "password": "cashier123", "role": "cashier" }
]
```

#### Tobacco Store Roma (Agency ID: 3)
```json
[
  { "username": "roma_admin", "password": "admin123", "role": "admin" },
  { "username": "roma_cashier", "password": "cashier123", "role": "cashier" }
]
```

#### Premium Vapes Napoli (Agency ID: 4)
```json
[
  { "username": "napoli_admin", "password": "admin123", "role": "admin" },
  { "username": "napoli_manager", "password": "manager123", "role": "manager" }
]
```

## API Endpoints

### Authentication

#### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "username": "milano_admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": 12,
    "username": "milano_admin",
    "role": "admin",
    "agency_id": 2,
    "agency_name": "VapeShop Milano"
  }
}
```

### Superadmin Routes (Superadmin Only)

#### Get All Agencies
```http
GET /api/superadmin/agencies
```

#### Get Agency Details
```http
GET /api/superadmin/agencies/{id}
```

#### Create New Agency
```http
POST /api/superadmin/agencies
```

**Request Body:**
```json
{
  "name": "New Vape Store",
  "email": "admin@newvapestore.com",
  "phone": "+39 123 456789",
  "address": "Via Example 123",
  "city": "Milano",
  "subscription_plan": "pro",
  "max_users": 10,
  "max_products": 500
}
```

#### Update Agency
```http
PUT /api/superadmin/agencies/{id}
```

#### Suspend/Reactivate Agency
```http
PATCH /api/superadmin/agencies/{id}/status
```

**Request Body:**
```json
{
  "is_active": false,
  "reason": "Payment overdue"
}
```

#### Get All Users (Cross-Agency)
```http
GET /api/superadmin/users?agency_id=2&role=admin&status=active&page=1&limit=20
```

#### Create User for Any Agency
```http
POST /api/superadmin/users
```

**Request Body:**
```json
{
  "username": "new_user",
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "role": "manager",
  "agency_id": 2
}
```

#### Update User (Any Agency)
```http
PUT /api/superadmin/users/{id}
```

#### Lock/Unlock User
```http
PATCH /api/superadmin/users/{id}/lock
```

**Request Body:**
```json
{
  "locked": true,
  "reason": "Security violation",
  "duration_hours": 24
}
```

#### Get System Analytics
```http
GET /api/superadmin/analytics
```

#### Get Audit Log
```http
GET /api/superadmin/audit-log?agency_id=2&action=login&start_date=2024-01-01&page=1&limit=50
```

### Regular API Routes (Agency-Scoped)

All these routes automatically filter data by the user's agency.

#### Categories
```http
GET /api/categories                    # Get all categories
POST /api/categories                   # Create category (Manager+)
PUT /api/categories/{id}              # Update category (Manager+)
DELETE /api/categories/{id}           # Delete category (Manager+)
```

#### Suppliers  
```http
GET /api/suppliers                     # Get all suppliers
GET /api/suppliers/{id}               # Get supplier details
POST /api/suppliers                   # Create supplier (Manager+)
PUT /api/suppliers/{id}               # Update supplier (Manager+)
DELETE /api/suppliers/{id}            # Delete supplier (Manager+)
```

#### Products
```http
GET /api/products                      # Get all products
GET /api/products/{id}                # Get product details
POST /api/products                    # Create product (Manager+)
PUT /api/products/{id}                # Update product (Manager+)
DELETE /api/products/{id}             # Delete product (Manager+)
```

#### Customers
```http
GET /api/customers                     # Get customers with pagination/search
GET /api/customers/{id}               # Get customer details
GET /api/customers/search/{term}      # Search customers for POS
POST /api/customers                   # Create customer
PUT /api/customers/{id}               # Update customer
DELETE /api/customers/{id}            # Delete customer (Manager+)
POST /api/customers/{id}/add-points   # Add loyalty points
POST /api/customers/{id}/redeem-points # Redeem loyalty points
```

#### Inventory
```http
GET /api/inventory                     # Get inventory levels
POST /api/inventory/adjust            # Adjust stock (Manager+)
GET /api/inventory/movements          # Get stock movements
```

#### Sales
```http
GET /api/sales                         # Get sales history
POST /api/sales                       # Create sale
GET /api/sales/{id}                   # Get sale details
PUT /api/sales/{id}/refund            # Process refund (Manager+)
```

#### Reports
```http
GET /api/reports/sales                # Sales reports
GET /api/reports/inventory           # Inventory reports
GET /api/reports/customers           # Customer reports
```

## Multi-Tenancy Features

### Data Isolation
- All entities (products, customers, sales, etc.) are isolated by `agency_id`
- Users can only access data from their assigned agency
- Database queries automatically filter by agency

### Agency Limits
- Each agency has configurable limits for users and products
- System enforces these limits during creation
- Superadmins can adjust limits

### Subscription Management
- Agencies have subscription plans: basic, pro, enterprise
- Different plans have different feature access
- Status tracking: active, suspended, cancelled

### Audit Logging
- All user actions are logged with timestamps
- Includes IP addresses and detailed action information
- Searchable by date, user, action type, etc.

## GDPR Compliance

### Data Processing
- Consent tracking for all users
- Data retention policies configurable per agency
- Automatic data deletion requests

### Privacy Features
- User data export capabilities
- Data deletion on request
- Consent management

## Italian Localization

### Language Support
- Default locale: Italian (it)
- Date format: DD/MM/YYYY
- Currency: EUR
- Timezone: Europe/Rome

### Business Features
- Italian tax code and VAT number support
- Local business address formats
- Italian business terminology in UI

## Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (e.g., duplicate entries)
- `429` - Too Many Requests (rate limiting)
- `500` - Internal Server Error

### Error Response Format
```json
{
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ]
}
```

## Rate Limiting

- 1000 requests per 15 minutes per IP
- Configurable via environment variables
- Bypassed for development environments

## Environment Variables

```bash
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
DB_PATH=./stock_management.db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=1000

# CORS Configuration (optional)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

## Development Tools

### API Documentation
- Interactive Swagger UI available at: `http://localhost:5000/api-docs`
- Auto-generated from route annotations

### Health Check
```http
GET /health
```

### Database Status
```http
GET /debug/db-status
```

### CORS Debug
```http
GET /debug/cors-info
```

## Sample API Calls

### Login and Get Token
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "milano_admin",
    "password": "admin123"
  }'
```

### Get Agency Products (as Milano Admin)
```bash
curl -X GET http://localhost:5000/api/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Create New Product (Manager+ only)
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Vape Product",
    "description": "Description here",
    "sku": "VP-001",
    "barcode": "1234567890",
    "category_id": 1,
    "supplier_id": 1,
    "cost_price": 10.50,
    "selling_price": 19.99,
    "min_stock_level": 5
  }'
```

### Superadmin: Get All Agencies
```bash
curl -X GET http://localhost:5000/api/superadmin/agencies \
  -H "Authorization: Bearer SUPERADMIN_JWT_TOKEN"
```

### Superadmin: Create New Agency
```bash
curl -X POST http://localhost:5000/api/superadmin/agencies \
  -H "Authorization: Bearer SUPERADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Shop",
    "email": "admin@testshop.it",
    "phone": "+39 123 456789",
    "address": "Via Test 123",
    "city": "Rome",
    "subscription_plan": "basic",
    "max_users": 5,
    "max_products": 100
  }'
```

## Security Features

### Authentication
- JWT-based authentication
- Token expiration
- Secure password hashing (bcrypt)

### Authorization
- Role-based access control
- Resource ownership validation
- Agency data isolation

### Account Security
- Account locking on failed attempts
- Password complexity requirements
- Session management

### Data Protection
- SQL injection prevention
- XSS protection via helmet
- Input validation and sanitization
- CORS configuration

## Production Deployment

### Prerequisites
- Node.js 18+
- SQLite 3
- Process manager (PM2 recommended)
- Reverse proxy (Nginx recommended)

### Configuration
1. Set production environment variables
2. Configure SSL certificates
3. Set up database backups
4. Configure log rotation
5. Set up monitoring

### Performance
- Database indexing for optimal queries
- Connection pooling
- Caching strategies for static data
- Compression middleware

## Support and Maintenance

### Monitoring
- Health check endpoints
- Audit logging
- Error tracking
- Performance metrics

### Backup Strategy
- Regular database backups
- Transaction log backups
- Recovery procedures
- Data retention policies

### Updates
- Migration scripts for database changes
- Backward compatibility considerations
- Feature flags for gradual rollouts
- Version management

---

**Last Updated:** October 2024  
**Version:** 2.0.0 (Multi-Tenant)  
**Support:** Contact system administrator for technical support