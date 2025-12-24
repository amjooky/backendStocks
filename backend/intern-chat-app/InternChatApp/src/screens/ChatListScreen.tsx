import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Chat, User } from '../types';
import ApiService from '../services/api';
import SocketService from '../services/socket';

interface Props {
  navigation: any;
  currentUser: User;
}

interface ChatItemProps {
  chat: Chat;
  onPress: () => void;
  currentUser: User;
}

const ChatItem: React.FC<ChatItemProps> = ({ chat, onPress, currentUser }) => {
  const getOtherParticipant = () => {
    if (chat.type === 'individual') {
      return chat.participants.find(p => 
        typeof p.user === 'object' && p.user._id !== currentUser._id
      );
    }
    return null;
  };

  const getChatName = () => {
    if (chat.name) {
      return chat.name;
    }
    
    if (chat.type === 'individual') {
      const otherParticipant = getOtherParticipant();
      if (otherParticipant && typeof otherParticipant.user === 'object') {
        return otherParticipant.user.fullName;
      }
    }
    
    return 'Unknown Chat';
  };

  const getChatAvatar = () => {
    if (chat.type === 'individual') {
      const otherParticipant = getOtherParticipant();
      if (otherParticipant && typeof otherParticipant.user === 'object') {
        return otherParticipant.user.profilePhoto;
      }
    }
    return null;
  };

  const getLastMessageTime = () => {
    if (chat.lastMessage) {
      const date = new Date(chat.lastMessage.timestamp);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) {
        return 'Just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
      } else if (diffInMinutes < 1440) {
        return `${Math.floor(diffInMinutes / 60)}h ago`;
      } else {
        return date.toLocaleDateString();
      }
    }
    return '';
  };

  const getChatIcon = () => {
    switch (chat.type) {
      case 'group':
        return '👥';
      case 'department':
        return '🏢';
      default:
        return '👤';
    }
  };

  return (
    <TouchableOpacity style={styles.chatItem} onPress={onPress}>
      <View style={styles.avatarContainer}>
        {getChatAvatar() ? (
          <Image source={{ uri: getChatAvatar()! }} style={styles.avatar} />
        ) : (
          <View style={styles.defaultAvatar}>
            <Text style={styles.avatarText}>{getChatIcon()}</Text>
          </View>
        )}
        {chat.unreadCount && chat.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName} numberOfLines={1}>
            {getChatName()}
          </Text>
          <Text style={styles.timeText}>
            {getLastMessageTime()}
          </Text>
        </View>
        
        <Text 
          style={[
            styles.lastMessage,
            chat.unreadCount && chat.unreadCount > 0 && styles.unreadMessage
          ]} 
          numberOfLines={2}
        >
          {chat.lastMessage?.content || 'No messages yet'}
        </Text>
      </View>
      
      {chat.settings.isPinned && (
        <View style={styles.pinnedIcon}>
          <Text>📌</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const ChatListScreen: React.FC<Props> = ({ navigation, currentUser }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [colleagues, setColleagues] = useState<User[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loadingColleagues, setLoadingColleagues] = useState(false);

  const loadChats = async (showRefreshLoader = false) => {
    try {
      if (showRefreshLoader) {
        setIsRefreshing(true);
      } else if (chats.length === 0) {
        setIsLoading(true);
      }

      console.log('Loading chats...');
      const response = await ApiService.getChats();
      
      if (response.error) {
        console.error('Load chats error:', response.error);
        Alert.alert('Error', response.error);
        return;
      }

      if (response.data && response.data.chats) {
        console.log('Loaded chats:', response.data.chats.length);
        setChats(response.data.chats);
      }
    } catch (error) {
      console.error('Load chats error:', error);
      Alert.alert('Error', 'Failed to load chats');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadColleagues = async () => {
    setLoadingColleagues(true);
    try {
      const response = await ApiService.getColleagues();
      if (response.data && response.data.colleagues) {
        setColleagues(response.data.colleagues);
      }
    } catch (error) {
      console.error('Load colleagues error:', error);
    } finally {
      setLoadingColleagues(false);
    }
  };

  const handleChatPress = (chat: Chat) => {
    navigation.navigate('Chat', {
      chatId: chat._id,
      chatName: getChatName(chat),
    });
  };

  const getChatName = (chat: Chat) => {
    if (chat.name) {
      return chat.name;
    }
    
    if (chat.type === 'individual') {
      const otherParticipant = chat.participants.find(p => 
        typeof p.user === 'object' && p.user._id !== currentUser._id
      );
      if (otherParticipant && typeof otherParticipant.user === 'object') {
        return otherParticipant.user.fullName;
      }
    }
    
    return 'Unknown Chat';
  };

  const handleNewChat = () => {
    setShowNewChatModal(true);
    loadColleagues();
  };

  const createIndividualChat = async (colleague: User) => {
    try {
      console.log('Creating chat with:', colleague.fullName);
      const response = await ApiService.createChat({
        type: 'individual',
        participantId: colleague._id,
      });
      
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }

      if (response.data && response.data.chat) {
        console.log('Chat created successfully');
        setShowNewChatModal(false);
        setSearchText('');
        loadChats(); // Refresh chat list
        
        // Navigate to the new chat
        navigation.navigate('Chat', {
          chatId: response.data.chat._id,
          chatName: colleague.fullName,
        });
      }
    } catch (error) {
      console.error('Create chat error:', error);
      Alert.alert('Error', 'Failed to create chat');
    }
  };

  // Setup socket listeners
  useEffect(() => {
    const setupSocketListeners = () => {
      SocketService.onNewMessage((message) => {
        console.log('New message received in chat list');
        // Update the chat list when new message arrives
        setChats(prevChats => {
          return prevChats.map(chat => {
            if (chat._id === message.chat) {
              return {
                ...chat,
                lastMessage: {
                  content: message.content.text || 'File shared',
                  sender: typeof message.sender === 'string' ? message.sender : message.sender._id,
                  timestamp: message.createdAt,
                  type: message.type,
                },
                unreadCount: (chat.unreadCount || 0) + 1,
              };
            }
            return chat;
          });
        });
      });

      SocketService.onChatUpdate((data) => {
        console.log('Chat update received');
        loadChats();
      });
    };

    if (SocketService.isSocketConnected()) {
      setupSocketListeners();
    }

    return () => {
      SocketService.removeListener('new_message');
      SocketService.removeListener('chat_updated');
    };
  }, []);

  // Load chats when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [])
  );

  const filteredColleagues = colleagues.filter(colleague =>
    colleague.fullName.toLowerCase().includes(searchText.toLowerCase()) ||
    colleague.email.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderChatItem = ({ item }: { item: Chat }) => (
    <ChatItem
      chat={item}
      onPress={() => handleChatPress(item)}
      currentUser={currentUser}
    />
  );

  const renderColleagueItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.colleagueItem}
      onPress={() => createIndividualChat(item)}
    >
      <View style={styles.colleagueAvatar}>
        {item.profilePhoto ? (
          <Image source={{ uri: item.profilePhoto }} style={styles.avatar} />
        ) : (
          <View style={styles.defaultAvatar}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
        )}
      </View>
      <View style={styles.colleagueInfo}>
        <Text style={styles.colleagueName}>{item.fullName}</Text>
        <Text style={styles.colleagueDetails}>
          {item.department} • {item.role}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>💬</Text>
      <Text style={styles.emptyStateTitle}>No chats yet</Text>
      <Text style={styles.emptyStateText}>
        Start a conversation with your colleagues
      </Text>
      <TouchableOpacity style={styles.startChatButton} onPress={handleNewChat}>
        <Text style={styles.startChatButtonText}>Start New Chat</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading chats...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <TouchableOpacity style={styles.newChatButton} onPress={handleNewChat}>
          <Text style={styles.newChatButtonText}>✏️</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadChats(true)}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={chats.length === 0 ? styles.emptyListContainer : undefined}
        showsVerticalScrollIndicator={false}
      />

      {/* New Chat Modal */}
      <Modal
        visible={showNewChatModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowNewChatModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Chat</Text>
            <View style={styles.placeholder} />
          </View>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search colleagues..."
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor="#999"
            />
          </View>
          
          {loadingColleagues ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading colleagues...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredColleagues}
              renderItem={renderColleagueItem}
              keyExtractor={(item) => item._id}
              style={styles.colleaguesList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={() => (
                <View style={styles.emptyColleagues}>
                  <Text style={styles.emptyColleaguesText}>
                    {searchText ? 'No colleagues found' : 'No colleagues available'}
                  </Text>
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newChatButtonText: {
    fontSize: 18,
    color: '#fff',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatContent: {
    flex: 1,
    marginRight: 8,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  timeText: {
    fontSize: 12,
    color: '#8e8e93',
  },
  lastMessage: {
    fontSize: 14,
    color: '#8e8e93',
    lineHeight: 20,
  },
  unreadMessage: {
    color: '#1a1a1a',
    fontWeight: '500',
  },
  pinnedIcon: {
    marginLeft: 8,
  },
  emptyListContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
    marginBottom: 24,
  },
  startChatButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  startChatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  cancelButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 50,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  searchInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  colleaguesList: {
    flex: 1,
  },
  colleagueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  colleagueAvatar: {
    marginRight: 12,
  },
  colleagueInfo: {
    flex: 1,
  },
  colleagueName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  colleagueDetails: {
    fontSize: 14,
    color: '#8e8e93',
  },
  emptyColleagues: {
    padding: 32,
    alignItems: 'center',
  },
  emptyColleaguesText: {
    fontSize: 16,
    color: '#8e8e93',
  },
});

export default ChatListScreen;