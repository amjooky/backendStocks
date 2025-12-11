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
  profilePhoto?: string;
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

export interface Chat {
  _id: string;
  type: 'individual' | 'group' | 'department';
  name?: string;
  description?: string;
  department?: string;
  participants: ChatParticipant[];
  createdBy: string | User;
  lastMessage?: {
    content: string;
    sender: string;
    timestamp: string;
    type: MessageType;
  };
  unreadCount?: number;
  settings: {
    isArchived: boolean;
    isPinned: boolean;
    notifications: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ChatParticipant {
  user: User | string;
  role: 'admin' | 'member';
  joinedAt: string;
}

export type MessageType = 'text' | 'image' | 'file' | 'audio' | 'video' | 'task';

export interface Message {
  _id: string;
  chat: string;
  sender: User | string;
  type: MessageType;
  content: {
    text?: string;
    file?: {
      originalName: string;
      fileName: string;
      filePath: string;
      fileSize: number;
      mimeType: string;
      url: string;
    };
    task?: {
      title: string;
      description?: string;
      assignees: string[];
      dueDate?: string;
      status: 'pending' | 'in_progress' | 'completed';
      priority: 'low' | 'medium' | 'high';
    };
  };
  replyTo?: {
    message: string;
    sender: string;
    preview: string;
  };
  metadata: {
    mentions: {
      user: string;
      position: number;
    }[];
    reactions: {
      emoji: string;
      users: string[];
      count: number;
    }[];
    isPinned: boolean;
    pinnedBy?: string;
    pinnedAt?: string;
    editedAt?: string;
    editHistory?: {
      content: string;
      editedAt: string;
    }[];
  };
  readBy: {
    user: string;
    readAt: string;
  }[];
  isDeleted: boolean;
  deletedBy?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface ChatState {
  chats: Chat[];
  activeChat: Chat | null;
  messages: { [chatId: string]: Message[] };
  isLoading: boolean;
  error: string | null;
}

export interface ApiResponse<T> {
  message?: string;
  data?: T;
  error?: string;
  user?: T;
  token?: string;
  chat?: T;
  chats?: T[];
  messages?: T[];
  colleagues?: T[];
}

export interface LoginCredentials {
  identifier: string; // email
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'intern' | 'supervisor';
  department: string;
}

export interface SendMessageData {
  chatId: string;
  type: MessageType;
  content: any;
  replyTo?: string;
}

export interface CreateChatData {
  type: 'individual' | 'group' | 'department';
  name?: string;
  description?: string;
  participantIds?: string[];
  participantId?: string;
  department?: string;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Register: undefined;
  Chat: { chatId: string; chatName: string };
  Profile: { userId?: string };
  CreateGroup: undefined;
  UserSearch: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  Chats: undefined;
  Contacts: undefined;
  Profile: undefined;
};

// Socket events
export interface SocketEvents {
  new_message: (data: { message: Message }) => void;
  message_read: (data: { messageId: string; userId: string }) => void;
  user_online: (data: { userId: string }) => void;
  user_offline: (data: { userId: string }) => void;
  typing_start: (data: { chatId: string; userId: string }) => void;
  typing_stop: (data: { chatId: string; userId: string }) => void;
}