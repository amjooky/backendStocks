import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Chat, Message, User } from '../types';
import { chatsAPI, messagesAPI } from '../services/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

interface ChatState {
  chats: Chat[];
  currentChat: Chat | null;
  messages: { [chatId: string]: Message[] };
  typingUsers: { [chatId: string]: string[] };
  loading: boolean;
  error: string | null;
}

type ChatAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CHATS'; payload: Chat[] }
  | { type: 'ADD_CHAT'; payload: Chat }
  | { type: 'UPDATE_CHAT'; payload: Chat }
  | { type: 'REMOVE_CHAT'; payload: string }
  | { type: 'SET_CURRENT_CHAT'; payload: Chat | null }
  | { type: 'SET_MESSAGES'; payload: { chatId: string; messages: Message[] } }
  | { type: 'ADD_MESSAGE'; payload: { chatId: string; message: Message } }
  | { type: 'UPDATE_MESSAGE'; payload: { chatId: string; message: Message } }
  | { type: 'REMOVE_MESSAGE'; payload: { chatId: string; messageId: string } }
  | { type: 'SET_TYPING_USERS'; payload: { chatId: string; users: string[] } }
  | { type: 'ADD_TYPING_USER'; payload: { chatId: string; userId: string } }
  | { type: 'REMOVE_TYPING_USER'; payload: { chatId: string; userId: string } };

interface ChatContextType extends ChatState {
  loadChats: () => Promise<void>;
  loadMessages: (chatId: string) => Promise<void>;
  createIndividualChat: (participantId: string) => Promise<Chat>;
  createGroupChat: (name: string, participantIds: string[], description?: string) => Promise<Chat>;
  selectChat: (chat: Chat) => void;
  sendMessage: (chatId: string, content: string) => void;
  loadMoreMessages: (chatId: string, before?: string) => Promise<void>;
}

const initialState: ChatState = {
  chats: [],
  currentChat: null,
  messages: {},
  typingUsers: {},
  loading: false,
  error: null,
};

