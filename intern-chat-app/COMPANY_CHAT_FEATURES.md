# Company-Based Chat Features

This document outlines the new features that enable employees with the same company ID to connect and chat with each other.

## Features Implemented

### 1. User Model Updates
- Removed `unique: true` constraint from `companyId` field to allow multiple employees per company
- Added `findByCompany(companyId, excludeUserId)` static method to find colleagues

### 2. Chat Model Enhancements
- Added new chat type: `'company'`
- Added `companyId` field for company-specific chats
- Added static methods:
  - `findOrCreateCompanyChat(companyId, createdBy)` - Creates company-wide chat
  - `findCompanyChats(companyId)` - Finds all chats for a company

### 3. API Endpoints

#### Get Company Colleagues
```http
GET /api/users/company/colleagues
Authorization: Bearer <token>
Query Parameters:
  - includeOffline: boolean (default: true)
  - role: string (optional filter by role)
```

#### Get/Create Company Chat
```http
POST /api/chats/company
Authorization: Bearer <token>
```

#### List Company Chats
```http
GET /api/chats/company/list
Authorization: Bearer <token>
```

### 4. Socket Events

#### Company-Specific Events

**Join Company Room:**
```javascript
socket.emit('join_company');
```

**Leave Company Room:**
```javascript
socket.emit('leave_company');
```

**Send Company Announcement (Admin Only):**
```javascript
socket.emit('company_announcement', {
  message: 'Important company update!',
  priority: 'high' // 'normal', 'high', 'urgent'
});
```

**Get Online Colleagues:**
```javascript
socket.emit('get_online_colleagues');
```

#### Listening to Company Events

**Colleague Status Changes:**
```javascript
socket.on('colleague_status_change', (data) => {
  console.log(`${data.userName} is now ${data.status}`);
  // data: { userId, userName, companyId, status, lastSeen }
});
```

**Company Announcements:**
```javascript
socket.on('company_announcement_received', (data) => {
  console.log('Company announcement:', data.message);
  // data: { message, priority, from: {id, name}, companyId, timestamp }
});
```

**Online Colleagues List:**
```javascript
socket.on('online_colleagues', (data) => {
  console.log('Online colleagues:', data.colleagues);
  // data: { colleagues: [...], companyId }
});
```

## Usage Examples

### Frontend Implementation

#### 1. Get Company Colleagues
```javascript
const getCompanyColleagues = async () => {
  try {
    const response = await fetch('/api/users/company/colleagues', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    return data.colleagues;
  } catch (error) {
    console.error('Failed to get colleagues:', error);
  }
};
```

#### 2. Create/Get Company Chat
```javascript
const getCompanyChat = async () => {
  try {
    const response = await fetch('/api/chats/company', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    return data.chat;
  } catch (error) {
    console.error('Failed to get company chat:', error);
  }
};
```

#### 3. Socket Connection Setup
```javascript
// Initialize socket connection
const socket = io(SERVER_URL, {
  auth: {
    token: userToken
  }
});

// Join all rooms including company room
socket.emit('join_rooms');

// Listen for colleague status changes
socket.on('colleague_status_change', (data) => {
  updateColleagueStatus(data.userId, data.status);
});

// Listen for company announcements
socket.on('company_announcement_received', (data) => {
  showNotification(`Company Announcement: ${data.message}`, data.priority);
});
```

## Database Schema Changes

### User Model
```javascript
companyId: {
  type: String,
  required: [true, 'Company ID is required'],
  trim: true,
  uppercase: true
  // Removed: unique: true
}
```

### Chat Model
```javascript
type: {
  type: String,
  enum: ['individual', 'group', 'department', 'company'], // Added 'company'
  required: [true, 'Chat type is required'],
  default: 'individual'
},

companyId: {
  type: String,
  trim: true,
  uppercase: true,
  required: function() {
    return this.type === 'company';
  }
}
```

## Security Considerations

1. **Company Isolation**: Users can only see colleagues from their own company
2. **Admin Permissions**: Only admins can send company-wide announcements
3. **Chat Access**: Users automatically get access to their company chat when created
4. **Real-time Updates**: Status changes are broadcast only to company colleagues

## Error Handling

The system handles various error scenarios:
- Invalid company IDs
- Unauthorized access attempts
- Network connectivity issues
- Database connection failures

All errors are properly logged and appropriate error messages are sent to clients.

## Performance Considerations

1. **Indexing**: Added database indexes for `companyId` field
2. **Socket Rooms**: Efficient room-based broadcasting for company events
3. **Caching**: Consider implementing Redis for socket room management in production
4. **Rate Limiting**: Implement rate limiting for company announcements

## Next Steps

To fully utilize these features, you might want to consider:

1. **Frontend UI Components**:
   - Company colleague list sidebar
   - Company chat interface
   - Announcement notification system

2. **Additional Features**:
   - File sharing within company chats
   - Company directory with search
   - Company-wide polls or surveys
   - Integration with company calendar systems

3. **Administrative Features**:
   - Company analytics dashboard
   - User management for admins
   - Bulk operations for company-wide actions