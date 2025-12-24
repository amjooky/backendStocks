import express from 'express';
import Message from '../models/Message.js';
import Chat from '../models/Chat.js';
import { authenticate, validateChatAccess } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get messages for a chat
router.get('/chat/:chatId', validateChatAccess, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50, before } = req.query;
    
    const query = {
      chat: chatId,
      isDeleted: false
    };
    
    // If 'before' timestamp is provided, get messages before that time
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }
    
    const messages = await Message.findChatMessages(chatId, parseInt(page), parseInt(limit));
    
    // Reverse to get chronological order
    messages.reverse();
    
    res.json({ 
      messages,
      hasMore: messages.length === parseInt(limit)
    });
    
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Failed to get messages' });
  }
});

// Get unread messages for current user
router.get('/unread', async (req, res) => {
  try {
    const { chatId } = req.query;
    
    const messages = await Message.findUnreadMessages(req.user._id, chatId);
    
    res.json({ messages });
    
  } catch (error) {
    console.error('Get unread messages error:', error);
    res.status(500).json({ message: 'Failed to get unread messages' });
  }
});

// Get mentions for current user
router.get('/mentions', async (req, res) => {
  try {
    const { read = false } = req.query;
    
    const mentions = await Message.findUserMentions(req.user._id, read === 'true');
    
    res.json({ mentions });
    
  } catch (error) {
    console.error('Get mentions error:', error);
    res.status(500).json({ message: 'Failed to get mentions' });
  }
});

// Search messages in a chat
router.get('/search/:chatId', validateChatAccess, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { q: searchTerm, type, after, before } = req.query;
    
    if (!searchTerm) {
      return res.status(400).json({ message: 'Search term is required' });
    }
    
    let query = {
      chat: chatId,
      isDeleted: false,
      $or: [
        { 'content.text': new RegExp(searchTerm, 'i') },
        { 'content.task.title': new RegExp(searchTerm, 'i') },
        { 'content.task.description': new RegExp(searchTerm, 'i') }
      ]
    };
    
    // Filter by message type
    if (type) {
      query.type = type;
    }
    
    // Date filters
    if (after || before) {
      query.createdAt = {};
      if (after) query.createdAt.$gte = new Date(after);
      if (before) query.createdAt.$lte = new Date(before);
    }
    
    const messages = await Message.find(query)
      .populate('sender', 'name profilePhoto')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json({ messages });
    
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({ message: 'Failed to search messages' });
  }
});

// Get message by ID
router.get('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findById(messageId)
      .populate('sender', 'name profilePhoto')
      .populate('chat', 'name type participants')
      .populate('replyTo.sender', 'name')
      .populate('metadata.mentions.user', 'name')
      .populate('readBy.user', 'name');
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Check if user has access to the chat
    const isParticipant = message.chat.participants.some(
      p => p.user.toString() === req.user._id.toString()
    );
    
    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json({ message });
    
  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({ message: 'Failed to get message' });
  }
});

// Edit message
router.put('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Check if user owns the message
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'You can only edit your own messages' 
      });
    }
    
    // Check if message can be edited (within time limit, e.g., 15 minutes)
    const editTimeLimit = 15 * 60 * 1000; // 15 minutes
    const timeSinceCreation = new Date() - message.createdAt;
    
    if (timeSinceCreation > editTimeLimit) {
      return res.status(400).json({ 
        message: 'Message can only be edited within 15 minutes of creation' 
      });
    }
    
    // Only text messages can be edited
    if (message.type !== 'text') {
      return res.status(400).json({ 
        message: 'Only text messages can be edited' 
      });
    }
    
    await message.editMessage(content);
    
    // Populate for response
    await message.populate('sender', 'name profilePhoto');
    
    res.json({
      message: 'Message edited successfully',
      message: message
    });
    
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ message: 'Failed to edit message' });
  }
});

// Delete message
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Check if user owns the message or is admin
    if (message.sender.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'You can only delete your own messages' 
      });
    }
    
    await message.softDelete(req.user._id);
    
    res.json({ message: 'Message deleted successfully' });
    
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Failed to delete message' });
  }
});

// Add reaction to message
router.post('/:messageId/reactions', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    
    if (!emoji) {
      return res.status(400).json({ message: 'Emoji is required' });
    }
    
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Verify user has access to the chat
    const chat = await Chat.findOne({
      _id: message.chat,
      'participants.user': req.user._id
    });
    
    if (!chat) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    await message.addReaction(req.user._id, emoji);
    
    res.json({
      message: 'Reaction added successfully',
      reactions: message.metadata.reactions
    });
    
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ message: 'Failed to add reaction' });
  }
});

// Remove reaction from message
router.delete('/:messageId/reactions/:emoji', async (req, res) => {
  try {
    const { messageId, emoji } = req.params;
    
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Verify user has access to the chat
    const chat = await Chat.findOne({
      _id: message.chat,
      'participants.user': req.user._id
    });
    
    if (!chat) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    await message.removeReaction(req.user._id, emoji);
    
    res.json({
      message: 'Reaction removed successfully',
      reactions: message.metadata.reactions
    });
    
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({ message: 'Failed to remove reaction' });
  }
});

// Pin/unpin message
router.patch('/:messageId/pin', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { pinned = true } = req.body;
    
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Verify user has admin access to the chat
    const chat = await Chat.findOne({
      _id: message.chat,
      'participants.user': req.user._id
    });
    
    if (!chat) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Check if user is admin of the chat
    const userParticipant = chat.participants.find(
      p => p.user.toString() === req.user._id.toString()
    );
    
    if (userParticipant?.role !== 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Only chat administrators can pin messages' 
      });
    }
    
    message.metadata.isPinned = pinned;
    if (pinned) {
      message.metadata.pinnedBy = req.user._id;
      message.metadata.pinnedAt = new Date();
    } else {
      message.metadata.pinnedBy = undefined;
      message.metadata.pinnedAt = undefined;
    }
    
    await message.save();
    
    res.json({
      message: `Message ${pinned ? 'pinned' : 'unpinned'} successfully`,
      pinned: message.metadata.isPinned
    });
    
  } catch (error) {
    console.error('Pin message error:', error);
    res.status(500).json({ message: 'Failed to pin message' });
  }
});

// Get pinned messages for a chat
router.get('/chat/:chatId/pinned', validateChatAccess, async (req, res) => {
  try {
    const { chatId } = req.params;
    
    const messages = await Message.find({
      chat: chatId,
      'metadata.isPinned': true,
      isDeleted: false
    })
    .populate('sender', 'name profilePhoto')
    .populate('metadata.pinnedBy', 'name')
    .sort({ 'metadata.pinnedAt': -1 });
    
    res.json({ messages });
    
  } catch (error) {
    console.error('Get pinned messages error:', error);
    res.status(500).json({ message: 'Failed to get pinned messages' });
  }
});

// Mark messages as read
router.patch('/read', async (req, res) => {
  try {
    const { messageIds } = req.body;
    
    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({ 
        message: 'Message IDs array is required' 
      });
    }
    
    // Update messages
    await Message.updateMany(
      {
        _id: { $in: messageIds },
        'readBy.user': { $ne: req.user._id }
      },
      {
        $push: {
          readBy: {
            user: req.user._id,
            readAt: new Date()
          }
        }
      }
    );
    
    res.json({ 
      message: 'Messages marked as read successfully',
      count: messageIds.length
    });
    
  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({ message: 'Failed to mark messages as read' });
  }
});

export default router;