import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
const chatFilesDir = path.join(uploadsDir, 'chat-files');
const profilePhotosDir = path.join(uploadsDir, 'profile-photos');

// Create directories if they don't exist
[uploadsDir, chatFilesDir, profilePhotosDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration for chat files
const chatFileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, chatFilesDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const ext = path.extname(file.originalname);
    const filename = `chat-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

// Storage configuration for profile photos
const profilePhotoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, profilePhotosDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const ext = path.extname(file.originalname);
    const filename = `profile-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'application/zip': 'zip',
    'application/x-zip-compressed': 'zip',
    'video/mp4': 'mp4',
    'video/mpeg': 'mpeg',
    'video/quicktime': 'mov',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg'
  };

  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not supported`), false);
  }
};

// File filter for profile photos only
const profilePhotoFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed for profile photos'), false);
  }
};

// Size limits
const fileSizeLimit = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB default
const profilePhotoSizeLimit = 5 * 1024 * 1024; // 5MB for profile photos

// Multer configurations
export const uploadChatFile = multer({
  storage: chatFileStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: fileSizeLimit,
    files: 5 // Maximum 5 files per request
  }
});

export const uploadProfilePhoto = multer({
  storage: profilePhotoStorage,
  fileFilter: profilePhotoFilter,
  limits: {
    fileSize: profilePhotoSizeLimit,
    files: 1
  }
});

// Memory storage for temporary file processing
export const uploadMemory = multer({
  storage: multer.memoryStorage(),
  fileFilter: fileFilter,
  limits: {
    fileSize: fileSizeLimit
  }
});

// Middleware to handle file upload errors
export const handleUploadErrors = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          message: 'File too large',
          maxSize: `${Math.round(fileSizeLimit / (1024 * 1024))}MB`
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          message: 'Too many files',
          maxFiles: 5
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          message: 'Unexpected file field'
        });
      default:
        return res.status(400).json({
          message: 'File upload error',
          error: error.message
        });
    }
  }
  
  if (error.message.includes('File type') || error.message.includes('Only image files')) {
    return res.status(400).json({
      message: error.message
    });
  }
  
  next(error);
};

// Utility function to get file URL
export const getFileUrl = (filename, type = 'chat-files') => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  return `${baseUrl}/uploads/${type}/${filename}`;
};

// Utility function to delete file
export const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`File deleted: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error deleting file: ${filePath}`, error);
    return false;
  }
};

// Utility function to get file info
export const getFileInfo = (file) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;
  
  let category = 'other';
  if (mimeType.startsWith('image/')) {
    category = 'image';
  } else if (mimeType.startsWith('video/')) {
    category = 'video';
  } else if (mimeType.startsWith('audio/')) {
    category = 'audio';
  } else if (
    mimeType.includes('pdf') || 
    mimeType.includes('document') || 
    mimeType.includes('text') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation')
  ) {
    category = 'document';
  }
  
  return {
    originalName: file.originalname,
    fileName: file.filename,
    filePath: file.path,
    fileSize: file.size,
    mimeType: file.mimetype,
    category,
    extension: ext,
    url: getFileUrl(file.filename)
  };
};

// Middleware to validate file access
export const validateFileAccess = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const userId = req.user._id;
    
    // Import File model (avoid circular dependency)
    const File = (await import('../models/File.js')).default;
    const Chat = (await import('../models/Chat.js')).default;
    
    const file = await File.findById(fileId);
    
    if (!file) {
      return res.status(404).json({ 
        message: 'File not found' 
      });
    }
    
    // Check if file is expired
    if (file.isFileExpired() || file.expiration.isExpired) {
      return res.status(410).json({ 
        message: 'File has expired' 
      });
    }
    
    // Check if user has access to the chat
    const chat = await Chat.findOne({
      _id: file.chat,
      'participants.user': userId
    });
    
    if (!chat && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Access denied to this file' 
      });
    }
    
    req.file = file;
    next();
  } catch (error) {
    console.error('File access validation error:', error);
    res.status(500).json({ 
      message: 'File access validation failed' 
    });
  }
};

export default {
  uploadChatFile,
  uploadProfilePhoto,
  uploadMemory,
  handleUploadErrors,
  getFileUrl,
  deleteFile,
  getFileInfo,
  validateFileAccess
};