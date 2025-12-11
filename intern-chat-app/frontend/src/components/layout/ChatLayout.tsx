import React from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Avatar,
  Badge,
  Paper,
  TextField,
  IconButton,
  Divider,
  Chip,
  Button,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Send,
  Add,
  Search,
  MoreVert,
  Circle,
  AttachFile,
  EmojiEmotions,
  Business,
  Chat
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';
import { useSocket } from '../../contexts/SocketContext';
import UserMenu from '../common/UserMenu';
import UserPresenceIndicator from '../common/UserPresenceIndicator';
import TeamColleagues from '../common/TeamColleagues';
import DebugInfo from '../debug/DebugInfo';
import TeamDirectory from '../directory/TeamDirectory';

const DRAWER_WIDTH = 320;
const HEADER_HEIGHT = 64;

const ChatLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { chats, currentChat, messages, selectChat, sendMessage } = useChat();
  const { isConnected } = useSocket();
  const [messageInput, setMessageInput] = React.useState('');
  const [activeTab, setActiveTab] = React.useState(0); // 0 = Chat, 1 = Directory

  const currentMessages = currentChat ? messages[currentChat._id] || [] : [];

  const handleSendMessage = () => {
    if (messageInput.trim() && currentChat) {
      sendMessage(currentChat._id, messageInput.trim());
      setMessageInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#4caf50';
      case 'away': return '#ff9800';
      case 'busy': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getChatName = (chat: any) => {
    if (chat.type === 'individual') {
      const otherUser = chat.participants.find((p: any) => p.user.id !== user?.id);
      return otherUser?.user.fullName || 'Unknown User';
    }
    return chat.name || 'Group Chat';
  };

  const getChatAvatar = (chat: any) => {
    if (chat.type === 'individual') {
      const otherUser = chat.participants.find((p: any) => p.user.id !== user?.id);
      return otherUser?.user.profilePhoto || otherUser?.user.fullName?.[0] || '?';
    }
    return chat.name?.[0] || 'G';
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Left Sidebar - Chat List */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid rgba(0, 0, 0, 0.12)',
          },
        }}
      >
        {/* Header */}
        <AppBar 
          position="static" 
          elevation={0}
          sx={{ 
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
          }}
        >
          <Toolbar sx={{ height: HEADER_HEIGHT, justifyContent: 'space-between' }}>
            <UserMenu showName={true} size="medium" />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Badge
                variant="dot"
                color={isConnected ? 'success' : 'error'}
                sx={{ mr: 1 }}
              >
                <IconButton size="small" title="Connection status">
                  <Circle sx={{ fontSize: 8, color: isConnected ? 'success.main' : 'error.main' }} />
                </IconButton>
              </Badge>
              <IconButton size="small" title="New chat">
                <Add />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Search */}
        <Box sx={{ p: 2 }}>
          <TextField
            placeholder="Search chats..."
            size="small"
            fullWidth
            InputProps={{
              startAdornment: <Search sx={{ color: 'text.secondary', mr: 1 }} />,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
              },
            }}
          />
        </Box>

        {/* Team Colleagues */}
        <TeamColleagues />

        {/* Chat List */}
        <List sx={{ flexGrow: 1, px: 1 }}>
          {chats.map((chat) => (
            <ListItemButton
              key={chat._id}
              onClick={() => selectChat(chat)}
              selected={currentChat?._id === chat._id}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                '&.Mui-selected': {
                  bgcolor: 'primary.50',
                  '&:hover': {
                    bgcolor: 'primary.100',
                  },
                },
              }}
            >
              {chat.type === 'individual' ? (
                <UserPresenceIndicator
                  status={chat.participants?.find((p: any) => p.user.id !== user?.id)?.user.status}
                  size="medium"
                >
                  <Avatar sx={{ mr: 2, width: 40, height: 40 }}>
                    {getChatAvatar(chat)}
                  </Avatar>
                </UserPresenceIndicator>
              ) : (
                <Avatar sx={{ mr: 2, width: 40, height: 40 }}>
                  {getChatAvatar(chat)}
                </Avatar>
              )}
              <ListItemText
                primary={
                  <Typography variant="body2" fontWeight={500}>
                    {getChatName(chat)}
                  </Typography>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {chat.lastMessage?.content || 'No messages yet'}
                  </Typography>
                }
              />
              {chat.type && (
                <Chip
                  label={chat.type}
                  size="small"
                  color={chat.type === 'group' ? 'primary' : 'default'}
                  sx={{ ml: 1, fontSize: '0.7rem', height: 20 }}
                />
              )}
            </ListItemButton>
          ))}
        </List>

        {/* Bottom Actions */}
        <Box sx={{ p: 2, borderTop: '1px solid rgba(0, 0, 0, 0.12)' }}>
          <Typography variant="caption" color="text.secondary">
            Status: {isConnected ? 'Connected' : 'Connecting...'}
          </Typography>
        </Box>
      </Drawer>

      {/* Main Content Area */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Navigation Tabs */}
        <AppBar 
          position="static" 
          elevation={0}
          sx={{ 
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
          }}
        >
          <Toolbar sx={{ height: HEADER_HEIGHT, justifyContent: 'space-between' }}>
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{ minHeight: 48 }}
            >
              <Tab 
                icon={<Chat />} 
                label="Chat" 
                iconPosition="start"
                sx={{ minHeight: 48 }}
              />
              <Tab 
                icon={<Business />} 
                label="Directory" 
                iconPosition="start"
                sx={{ minHeight: 48 }}
              />
            </Tabs>
            
            {activeTab === 0 && currentChat && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {currentChat.type === 'individual' ? (
                  <UserPresenceIndicator
                    status={currentChat.participants?.find((p: any) => p.user.id !== user?.id)?.user.status}
                    size="medium"
                  >
                    <Avatar sx={{ mr: 2, width: 40, height: 40 }}>
                      {getChatAvatar(currentChat)}
                    </Avatar>
                  </UserPresenceIndicator>
                ) : (
                  <Avatar sx={{ mr: 2, width: 40, height: 40 }}>
                    {getChatAvatar(currentChat)}
                  </Avatar>
                )}
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6">
                    {getChatName(currentChat)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {currentChat.participants?.length} participants
                  </Typography>
                </Box>
                <IconButton>
                  <Search />
                </IconButton>
                <IconButton>
                  <MoreVert />
                </IconButton>
              </Box>
            )}
          </Toolbar>
        </AppBar>

        {/* Tab Content */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {/* Chat Tab */}
          {activeTab === 0 && (
            currentChat ? (
              <>
                {/* Messages Area */}
                <Box sx={{ 
                  flexGrow: 1, 
                  overflow: 'auto', 
                  p: 2,
                  bgcolor: 'grey.50',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  minHeight: 'calc(100vh - 200px)'
                }}>
                  {currentMessages.map((message) => (
                    <Box
                      key={message._id}
                      sx={{
                        display: 'flex',
                        flexDirection: message.sender.id === user?.id ? 'row-reverse' : 'row',
                        mb: 1,
                      }}
                    >
                      {message.sender.id !== user?.id && (
                        <Avatar 
                          sx={{ mr: 1, width: 32, height: 32 }}
                          src={message.sender.profilePhoto}
                        >
                          {message.sender.name.firstName?.[0]}
                        </Avatar>
                      )}
                      <Paper
                        sx={{
                          p: 1.5,
                          maxWidth: '70%',
                          bgcolor: message.sender.id === user?.id ? 'primary.main' : 'white',
                          color: message.sender.id === user?.id ? 'white' : 'text.primary',
                          borderRadius: 2,
                          ...(message.sender.id === user?.id ? {
                            borderBottomRightRadius: 4,
                          } : {
                            borderBottomLeftRadius: 4,
                          })
                        }}
                      >
                        {message.sender.id !== user?.id && (
                          <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
                            {message.sender.name.firstName} {message.sender.name.lastName}
                          </Typography>
                        )}
                        <Typography variant="body2">
                          {message.content.text}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            opacity: 0.7, 
                            display: 'block', 
                            textAlign: 'right',
                            mt: 0.5 
                          }}
                        >
                          {new Date(message.createdAt).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </Typography>
                      </Paper>
                    </Box>
                  ))}
                </Box>

                {/* Message Input */}
                <Box sx={{ 
                  p: 2, 
                  borderTop: '1px solid rgba(0, 0, 0, 0.12)',
                  bgcolor: 'background.paper'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                    <IconButton size="small">
                      <AttachFile />
                    </IconButton>
                    <TextField
                      fullWidth
                      multiline
                      maxRows={4}
                      placeholder="Type a message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 3,
                        },
                      }}
                    />
                    <IconButton size="small">
                      <EmojiEmotions />
                    </IconButton>
                    <IconButton 
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim()}
                      sx={{ 
                        bgcolor: 'primary.main',
                        color: 'white',
                        '&:hover': {
                          bgcolor: 'primary.dark',
                        },
                      }}
                    >
                      <Send />
                    </IconButton>
                  </Box>
                </Box>
              </>
            ) : (
              /* Welcome Screen for Chat Tab */
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                height: '100%',
                flexDirection: 'column',
                gap: 2,
                color: 'text.secondary',
                p: 4
              }}>
                <Typography variant="h4" fontWeight="light">
                  💬 Welcome to Company Chat
                </Typography>
                <Typography variant="body1">
                  Select a chat from the sidebar to start messaging with your colleagues
                </Typography>
                <Button 
                  variant="contained" 
                  startIcon={<Add />}
                  sx={{ mt: 2 }}
                >
                  Start New Chat
                </Button>
                
                {/* Debug Info */}
                <Box sx={{ mt: 4, width: '100%', maxWidth: 600 }}>
                  <DebugInfo />
                </Box>
              </Box>
            )
          )}
          
          {/* Directory Tab */}
          {activeTab === 1 && (
            <TeamDirectory />
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ChatLayout;