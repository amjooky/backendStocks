import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: [true, 'Chat reference is required']
  },
  
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender is required']
  },
  
  type: {
    type: String,
    enum: ['text', 'file', 'image', 'task', 'system'],
    required: [true, 'Message type is required'],
    default: 'text'
  },
  
  content: {
    // For text messages
    text: {
      type: String,
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters']
    },
    
    // For file/image messages
    file: {
      originalName: String,
      fileName: String,
      filePath: String,
      fileSize: Number,
      mimeType: String,
      url: String // For serving the file
    },
    
    // For task messages
    task: {
      title: {
        type: String,
        maxlength: [200, 'Task title cannot exceed 200 characters']
      },
      description: {
        type: String,
        maxlength: [1000, 'Task description cannot exceed 1000 characters']
      },
      assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      dueDate: Date,
      priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      },
      status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'cancelled'],
        default: 'pending'
      },
      completedAt: Date
    },
    
    // For system messages (user joined, left, etc.)
    system: {
      action: {
        type: String,
        enum: ['user_joined', 'user_left', 'chat_created', 'chat_updated', 'file_shared']
      },
      data: mongoose.Schema.Types.Mixed // Flexible data for system messages
    }
  },
  
  // Message metadata
  metadata: {
    edited: {
      isEdited: { type: Boolean, default: false },
      editedAt: Date,
      originalContent: String
    },
    
    mentions: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      position: Number // Position in the message text
    }],
    
    reactions: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      emoji: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    isPinned: {
      type: Boolean,
      default: false
    },
    
    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    pinnedAt: Date
  },
  
  // Read receipts
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Reply functionality
  replyTo: {
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    content: String, // Brief preview of the original message
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Message status
  status: {
    type: String,
    enum: ['sent', 'delivered', 'failed'],
    default: 'sent'
  },
  
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  deletedAt: Date,
  
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
  
}, {
  timestamps: true
});

// Indexes for better query performance
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ type: 1 });
messageSchema.index({ 'readBy.user': 1 });
messageSchema.index({ 'metadata.mentions.user': 1 });
messageSchema.index({ isDeleted: 1 });
messageSchema.index({ status: 1 });

// Compound indexes
messageSchema.index({ chat: 1, isDeleted: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });

// Validation based on message type
messageSchema.pre('save', function(next) {
  switch (this.type) {
    case 'text':
      if (!this.content.text || this.content.text.trim() === '') {
        return next(new Error('Text messages must have content'));
      }
      break;
    case 'file':
    case 'image':
      if (!this.content.file || !this.content.file.fileName) {
        return next(new Error('File messages must have file information'));
      }
      break;
    case 'task':
      if (!this.content.task || !this.content.task.title) {
        return next(new Error('Task messages must have a title'));
      }
      break;
    case 'system':
      if (!this.content.system || !this.content.system.action) {
        return next(new Error('System messages must have an action'));
      }
      break;
  }
  next();
});

// Method to add reaction
messageSchema.methods.addReaction = function(userId, emoji) {
  const existingReaction = this.metadata.reactions.find(
    r => r.user.toString() === userId.toString() && r.emoji === emoji
  );
  
  if (!existingReaction) {
    this.metadata.reactions.push({
      user: userId,
      emoji: emoji
    });
  }
  
  return this.save();
};

// Method to remove reaction
messageSchema.methods.removeReaction = function(userId, emoji) {
  this.metadata.reactions = this.metadata.reactions.filter(
    r => !(r.user.toString() === userId.toString() && r.emoji === emoji)
  );
  
  return this.save();
};

// Method to mark as read
messageSchema.methods.markAsRead = function(userId) {
  const existingRead = this.readBy.find(r => r.user.toString() === userId.toString());
  
  if (!existingRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method to edit message
messageSchema.methods.editMessage = function(newContent) {
  if (this.type === 'text') {
    this.metadata.edited.originalContent = this.content.text;
    this.content.text = newContent;
    this.metadata.edited.isEdited = true;
    this.metadata.edited.editedAt = new Date();
  }
  
  return this.save();
};

// Method to soft delete
messageSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  
  return this.save();
};

// Static method to find messages for a chat
messageSchema.statics.findChatMessages = function(chatId, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  
  return this.find({
    chat: chatId,
    isDeleted: false
  })
  .populate('sender', 'name profilePhoto')
  .populate('replyTo.sender', 'name')
  .populate('metadata.mentions.user', 'name')
  .populate('readBy.user', 'name')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

// Static method to find unread messages for a user
messageSchema.statics.findUnreadMessages = function(userId, chatId = null) {
  const query = {
    sender: { $ne: userId },
    'readBy.user': { $ne: userId },
    isDeleted: false
  };
  
  if (chatId) {
    query.chat = chatId;
  }
  
  return this.find(query)
    .populate('chat', 'name type')
    .populate('sender', 'name profilePhoto')
    .sort({ createdAt: -1 });
};

// Static method to find mentions for a user
messageSchema.statics.findUserMentions = function(userId, read = false) {
  const query = {
    'metadata.mentions.user': userId,
    isDeleted: false
  };
  
  if (!read) {
    query['readBy.user'] = { $ne: userId };
  }
  
  return this.find(query)
    .populate('chat', 'name type')
    .populate('sender', 'name profilePhoto')
    .sort({ createdAt: -1 });
};

// Static method to search messages
messageSchema.statics.searchMessages = function(chatId, searchTerm, userId) {
  return this.find({
    chat: chatId,
    isDeleted: false,
    $or: [
      { 'content.text': new RegExp(searchTerm, 'i') },
      { 'content.task.title': new RegExp(searchTerm, 'i') },
      { 'content.task.description': new RegExp(searchTerm, 'i') }
    ]
  })
  .populate('sender', 'name profilePhoto')
  .sort({ createdAt: -1 });
};

const Message = mongoose.model('Message', messageSchema);

export default Message;