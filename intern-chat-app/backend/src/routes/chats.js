import express from 'express';
import Chat from '../models/Chat.js';
import User from '../models/User.js';
import { authenticate, validateChatAccess, requireSupervisorOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get user's chats
router.get('/', async (req, res) => {
  try {
    const chats = await Chat.findUserChats(req.user._id);
    res.json({ chats });
    
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ message: 'Failed to get chats' });
  }
});

// Create individual chat
router.post('/individual', async (req, res) => {
  try {
    const { participantId } = req.body;
    
    if (!participantId) {
      return res.status(400).json({ message: 'Participant ID is required' });
    }
    
    // Check if participant exists
    const participant = await User.findById(participantId);
    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }
    
    // Can't create chat with yourself
    if (participantId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot create chat with yourself' });
    }
    
    // Find or create individual chat
    const chat = await Chat.findOrCreateIndividualChat(req.user._id, participantId);
    
    res.json({
      message: 'Chat created successfully',
      chat
    });
    
  } catch (error) {
    console.error('Create individual chat error:', error);
    res.status(500).json({ message: 'Failed to create chat' });
  }
});

// Create group chat
router.post('/group', async (req, res) => {
  try {
    const { name, description, participantIds = [] } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Group name is required' });
    }
    
    if (participantIds.length === 0) {
      return res.status(400).json({ message: 'At least one participant is required' });
    }
    
    // Verify all participants exist
    const participants = await User.find({
      _id: { $in: participantIds },
      isActive: true
    });
    
    if (participants.length !== participantIds.length) {
      return res.status(400).json({ message: 'Some participants not found' });
    }
    
    // Create chat participants array
    const chatParticipants = [
      { user: req.user._id, role: 'admin' }, // Creator is admin
      ...participantIds.map(id => ({ user: id, role: 'member' }))
    ];
    
    const chat = new Chat({
      type: 'group',
      name,
      description,
      participants: chatParticipants,
      createdBy: req.user._id
    });
    
    await chat.save();
    
    // Populate participants for response
    await chat.populate('participants.user', 'name email profilePhoto status');
    
    res.status(201).json({
      message: 'Group chat created successfully',
      chat
    });
    
  } catch (error) {
    console.error('Create group chat error:', error);
    res.status(500).json({ message: 'Failed to create group chat' });
  }
});


// Create department chat (supervisor/admin only)
router.post('/department', requireSupervisorOrAdmin, async (req, res) => {
  try {
    const { name, description, department } = req.body;
    
    if (!name || !department) {
      return res.status(400).json({ 
        message: 'Name and department are required' 
      });
    }
    
    // Get all users from the department
    const departmentUsers = await User.findByDepartment(department);
    
    if (departmentUsers.length === 0) {
      return res.status(400).json({ 
        message: 'No users found in this department' 
      });
    }
    
    // Create participants array
    const participants = departmentUsers.map(user => ({
      user: user._id,
      role: user.role === 'supervisor' || user.role === 'admin' ? 'admin' : 'member'
    }));
    
    const chat = new Chat({
      type: 'department',
      name,
      description,
      department,
      participants,
      createdBy: req.user._id
    });
    
    await chat.save();
    
    // Populate participants for response
    await chat.populate('participants.user', 'name email profilePhoto status');
    
    res.status(201).json({
      message: 'Department chat created successfully',
      chat
    });
    
  } catch (error) {
    console.error('Create department chat error:', error);
    res.status(500).json({ message: 'Failed to create department chat' });
  }
});

// Get chat details
router.get('/:chatId', validateChatAccess, async (req, res) => {
  try {
    const chat = req.chat;
    
    await chat.populate('participants.user', 'name email profilePhoto status lastSeen');
    await chat.populate('createdBy', 'name email');
    
    res.json({ chat });
    
  } catch (error) {
    console.error('Get chat details error:', error);
    res.status(500).json({ message: 'Failed to get chat details' });
  }
});

