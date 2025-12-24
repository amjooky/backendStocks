import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ActionSheetIOS,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Message, User } from '../types';
import ApiService from '../services/api';
import SocketService from '../services/socket';

interface Props {
  route: any;
  navigation: any;
  currentUser: User;
}

interface MessageItemProps {
  message: Message;
  currentUser: User;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
}

const MessageItem: React.FC<MessageItemProps> = ({ 
  message, 
  currentUser, 
  isFirstInGroup,
  isLastInGroup 
}) => {
  const isOwnMessage = (typeof message.sender === 'object' ? message.sender._id : message.sender) === currentUser._id;
  const senderName = typeof message.sender === 'object' ? message.sender.fullName : 'Unknown User';

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessageContent = () => {
    switch (message.type) {
      case 'image':
        return (
          <View style={styles.imageContainer}>
            {message.content.imageUrl && (
              <Image 
                source={{ uri: message.content.imageUrl }} 
                style={styles.messageImage}
                resizeMode="cover"
              />
            )}
            {message.content.text && (
              <Text style={[
                styles.messageText,
                isOwnMessage ? styles.ownMessageText : styles.otherMessageText
              ]}>
                {message.content.text}
              </Text>
            )}
          </View>
        );
        
      case 'file':
        return (
          <View style={styles.fileContainer}>
            <View style={styles.fileIcon}>
              <Text style={styles.fileIconText}>📄</Text>
            </View>
            <View style={styles.fileInfo}>
              <Text style={[
                styles.fileName,
                isOwnMessage ? styles.ownMessageText : styles.otherMessageText
              ]}>
                {message.content.fileName || 'File'}
              </Text>
              <Text style={[
                styles.fileSize,
                isOwnMessage ? styles.ownFileText : styles.otherFileText
              ]}>
                {message.content.fileSize ? `${Math.round(message.content.fileSize / 1024)}KB` : ''}
              </Text>
            </View>
          </View>
        );
        
      default:
        return (
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {message.content.text}
          </Text>
        );
    }
  };

  return (
    <View style={[
      styles.messageContainer,
      isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
    ]}>
      {!isOwnMessage && isFirstInGroup && (
        <Text style={styles.senderName}>{senderName}</Text>
      )}
      
      <View style={[
        styles.messageBubble,
        isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
        isFirstInGroup && !isOwnMessage && styles.firstInGroup,
        isLastInGroup && !isOwnMessage && styles.lastInGroup,
        isFirstInGroup && isOwnMessage && styles.ownFirstInGroup,
        isLastInGroup && isOwnMessage && styles.ownLastInGroup,
      ]}>
        {renderMessageContent()}
        
        <View style={styles.messageFooter}>
          <Text style={[
            styles.messageTime,
            isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
          ]}>
            {formatTime(message.createdAt)}
          </Text>
          
          {isOwnMessage && (
            <View style={styles.messageStatus}>
              <Text style={styles.messageStatusIcon}>
                {message.status === 'read' ? '✓✓' : 
                 message.status === 'delivered' ? '✓' : '⏱'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const ChatScreen: React.FC<Props> = ({ route, navigation, currentUser }) => {
  const { chatId, chatName } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load messages
  const loadMessages = async () => {
    try {
      setIsLoading(true);
      console.log('Loading messages for chat:', chatId);
      
      const response = await ApiService.getMessages(chatId);
      
      if (response.error) {
        console.error('Load messages error:', response.error);
        Alert.alert('Error', response.error);
        return;
      }

      if (response.data && response.data.messages) {
        console.log('Loaded messages:', response.data.messages.length);
        setMessages(response.data.messages);
        
        // Mark messages as read
        setTimeout(() => {
          ApiService.markMessagesAsRead(chatId);
        }, 500);
      }
    } catch (error) {
      console.error('Load messages error:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };

  // Send message
  const sendMessage = async (messageData: any) => {
    if (isSending) return;

    setIsSending(true);
    try {
      console.log('Sending message:', messageData);
      
      const response = await ApiService.sendMessage(chatId, messageData);
      
      if (response.error) {
        console.error('Send message error:', response.error);
        Alert.alert('Error', response.error);
        return;
      }

      if (response.data && response.data.message) {
        console.log('Message sent successfully');
        // The message will be added via socket listener
        setInputText('');
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Send message error:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendText = () => {
    const text = inputText.trim();
    if (!text || isSending) return;

    sendMessage({
      type: 'text',
      content: { text }
    });
  };

  const handleTyping = (text: string) => {
    setInputText(text);
    
    // Emit typing event
    SocketService.emitTyping(chatId, text.length > 0);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Stop typing after 3 seconds of inactivity
    if (text.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        SocketService.emitTyping(chatId, false);
      }, 3000);
    }
  };

  // Handle attachments
  const handleAttachmentPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Camera', 'Photo Library', 'Document'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          switch (buttonIndex) {
            case 1:
              handleCamera();
              break;
            case 2:
              handleImagePicker();
              break;
            case 3:
              handleDocumentPicker();
              break;
          }
        }
      );
    } else {
      setShowAttachmentModal(true);
    }
  };

  const handleCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to access camera');
    }
  };

  const handleImagePicker = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Photo library permission is required to select images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to access photo library');
    }
  };

  const handleDocumentPicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadFile(result.assets[0]);
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to access documents');
    }
  };

  const uploadImage = async (asset: any) => {
    setIsUploading(true);
    setShowAttachmentModal(false);
    
    try {
      console.log('Uploading image:', asset.uri);
      
      const response = await ApiService.uploadFile(asset.uri, 'image');
      
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }

      if (response.data && response.data.fileUrl) {
        // Send image message
        await sendMessage({
          type: 'image',
          content: {
            text: '',
            imageUrl: response.data.fileUrl,
            fileName: asset.fileName || 'image.jpg',
            fileSize: asset.fileSize,
          }
        });
      }
    } catch (error) {
      console.error('Image upload error:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const uploadFile = async (asset: any) => {
    setIsUploading(true);
    setShowAttachmentModal(false);
    
    try {
      console.log('Uploading file:', asset.uri);
      
      const response = await ApiService.uploadFile(asset.uri, 'file');
      
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }

      if (response.data && response.data.fileUrl) {
        // Send file message
        await sendMessage({
          type: 'file',
          content: {
            text: '',
            fileUrl: response.data.fileUrl,
            fileName: asset.name,
            fileSize: asset.size,
          }
        });
      }
    } catch (error) {
      console.error('File upload error:', error);
      Alert.alert('Error', 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  // Setup socket listeners
  useEffect(() => {
    const setupSocketListeners = () => {
      SocketService.onNewMessage((message) => {
        if (message.chat === chatId) {
          console.log('New message received in chat');
          setMessages(prevMessages => [...prevMessages, message]);
          
          // Mark as read if message is from others
          if ((typeof message.sender === 'object' ? message.sender._id : message.sender) !== currentUser._id) {
            setTimeout(() => {
              ApiService.markMessagesAsRead(chatId);
            }, 500);
          }
          
          // Scroll to bottom
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      });

      SocketService.onTyping((data) => {
        if (data.chatId === chatId && data.userId !== currentUser._id) {
          console.log('User typing:', data.userName, data.isTyping);
          
          setTypingUsers(prev => {
            if (data.isTyping) {
              return prev.includes(data.userName) ? prev : [...prev, data.userName];
            } else {
              return prev.filter(user => user !== data.userName);
            }
          });
        }
      });

      SocketService.onMessageUpdate((data) => {
        if (data.chatId === chatId) {
          console.log('Message status updated');
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg._id === data.messageId 
                ? { ...msg, status: data.status }
                : msg
            )
          );
        }
      });
    };

    if (SocketService.isSocketConnected()) {
      setupSocketListeners();
    }

    return () => {
      SocketService.removeListener('new_message');
      SocketService.removeListener('typing');
      SocketService.removeListener('message_updated');
      
      // Stop typing when leaving
      SocketService.emitTyping(chatId, false);
      
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [chatId, currentUser._id]);

  // Load messages when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadMessages();
    }, [chatId])
  );

  // Group messages by sender for bubble styling
  const getMessageGrouping = (index: number) => {
    const currentMessage = messages[index];
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;

    const currentSender = typeof currentMessage.sender === 'object' 
      ? currentMessage.sender._id 
      : currentMessage.sender;
    
    const previousSender = previousMessage 
      ? (typeof previousMessage.sender === 'object' 
         ? previousMessage.sender._id 
         : previousMessage.sender)
      : null;
    
    const nextSender = nextMessage 
      ? (typeof nextMessage.sender === 'object' 
         ? nextMessage.sender._id 
         : nextMessage.sender)
      : null;

    const isFirstInGroup = currentSender !== previousSender;
    const isLastInGroup = currentSender !== nextSender;

    return { isFirstInGroup, isLastInGroup };
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const { isFirstInGroup, isLastInGroup } = getMessageGrouping(index);
    
    return (
      <MessageItem
        message={item}
        currentUser={currentUser}
        isFirstInGroup={isFirstInGroup}
        isLastInGroup={isLastInGroup}
      />
    );
  };

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;

    const typingText = typingUsers.length === 1
      ? `${typingUsers[0]} is typing...`
      : `${typingUsers.slice(0, -1).join(', ')} and ${typingUsers[typingUsers.length - 1]} are typing...`;

    return (
      <View style={styles.typingContainer}>
        <Text style={styles.typingText}>{typingText}</Text>
        <View style={styles.typingDots}>
          <Text style={styles.typingDot}>●</Text>
          <Text style={styles.typingDot}>●</Text>
          <Text style={styles.typingDot}>●</Text>
        </View>
      </View>
    );
  };

  const renderAttachmentModal = () => (
    <Modal
      visible={showAttachmentModal}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.attachmentModalOverlay}>
        <View style={styles.attachmentModal}>
          <Text style={styles.attachmentModalTitle}>Choose Attachment</Text>
          
          <TouchableOpacity style={styles.attachmentOption} onPress={handleCamera}>
            <Text style={styles.attachmentIcon}>📷</Text>
            <Text style={styles.attachmentText}>Camera</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.attachmentOption} onPress={handleImagePicker}>
            <Text style={styles.attachmentIcon}>🖼️</Text>
            <Text style={styles.attachmentText}>Photo Library</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.attachmentOption} onPress={handleDocumentPicker}>
            <Text style={styles.attachmentIcon}>📄</Text>
            <Text style={styles.attachmentText}>Document</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.attachmentOption, styles.cancelOption]}
            onPress={() => setShowAttachmentModal(false)}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Set navigation title
  useEffect(() => {
    navigation.setOptions({ title: chatName });
  }, [navigation, chatName]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id}
        style={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>💬</Text>
            <Text style={styles.emptyStateText}>No messages yet</Text>
            <Text style={styles.emptyStateSubtext}>Start the conversation!</Text>
          </View>
        )}
      />
      
      {renderTypingIndicator()}
      
      {isUploading && (
        <View style={styles.uploadingIndicator}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.uploadingText}>Uploading...</Text>
        </View>
      )}
      
      <View style={styles.inputContainer}>
        <TouchableOpacity 
          style={styles.attachButton}
          onPress={handleAttachmentPress}
          disabled={isUploading}
        >
          <Text style={styles.attachButtonText}>📎</Text>
        </TouchableOpacity>
        
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={handleTyping}
          placeholder="Type a message..."
          multiline={true}
          maxLength={1000}
          placeholderTextColor="#999"
          editable={!isSending}
        />
        
        <TouchableOpacity 
          style={[
            styles.sendButton,
            (!inputText.trim() || isSending) && styles.sendButtonDisabled
          ]}
          onPress={handleSendText}
          disabled={!inputText.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
      
      {renderAttachmentModal()}
    </KeyboardAvoidingView>
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
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#8e8e93',
  },
  messageContainer: {
    marginVertical: 2,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: '#8e8e93',
    marginBottom: 4,
    marginLeft: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  ownMessageBubble: {
    backgroundColor: '#007AFF',
    marginLeft: 40,
  },
  otherMessageBubble: {
    backgroundColor: '#e9ecef',
    marginRight: 40,
  },
  firstInGroup: {
    borderTopLeftRadius: 18,
  },
  lastInGroup: {
    borderBottomLeftRadius: 6,
  },
  ownFirstInGroup: {
    borderTopRightRadius: 18,
  },
  ownLastInGroup: {
    borderBottomRightRadius: 6,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#1a1a1a',
  },
  imageContainer: {
    overflow: 'hidden',
    borderRadius: 8,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileIconText: {
    fontSize: 18,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
  },
  fileSize: {
    fontSize: 12,
    marginTop: 2,
  },
  ownFileText: {
    color: 'rgba(255,255,255,0.8)',
  },
  otherFileText: {
    color: '#8e8e93',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  ownMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherMessageTime: {
    color: '#8e8e93',
  },
  messageStatus: {
    marginLeft: 8,
  },
  messageStatusIcon: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 14,
    color: '#8e8e93',
    marginRight: 8,
  },
  typingDots: {
    flexDirection: 'row',
  },
  typingDot: {
    fontSize: 8,
    color: '#8e8e93',
    marginHorizontal: 1,
  },
  uploadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: 'rgba(0,122,255,0.1)',
  },
  uploadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#007AFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  attachButtonText: {
    fontSize: 18,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 120,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginBottom: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#c7c7cc',
  },
  sendButtonText: {
    fontSize: 18,
    color: '#fff',
  },
  // Attachment modal styles
  attachmentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  attachmentModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  attachmentModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 20,
  },
  attachmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  attachmentIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  attachmentText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  cancelOption: {
    borderBottomWidth: 0,
    justifyContent: 'center',
    marginTop: 10,
  },
  cancelText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
  },
});

export default ChatScreen;