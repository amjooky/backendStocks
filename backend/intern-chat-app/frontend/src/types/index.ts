// User types
export interface User {
  _id: string;
  id: string;
  email: string;
  name: {
    firstName: string;
    lastName: string;
  };
  fullName: string;
  role: 'intern' | 'supervisor' | 'admin';
  department: string;
  team?: string;
  profilePhoto?: string;
  bio?: string;
  skills?: string[];
  location?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen: string;
  isActive: boolean;
  settings: {
    notifications: {
      email: boolean;
      push: boolean;
      mentions: boolean;
    };
    privacy: {
      showOnlineStatus: boolean;
      showLastSeen: boolean;
    };
  };
  createdAt: string;
  updatedAt: string;
}

// Chat types
export interface Chat {
  _id: string;
  type: 'individual' | 'group' | 'department';
  name?: string;
  description?: string;
  participants: ChatParticipant[];
  department?: string;
  settings: ChatSettings;
  lastMessage?: LastMessage;
  createdBy: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatParticipant {
  user: User;
  role: 'member' | 'admin';
  joinedAt: string;
  lastRead: string;
  notifications: boolean;
}

export interface ChatSettings {
  allowFileSharing: boolean;
  allowTaskAssignment: boolean;
  retentionDays: number;
  isArchived: boolean;
  isPinned: boolean;
}

export interface LastMessage {
  content: string;
  sender: User;
  timestamp: string;
  type: 'text' | 'file' | 'image' | 'task';
}

// Message types
export interface Message {
  _id: string;
  chat: string;
  sender: User;
  type: 'text' | 'file' | 'image' | 'task' | 'system';
  content: MessageContent;
  metadata: MessageMetadata;
  readBy: ReadReceipt[];
  replyTo?: ReplyInfo;
  status: 'sent' | 'delivered' | 'failed';
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MessageContent {
  text?: string;
  file?: FileInfo;
  task?: TaskInfo;
  system?: SystemInfo;
}

export interface FileInfo {
  originalName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  url: string;
}

export interface TaskInfo {
  title: string;
  description?: string;
  assignedTo?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  completedAt?: string;
}

export interface SystemInfo {
  action: 'user_joined' | 'user_left' | 'chat_created' | 'chat_updated' | 'file_shared';
  data: any;
}

export interface MessageMetadata {
  edited: {
    isEdited: boolean;
    editedAt?: string;
    originalContent?: string;
  };
  mentions: Mention[];
  reactions: Reaction[];
  isPinned: boolean;
  pinnedBy?: string;
  pinnedAt?: string;
}

export interface Mention {
  user: User;
  position: number;
}

export interface Reaction {
  user: User;
  emoji: string;
  createdAt: string;
}

export interface ReadReceipt {
  user: User;
  readAt: string;
}

export interface ReplyInfo {
  message: string;
  content: string;
  sender: User;
}

// File types
export interface FileData {
  _id: string;
  originalName: string;
  fileName: string;
  filePath: string;
  url: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: User;
  chat: string;
  message?: string;
  category: 'image' | 'document' | 'video' | 'audio' | 'other';
  metadata: FileMetadata;
  expiration: FileExpiration;
  downloads: FileDownload[];
  downloadCount: number;
  status: 'uploading' | 'processing' | 'ready' | 'failed' | 'expired';
  accessLevel: 'private' | 'chat' | 'department' | 'organization';
  createdAt: string;
  updatedAt: string;
}

export interface FileMetadata {
  image?: {
    width: number;
    height: number;
    format: string;
  };
  video?: {
    duration: number;
    format: string;
    resolution: string;
  };
  document?: {
    pages: number;
    format: string;
  };
  audio?: {
    duration: number;
    format: string;
    bitrate: number;
  };
}

export interface FileExpiration {
  expiresAt?: string;
  isExpired: boolean;
  deletedAt?: string;
}

export interface FileDownload {
  user: User;
  downloadedAt: string;
  ipAddress: string;
  userAgent: string;
}

// API Response types
export interface ApiResponse<T> {
  message?: string;
  data?: T;
  error?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Auth types
export interface LoginCredentials {
  identifier: string; // email
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'intern' | 'supervisor' | 'admin';
  department: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  message: string;
}

// Socket types
export interface SocketEvents {
  // Connection events
  connect: () => void;
  disconnect: (reason: string) => void;
  
  // Room events
  join_rooms: () => void;
  join_chat: (data: { chatId: string }) => void;
  leave_chat: (data: { chatId: string }) => void;
  joined_chat: (data: { chatId: string; message: string }) => void;
  left_chat: (data: { chatId: string; message: string }) => void;
  
  // Message events
  send_message: (data: SendMessageData) => void;
  new_message: (data: { message: Message }) => void;
  message_sent: (data: { tempId?: string; messageId: string; timestamp: string }) => void;
  
  // Typing events
  typing_start: (data: { chatId: string }) => void;
  typing_stop: (data: { chatId: string }) => void;
  user_typing: (data: { userId: string; userName: string; chatId: string; isTyping: boolean }) => void;
  
  // Read receipt events
  mark_messages_read: (data: { chatId: string; messageIds: string[] }) => void;
  messages_read: (data: { userId: string; userName: string; messageIds: string[]; readAt: string }) => void;
  
  // Reaction events
  add_reaction: (data: { messageId: string; emoji: string }) => void;
  remove_reaction: (data: { messageId: string; emoji: string }) => void;
  reaction_added: (data: { messageId: string; userId: string; userName: string; emoji: string; timestamp: string }) => void;
  reaction_removed: (data: { messageId: string; userId: string; userName: string; emoji: string; timestamp: string }) => void;
  
  // User status events
  update_status: (data: { status: User['status'] }) => void;
  user_status_change: (data: { userId: string; status: User['status']; lastSeen: string }) => void;
  
  // Notification events
  mention_notification: (data: { messageId: string; chatId: string; senderId: string; senderName: string; content: string }) => void;
  
  // Error events
  error: (data: { message: string }) => void;
}

export interface SendMessageData {
  chatId: string;
  type?: 'text' | 'task';
  content: {
    text?: string;
    task?: TaskInfo;
  };
  replyTo?: {
    messageId: string;
  };
  tempId?: string; // For optimistic updates
}

// UI State types
export interface AppState {
  user: User | null;
  chats: Chat[];
  currentChat: Chat | null;
  messages: { [chatId: string]: Message[] };
  onlineUsers: string[];
  typingUsers: { [chatId: string]: string[] };
  loading: boolean;
  error: string | null;
}

// Theme types
export interface ThemeMode {
  mode: 'light' | 'dark';
}

// Notification types
export interface NotificationData {
  id: string;
  type: 'message' | 'mention' | 'system';
  title: string;
  body: string;
  avatar?: string;
  chatId?: string;
  messageId?: string;
  timestamp: string;
  read: boolean;
}

export default {};