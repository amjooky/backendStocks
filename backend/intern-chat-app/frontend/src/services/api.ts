import axios, { AxiosResponse } from 'axios';
import toast from 'react-hot-toast';
import {
  User,
  Chat,
  Message,
  FileData,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  ApiResponse,
  PaginatedResponse,
} from '../types';

// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    const message = error.response?.data?.message || 'An error occurred';
    toast.error(message);
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials: LoginCredentials): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/login', credentials),
    
  register: (data: RegisterData): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/register', data),
    
  logout: (): Promise<AxiosResponse<ApiResponse<null>>> =>
    api.post('/auth/logout'),
    
  getProfile: (): Promise<AxiosResponse<ApiResponse<{ user: User }>>> =>
    api.get('/auth/profile'),
    
  updateProfile: (data: Partial<User>): Promise<AxiosResponse<ApiResponse<{ user: User }>>> =>
    api.put('/auth/profile', data),
    
  changePassword: (data: { currentPassword: string; newPassword: string }): Promise<AxiosResponse<ApiResponse<null>>> =>
    api.put('/auth/password', data),
    
  updateStatus: (status: User['status']): Promise<AxiosResponse<ApiResponse<{ status: string; lastSeen: string }>>> =>
    api.put('/auth/status', { status }),
    
  verifyToken: (): Promise<AxiosResponse<ApiResponse<{ valid: boolean; user: User }>>> =>
    api.get('/auth/verify'),
};

