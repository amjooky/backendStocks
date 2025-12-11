import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Middleware to authenticate JWT tokens
export const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        message: 'Access denied. No token provided.' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user and attach to request
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid token. User not found.' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        message: 'Account is deactivated.' 
      });
    }

    // Update last seen
    await user.updateLastSeen();
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid token.' 
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired.' 
      });
    }
    
    console.error('Authentication error:', error);
    res.status(500).json({ 
      message: 'Authentication failed.' 
    });
  }
};

// Middleware to check user roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Access denied. Please login.' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. ${req.user.role} role is not authorized for this action.` 
      });
    }

    next();
  };
};

// Middleware specifically for admin access
export const requireAdmin = authorize('admin');

// Middleware for supervisor and admin access
export const requireSupervisorOrAdmin = authorize('supervisor', 'admin');

// Socket.IO authentication middleware
export const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    if (!user.isActive) {
      return next(new Error('Authentication error: Account is deactivated'));
    }

    // Set user online status
    await user.setStatus('online');
    
    // Attach user info to socket
    socket.userId = user._id.toString();
    socket.user = user;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new Error('Authentication error: Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      next(new Error('Authentication error: Token expired'));
    } else {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error: Authentication failed'));
    }
  }
};

// Middleware to validate department access
export const validateDepartmentAccess = async (req, res, next) => {
  try {
    const { department } = req.params;
    const user = req.user;
    
    // Admins can access all departments
    if (user.role === 'admin') {
      return next();
    }
    
    // Users can only access their own department
    if (user.department.toLowerCase() !== department.toLowerCase()) {
      return res.status(403).json({
        message: 'Access denied. You can only access your own department.'
      });
    }
    
    next();
  } catch (error) {
    console.error('Department access validation error:', error);
    res.status(500).json({ 
      message: 'Department access validation failed.' 
    });
  }
};

// Middleware to check chat access permissions
export const validateChatAccess = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;
    
    // Import Chat model (avoid circular dependency)
    const Chat = (await import('../models/Chat.js')).default;
    
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({ 
        message: 'Chat not found.' 
      });
    }
    
    // Check if user is a participant
    const isParticipant = chat.participants.some(
      participant => participant.user.toString() === userId.toString()
    );
    
    // Admins can access all chats
    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Access denied. You are not a participant in this chat.' 
      });
    }
    
    req.chat = chat;
    next();
  } catch (error) {
    console.error('Chat access validation error:', error);
    res.status(500).json({ 
      message: 'Chat access validation failed.' 
    });
  }
};

// Utility function to generate JWT token
export const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id,
      email: user.email,
      role: user.role,
      department: user.department
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRE || '30d' 
    }
  );
};

// Utility function to extract user info from token
export const extractUserFromToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export default {
  authenticate,
  authorize,
  requireAdmin,
  requireSupervisorOrAdmin,
  authenticateSocket,
  validateDepartmentAccess,
  validateChatAccess,
  generateToken,
  extractUserFromToken
};