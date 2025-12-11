import express from 'express';
import path from 'path';
import fs from 'fs';
import File from '../models/File.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import { authenticate, validateChatAccess } from '../middleware/auth.js';
import { 
  uploadChatFile, 
  handleUploadErrors, 
  getFileInfo,
  deleteFile,
  validateFileAccess
} from '../middleware/upload.js';
import { io } from '../server.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Upload files to a chat
router.post('/upload/:chatId', 
  validateChatAccess,
  uploadChatFile.array('files', 5),
  handleUploadErrors,
  async (req, res) => {
    try {
      const { chatId } = req.params;
      const { description } = req.body;
      const chat = req.chat;
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }
      
      const uploadedFiles = [];
      const messages = [];
      
      for (const file of req.files) {
        const fileInfo = getFileInfo(file);
        
        // Create file record
        const fileRecord = new File({
          originalName: fileInfo.originalName,
          fileName: fileInfo.fileName,
          filePath: fileInfo.filePath,
          fileSize: fileInfo.fileSize,
          mimeType: fileInfo.mimeType,
          category: fileInfo.category,
          url: fileInfo.url,
          uploadedBy: req.user._id,
          chat: chatId
        });
        
        await fileRecord.save();
        
        // Create message for the file
        const message = new Message({
          chat: chatId,
          sender: req.user._id,
          type: fileInfo.category === 'image' ? 'image' : 'file',
          content: {
            file: {
              originalName: fileInfo.originalName,
              fileName: fileInfo.fileName,
              filePath: fileInfo.filePath,
              fileSize: fileInfo.fileSize,
              mimeType: fileInfo.mimeType,
              url: fileInfo.url
            },
            text: description || `Shared ${fileInfo.category}: ${fileInfo.originalName}`
          }
        });
        
        await message.save();
        
        // Link file to message
        fileRecord.message = message._id;
        await fileRecord.save();
        
        // Populate message for response
        await message.populate('sender', 'name profilePhoto');
        
        uploadedFiles.push(fileRecord);
        messages.push(message);
      }
      
      // Update chat's last message
      const lastMessage = messages[messages.length - 1];
      await chat.updateLastMessage(
        `Shared ${uploadedFiles.length} file(s)`,
        req.user._id,
        'file'
      );
      
      // Emit to all chat participants via Socket.IO
      messages.forEach(message => {
        io.to(chatId).emit('new_message', { message });
      });
      
      res.json({
        message: 'Files uploaded successfully',
        files: uploadedFiles,
        messages: messages
      });
      
    } catch (error) {
      console.error('File upload error:', error);
      
      // Clean up uploaded files on error
      if (req.files) {
        req.files.forEach(file => {
          deleteFile(file.path);
        });
      }
      
      res.status(500).json({ message: 'Failed to upload files' });
    }
  }
);

// Get files for a chat
router.get('/chat/:chatId', validateChatAccess, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { category, page = 1, limit = 20 } = req.query;
    
    const files = await File.findChatFiles(chatId, category, parseInt(page), parseInt(limit));
    
    const total = await File.countDocuments({
      chat: chatId,
      status: 'ready',
      'expiration.isExpired': false,
      ...(category && { category })
    });
    
    res.json({
      files,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Get chat files error:', error);
    res.status(500).json({ message: 'Failed to get files' });
  }
});

// Get files uploaded by current user
router.get('/my-files', async (req, res) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;
    
    const files = await File.findUserFiles(req.user._id, category, parseInt(page), parseInt(limit));
    
    const total = await File.countDocuments({
      uploadedBy: req.user._id,
      status: 'ready',
      'expiration.isExpired': false,
      ...(category && { category })
    });
    
    res.json({
      files,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Get user files error:', error);
    res.status(500).json({ message: 'Failed to get files' });
  }
});

// Get file details
router.get('/:fileId', validateFileAccess, async (req, res) => {
  try {
    const file = req.file;
    
    await file.populate([
      { path: 'uploadedBy', select: 'name profilePhoto' },
      { path: 'chat', select: 'name type' }
    ]);
    
    res.json({ file });
    
  } catch (error) {
    console.error('Get file details error:', error);
    res.status(500).json({ message: 'Failed to get file details' });
  }
});

// Download file
router.get('/:fileId/download', validateFileAccess, async (req, res) => {
  try {
    const file = req.file;
    
    // Check if file exists on disk
    if (!fs.existsSync(file.filePath)) {
      return res.status(404).json({ 
        message: 'File not found on server' 
      });
    }
    
    // Track download
    await file.trackDownload(
      req.user._id,
      req.ip,
      req.get('User-Agent') || ''
    );
    
    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.fileSize);
    
    // Stream file
    const fileStream = fs.createReadStream(file.filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({ message: 'Failed to download file' });
  }
});