// Update chat
router.put('/:chatId', validateChatAccess, async (req, res) => {
  try {
    const { name, description, settings } = req.body;
    const chat = req.chat;
    
    // Check if user is admin of the chat
    const userParticipant = chat.participants.find(
      p => p.user.toString() === req.user._id.toString()
    );
    
    if (!userParticipant || (userParticipant.role !== 'admin' && req.user.role !== 'admin')) {
      return res.status(403).json({ 
        message: 'Only chat administrators can update chat details' 
      });
    }
    
    // Update fields
    if (name !== undefined) chat.name = name;
    if (description !== undefined) chat.description = description;
    if (settings) {
      chat.settings = { ...chat.settings.toObject(), ...settings };
    }
    
    await chat.save();
    
    res.json({
      message: 'Chat updated successfully',
      chat
    });
    
  } catch (error) {
    console.error('Update chat error:', error);
    res.status(500).json({ message: 'Failed to update chat' });
  }
});

// Add participant to chat
router.post('/:chatId/participants', validateChatAccess, async (req, res) => {
  try {
    const { userId, role = 'member' } = req.body;
    const chat = req.chat;
    
    // Check if user is admin of the chat
    const userParticipant = chat.participants.find(
      p => p.user.toString() === req.user._id.toString()
    );
    
    if (!userParticipant || (userParticipant.role !== 'admin' && req.user.role !== 'admin')) {
      return res.status(403).json({ 
        message: 'Only chat administrators can add participants' 
      });
    }
    
    // Check if user exists
    const newParticipant = await User.findById(userId);
    if (!newParticipant) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is already a participant
    const existingParticipant = chat.participants.find(
      p => p.user.toString() === userId
    );
    
    if (existingParticipant) {
      return res.status(400).json({ message: 'User is already a participant' });
    }
    
    await chat.addParticipant(userId, role);
    
    await chat.populate('participants.user', 'name email profilePhoto status');
    
    res.json({
      message: 'Participant added successfully',
      chat
    });
    
  } catch (error) {
    console.error('Add participant error:', error);
    res.status(500).json({ message: 'Failed to add participant' });
  }
});

// Remove participant from chat
router.delete('/:chatId/participants/:userId', validateChatAccess, async (req, res) => {
  try {
    const { userId } = req.params;
    const chat = req.chat;
    
    // Check if user is admin of the chat or removing themselves
    const userParticipant = chat.participants.find(
      p => p.user.toString() === req.user._id.toString()
    );
    
    const isAdmin = userParticipant?.role === 'admin' || req.user.role === 'admin';
    const isSelf = userId === req.user._id.toString();
    
    if (!isAdmin && !isSelf) {
      return res.status(403).json({ 
        message: 'You can only remove yourself or be an administrator' 
      });
    }
    
    // Can't remove from individual chats
    if (chat.type === 'individual') {
      return res.status(400).json({ 
        message: 'Cannot remove participants from individual chats' 
      });
    }
    
    await chat.removeParticipant(userId);
    
    await chat.populate('participants.user', 'name email profilePhoto status');
    
    res.json({
      message: 'Participant removed successfully',
      chat
    });
    
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({ message: 'Failed to remove participant' });
  }
});

// Archive/unarchive chat
router.patch('/:chatId/archive', validateChatAccess, async (req, res) => {
  try {
    const { archived = true } = req.body;
    const chat = req.chat;
    
    chat.settings.isArchived = archived;
    await chat.save();
    
    res.json({
      message: `Chat ${archived ? 'archived' : 'unarchived'} successfully`,
      archived: chat.settings.isArchived
    });
    
  } catch (error) {
    console.error('Archive chat error:', error);
    res.status(500).json({ message: 'Failed to archive chat' });
  }
});

// Pin/unpin chat
router.patch('/:chatId/pin', validateChatAccess, async (req, res) => {
  try {
    const { pinned = true } = req.body;
    const chat = req.chat;
    
    chat.settings.isPinned = pinned;
    await chat.save();
    
    res.json({
      message: `Chat ${pinned ? 'pinned' : 'unpinned'} successfully`,
      pinned: chat.settings.isPinned
    });
    
  } catch (error) {
    console.error('Pin chat error:', error);
    res.status(500).json({ message: 'Failed to pin chat' });
  }
});

// Leave chat
router.post('/:chatId/leave', validateChatAccess, async (req, res) => {
  try {
    const chat = req.chat;
    
    // Can't leave individual chats
    if (chat.type === 'individual') {
      return res.status(400).json({ 
        message: 'Cannot leave individual chats' 
      });
    }
    
    await chat.removeParticipant(req.user._id);
    
    res.json({
      message: 'Left chat successfully'
    });
    
  } catch (error) {
    console.error('Leave chat error:', error);
    res.status(500).json({ message: 'Failed to leave chat' });
  }
});

export default router;