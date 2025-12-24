import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['individual', 'group', 'department'],
    required: [true, 'Chat type is required'],
    default: 'individual'
  },
  
  name: {
    type: String,
    trim: true,
    maxlength: [100, 'Chat name cannot exceed 100 characters'],
    // Required only for group and department chats
    required: function() {
      return this.type === 'group' || this.type === 'department';
    }
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['member', 'admin'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastRead: {
      type: Date,
      default: Date.now
    },
    notifications: {
      type: Boolean,
      default: true
    }
  }],
  
  // For department-based chats
  department: {
    type: String,
    trim: true,
    // Required only for department chats
    required: function() {
      return this.type === 'department';
    }
  },
  
  
  // Chat settings
  settings: {
    allowFileSharing: { type: Boolean, default: true },
    allowTaskAssignment: { type: Boolean, default: true },
    retentionDays: { type: Number, default: 0 }, // 0 means no auto-deletion
    isArchived: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false }
  },
  
  // Last message info for quick access
  lastMessage: {
    content: String,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: Date,
    type: {
      type: String,
      enum: ['text', 'file', 'image', 'task'],
      default: 'text'
    }
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
  
}, {
  timestamps: true
});

// Indexes for better query performance
chatSchema.index({ 'participants.user': 1 });
chatSchema.index({ type: 1 });
chatSchema.index({ department: 1 });
chatSchema.index({ createdBy: 1 });
chatSchema.index({ 'lastMessage.timestamp': -1 });
chatSchema.index({ isActive: 1 });

// Compound indexes
chatSchema.index({ type: 1, department: 1 });
chatSchema.index({ 'participants.user': 1, isActive: 1 });

// Validation: Individual chats should have exactly 2 participants
chatSchema.pre('save', function(next) {
  if (this.type === 'individual' && this.participants.length !== 2) {
    next(new Error('Individual chats must have exactly 2 participants'));
  } else {
    next();
  }
});

// Virtual for unread message count per user
chatSchema.methods.getUnreadCount = function(userId) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (!participant) return 0;
  
  // This would typically involve querying messages, but we'll return 0 for now
  // In a real implementation, you'd count messages after participant.lastRead
  return 0;
};

// Method to add participant
chatSchema.methods.addParticipant = function(userId, role = 'member') {
  const existingParticipant = this.participants.find(p => p.user.toString() === userId.toString());
  
  if (!existingParticipant) {
    this.participants.push({
      user: userId,
      role: role,
      joinedAt: new Date(),
      lastRead: new Date()
    });
  }
  
  return this.save();
};

// Method to remove participant
chatSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(p => p.user.toString() !== userId.toString());
  return this.save();
};

// Method to update last read timestamp
chatSchema.methods.updateLastRead = function(userId) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  
  if (participant) {
    participant.lastRead = new Date();
    return this.save();
  }
  
  return Promise.reject(new Error('User is not a participant in this chat'));
};

// Method to update last message
chatSchema.methods.updateLastMessage = function(content, sender, type = 'text') {
  this.lastMessage = {
    content,
    sender,
    timestamp: new Date(),
    type
  };
  
  return this.save();
};

// Static method to find chats for a user
chatSchema.statics.findUserChats = function(userId) {
  return this.find({
    'participants.user': userId,
    isActive: true
  })
  .populate('participants.user', 'name email profilePhoto status lastSeen')
  .populate('lastMessage.sender', 'name')
  .sort({ 'lastMessage.timestamp': -1, updatedAt: -1 });
};

// Static method to find or create individual chat
chatSchema.statics.findOrCreateIndividualChat = async function(user1Id, user2Id) {
  // Look for existing individual chat between these two users
  let chat = await this.findOne({
    type: 'individual',
    'participants.user': { $all: [user1Id, user2Id] },
    isActive: true
  }).populate('participants.user', 'name email profilePhoto status lastSeen');
  
  if (!chat) {
    // Create new individual chat
    chat = await this.create({
      type: 'individual',
      participants: [
        { user: user1Id },
        { user: user2Id }
      ],
      createdBy: user1Id
    });
    
    // Populate the new chat
    chat = await this.populate(chat, {
      path: 'participants.user',
      select: 'name email profilePhoto status lastSeen'
    });
  }
  
  return chat;
};

// Static method to find department chats
chatSchema.statics.findDepartmentChats = function(department) {
  return this.find({
    type: 'department',
    department: new RegExp(department, 'i'),
    isActive: true
  })
  .populate('participants.user', 'name email profilePhoto status lastSeen')
  .populate('createdBy', 'name')
  .sort({ updatedAt: -1 });
};


const Chat = mongoose.model('Chat', chatSchema);

export default Chat;