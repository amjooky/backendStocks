import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  originalName: {
    type: String,
    required: [true, 'Original file name is required'],
    trim: true,
    maxlength: [255, 'File name cannot exceed 255 characters']
  },
  
  fileName: {
    type: String,
    required: [true, 'File name is required'],
    unique: true,
    trim: true
  },
  
  filePath: {
    type: String,
    required: [true, 'File path is required']
  },
  
  url: {
    type: String,
    required: [true, 'File URL is required']
  },
  
  mimeType: {
    type: String,
    required: [true, 'MIME type is required']
  },
  
  fileSize: {
    type: Number,
    required: [true, 'File size is required'],
    min: [0, 'File size cannot be negative']
  },
  
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader is required']
  },
  
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: [true, 'Chat reference is required']
  },
  
  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  
  // File categorization
  category: {
    type: String,
    enum: ['image', 'document', 'video', 'audio', 'other'],
    required: true
  },
  
  // Metadata based on file type
  metadata: {
    // For images
    image: {
      width: Number,
      height: Number,
      format: String
    },
    
    // For videos
    video: {
      duration: Number,
      format: String,
      resolution: String
    },
    
    // For documents
    document: {
      pages: Number,
      format: String
    },
    
    // For audio
    audio: {
      duration: Number,
      format: String,
      bitrate: Number
    }
  },
  
  // File expiration settings
  expiration: {
    expiresAt: Date,
    isExpired: {
      type: Boolean,
      default: false
    },
    deletedAt: Date
  },
  
  // Download tracking
  downloads: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    downloadedAt: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String
  }],
  
  downloadCount: {
    type: Number,
    default: 0
  },
  
  // File status
  status: {
    type: String,
    enum: ['uploading', 'processing', 'ready', 'failed', 'expired'],
    default: 'ready'
  },
  
  // Security
  isPublic: {
    type: Boolean,
    default: false
  },
  
  accessLevel: {
    type: String,
    enum: ['private', 'chat', 'department', 'organization'],
    default: 'chat'
  },
  
  // Virus scan results (if implemented)
  virusScan: {
    scanned: {
      type: Boolean,
      default: false
    },
    scanDate: Date,
    isClean: {
      type: Boolean,
      default: true
    },
    scanResult: String
  }
  
}, {
  timestamps: true
});

// Indexes for better query performance
fileSchema.index({ uploadedBy: 1 });
fileSchema.index({ chat: 1 });
fileSchema.index({ message: 1 });
fileSchema.index({ category: 1 });
fileSchema.index({ mimeType: 1 });
fileSchema.index({ status: 1 });
fileSchema.index({ 'expiration.expiresAt': 1 });
fileSchema.index({ 'expiration.isExpired': 1 });

// Compound indexes
fileSchema.index({ chat: 1, category: 1, createdAt: -1 });
fileSchema.index({ uploadedBy: 1, createdAt: -1 });
fileSchema.index({ status: 1, 'expiration.isExpired': 1 });

// Virtual for file extension
fileSchema.virtual('extension').get(function() {
  return this.originalName.split('.').pop().toLowerCase();
});

// Virtual for human readable file size
fileSchema.virtual('humanFileSize').get(function() {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Ensure virtual fields are serialized
fileSchema.set('toJSON', { virtuals: true });

// Pre-save middleware to set expiration date
fileSchema.pre('save', function(next) {
  if (this.isNew && !this.expiration.expiresAt) {
    const expireDays = parseInt(process.env.FILE_EXPIRE_DAYS) || 90;
    if (expireDays > 0) {
      this.expiration.expiresAt = new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000);
    }
  }
  next();
});

// Pre-save middleware to determine file category
fileSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('mimeType')) {
    const mimeType = this.mimeType.toLowerCase();
    
    if (mimeType.startsWith('image/')) {
      this.category = 'image';
    } else if (mimeType.startsWith('video/')) {
      this.category = 'video';
    } else if (mimeType.startsWith('audio/')) {
      this.category = 'audio';
    } else if (
      mimeType.includes('pdf') || 
      mimeType.includes('document') || 
      mimeType.includes('text') ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('presentation')
    ) {
      this.category = 'document';
    } else {
      this.category = 'other';
    }
  }
  next();
});

// Method to track download
fileSchema.methods.trackDownload = function(userId, ipAddress = '', userAgent = '') {
  this.downloads.push({
    user: userId,
    downloadedAt: new Date(),
    ipAddress,
    userAgent
  });
  
  this.downloadCount += 1;
  return this.save();
};

// Method to check if file is expired
fileSchema.methods.isFileExpired = function() {
  return this.expiration.expiresAt && new Date() > this.expiration.expiresAt;
};

// Method to mark as expired
fileSchema.methods.markAsExpired = function() {
  this.expiration.isExpired = true;
  this.expiration.deletedAt = new Date();
  this.status = 'expired';
  
  return this.save();
};

// Method to extend expiration
fileSchema.methods.extendExpiration = function(days) {
  if (this.expiration.expiresAt) {
    this.expiration.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    this.expiration.isExpired = false;
    
    if (this.status === 'expired') {
      this.status = 'ready';
    }
  }
  
  return this.save();
};

// Static method to find files by chat
fileSchema.statics.findChatFiles = function(chatId, category = null, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const query = {
    chat: chatId,
    status: 'ready',
    'expiration.isExpired': false
  };
  
  if (category) {
    query.category = category;
  }
  
  return this.find(query)
    .populate('uploadedBy', 'name profilePhoto')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to find files by user
fileSchema.statics.findUserFiles = function(userId, category = null, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const query = {
    uploadedBy: userId,
    status: 'ready',
    'expiration.isExpired': false
  };
  
  if (category) {
    query.category = category;
  }
  
  return this.find(query)
    .populate('chat', 'name type')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to find expired files
fileSchema.statics.findExpiredFiles = function() {
  return this.find({
    $or: [
      { 'expiration.expiresAt': { $lt: new Date() } },
      { 'expiration.isExpired': true }
    ],
    status: { $ne: 'expired' }
  });
};

// Static method to get file statistics for a chat
fileSchema.statics.getChatFileStats = function(chatId) {
  return this.aggregate([
    {
      $match: {
        chat: new mongoose.Types.ObjectId(chatId),
        status: 'ready',
        'expiration.isExpired': false
      }
    },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalSize: { $sum: '$fileSize' }
      }
    }
  ]);
};

// Static method to search files
fileSchema.statics.searchFiles = function(chatId, searchTerm, userId) {
  return this.find({
    chat: chatId,
    originalName: new RegExp(searchTerm, 'i'),
    status: 'ready',
    'expiration.isExpired': false
  })
  .populate('uploadedBy', 'name profilePhoto')
  .sort({ createdAt: -1 });
};

const File = mongoose.model('File', fileSchema);

export default File;