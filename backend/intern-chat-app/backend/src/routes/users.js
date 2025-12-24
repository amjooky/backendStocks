import express from 'express';
import User from '../models/User.js';
import { authenticate, requireAdmin, validateDepartmentAccess } from '../middleware/auth.js';
import { uploadProfilePhoto, handleUploadErrors, getFileUrl } from '../middleware/upload.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all users (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, department, role, search } = req.query;
    const skip = (page - 1) * limit;
    
    // Build query
    const query = { isActive: true };
    
    if (department) {
      query.department = new RegExp(department, 'i');
    }
    
    if (role) {
      query.role = role;
    }
    
    if (search) {
      query.$or = [
        { 'name.firstName': new RegExp(search, 'i') },
        { 'name.lastName': new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }
    
    const users = await User.find(query)
      .select('-password')
      .sort({ 'name.firstName': 1, 'name.lastName': 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await User.countDocuments(query);
    
    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to get users' });
  }
});

// Get users by department
router.get('/department/:department', validateDepartmentAccess, async (req, res) => {
  try {
    const { department } = req.params;
    const { includeOffline = false } = req.query;
    
    const query = {
      department: new RegExp(department, 'i'),
      isActive: true
    };
    
    if (!includeOffline) {
      query.status = { $ne: 'offline' };
    }
    
    const users = await User.find(query)
      .select('name email profilePhoto status lastSeen role department')
      .sort({ status: 1, 'name.firstName': 1 });
    
    res.json({ users });
    
  } catch (error) {
    console.error('Get department users error:', error);
    res.status(500).json({ message: 'Failed to get department users' });
  }
});

// Get supervisors
router.get('/supervisors', async (req, res) => {
  try {
    const supervisors = await User.findSupervisors();
    res.json({ supervisors });
    
  } catch (error) {
    console.error('Get supervisors error:', error);
    res.status(500).json({ message: 'Failed to get supervisors' });
  }
});

// Get online users
router.get('/online', async (req, res) => {
  try {
    const users = await User.findOnlineUsers();
    res.json({ users });
    
  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({ message: 'Failed to get online users' });
  }
});

// Get colleagues (all users in the system)
router.get('/colleagues', async (req, res) => {
  try {
    const currentUser = req.user;
    const { includeOffline = true, role } = req.query;
    
    // Get all users in the system, excluding current user
    let colleagues = await User.findColleagues(currentUser._id);
    
    // Filter by role if specified
    if (role) {
      colleagues = colleagues.filter(user => user.role === role);
    }
    
    // Filter out offline users if requested
    if (includeOffline === 'false') {
      colleagues = colleagues.filter(user => user.status !== 'offline');
    }
    
    res.json({ 
      colleagues,
      totalCount: colleagues.length
    });
    
  } catch (error) {
    console.error('Get colleagues error:', error);
    res.status(500).json({ message: 'Failed to get colleagues' });
  }
});

// Search users
router.get('/search/:term', async (req, res) => {
  try {
    const { term } = req.params;
    const { department, excludeMe = true } = req.query;
    
    const query = {
      $or: [
        { 'name.firstName': new RegExp(term, 'i') },
        { 'name.lastName': new RegExp(term, 'i') },
        { email: new RegExp(term, 'i') }
      ],
      isActive: true
    };
    
    // Exclude current user
    if (excludeMe === 'true') {
      query._id = { $ne: req.user._id };
    }
    
    // Filter by department if specified
    if (department) {
      query.department = new RegExp(department, 'i');
    }
    
    const users = await User.find(query)
      .select('name email profilePhoto status department role')
      .limit(20)
      .sort({ 'name.firstName': 1 });
    
    res.json({ users });
    
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Failed to search users' });
  }
});

// Get user by ID
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if current user can view this profile
    if (userId !== req.user._id.toString() && 
        req.user.role !== 'admin' && 
        user.department !== req.user.department) {
      return res.status(403).json({ 
        message: 'Access denied. You can only view profiles from your department.' 
      });
    }
    
    res.json({ user });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to get user' });
  }
});

// Update user (admin only)
router.put('/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    
    // Remove sensitive fields
    delete updates.password;
    delete updates.verification;
    delete updates.passwordReset;
    
    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ 
      message: 'User updated successfully',
      user 
    });
    
  } catch (error) {
    console.error('Update user error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: 'Validation error',
        errors: messages
      });
    }
    
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Deactivate user (admin only)
router.delete('/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ 
      message: 'User deactivated successfully',
      user: { id: user._id, isActive: user.isActive }
    });
    
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ message: 'Failed to deactivate user' });
  }
});

// Upload profile photo
router.post('/profile-photo', 
  uploadProfilePhoto.single('photo'), 
  handleUploadErrors,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      const photoUrl = getFileUrl(req.file.filename, 'profile-photos');
      
      // Update user's profile photo
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { profilePhoto: photoUrl },
        { new: true }
      );
      
      res.json({
        message: 'Profile photo uploaded successfully',
        profilePhoto: user.profilePhoto
      });
      
    } catch (error) {
      console.error('Upload profile photo error:', error);
      res.status(500).json({ message: 'Failed to upload profile photo' });
    }
  }
);

export default router;