const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_CHATS':
      return { ...state, chats: action.payload, loading: false };
    case 'ADD_CHAT':
      return { 
        ...state, 
        chats: [action.payload, ...state.chats.filter(c => c._id !== action.payload._id)] 
      };
    case 'UPDATE_CHAT':
      return {
        ...state,
        chats: state.chats.map(chat => 
          chat._id === action.payload._id ? action.payload : chat
        ),
        currentChat: state.currentChat?._id === action.payload._id ? action.payload : state.currentChat
      };
    case 'REMOVE_CHAT':
      return {
        ...state,
        chats: state.chats.filter(chat => chat._id !== action.payload),
        currentChat: state.currentChat?._id === action.payload ? null : state.currentChat
      };
    case 'SET_CURRENT_CHAT':
      return { ...state, currentChat: action.payload };
    case 'SET_MESSAGES':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.chatId]: action.payload.messages
        }
      };
    case 'ADD_MESSAGE':
      const currentMessages = state.messages[action.payload.chatId] || [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.chatId]: [...currentMessages, action.payload.message]
        }
      };
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.chatId]: (state.messages[action.payload.chatId] || []).map(msg =>
            msg._id === action.payload.message._id ? action.payload.message : msg
          )
        }
      };
    case 'REMOVE_MESSAGE':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.chatId]: (state.messages[action.payload.chatId] || []).filter(
            msg => msg._id !== action.payload.messageId
          )
        }
      };
    case 'SET_TYPING_USERS':
      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [action.payload.chatId]: action.payload.users
        }
      };
    case 'ADD_TYPING_USER':
      const currentTypingUsers = state.typingUsers[action.payload.chatId] || [];
      if (!currentTypingUsers.includes(action.payload.userId)) {
        return {
          ...state,
          typingUsers: {
            ...state.typingUsers,
            [action.payload.chatId]: [...currentTypingUsers, action.payload.userId]
          }
        };
      }
      return state;
    case 'REMOVE_TYPING_USER':
      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [action.payload.chatId]: (state.typingUsers[action.payload.chatId] || []).filter(
            userId => userId !== action.payload.userId
          )
        }
      };
    default:
      return state;
  }
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { user, isAuthenticated } = useAuth();
  const { sendMessage: socketSendMessage, joinChat, isConnected } = useSocket();

  // Load chats on mount
  useEffect(() => {
    if (isAuthenticated && user) {
      loadChats();
    }
  }, [isAuthenticated, user]);

  // Socket event listeners
  useEffect(() => {
    const handleNewMessage = (event: CustomEvent) => {
      const { message } = event.detail;
      dispatch({ type: 'ADD_MESSAGE', payload: { chatId: message.chat, message } });
      
      // Update chat's last message
      const chat = state.chats.find(c => c._id === message.chat);
      if (chat) {
        const updatedChat = {
          ...chat,
          lastMessage: {
            content: message.content.text || 'File',
            sender: message.sender,
            timestamp: message.createdAt,
            type: message.type
          }
        };
        dispatch({ type: 'UPDATE_CHAT', payload: updatedChat });
      }
    };

    const handleUserTyping = (event: CustomEvent) => {
      const { userId, chatId, isTyping } = event.detail;
      if (userId === user?.id) return; // Don't show own typing
      
      if (isTyping) {
        dispatch({ type: 'ADD_TYPING_USER', payload: { chatId, userId } });
      } else {
        dispatch({ type: 'REMOVE_TYPING_USER', payload: { chatId, userId } });
      }
    };

    const handleMessageSent = (event: CustomEvent) => {
      const { messageId, tempId, timestamp } = event.detail;
      // Update optimistic message with real data
      console.log('Message sent confirmation:', event.detail);
    };

    window.addEventListener('new_message', handleNewMessage as EventListener);
    window.addEventListener('user_typing', handleUserTyping as EventListener);
    window.addEventListener('message_sent', handleMessageSent as EventListener);

    return () => {
      window.removeEventListener('new_message', handleNewMessage as EventListener);
      window.removeEventListener('user_typing', handleUserTyping as EventListener);
      window.removeEventListener('message_sent', handleMessageSent as EventListener);
    };
  }, [state.chats, user]);

  const loadChats = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await chatsAPI.getChats();
      dispatch({ type: 'SET_CHATS', payload: response.data?.data?.chats || [] });
    } catch (error: any) {
      console.error('Load chats error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load chats' });
    }
  };

  const loadMessages = async (chatId: string): Promise<void> => {
    try {
      const response = await messagesAPI.getChatMessages(chatId);
      dispatch({ type: 'SET_MESSAGES', payload: { chatId, messages: response.data?.data?.messages || [] } });
    } catch (error: any) {
      console.error('Load messages error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load messages' });
    }
  };

  const loadMoreMessages = async (chatId: string, before?: string): Promise<void> => {
    try {
      const response = await messagesAPI.getChatMessages(chatId, { 
        page: 1, 
        limit: 50, 
        before 
      });
      
      const existingMessages = state.messages[chatId] || [];
      const newMessages = [...(response.data?.data?.messages || []), ...existingMessages];
      
      dispatch({ type: 'SET_MESSAGES', payload: { chatId, messages: newMessages } });
    } catch (error: any) {
      console.error('Load more messages error:', error);
    }
  };

  const createIndividualChat = async (participantId: string): Promise<Chat> => {
    try {
      const response = await chatsAPI.createIndividualChat(participantId);
      const newChat = response.data?.data?.chat;
      dispatch({ type: 'ADD_CHAT', payload: newChat });
      return newChat;
    } catch (error: any) {
      console.error('Create individual chat error:', error);
      throw error;
    }
  };

  const createGroupChat = async (
    name: string, 
    participantIds: string[], 
    description?: string
  ): Promise<Chat> => {
    try {
      const response = await chatsAPI.createGroupChat({ name, participantIds, description });
      const newChat = response.data?.data?.chat;
      dispatch({ type: 'ADD_CHAT', payload: newChat });
      return newChat;
    } catch (error: any) {
      console.error('Create group chat error:', error);
      throw error;
    }
  };

  const selectChat = (chat: Chat): void => {
    dispatch({ type: 'SET_CURRENT_CHAT', payload: chat });
    
    // Join chat room
    joinChat(chat._id);
    
    // Load messages if not loaded
    if (!state.messages[chat._id]) {
      loadMessages(chat._id);
    }
  };

  const sendMessage = (chatId: string, content: string): void => {
    if (!isConnected) {
      dispatch({ type: 'SET_ERROR', payload: 'Not connected to server' });
      return;
    }

    const tempId = `temp_${Date.now()}`;
    const tempMessage: Message = {
      _id: tempId,
      chat: chatId,
      sender: user!,
      type: 'text',
      content: { text: content },
      metadata: {
        edited: { isEdited: false },
        mentions: [],
        reactions: [],
        isPinned: false,
      },
      readBy: [],
      status: 'sent',
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add optimistic message
    dispatch({ type: 'ADD_MESSAGE', payload: { chatId, message: tempMessage } });

    // Send via socket
    socketSendMessage({
      chatId,
      content: { text: content },
      tempId,
    });
  };

  const contextValue: ChatContextType = {
    ...state,
    loadChats,
    loadMessages,
    createIndividualChat,
    createGroupChat,
    selectChat,
    sendMessage,
    loadMoreMessages,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};