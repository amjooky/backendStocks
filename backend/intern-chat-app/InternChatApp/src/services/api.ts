import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  User, 
  Chat, 
  Message, 
  LoginCredentials, 
  RegisterData, 
  ApiResponse,
  SendMessageData,
  CreateChatData
} from '../types';

// Use the detected IP address for mobile device connectivity
const BASE_URL = 'http://192.168.1.91:5000/api';

console.log('API Base URL:', BASE_URL);

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = BASE_URL;
    this.setupInterceptors();
  }

  // Transform backend user to mobile app user format
  private transformUser(backendUser: any): User {
    return {
      _id: backendUser.id?.toString() || backendUser._id,
      id: backendUser.id?.toString() || backendUser._id,
      email: backendUser.email || '',
      name: {
        firstName: backendUser.first_name || backendUser.firstName || '',
        lastName: backendUser.last_name || backendUser.lastName || '',
      },
      fullName: `${backendUser.first_name || backendUser.firstName || ''} ${backendUser.last_name || backendUser.lastName || ''}`.trim(),
      role: this.mapRole(backendUser.role),
      department: backendUser.department || 'General',
      profilePhoto: backendUser.profile_photo || backendUser.profilePhoto,
      status: 'online',
      lastSeen: new Date().toISOString(),
      isActive: backendUser.is_active !== undefined ? !!backendUser.is_active : true,
      settings: {
        notifications: {
          email: true,
          push: true,
          mentions: true,
        },
        privacy: {
          showOnlineStatus: true,
          showLastSeen: true,
        },
      },
      createdAt: backendUser.created_at || backendUser.createdAt || new Date().toISOString(),
      updatedAt: backendUser.updated_at || backendUser.updatedAt || new Date().toISOString(),
    };
  }

  // Map backend roles to mobile app roles
  private mapRole(backendRole: string): 'intern' | 'supervisor' | 'admin' {
    switch (backendRole?.toLowerCase()) {
      case 'admin':
        return 'admin';
      case 'manager':
      case 'supervisor':
        return 'supervisor';
      case 'cashier':
      case 'intern':
      default:
        return 'intern';
    }
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    axios.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        // Ensure proper headers
        config.headers['Content-Type'] = config.headers['Content-Type'] || 'application/json';
        config.timeout = 10000; // 10 second timeout
        
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors
    axios.interceptors.response.use(
      (response) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error) => {
        console.error('API Error:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
          // Token expired or invalid
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');
          console.log('Token cleared due to 401 error');
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User; token: string }>> {
    try {
      console.log('Attempting login for:', credentials.identifier);
      // Backend expects 'username' field, not 'identifier'
      const loginData = {
        username: credentials.identifier,
        password: credentials.password
      };
      console.log('Sending login data:', { username: loginData.username, password: '[REDACTED]' });
      const response = await axios.post(`${this.baseURL}/auth/login`, loginData);
      console.log('Login successful, transforming user data');
      
      // Transform the user data to match mobile app expectations
      const transformedUser = this.transformUser(response.data.user);
      console.log('User transformed:', { fullName: transformedUser.fullName, role: transformedUser.role });
      
      return { 
        data: {
          user: transformedUser,
          token: response.data.token
        }
      };
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message);
      return { error: error.response?.data?.message || 'Login failed' };
    }
  }

  async register(userData: RegisterData): Promise<ApiResponse<{ user: User; token: string }>> {
    try {
      console.log('Attempting registration for:', userData.email);
      const response = await axios.post(`${this.baseURL}/auth/register`, userData);
      console.log('Registration successful');
      return { data: response.data };
    } catch (error: any) {
      console.error('Registration error:', error.response?.data || error.message);
      return { error: error.response?.data?.message || 'Registration failed' };
    }
  }

  async logout(): Promise<ApiResponse<void>> {
    try {
      await axios.post(`${this.baseURL}/auth/logout`);
      return { message: 'Logged out successfully' };
    } catch (error: any) {
      console.error('Logout error:', error.response?.data || error.message);
      return { error: error.response?.data?.message || 'Logout failed' };
    }
  }

  async getProfile(): Promise<ApiResponse<{ user: User }>> {
    try {
      const response = await axios.get(`${this.baseURL}/auth/profile`);
      const transformedUser = this.transformUser(response.data.user);
      console.log('Profile retrieved and transformed:', { fullName: transformedUser.fullName });
      return { data: { user: transformedUser } };
    } catch (error: any) {
      console.error('Get profile error:', error.response?.data || error.message);
      return { error: error.response?.data?.message || 'Failed to get profile' };
    }
  }

  async verifyToken(): Promise<ApiResponse<{ valid: boolean; user: User }>> {
    try {
      const response = await axios.get(`${this.baseURL}/auth/verify`);
      return { data: response.data };
    } catch (error: any) {
      console.error('Token verification error:', error.response?.data || error.message);
      return { error: error.response?.data?.message || 'Token verification failed' };
    }
  }

  // User endpoints
  async getColleagues(): Promise<ApiResponse<{ colleagues: User[] }>> {
    try {
      const response = await axios.get(`${this.baseURL}/users/colleagues`);
      return { data: response.data };
    } catch (error: any) {
      console.error('Get colleagues error:', error.response?.data || error.message);
      return { error: error.response?.data?.message || 'Failed to get colleagues' };
    }
  }

  async searchUsers(term: string): Promise<ApiResponse<{ users: User[] }>> {
    try {
      const response = await axios.get(`${this.baseURL}/users/search/${term}`);
      return { data: response.data };
    } catch (error: any) {
      console.error('Search users error:', error.response?.data || error.message);
      return { error: error.response?.data?.message || 'Failed to search users' };
    }
  }

  // Chat endpoints
  async getChats(): Promise<ApiResponse<{ chats: Chat[] }>> {
    try {
      const response = await axios.get(`${this.baseURL}/chats`);
      return { data: response.data };
    } catch (error: any) {
      console.error('Get chats error:', error.response?.data || error.message);
      return { error: error.response?.data?.message || 'Failed to get chats' };
    }
  }

  async createChat(chatData: CreateChatData): Promise<ApiResponse<{ chat: Chat }>> {
    try {
      let endpoint = `${this.baseURL}/chats/`;
      let requestData = chatData;
      
      switch (chatData.type) {
        case 'individual':
          endpoint += 'individual';
          // For individual chats, we need participantId instead of participantIds
          requestData = {
            participantId: chatData.participantId || chatData.participantIds?.[0]
          };
          break;
        case 'group':
          endpoint += 'group';
          break;
        case 'department':
          endpoint += 'department';
          break;
      }
      
      console.log('Creating chat:', endpoint, requestData);
      const response = await axios.post(endpoint, requestData);
      return { data: response.data };
    } catch (error: any) {
      console.error('Create chat error:', error.response?.data || error.message);
      return { error: error.response?.data?.message || 'Failed to create chat' };
    }
  }

  async getChat(chatId: string): Promise<ApiResponse<{ chat: Chat }>> {
    try {
      const response = await axios.get(`${this.baseURL}/chats/${chatId}`);
      return { data: response.data };
    } catch (error: any) {
      console.error('Get chat error:', error.response?.data || error.message);
      return { error: error.response?.data?.message || 'Failed to get chat' };
    }
  }

  // Message endpoints
  async getMessages(chatId: string, page: number = 1, limit: number = 50): Promise<ApiResponse<{ messages: Message[]; hasMore: boolean }>> {
    try {
      const response = await axios.get(`${this.baseURL}/messages/chat/${chatId}`, {
        params: { page, limit }
      });
      return { data: response.data };
    } catch (error: any) {
      console.error('Get messages error:', error.response?.data || error.message);
      return { error: error.response?.data?.message || 'Failed to get messages' };
    }
  }

  async markMessagesAsRead(messageIds: string[]): Promise<ApiResponse<void>> {
    try {
      await axios.patch(`${this.baseURL}/messages/read`, { messageIds });
      return { message: 'Messages marked as read' };
    } catch (error: any) {
      console.error('Mark messages as read error:', error.response?.data || error.message);
      return { error: error.response?.data?.message || 'Failed to mark messages as read' };
    }
  }

  async deleteMessage(messageId: string): Promise<ApiResponse<void>> {
    try {
      await axios.delete(`${this.baseURL}/messages/${messageId}`);
      return { message: 'Message deleted successfully' };
    } catch (error: any) {
      console.error('Delete message error:', error.response?.data || error.message);
      return { error: error.response?.data?.message || 'Failed to delete message' };
    }
  }

  // File endpoints
  async uploadFile(chatId: string, fileData: FormData): Promise<ApiResponse<{ files: any[]; messages: Message[] }>> {
    try {
      const response = await axios.post(`${this.baseURL}/files/upload/${chatId}`, fileData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // Longer timeout for file uploads
      });
      return { data: response.data };
    } catch (error: any) {
      console.error('Upload file error:', error.response?.data || error.message);
      return { error: error.response?.data?.message || 'Failed to upload file' };
    }
  }

  async getFileUrl(fileId: string): string {
    return `http://192.168.1.91:5000/api/files/${fileId}/view`;
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`http://192.168.1.91:5000/health`, { timeout: 5000 });
      console.log('Server connection test successful:', response.data);
      return response.status === 200;
    } catch (error: any) {
      console.error('Server connection test failed:', error.message);
      return false;
    }
  }

  // Token management
  async setAuthToken(token: string): Promise<void> {
    await AsyncStorage.setItem('token', token);
  }

  async clearAuthToken(): Promise<void> {
    await AsyncStorage.removeItem('token');
  }

  // Verify authentication (for app initialization)
  async verifyAuth(): Promise<ApiResponse<{ user: User }>> {
    try {
      // Try to get profile to verify token is still valid
      const response = await this.getProfile();
      return response;
    } catch (error: any) {
      console.error('Auth verification error:', error.response?.data || error.message);
      return { error: error.response?.data?.message || 'Authentication verification failed' };
    }
  }

  // Send message
  async sendMessage(chatId: string, messageData: any): Promise<ApiResponse<{ message: Message }>> {
    try {
      console.log('Sending message to chat:', chatId, messageData.type);
      const response = await axios.post(`${this.baseURL}/messages/${chatId}`, messageData);
      return { data: response.data };
    } catch (error: any) {
      console.error('Send message error:', error.response?.data || error.message);
      return { error: error.response?.data?.message || 'Failed to send message' };
    }
  }

  // Mark messages as read (single chat)
  async markMessagesAsRead(chatId: string): Promise<ApiResponse<void>> {
    try {
      await axios.patch(`${this.baseURL}/messages/chat/${chatId}/read`);
      return { message: 'Messages marked as read' };
    } catch (error: any) {
      console.error('Mark messages as read error:', error.response?.data || error.message);
      return { error: error.response?.data?.message || 'Failed to mark messages as read' };
    }
  }

  // Upload file (simplified for mobile)
  async uploadFile(fileUri: string, type: 'image' | 'file'): Promise<ApiResponse<{ fileUrl: string }>> {
    try {
      // For now, return a mock response since file upload needs proper implementation
      console.warn('File upload not fully implemented in mobile app yet');
      return { error: 'File upload not yet supported' };
    } catch (error: any) {
      console.error('Upload file error:', error.response?.data || error.message);
      return { error: error.response?.data?.message || 'Failed to upload file' };
    }
  }
}

export default new ApiService();
