import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message, User, SendMessageData } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private baseURL: string = 'http://192.168.1.91:5000'; // Use detected IP
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  async connect(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Connecting to socket server:', this.baseURL);

      // Disconnect existing connection
      if (this.socket) {
        this.disconnect();
      }

      // Create new connection
      this.socket = io(this.baseURL, {
        auth: {
          token: token,
        },
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true,
        timeout: 10000,
        forceNew: true,
      });

      this.setupEventListeners();

    } catch (error) {
      console.error('Socket connection error:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket connected with ID:', this.socket?.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnected = false;
      
      // Auto-reconnect on disconnection (except manual disconnect)
      if (reason !== 'io client disconnect' && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        setTimeout(() => {
          this.socket?.connect();
        }, 2000 * this.reconnectAttempts); // Exponential backoff
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      this.isConnected = false;
      
      // Handle authentication errors
      if (error.message.includes('Authentication')) {
        console.error('Socket authentication failed:', error.message);
        // Clear token and force re-login
        AsyncStorage.removeItem('token');
        AsyncStorage.removeItem('user');
      }
    });

    // Test events
    this.socket.on('welcome', (data) => {
      console.log('Welcome message received:', data);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      console.log('Disconnecting socket');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected || false;
  }

  // Join chat room
  joinChat(chatId: string): void {
    if (this.socket && this.isConnected) {
      console.log('Joining chat room:', chatId);
      this.socket.emit('join_chat', { chatId });
    } else {
      console.warn('Cannot join chat: socket not connected');
    }
  }

  // Leave chat room
  leaveChat(chatId: string): void {
    if (this.socket && this.isConnected) {
      console.log('Leaving chat room:', chatId);
      this.socket.emit('leave_chat', { chatId });
    }
  }

  // Send message
  sendMessage(messageData: SendMessageData): void {
    if (this.socket && this.isConnected) {
      console.log('Sending message:', messageData);
      this.socket.emit('send_message', messageData);
    } else {
      console.error('Cannot send message: socket not connected');
      throw new Error('Socket not connected. Please check your internet connection.');
    }
  }

  // Typing indicators
  startTyping(chatId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing_start', { chatId });
    }
  }

  stopTyping(chatId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing_stop', { chatId });
    }
  }

  // Mark messages as read
  markAsRead(chatId: string, messageIds: string[]): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('mark_as_read', { chatId, messageIds });
    }
  }

  // Event listeners
  onNewMessage(callback: (message: Message) => void): void {
    if (this.socket) {
      this.socket.on('new_message', (data: { message: Message }) => {
        console.log('New message received:', data.message);
        callback(data.message);
      });
    }
  }

  onMessageRead(callback: (data: { messageId: string; userId: string; readAt: string }) => void): void {
    if (this.socket) {
      this.socket.on('message_read', callback);
    }
  }

  onUserOnline(callback: (data: { userId: string; user: User }) => void): void {
    if (this.socket) {
      this.socket.on('user_online', callback);
    }
  }

  onUserOffline(callback: (data: { userId: string }) => void): void {
    if (this.socket) {
      this.socket.on('user_offline', callback);
    }
  }

  onTypingStart(callback: (data: { chatId: string; userId: string; user: User }) => void): void {
    if (this.socket) {
      this.socket.on('typing_start', callback);
    }
  }

  onTypingStop(callback: (data: { chatId: string; userId: string }) => void): void {
    if (this.socket) {
      this.socket.on('typing_stop', callback);
    }
  }

  onChatUpdate(callback: (data: { chatId: string; chat: any }) => void): void {
    if (this.socket) {
      this.socket.on('chat_updated', callback);
    }
  }

  onError(callback: (error: any) => void): void {
    if (this.socket) {
      this.socket.on('error', callback);
    }
  }

  // Remove specific event listeners
  removeListener(event: string, callback?: Function): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  // Remove all listeners
  removeAllListeners(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  // Get current socket ID
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // Update user status
  updateStatus(status: 'online' | 'offline' | 'away' | 'busy'): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('update_status', { status });
    }
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve(false);
        return;
      }

      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000);

      this.socket.emit('ping', (response: any) => {
        clearTimeout(timeout);
        console.log('Socket ping response:', response);
        resolve(true);
      });
    });
  }
}

export default new SocketService();