// Users API
export const usersAPI = {
  getUsers: (params?: {
    page?: number;
    limit?: number;
    department?: string;
    role?: string;
    search?: string;
  }): Promise<AxiosResponse<PaginatedResponse<User>>> =>
    api.get('/users', { params }),
    
  getUserById: (userId: string): Promise<AxiosResponse<ApiResponse<{ user: User }>>> =>
    api.get(`/users/${userId}`),
    
  getUsersByDepartment: (department: string, includeOffline = false): Promise<AxiosResponse<ApiResponse<{ users: User[] }>>> =>
    api.get(`/users/department/${department}`, { params: { includeOffline } }),
    
  getSupervisors: (): Promise<AxiosResponse<ApiResponse<{ supervisors: User[] }>>> =>
    api.get('/users/supervisors'),
    
  getOnlineUsers: (): Promise<AxiosResponse<ApiResponse<{ users: User[] }>>> =>
    api.get('/users/online'),
    
  searchUsers: (term: string, params?: { department?: string; excludeMe?: boolean }): Promise<AxiosResponse<ApiResponse<{ users: User[] }>>> =>
    api.get(`/users/search/${encodeURIComponent(term)}`, { params }),
    
  getColleagues: (params?: { includeOffline?: boolean; role?: string }): Promise<AxiosResponse<ApiResponse<{ colleagues: User[]; totalCount: number }>>> =>
    api.get('/users/colleagues', { params }),
    
  uploadProfilePhoto: (file: File): Promise<AxiosResponse<ApiResponse<{ profilePhoto: string }>>> => {
    const formData = new FormData();
    formData.append('photo', file);
    return api.post('/users/profile-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Chats API
export const chatsAPI = {
  getChats: (): Promise<AxiosResponse<ApiResponse<{ chats: Chat[] }>>> =>
    api.get('/chats'),
    
  getChatById: (chatId: string): Promise<AxiosResponse<ApiResponse<{ chat: Chat }>>> =>
    api.get(`/chats/${chatId}`),
    
  createIndividualChat: (participantId: string): Promise<AxiosResponse<ApiResponse<{ chat: Chat }>>> =>
    api.post('/chats/individual', { participantId }),
    
  createGroupChat: (data: {
    name: string;
    description?: string;
    participantIds: string[];
  }): Promise<AxiosResponse<ApiResponse<{ chat: Chat }>>> =>
    api.post('/chats/group', data),
    
  createDepartmentChat: (data: {
    name: string;
    description?: string;
    department: string;
  }): Promise<AxiosResponse<ApiResponse<{ chat: Chat }>>> =>
    api.post('/chats/department', data),
    
    
  updateChat: (chatId: string, data: {
    name?: string;
    description?: string;
    settings?: Partial<Chat['settings']>;
  }): Promise<AxiosResponse<ApiResponse<{ chat: Chat }>>> =>
    api.put(`/chats/${chatId}`, data),
    
  addParticipant: (chatId: string, userId: string, role = 'member'): Promise<AxiosResponse<ApiResponse<{ chat: Chat }>>> =>
    api.post(`/chats/${chatId}/participants`, { userId, role }),
    
  removeParticipant: (chatId: string, userId: string): Promise<AxiosResponse<ApiResponse<{ chat: Chat }>>> =>
    api.delete(`/chats/${chatId}/participants/${userId}`),
    
  archiveChat: (chatId: string, archived = true): Promise<AxiosResponse<ApiResponse<{ archived: boolean }>>> =>
    api.patch(`/chats/${chatId}/archive`, { archived }),
    
  pinChat: (chatId: string, pinned = true): Promise<AxiosResponse<ApiResponse<{ pinned: boolean }>>> =>
    api.patch(`/chats/${chatId}/pin`, { pinned }),
    
  leaveChat: (chatId: string): Promise<AxiosResponse<ApiResponse<null>>> =>
    api.post(`/chats/${chatId}/leave`),
};

// Messages API
export const messagesAPI = {
  getChatMessages: (chatId: string, params?: {
    page?: number;
    limit?: number;
    before?: string;
  }): Promise<AxiosResponse<ApiResponse<{ messages: Message[]; hasMore: boolean }>>> =>
    api.get(`/messages/chat/${chatId}`, { params }),
    
  getUnreadMessages: (chatId?: string): Promise<AxiosResponse<ApiResponse<{ messages: Message[] }>>> =>
    api.get('/messages/unread', { params: chatId ? { chatId } : {} }),
    
  getMentions: (read = false): Promise<AxiosResponse<ApiResponse<{ mentions: Message[] }>>> =>
    api.get('/messages/mentions', { params: { read } }),
    
  searchMessages: (chatId: string, params: {
    q: string;
    type?: string;
    after?: string;
    before?: string;
  }): Promise<AxiosResponse<ApiResponse<{ messages: Message[] }>>> =>
    api.get(`/messages/search/${chatId}`, { params }),
    
  getMessageById: (messageId: string): Promise<AxiosResponse<ApiResponse<{ message: Message }>>> =>
    api.get(`/messages/${messageId}`),
    
  editMessage: (messageId: string, content: string): Promise<AxiosResponse<ApiResponse<{ message: Message }>>> =>
    api.put(`/messages/${messageId}`, { content }),
    
  deleteMessage: (messageId: string): Promise<AxiosResponse<ApiResponse<null>>> =>
    api.delete(`/messages/${messageId}`),
    
  addReaction: (messageId: string, emoji: string): Promise<AxiosResponse<ApiResponse<{ reactions: any[] }>>> =>
    api.post(`/messages/${messageId}/reactions`, { emoji }),
    
  removeReaction: (messageId: string, emoji: string): Promise<AxiosResponse<ApiResponse<{ reactions: any[] }>>> =>
    api.delete(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`),
    
  pinMessage: (messageId: string, pinned = true): Promise<AxiosResponse<ApiResponse<{ pinned: boolean }>>> =>
    api.patch(`/messages/${messageId}/pin`, { pinned }),
    
  getPinnedMessages: (chatId: string): Promise<AxiosResponse<ApiResponse<{ messages: Message[] }>>> =>
    api.get(`/messages/chat/${chatId}/pinned`),
    
  markMessagesAsRead: (messageIds: string[]): Promise<AxiosResponse<ApiResponse<{ count: number }>>> =>
    api.patch('/messages/read', { messageIds }),
};

// Files API
export const filesAPI = {
  uploadFiles: (chatId: string, files: File[], description?: string): Promise<AxiosResponse<ApiResponse<{
    files: FileData[];
    messages: Message[];
  }>>> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    if (description) {
      formData.append('description', description);
    }
    
    return api.post(`/files/upload/${chatId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000, // 60 seconds for file uploads
    });
  },
  
  getChatFiles: (chatId: string, params?: {
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<AxiosResponse<PaginatedResponse<FileData>>> =>
    api.get(`/files/chat/${chatId}`, { params }),
    
  getMyFiles: (params?: {
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<AxiosResponse<PaginatedResponse<FileData>>> =>
    api.get('/files/my-files', { params }),
    
  getFileById: (fileId: string): Promise<AxiosResponse<ApiResponse<{ file: FileData }>>> =>
    api.get(`/files/${fileId}`),
    
  downloadFile: (fileId: string): Promise<AxiosResponse<Blob>> =>
    api.get(`/files/${fileId}/download`, { responseType: 'blob' }),
    
  viewFile: (fileId: string): Promise<AxiosResponse<Blob>> =>
    api.get(`/files/${fileId}/view`, { responseType: 'blob' }),
    
  deleteFile: (fileId: string): Promise<AxiosResponse<ApiResponse<null>>> =>
    api.delete(`/files/${fileId}`),
    
  searchFiles: (chatId: string, params: {
    q: string;
    category?: string;
    type?: string;
  }): Promise<AxiosResponse<ApiResponse<{ files: FileData[] }>>> =>
    api.get(`/files/search/${chatId}`, { params }),
    
  getFileStats: (chatId: string): Promise<AxiosResponse<ApiResponse<{
    stats: {
      totalFiles: number;
      totalSize: number;
      byCategory: Record<string, { count: number; size: number }>;
    };
  }>>> =>
    api.get(`/files/stats/${chatId}`),
    
  extendFileExpiration: (fileId: string, days = 30): Promise<AxiosResponse<ApiResponse<{ expiresAt: string }>>> =>
    api.patch(`/files/${fileId}/extend`, { days }),
};

export default api;