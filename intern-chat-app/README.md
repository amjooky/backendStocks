# 💬 Intern Chat - Internal Communication Platform

A comprehensive internal chat application designed specifically for interns and supervisors to communicate effectively within the organization.

## 🚀 Features

### 👥 User Management
- **Authentication**: Secure login with email/company ID and password
- **Role-based Access**: Three user roles (Intern, Supervisor, Admin)
- **User Profiles**: Complete profiles with name, department, photo, and online status
- **Status Management**: Real-time online/offline/away/busy status indicators

### 💬 Real-time Messaging
- **1-to-1 Chats**: Direct messaging between interns and supervisors
- **Group Chats**: Create groups for projects or teams  
- **Department Chats**: Department-wide communication channels
- **Message Types**: Text, files, images, and task assignments
- **Rich Features**: Message reactions, replies, editing, and deletion
- **Read Receipts**: See when messages are read
- **Typing Indicators**: Real-time typing notifications

### 📁 File Sharing & Management
- **File Upload**: Support for documents, images, videos, and more
- **File Categories**: Automatic categorization of uploaded files
- **File Expiration**: Security feature with configurable file retention
- **Download Tracking**: Monitor file access and downloads
- **File Search**: Search files by name, type, or category

### 🔔 Advanced Features
- **@Mentions**: Mention users in group chats with notifications
- **Message Search**: Full-text search across conversations
- **Pinned Messages**: Pin important messages in chats
- **Message Filters**: Filter messages by type, date, or sender
- **Task Assignment**: Create and assign tasks through chat (optional)
- **Mobile Responsive**: Optimized for both desktop and mobile devices

### 🔐 Security & Privacy
- **JWT Authentication**: Secure token-based authentication
- **Role-based Permissions**: Granular access control
- **File Expiration**: Automatic cleanup of old files
- **Private Internal Hosting**: No external access, internal use only
- **Data Encryption**: Secure data transmission

## 🏗️ Tech Stack

### Backend
- **Framework**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.IO for real-time communication
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer for handling file uploads
- **Security**: Helmet, CORS, Rate limiting, bcrypt for password hashing

### Frontend  
- **Framework**: React with TypeScript
- **UI Library**: Material-UI (MUI)
- **State Management**: React Context + useReducer
- **Real-time**: Socket.IO Client
- **HTTP Client**: Axios
- **Routing**: React Router
- **Forms**: React Hook Form with Yup validation
- **File Upload**: React Dropzone
- **Notifications**: React Hot Toast

### Development Tools
- **Build Tool**: Vite
- **Language**: TypeScript
- **Package Manager**: npm

## 📋 Prerequisites

Before running this application, make sure you have:

- **Node.js** (v20.10.0 or higher)
- **MongoDB** (v5.0 or higher) - running locally or remote connection
- **npm** (v9.8.1 or higher)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd intern-chat-app
```

### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env file with your configuration

# Start the backend server
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start the frontend development server
npm run dev
```

### 4. Database Setup
Make sure MongoDB is running on your system. The application will create the necessary collections automatically.

## ⚙️ Configuration

### Backend Environment Variables (.env)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/intern-chat
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=30d
BCRYPT_ROUNDS=12
CORS_ORIGIN=http://localhost:3000
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
FILE_EXPIRE_DAYS=90
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### Frontend Configuration
The frontend is configured to connect to the backend at `http://localhost:5000`. Modify the proxy settings in `vite.config.ts` if needed.

## 📡 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/password` - Change password
- `PUT /api/auth/status` - Update user status

### Chat Endpoints  
- `GET /api/chats` - Get user's chats
- `POST /api/chats/individual` - Create individual chat
- `POST /api/chats/group` - Create group chat
- `POST /api/chats/department` - Create department chat
- `GET /api/chats/:chatId` - Get chat details
- `PUT /api/chats/:chatId` - Update chat
- `POST /api/chats/:chatId/participants` - Add participant
- `DELETE /api/chats/:chatId/participants/:userId` - Remove participant