// Serve file for viewing (images, PDFs, etc.)
router.get('/:fileId/view', validateFileAccess, async (req, res) => {
  try {
    const file = req.file;
    
    // Check if file exists on disk
    if (!fs.existsSync(file.filePath)) {
      return res.status(404).json({ 
        message: 'File not found on server' 
      });
    }
    
    // Set appropriate headers for viewing
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.fileSize);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Stream file
    const fileStream = fs.createReadStream(file.filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('File view error:', error);
    res.status(500).json({ message: 'Failed to view file' });
  }
});

// Delete file
router.delete('/:fileId', validateFileAccess, async (req, res) => {
  try {
    const file = req.file;
    
    // Check if user can delete (owner or admin)
    if (file.uploadedBy.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'You can only delete your own files' 
      });
    }
    
    // Mark as expired instead of hard delete
    await file.markAsExpired();
    
    // Delete physical file
    deleteFile(file.filePath);
    
    // Delete associated message if exists
    if (file.message) {
      await Message.findByIdAndUpdate(
        file.message,
        { isDeleted: true, deletedBy: req.user._id, deletedAt: new Date() }
      );
    }
    
    res.json({ message: 'File deleted successfully' });
    
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'Failed to delete file' });
  }
});

// Search files in a chat
router.get('/search/:chatId', validateChatAccess, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { q: searchTerm, category, type } = req.query;
    
    if (!searchTerm) {
      return res.status(400).json({ message: 'Search term is required' });
    }
    
    let query = {
      chat: chatId,
      originalName: new RegExp(searchTerm, 'i'),
      status: 'ready',
      'expiration.isExpired': false
    };
    
    if (category) {
      query.category = category;
    }
    
    if (type) {
      query.mimeType = new RegExp(type, 'i');
    }
    
    const files = await File.find(query)
      .populate('uploadedBy', 'name profilePhoto')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json({ files });
    
  } catch (error) {
    console.error('Search files error:', error);
    res.status(500).json({ message: 'Failed to search files' });
  }
});

// Get file statistics for a chat
router.get('/stats/:chatId', validateChatAccess, async (req, res) => {
  try {
    const { chatId } = req.params;
    
    const stats = await File.getChatFileStats(chatId);
    
    // Calculate total files and size
    const totalStats = stats.reduce((acc, stat) => {
      acc.totalFiles += stat.count;
      acc.totalSize += stat.totalSize;
      acc.byCategory[stat._id] = {
        count: stat.count,
        size: stat.totalSize
      };
      return acc;
    }, {
      totalFiles: 0,
      totalSize: 0,
      byCategory: {}
    });
    
    res.json({ stats: totalStats });
    
  } catch (error) {
    console.error('Get file stats error:', error);
    res.status(500).json({ message: 'Failed to get file statistics' });
  }
});

// Extend file expiration (file owner or admin)
router.patch('/:fileId/extend', validateFileAccess, async (req, res) => {
  try {
    const { days = 30 } = req.body;
    const file = req.file;
    
    // Check if user can extend (owner or admin)
    if (file.uploadedBy.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'You can only extend your own files' 
      });
    }
    
    if (days < 1 || days > 365) {
      return res.status(400).json({ 
        message: 'Extension days must be between 1 and 365' 
      });
    }
    
    await file.extendExpiration(days);
    
    res.json({
      message: `File expiration extended by ${days} days`,
      expiresAt: file.expiration.expiresAt
    });
    
  } catch (error) {
    console.error('Extend file expiration error:', error);
    res.status(500).json({ message: 'Failed to extend file expiration' });
  }
});

// Get expired files (admin only)
router.get('/admin/expired', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const expiredFiles = await File.findExpiredFiles()
      .populate('uploadedBy', 'name email')
      .populate('chat', 'name type')
      .sort({ 'expiration.expiresAt': 1 });
    
    res.json({ files: expiredFiles });
    
  } catch (error) {
    console.error('Get expired files error:', error);
    res.status(500).json({ message: 'Failed to get expired files' });
  }
});

// Clean up expired files (admin only)
router.post('/admin/cleanup', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const expiredFiles = await File.findExpiredFiles();
    let cleanedCount = 0;
    
    for (const file of expiredFiles) {
      await file.markAsExpired();
      if (deleteFile(file.filePath)) {
        cleanedCount++;
      }
    }
    
    res.json({
      message: `Cleanup completed. ${cleanedCount} files processed.`,
      cleanedCount,
      totalExpired: expiredFiles.length
    });
    
  } catch (error) {
    console.error('File cleanup error:', error);
    res.status(500).json({ message: 'Failed to cleanup expired files' });
  }
});

export default router;