import User from '../models/User.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';

const socketHandlers = (io, socket) => {
  console.log(`Socket connected: ${socket.id} for user ${socket.userId}`);

  // Join user's rooms (their chats)
  socket.on('join_rooms', async () => {
    try {
      const userChats = await Chat.find({
        'participants.user': socket.userId,
        isActive: true
      });

      for (const chat of userChats) {
        socket.join(chat._id.toString());
        console.log(`User ${socket.userId} joined room ${chat._id}`);
      }

      // Join user's personal room for direct notifications
      socket.join(`user_${socket.userId}`);
      
      // Notify other users that this user is online
      socket.broadcast.emit('user_status_change', {
        userId: socket.userId,
        status: 'online',
        lastSeen: new Date()
      });

    } catch (error) {
      console.error('Error joining rooms:', error);
      socket.emit('error', { message: 'Failed to join chat rooms' });
    }
  });

  // Handle joining a specific chat room
  socket.on('join_chat', async (data) => {
    try {
      const { chatId } = data;
      
      // Verify user has access to this chat
      const chat = await Chat.findOne({
        _id: chatId,
        'participants.user': socket.userId,
        isActive: true
      });

      if (!chat) {
        socket.emit('error', { message: 'Access denied to chat room' });
        return;
      }

      socket.join(chatId);
      console.log(`User ${socket.userId} joined chat ${chatId}`);

      // Update user's last read timestamp for this chat
      await chat.updateLastRead(socket.userId);

      socket.emit('joined_chat', { chatId, message: 'Successfully joined chat' });

    } catch (error) {
      console.error('Error joining chat:', error);
      socket.emit('error', { message: 'Failed to join chat' });
    }
  });

  // Handle leaving a chat room
  socket.on('leave_chat', (data) => {
    try {
      const { chatId } = data;
      socket.leave(chatId);
      console.log(`User ${socket.userId} left chat ${chatId}`);
      
      socket.emit('left_chat', { chatId, message: 'Successfully left chat' });

    } catch (error) {
      console.error('Error leaving chat:', error);
      socket.emit('error', { message: 'Failed to leave chat' });
    }
  });

  // Handle sending messages
  socket.on('send_message', async (data) => {
    try {
      const { chatId, type = 'text', content, replyTo } = data;

      // Verify user has access to this chat
      const chat = await Chat.findOne({
        _id: chatId,
        'participants.user': socket.userId,
        isActive: true
      });

      if (!chat) {
        socket.emit('error', { message: 'Access denied to chat' });
        return;
      }

      // Create message
      const messageData = {
        chat: chatId,
        sender: socket.userId,
        type,
        content: {}
      };

      // Set content based on message type
      switch (type) {
        case 'text':
          messageData.content.text = content.text;
          
          // Extract mentions from message text
          const mentions = extractMentions(content.text);
          if (mentions.length > 0) {
            messageData.metadata = {
              mentions: mentions.map(mention => ({
                user: mention.userId,
                position: mention.position
              }))
            };
          }
          break;

        case 'task':
          messageData.content.task = content.task;
          break;

        default:
          socket.emit('error', { message: 'Unsupported message type' });
          return;
      }

      // Handle reply
      if (replyTo) {
        const originalMessage = await Message.findById(replyTo.messageId);
        if (originalMessage) {
          messageData.replyTo = {
            message: originalMessage._id,
            content: originalMessage.content.text || 'File/Task',
            sender: originalMessage.sender
          };
        }
      }

      const message = new Message(messageData);
      await message.save();

      // Populate message for response
      await message.populate([
        { path: 'sender', select: 'name profilePhoto' },
        { path: 'replyTo.sender', select: 'name' }
      ]);

      // Update chat's last message
      await chat.updateLastMessage(
        message.content.text || `${type} message`,
        socket.userId,
        type
      );

      // Send message to all participants in the chat
      io.to(chatId).emit('new_message', {
        message: {
          _id: message._id,
          chat: message.chat,
          sender: message.sender,
          type: message.type,
          content: message.content,
          metadata: message.metadata,
          replyTo: message.replyTo,
          createdAt: message.createdAt,
          readBy: message.readBy
        }
      });

      // Send push notifications for mentions
      if (message.metadata?.mentions) {
        for (const mention of message.metadata.mentions) {
          io.to(`user_${mention.user}`).emit('mention_notification', {
            messageId: message._id,
            chatId,
            senderId: socket.userId,
            senderName: socket.user.fullName,
            content: message.content.text
          });
        }
      }

      // Send delivery confirmation to sender
      socket.emit('message_sent', {
        tempId: data.tempId, // For client-side message matching
        messageId: message._id,
        timestamp: message.createdAt
      });

    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicators
  socket.on('typing_start', (data) => {
    try {
      const { chatId } = data;
      socket.to(chatId).emit('user_typing', {
        userId: socket.userId,
        userName: socket.user.fullName,
        chatId,
        isTyping: true
      });
    } catch (error) {
      console.error('Error handling typing start:', error);
    }
  });

  socket.on('typing_stop', (data) => {
    try {
      const { chatId } = data;
      socket.to(chatId).emit('user_typing', {
        userId: socket.userId,
        userName: socket.user.fullName,
        chatId,
        isTyping: false
      });
    } catch (error) {
      console.error('Error handling typing stop:', error);
    }
  });

  // Handle message read receipts
  socket.on('mark_messages_read', async (data) => {
    try {
      const { chatId, messageIds } = data;

      // Verify user has access to this chat
      const chat = await Chat.findOne({
        _id: chatId,
        'participants.user': socket.userId
      });

      if (!chat) {
        socket.emit('error', { message: 'Access denied to chat' });
        return;
      }

      // Mark messages as read
      await Message.updateMany(
        {
          _id: { $in: messageIds },
          chat: chatId,
          'readBy.user': { $ne: socket.userId }
        },
        {
          $push: {
            readBy: {
              user: socket.userId,
              readAt: new Date()
            }
          }
        }
      );

      // Update chat's last read timestamp
      await chat.updateLastRead(socket.userId);

      // Notify other participants about read receipts
      socket.to(chatId).emit('messages_read', {
        userId: socket.userId,
        userName: socket.user.fullName,
        messageIds,
        readAt: new Date()
      });

    } catch (error) {
      console.error('Error marking messages as read:', error);
      socket.emit('error', { message: 'Failed to mark messages as read' });
    }
  });

  // Handle message reactions
  socket.on('add_reaction', async (data) => {
    try {
      const { messageId, emoji } = data;

      const message = await Message.findById(messageId);
      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // Verify user has access to the chat
      const chat = await Chat.findOne({
        _id: message.chat,
        'participants.user': socket.userId
      });

      if (!chat) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      await message.addReaction(socket.userId, emoji);

      // Notify all participants
      io.to(message.chat.toString()).emit('reaction_added', {
        messageId,
        userId: socket.userId,
        userName: socket.user.fullName,
        emoji,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error adding reaction:', error);
      socket.emit('error', { message: 'Failed to add reaction' });
    }
  });

  socket.on('remove_reaction', async (data) => {
    try {
      const { messageId, emoji } = data;

      const message = await Message.findById(messageId);
      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // Verify user has access to the chat
      const chat = await Chat.findOne({
        _id: message.chat,
        'participants.user': socket.userId
      });

      if (!chat) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      await message.removeReaction(socket.userId, emoji);

      // Notify all participants
      io.to(message.chat.toString()).emit('reaction_removed', {
        messageId,
        userId: socket.userId,
        userName: socket.user.fullName,
        emoji,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error removing reaction:', error);
      socket.emit('error', { message: 'Failed to remove reaction' });
    }
  });

  
  
  // Request online colleagues
  socket.on('get_online_colleagues', async () => {
    try {
      const onlineColleagues = await User.find({
        _id: { $ne: socket.userId },
        status: { $in: ['online', 'away', 'busy'] },
        isActive: true
      }).select('name email profilePhoto status lastSeen role department');
      
      socket.emit('online_colleagues', {
        colleagues: onlineColleagues
      });
      
    } catch (error) {
      console.error('Error getting online colleagues:', error);
      socket.emit('error', { message: 'Failed to get online colleagues' });
    }
  });

  // Handle user status updates
  socket.on('update_status', async (data) => {
    try {
      const { status } = data;
      const validStatuses = ['online', 'away', 'busy'];
      
      if (!validStatuses.includes(status)) {
        socket.emit('error', { message: 'Invalid status' });
        return;
      }

      await socket.user.setStatus(status);

      // Broadcast status change to all users
      socket.broadcast.emit('user_status_change', {
        userId: socket.userId,
        status,
        lastSeen: new Date()
      });

    } catch (error) {
      console.error('Error updating status:', error);
      socket.emit('error', { message: 'Failed to update status' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', async (reason) => {
    try {
      console.log(`User ${socket.userId} disconnected: ${reason}`);
      
      // Set user offline
      await socket.user.setStatus('offline');

      // Notify other users
      socket.broadcast.emit('user_status_change', {
        userId: socket.userId,
        status: 'offline',
        lastSeen: new Date()
      });

    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
};

// Utility function to extract mentions from message text
function extractMentions(text) {
  const mentions = [];
  const mentionRegex = /@(\w+)/g;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push({
      username: match[1],
      position: match.index,
      userId: null // This would need to be resolved to actual user ID
    });
  }

  return mentions;
}

export default socketHandlers;