import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { SocketEvents, SendMessageData, Message } from '../types';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  sendMessage: (data: SendMessageData) => void;
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
  startTyping: (chatId: string) => void;
  stopTyping: (chatId: string) => void;
  markMessagesAsRead: (chatId: string, messageIds: string[]) => void;
  addReaction: (messageId: string, emoji: string) => void;
  removeReaction: (messageId: string, emoji: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Initialize socket connection
      const token = localStorage.getItem('token');
      if (!token) return;

      socketRef.current = io('http://localhost:5000', {
        auth: {
          token,
        },
        transports: ['websocket'],
      });

      const socket = socketRef.current;

      // Connection events
      socket.on('connect', () => {
        console.log('Connected to server');
        setIsConnected(true);
        // Join user's rooms
        socket.emit('join_rooms');
      });

      socket.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason);
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
        if (error.message.includes('Authentication')) {
          toast.error('Authentication failed. Please login again.');
        }
      });

      // Chat events
      socket.on('joined_chat', (data) => {
        console.log('Joined chat:', data);
      });

      socket.on('left_chat', (data) => {
        console.log('Left chat:', data);
      });

      // Message events
      socket.on('new_message', (data) => {
        console.log('New message:', data);
        // This will be handled by the ChatContext
        window.dispatchEvent(new CustomEvent('new_message', { detail: data }));
      });

      socket.on('message_sent', (data) => {
        console.log('Message sent confirmation:', data);
        window.dispatchEvent(new CustomEvent('message_sent', { detail: data }));
      });

      // Typing events
      socket.on('user_typing', (data) => {
        console.log('User typing:', data);
        window.dispatchEvent(new CustomEvent('user_typing', { detail: data }));
      });

      // Read receipt events
      socket.on('messages_read', (data) => {
        console.log('Messages read:', data);
        window.dispatchEvent(new CustomEvent('messages_read', { detail: data }));
      });

      // Reaction events
      socket.on('reaction_added', (data) => {
        console.log('Reaction added:', data);
        window.dispatchEvent(new CustomEvent('reaction_added', { detail: data }));
      });

      socket.on('reaction_removed', (data) => {
        console.log('Reaction removed:', data);
        window.dispatchEvent(new CustomEvent('reaction_removed', { detail: data }));
      });

      // User status events
      socket.on('user_status_change', (data) => {
        console.log('User status change:', data);
        window.dispatchEvent(new CustomEvent('user_status_change', { detail: data }));
      });

      // Notification events
      socket.on('mention_notification', (data) => {
        console.log('Mention notification:', data);
        toast.success(`${data.senderName} mentioned you in a message`);
        window.dispatchEvent(new CustomEvent('mention_notification', { detail: data }));
      });

      // Error events
      socket.on('error', (data) => {
        console.error('Socket error:', data);
        toast.error(data.message || 'An error occurred');
      });

      // Listen for logout event
      const handleLogout = () => {
        if (socketRef.current) {
          console.log('User logged out, disconnecting socket');
          socketRef.current.disconnect();
          socketRef.current = null;
          setIsConnected(false);
        }
      };
      
      window.addEventListener('userLogout', handleLogout);

      return () => {
        window.removeEventListener('userLogout', handleLogout);
        socket.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      };
    } else {
      // Disconnect if not authenticated
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    }
  }, [isAuthenticated, user]);

  const sendMessage = (data: SendMessageData) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('send_message', data);
    } else {
      toast.error('Not connected to server. Please check your connection.');
    }
  };

  const joinChat = (chatId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('join_chat', { chatId });
    }
  };

  const leaveChat = (chatId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('leave_chat', { chatId });
    }
  };

  const startTyping = (chatId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing_start', { chatId });
    }
  };

  const stopTyping = (chatId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing_stop', { chatId });
    }
  };

  const markMessagesAsRead = (chatId: string, messageIds: string[]) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('mark_messages_read', { chatId, messageIds });
    }
  };

  const addReaction = (messageId: string, emoji: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('add_reaction', { messageId, emoji });
    }
  };

  const removeReaction = (messageId: string, emoji: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('remove_reaction', { messageId, emoji });
    }
  };

  const contextValue: SocketContextType = {
    socket: socketRef.current,
    isConnected,
    sendMessage,
    joinChat,
    leaveChat,
    startTyping,
    stopTyping,
    markMessagesAsRead,
    addReaction,
    removeReaction,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};