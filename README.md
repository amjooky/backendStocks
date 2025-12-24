# Stock Management Backend API

Backend API for the Stock Management System with comprehensive receipt management.

## 🚀 Quick Start

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

### Environment Variables
Copy `.env` and configure:
```bash
NODE_ENV=production
PORT=3000
FRONTEND_URL=*
```

## 📋 API Endpoints

### Receipt Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/receipts` | Create new receipt |
| GET | `/api/receipts` | Get all receipts (paginated) |
| GET | `/api/receipts/:id` | Get specific receipt |
| PUT | `/api/receipts/:id` | Update receipt |
| DELETE | `/api/receipts/:id` | Delete receipt |
| GET | `/api/receipts/stats` | Get statistics |
| POST | `/api/receipts/generate-number` | Generate receipt number |
| GET | `/api/receipts/search` | Search receipts |
| GET | `/api/receipts/export` | Export receipts |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API info |
| GET | `/api/health` | Health check |

## 🛠️ API Usage Examples

### Create Receipt
```bash
curl -X POST https://your-api.com/api/receipts \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-10-09T15:45:11.228Z",
    "items": [
      {
        "productId": 4,
        "productName": "Test Product",
        "productSku": "SKU001",
        "unitPrice": 60.0,
        "quantity": 1,
        "discount": 0.0,
        "tax": 0.0,
        "subtotal": 60.0,
        "total": 60.0
      }
    ],
    "subtotal": 60.0,
    "tax": 0.0,
    "discount": 0.0,
    "total": 60.0,
    "paymentMethod": "cash",
    "cashAmount": 100.0,
    "changeAmount": 40.0,
    "notes": "Payment confirmed via mobile POS",
    "receiptNumber": "RCP-251009-000001"
  }'
```

### Get Receipts with Filters
```bash
# Get paginated receipts
curl "https://your-api.com/api/receipts?page=1&limit=20"

# Filter by date range
curl "https://your-api.com/api/receipts?from_date=2025-10-01&to_date=2025-10-31"

# Search receipts
curl "https://your-api.com/api/receipts/search?q=RCP-251009"
```

### Generate Receipt Number
```bash
curl -X POST https://your-api.com/api/receipts/generate-number
```

### Get Statistics
```bash
curl "https://your-api.com/api/receipts/stats"
```

## 🔧 Features

- ✅ **Complete CRUD Operations** for receipts
- ✅ **Pagination & Filtering** with flexible query parameters  
- ✅ **Search Functionality** across receipt numbers, customers, and amounts
- ✅ **Statistics Dashboard** with totals, averages, and date ranges
- ✅ **Receipt Number Generation** with automatic incrementing
- ✅ **Data Validation** using Joi schemas
- ✅ **Error Handling** with consistent error responses
- ✅ **Security Middleware** (CORS, Helmet, Rate limiting)
- ✅ **Request Logging** with Morgan
- ✅ **Compression** for better performance

## 📊 Data Models

### Receipt Schema
```json
{
  "id": "string (UUID)",
  "timestamp": "string (ISO date)",
  "receiptNumber": "string",
  "items": [
    {
      "productId": "number",
      "productName": "string", 
      "productSku": "string",
      "unitPrice": "number",
      "quantity": "number",
      "discount": "number",
      "tax": "number",
      "subtotal": "number",
      "total": "number"
    }
  ],
  "customer": {
    "id": "number",
    "name": "string",
    "email": "string",
    "phone": "string"
  },
  "subtotal": "number",
  "tax": "number", 
  "discount": "number",
  "total": "number",
  "paymentMethod": "cash|card|digitalWallet|bankTransfer|split",
  "cashAmount": "number",
  "changeAmount": "number", 
  "notes": "string",
  "appliedPromotions": ["number"],
  "loyaltyPointsRedeemed": "number"
}
```

## 🚀 Deployment

### Production Deployment
For production deployment on AlmaLinux or other servers:
1. Ensure Node.js and npm are installed
2. Configure environment variables in `.env`
3. Run `npm install` and `npm start`

### Environment Variables for Production
```
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-flutter-app.com
```

## 🔒 Security Features

- **CORS** protection with configurable origins
- **Rate limiting** (100 requests per 15 minutes per IP)
- **Helmet** for security headers
- **Input validation** with Joi schemas
- **Error handling** without exposing stack traces in production

## 📈 Monitoring

Health check endpoint: `GET /api/health`
```json
{
  "status": "healthy",
  "timestamp": "2025-10-09T15:45:11.228Z",
  "uptime": 3600,
  "memory": {...},
  "environment": "production"
}
```

The API is now ready for production deployment! 🎉