### Message Endpoints
- `GET /api/messages/chat/:chatId` - Get messages for chat
- `GET /api/messages/unread` - Get unread messages
- `GET /api/messages/mentions` - Get user mentions
- `GET /api/messages/search/:chatId` - Search messages
- `PUT /api/messages/:messageId` - Edit message
- `DELETE /api/messages/:messageId` - Delete message
- `POST /api/messages/:messageId/reactions` - Add reaction
- `PATCH /api/messages/:messageId/pin` - Pin/unpin message

### File Endpoints
- `POST /api/files/upload/:chatId` - Upload files
- `GET /api/files/chat/:chatId` - Get chat files  
- `GET /api/files/:fileId` - Get file details
- `GET /api/files/:fileId/download` - Download file
- `DELETE /api/files/:fileId` - Delete file
- `GET /api/files/search/:chatId` - Search files

### User Endpoints
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/department/:department` - Get department users
- `GET /api/users/supervisors` - Get supervisors
- `GET /api/users/online` - Get online users
- `POST /api/users/profile-photo` - Upload profile photo
- `GET /api/users/search/:term` - Search users

## 🔌 Socket.IO Events

### Client to Server Events
- `join_rooms` - Join user's chat rooms
- `join_chat` - Join specific chat
- `leave_chat` - Leave chat
- `send_message` - Send message
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `mark_messages_read` - Mark messages as read
- `add_reaction` - Add emoji reaction
- `remove_reaction` - Remove emoji reaction
- `update_status` - Update user status

### Server to Client Events
- `new_message` - New message received
- `user_typing` - User typing notification
- `messages_read` - Read receipt notification
- `reaction_added` - Reaction added notification
- `reaction_removed` - Reaction removed notification
- `user_status_change` - User status changed
- `mention_notification` - User mentioned notification
- `error` - Error notification

## 🎨 UI/UX Design

The application features a modern, clean interface inspired by popular chat applications:

- **Left Sidebar**: Chat list with search and filters
- **Main Panel**: Message area with rich formatting
- **Right Panel**: Chat details and file sharing (when applicable)  
- **Top Bar**: User profile, search, and settings
- **Mobile Responsive**: Optimized layouts for different screen sizes
- **Dark/Light Theme**: User preference support (optional)

## 👥 User Roles & Permissions

### Intern
- Create individual chats with supervisors
- Participate in group and department chats
- Share files and create tasks
- View department colleagues

### Supervisor  
- All intern permissions
- Create group chats
- Create department chats
- Manage group chat members
- Admin privileges in their department

### Admin
- All supervisor permissions
- Access to all chats and users
- User management capabilities  
- File cleanup and maintenance
- System-wide settings

## 🚀 Deployment

### Development
```bash
# Backend
cd backend && npm run dev

# Frontend  
cd frontend && npm run dev
```

### Production Build
```bash
# Backend
cd backend && npm start

# Frontend
cd frontend && npm run build
cd frontend && npm run preview
```

### Docker Deployment (Optional)
```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🔧 Maintenance

### File Cleanup
The application includes automatic file expiration. Admins can also manually clean up expired files:

```bash
# Clean up expired files via API
POST /api/files/admin/cleanup
```

### Database Maintenance  
Regular MongoDB maintenance should be performed:
- Index optimization
- Old message cleanup (if needed)
- User activity monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, please contact your system administrator or create an issue in the project repository.

## 🎯 Future Enhancements

- **Video/Voice Calling**: Integration with WebRTC
- **Mobile Apps**: Native iOS and Android applications
- **Advanced Search**: Full-text search with filters
- **Integrations**: Connect with other internal tools
- **Analytics**: Chat usage and engagement metrics
- **Bot Integration**: Automated responses and workflows
- **Advanced Security**: End-to-end encryption option

---

**Happy Chatting! 💬**