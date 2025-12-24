import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Avatar,
  Divider,
  CircularProgress,
  Button,
  Collapse,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Chat,
  Group,
} from '@mui/icons-material';
import { User } from '../../types';
import { usersAPI, chatsAPI } from '../../services/api';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import UserPresenceIndicator from './UserPresenceIndicator';
import toast from 'react-hot-toast';

const TeamColleagues: React.FC = () => {
  const { user } = useAuth();
  const { createIndividualChat, loadChats } = useChat();
  const [colleagues, setColleagues] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (user) {
      loadColleagues();
    }
  }, [user]);

  const loadColleagues = async () => {
    if (!user) {
      console.log('🔍 No user found');
      return;
    }
    
    console.log('🔍 Loading colleagues...');
    
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Making API call to get colleagues...');
      const response = await usersAPI.getColleagues();
      console.log('✅ Got colleagues response:', response.data);
      setColleagues(response.data.data?.colleagues || []);
    } catch (error: any) {
      console.error('❌ Failed to load colleagues:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      setError(error.response?.data?.message || 'Failed to load colleagues');
    } finally {
      setLoading(false);
    }
  };

  const startChatWithColleague = async (colleague: User) => {
    try {
      const chat = await createIndividualChat(colleague._id);
      toast.success(`Chat started with ${colleague.name.firstName} ${colleague.name.lastName}`);
    } catch (error: any) {
      console.error('Failed to start chat:', error);
      toast.error('Failed to start chat');
    }
  };

  const createTeamChat = async () => {
    try {
      // Create a general group chat for all team members
      const allColleagues = colleagues.map(c => c._id);
      const response = await chatsAPI.createGroupChat({
        name: 'General Team Chat',
        description: 'General discussion for all team members',
        participantIds: allColleagues
      });
      await loadChats(); // Refresh chats list
      toast.success('Team chat created!');
    } catch (error: any) {
      console.error('Failed to create team chat:', error);
      toast.error('Failed to create team chat');
    }
  };

  if (!user) {
    return null;
  }

  const onlineColleagues = colleagues.filter(c => c.status === 'online');
  const offlineColleagues = colleagues.filter(c => c.status !== 'online');

  return (
    <Box sx={{ px: 1, py: 1 }}>
      {/* Company Section Header */}
      <ListItemButton
        onClick={() => setExpanded(!expanded)}
        sx={{
          borderRadius: 2,
          mb: 0.5,
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        <Group sx={{ mr: 1.5, color: 'primary.main', fontSize: 20 }} />
        <ListItemText
          primary={
            <Typography variant="subtitle2" fontWeight={600}>
              Team Members
            </Typography>
          }
          secondary={
            <Typography variant="caption" color="text.secondary">
              {colleagues.length} member{colleagues.length !== 1 ? 's' : ''}
              {onlineColleagues.length > 0 && ` • ${onlineColleagues.length} online`}
            </Typography>
          }
        />
        {expanded ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ ml: 2, mb: 1 }}>
          {/* Team Chat Button */}
          <Button
            onClick={createTeamChat}
            startIcon={<Group />}
            variant="outlined"
            size="small"
            fullWidth
            sx={{ mb: 2, textTransform: 'none' }}
          >
            Team Chat
          </Button>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : error ? (
            <Box sx={{ py: 1 }}>
              <Typography variant="body2" color="error" align="center">
                {error}
              </Typography>
              <Button
                onClick={loadColleagues}
                size="small"
                variant="text"
                fullWidth
                sx={{ mt: 1 }}
              >
                Try Again
              </Button>
            </Box>
          ) : colleagues.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
              sx={{ py: 2 }}
            >
              No team members found
            </Typography>
          ) : (
            <>
              {/* Online Colleagues */}
              {onlineColleagues.length > 0 && (
                <>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ px: 1, fontWeight: 600, textTransform: 'uppercase' }}
                  >
                    Online ({onlineColleagues.length})
                  </Typography>
                  <List dense sx={{ py: 0 }}>
                    {onlineColleagues.map((colleague) => (
                      <ListItem key={colleague._id} disablePadding>
                        <ListItemButton
                          onClick={() => startChatWithColleague(colleague)}
                          sx={{
                            borderRadius: 2,
                            mb: 0.5,
                            py: 1,
                            '&:hover': {
                              bgcolor: 'action.hover',
                            },
                          }}
                        >
                          <UserPresenceIndicator
                            status={colleague.status}
                            size="small"
                          >
                            <Avatar
                              src={colleague.profilePhoto}
                              sx={{ width: 32, height: 32, mr: 1.5 }}
                            >
                              {colleague.name.firstName[0]}{colleague.name.lastName[0]}
                            </Avatar>
                          </UserPresenceIndicator>
                          
                          <ListItemText
                            primary={
                              <Typography variant="body2" fontWeight={500}>
                                {colleague.name.firstName} {colleague.name.lastName}
                              </Typography>
                            }
                            secondary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                  {colleague.department} • {colleague.role}
                                </Typography>
                              </Box>
                            }
                          />
                          
                          <Tooltip title="Start chat">
                            <IconButton size="small" sx={{ ml: 1 }}>
                              <Chat sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </>
              )}

              {/* Offline Colleagues */}
              {offlineColleagues.length > 0 && (
                <>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ px: 1, fontWeight: 600, textTransform: 'uppercase' }}
                  >
                    Offline ({offlineColleagues.length})
                  </Typography>
                  <List dense sx={{ py: 0 }}>
                    {offlineColleagues.map((colleague) => (
                      <ListItem key={colleague._id} disablePadding>
                        <ListItemButton
                          onClick={() => startChatWithColleague(colleague)}
                          sx={{
                            borderRadius: 2,
                            mb: 0.5,
                            py: 1,
                            opacity: 0.7,
                            '&:hover': {
                              bgcolor: 'action.hover',
                              opacity: 0.9,
                            },
                          }}
                        >
                          <UserPresenceIndicator
                            status={colleague.status}
                            size="small"
                          >
                            <Avatar
                              src={colleague.profilePhoto}
                              sx={{ width: 32, height: 32, mr: 1.5 }}
                            >
                              {colleague.name.firstName[0]}{colleague.name.lastName[0]}
                            </Avatar>
                          </UserPresenceIndicator>
                          
                          <ListItemText
                            primary={
                              <Typography variant="body2" fontWeight={500}>
                                {colleague.name.firstName} {colleague.name.lastName}
                              </Typography>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                {colleague.department} • {colleague.role}
                              </Typography>
                            }
                          />
                          
                          <Tooltip title="Start chat">
                            <IconButton size="small" sx={{ ml: 1 }}>
                              <Chat sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </>
          )}
        </Box>
      </Collapse>
      
      <Divider sx={{ my: 1 }} />
    </Box>
  );
};

export default TeamColleagues;
