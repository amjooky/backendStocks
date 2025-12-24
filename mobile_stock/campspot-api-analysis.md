# CampSpot API Analysis

## Overview
The CampSpot API is a comprehensive camping booking and equipment rental platform API. It provides endpoints for managing camping sites, bookings, activities, and user authentication.

**Base URL:** https://campspot-production.up.railway.app

## API Highlights

### 🏕️ **Core Features**
- **Camping Site Management** - Browse and manage camping sites (tent, RV, cabin, glamping)
- **Booking System** - Create, manage, and track reservations
- **Activity Management** - Discover and book outdoor activities
- **User Authentication** - JWT-based authentication system
- **Equipment Rental** - Rental system for camping equipment

### 🔐 **Authentication**
- Uses **JWT Bearer Token** authentication
- Register/Login endpoints available
- Protected routes require `Authorization: Bearer <token>` header

### 📍 **Rate Limiting**
- **1000 requests per 60 seconds** per IP
- Headers: `Ratelimit: limit=1000, remaining=xxx, reset=xx`

---

## 🚀 Main API Endpoints

### **Activities** (`/api/activities`)
- **GET** `/api/activities` - List all activities with filters
  - Query params: `category`, `difficulty`, `minPrice`, `maxPrice`, `page`, `limit`
- **POST** `/api/activities` - Create new activity (Admin only)
- **GET** `/api/activities/{id}` - Get specific activity
- **PUT** `/api/activities/{id}` - Update activity (Admin only)
- **DELETE** `/api/activities/{id}` - Delete activity (Admin only)
- **POST** `/api/activities/{id}/reviews` - Add review to activity

### **Authentication** (`/api/auth`)
- **POST** `/api/auth/register` - Register new user
- **POST** `/api/auth/login` - Login user
- **GET** `/api/auth/profile` - Get user profile
- **PATCH** `/api/auth/profile` - Update user profile

### **Bookings** (`/api/bookings`)
- **GET** `/api/bookings` - List user's bookings
- **POST** `/api/bookings` - Create new booking
- **GET** `/api/bookings/{id}` - Get specific booking
- **PUT** `/api/bookings/{id}` - Update booking
- **DELETE** `/api/bookings/{id}` - Cancel booking
- **POST** `/api/bookings/availability` - Check availability

### **Camping Sites** (`/api/camping-sites`)
- **GET** `/api/camping-sites` - List all sites with filters
- **POST** `/api/camping-sites` - Create new site (Admin only)
- **GET** `/api/camping-sites/{id}` - Get specific site
- **PUT** `/api/camping-sites/{id}` - Update site (Admin only)
- **DELETE** `/api/camping-sites/{id}` - Delete site (Admin only)

### **Equipment Rental** (`/api/equipment`)
- **GET** `/api/equipment` - List available equipment
- **POST** `/api/equipment` - Add new equipment (Admin only)
- **GET** `/api/equipment/{id}` - Get specific equipment
- **PUT** `/api/equipment/{id}` - Update equipment (Admin only)
- **DELETE** `/api/equipment/{id}` - Delete equipment (Admin only)
- **POST** `/api/equipment/{id}/rent` - Rent equipment

---

## 📊 Data Models

### **Activity Schema**
```json
{
  "name": "string",
  "icon": "string",
  "description": "string", 
  "duration": "string",
  "difficulty": "Easy|Beginner|Intermediate|Advanced",
  "price": "number",
  "category": "string",
  "maxParticipants": "integer",
  "equipment": ["string"],
  "rating": "number",
  "status": "active|inactive|full"
}
```

### **Camping Site Schema**
```json
{
  "name": "string",
  "description": "string",
  "type": "tent|rv|cabin|glamping",
  "location": {
    "latitude": "number",
    "longitude": "number", 
    "address": "string",
    "city": "string",
    "state": "string"
  },
  "amenities": ["string"],
  "price": {
    "amount": "number",
    "currency": "USD"
  },
  "images": ["string"],
  "maxGuests": "number",
  "rating": "number"
}
```

### **Booking Schema**
```json
{
  "userId": "string",
  "campingSiteId": "string",
  "checkInDate": "date",
  "checkOutDate": "date", 
  "numberOfGuests": "integer",
  "status": "pending|confirmed|cancelled",
  "totalPrice": "number"
}
```

---

## 🛠️ Quick Start Examples

### 1. Register & Login
```bash
# Register
curl -X POST https://campspot-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'

# Login
curl -X POST https://campspot-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com", 
    "password": "password123"
  }'
```

### 2. Browse Camping Sites
```bash
# Get all camping sites
curl https://campspot-production.up.railway.app/api/camping-sites

# Filter by type and location
curl "https://campspot-production.up.railway.app/api/camping-sites?type=cabin&city=Aspen"
```

### 3. Create Booking
```bash
curl -X POST https://campspot-production.up.railway.app/api/bookings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campingSiteId": "SITE_ID",
    "checkInDate": "2024-06-01",
    "checkOutDate": "2024-06-05", 
    "numberOfGuests": 4
  }'
```

### 4. Browse Activities
```bash
# Get activities by difficulty and category
curl "https://campspot-production.up.railway.app/api/activities?difficulty=Beginner&category=hiking&limit=10"
```

---

## 🔍 Advanced Features

- **Pagination**: Most list endpoints support `page` and `limit` parameters
- **Filtering**: Activities and camping sites have extensive filtering options
- **Reviews**: Activities support user reviews and ratings
- **Availability Checking**: Real-time availability checking for bookings
- **Equipment Integration**: Link equipment rentals with activities and bookings
- **Geolocation**: Camping sites include latitude/longitude for mapping

---

## 📝 Usage Notes

1. **Authentication Required**: Most POST/PUT/DELETE operations require authentication
2. **Admin Access**: Some operations (creating sites, activities) require admin privileges
3. **Date Formats**: Use ISO date format (YYYY-MM-DD) for dates
4. **Error Handling**: API returns standard HTTP status codes with JSON error messages
5. **Rate Limits**: Monitor rate limit headers to avoid throttling

---

## 🌟 Key Business Capabilities

- **Multi-site Management**: Support for different camping site types
- **Activity Booking**: Integrate outdoor activities with camping
- **Equipment Rental**: Full rental management system
- **User Management**: Complete user profiles and authentication
- **Review System**: User feedback and rating system
- **Real-time Availability**: Check site availability in real-time
