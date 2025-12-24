import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

// Register new user
export const register = async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      role = 'intern',
      department
    } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName || !department) {
      return res.status(400).json({
        message: 'All required fields must be provided',
        required: ['email', 'password', 'firstName', 'lastName', 'department']
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      email
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists with this email'
      });
    }

    // Create new user
    const user = new User({
      email,
      password,
      name: {
        firstName,
        lastName
      },
      role,
      department,
      verification: {
        verificationToken: uuidv4(),
        verificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    await user.save();

    // Generate token
    const token = generateToken(user);

    // Set user online
    await user.setStatus('online');

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        profilePhoto: user.profilePhoto,
        status: user.status,
        isActive: user.isActive,
        settings: user.settings
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: 'Validation error',
        errors: messages
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        message: `${field} already exists`
      });
    }

    res.status(500).json({
      message: 'Registration failed. Please try again.'
    });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier is email

    // Validation
    if (!identifier || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await User.findOne({
      email: identifier.toLowerCase(),
      isActive: true
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user);

    // Set user online and update last seen
    await user.setStatus('online');

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        profilePhoto: user.profilePhoto,
        status: user.status,
        lastSeen: user.lastSeen,
        isActive: user.isActive,
        settings: user.settings
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Login failed. Please try again.'
    });
  }
};

// Logout user
export const logout = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Set user offline
    const user = await User.findById(userId);
    if (user) {
      await user.setStatus('offline');
    }

    res.json({
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      message: 'Logout failed'
    });
  }
};

// Get current user profile
export const getProfile = async (req, res) => {
  try {
    const user = req.user;

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        profilePhoto: user.profilePhoto,
        status: user.status,
        lastSeen: user.lastSeen,
        isActive: user.isActive,
        settings: user.settings,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      message: 'Failed to get profile'
    });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const updates = req.body;

    // Remove fields that shouldn't be updated via this endpoint
    delete updates.password;
    delete updates.email;
    delete updates.role;
    delete updates.isActive;
    delete updates.verification;
    delete updates.passwordReset;

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { 
        new: true,
        runValidators: true
      }
    );

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        profilePhoto: user.profilePhoto,
        status: user.status,
        lastSeen: user.lastSeen,
        isActive: user.isActive,
        settings: user.settings,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: 'Validation error',
        errors: messages
      });
    }

    res.status(500).json({
      message: 'Failed to update profile'
    });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get user with password
    const user = await User.findById(userId).select('+password');

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      message: 'Failed to change password'
    });
  }
};

// Update user status
export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.user._id;

    // Validation
    const validStatuses = ['online', 'offline', 'away', 'busy'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: 'Invalid status. Valid statuses are: ' + validStatuses.join(', ')
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    await user.setStatus(status);

    res.json({
      message: 'Status updated successfully',
      status: user.status,
      lastSeen: user.lastSeen
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      message: 'Failed to update status'
    });
  }
};

// Verify token (for frontend to check if token is still valid)
export const verifyToken = async (req, res) => {
  try {
    // If we reach here, the token is valid (middleware passed)
    res.json({
      valid: true,
      user: {
        id: req.user._id,
        email: req.user.email,
        role: req.user.role,
        department: req.user.department
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      message: 'Token verification failed'
    });
  }
};

export default {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  updateStatus,
  verifyToken
};