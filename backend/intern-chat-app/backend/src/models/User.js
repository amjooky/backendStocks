import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      'Please provide a valid email address'
    ]
  },
  
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't include password in queries by default
  },
  
  name: {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    }
  },
  
  role: {
    type: String,
    enum: ['intern', 'supervisor', 'admin'],
    required: [true, 'Role is required'],
    default: 'intern'
  },
  
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
    maxlength: [100, 'Department name cannot exceed 100 characters']
  },
  
  profilePhoto: {
    type: String, // URL or file path
    default: null
  },
  
  status: {
    type: String,
    enum: ['online', 'offline', 'away', 'busy'],
    default: 'offline'
  },
  
  lastSeen: {
    type: Date,
    default: Date.now
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  settings: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true }
    },
    privacy: {
      showOnlineStatus: { type: Boolean, default: true },
      showLastSeen: { type: Boolean, default: true }
    }
  },
  
  // For account verification and password reset
  verification: {
    isVerified: { type: Boolean, default: false },
    verificationToken: String,
    verificationExpires: Date
  },
  
  passwordReset: {
    token: String,
    expires: Date
  }
  
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.verification;
      delete ret.passwordReset;
      return ret;
    }
  }
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ department: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.name.firstName} ${this.name.lastName}`;
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', { virtuals: true });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash password if it has been modified or is new
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Method to update last seen
userSchema.methods.updateLastSeen = function() {
  this.lastSeen = new Date();
  return this.save({ validateBeforeSave: false });
};

// Method to set user status
userSchema.methods.setStatus = function(status) {
  this.status = status;
  if (status === 'offline') {
    this.lastSeen = new Date();
  }
  return this.save({ validateBeforeSave: false });
};

// Static method to find users by department
userSchema.statics.findByDepartment = function(department) {
  return this.find({ 
    department: new RegExp(department, 'i'),
    isActive: true 
  }).select('-password');
};

// Static method to find supervisors
userSchema.statics.findSupervisors = function() {
  return this.find({ 
    role: 'supervisor',
    isActive: true 
  }).select('-password');
};

// Static method to find online users
userSchema.statics.findOnlineUsers = function() {
  return this.find({ 
    status: { $in: ['online', 'away', 'busy'] },
    isActive: true 
  }).select('-password');
};

// Static method to find all colleagues (all users in the system)
userSchema.statics.findColleagues = function(excludeUserId = null) {
  const query = {
    isActive: true
  };
  
  // Exclude a specific user if provided (useful for excluding current user)
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }
  
  return this.find(query)
    .select('name email profilePhoto status lastSeen role department')
    .sort({ 'name.firstName': 1, 'name.lastName': 1 });
};

const User = mongoose.model('User', userSchema);

export default User;