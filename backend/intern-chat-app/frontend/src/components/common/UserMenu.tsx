import React, { useState } from 'react';
import {
  Menu,
  MenuItem,
  Avatar,
  Box,
  Typography,
  Divider,
  ListItemIcon,
  ListItemText,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  ExpandMore,
  Settings,
  AccountCircle,
  ExitToApp,
  Circle,
  Feedback,
  Help,
  DarkMode,
  Notifications,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import UserStatusSelector from './UserStatusSelector';

interface UserMenuProps {
  showName?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const UserMenu: React.FC<UserMenuProps> = ({ showName = true, size = 'medium' }) => {
  const { user, logout, updateStatus } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [statusSelectorOpen, setStatusSelectorOpen] = useState(false);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    setLogoutDialogOpen(true);
    handleClose();
  };

  const confirmLogout = async () => {
    try {
      await logout();
      setLogoutDialogOpen(false);
    } catch (error) {
      console.error('Logout error:', error);
      // Still close dialog even if logout fails
      setLogoutDialogOpen(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      await updateStatus(status as any);
      setStatusSelectorOpen(false);
    } catch (error) {
      console.error('Status update error:', error);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online': return '#4caf50';
      case 'away': return '#ff9800';
      case 'busy': return '#f44336';
      case 'offline': return '#9e9e9e';
      default: return '#9e9e9e';
    }
  };

  const getAvatarSize = () => {
    switch (size) {
      case 'small': return { width: 28, height: 28 };
      case 'large': return { width: 48, height: 48 };
      default: return { width: 36, height: 36 };
    }
  };

  if (!user) return null;

  return (
    <>
      <Box
        onClick={handleClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          padding: showName ? '4px 8px' : '4px',
          borderRadius: 2,
          '&:hover': {
            bgcolor: 'action.hover',
          },
          transition: 'background-color 0.2s',
        }}
      >
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          badgeContent={
            <Circle
              sx={{
                width: 12,
                height: 12,
                color: getStatusColor(user.status),
                border: '2px solid white',
                borderRadius: '50%',
              }}
            />
          }
        >
          <Avatar 
            src={user.profilePhoto} 
            sx={getAvatarSize()}
          >
            {user.name?.firstName?.[0]}{user.name?.lastName?.[0]}
          </Avatar>
        </Badge>
        
        {showName && (
          <>
            <Box sx={{ ml: 1, flexGrow: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" fontWeight={600} noWrap>
                {user.name?.firstName} {user.name?.lastName}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {user.status || 'offline'}
              </Typography>
            </Box>
            <ExpandMore sx={{ ml: 0.5, fontSize: '1.2rem' }} />
          </>
        )}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          elevation: 3,
          sx: {
            minWidth: 280,
            mt: 1,
            '& .MuiMenuItem-root': {
              px: 2,
              py: 1.5,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* User Profile Section */}
        <Box sx={{ px: 2, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={
                <Circle
                  sx={{
                    width: 14,
                    height: 14,
                    color: getStatusColor(user.status),
                    border: '2px solid white',
                    borderRadius: '50%',
                  }}
                />
              }
            >
              <Avatar src={user.profilePhoto} sx={{ width: 48, height: 48 }}>
                {user.name?.firstName?.[0]}{user.name?.lastName?.[0]}
              </Avatar>
            </Badge>
            <Box sx={{ ml: 2, flexGrow: 1 }}>
              <Typography variant="h6" fontWeight={600}>
                {user.name?.firstName} {user.name?.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {user.department} • {user.role}
          </Typography>
        </Box>

        {/* Status Selector */}
        <MenuItem onClick={() => setStatusSelectorOpen(true)}>
          <ListItemIcon>
            <Circle sx={{ color: getStatusColor(user.status) }} />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2">Status: {user.status || 'offline'}</Typography>
            <Typography variant="caption" color="text.secondary">
              Click to change
            </Typography>
          </ListItemText>
        </MenuItem>

        <Divider />

        {/* Menu Items */}
        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <AccountCircle />
          </ListItemIcon>
          <ListItemText>Profile & Account</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <Settings />
          </ListItemIcon>
          <ListItemText>Settings & Privacy</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <Notifications />
          </ListItemIcon>
          <ListItemText>Notifications</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <DarkMode />
          </ListItemIcon>
          <ListItemText>Dark Mode</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <Help />
          </ListItemIcon>
          <ListItemText>Help & Support</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <Feedback />
          </ListItemIcon>
          <ListItemText>Give Feedback</ListItemText>
        </MenuItem>

        <Divider />

        {/* Logout */}
        <MenuItem 
          onClick={handleLogout}
          sx={{ 
            color: 'error.main',
            '&:hover': {
              bgcolor: 'error.50',
            }
          }}
        >
          <ListItemIcon>
            <ExitToApp sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Log Out</ListItemText>
        </MenuItem>
      </Menu>

      {/* Status Selector Dialog */}
      <UserStatusSelector
        open={statusSelectorOpen}
        currentStatus={user.status || 'offline'}
        onClose={() => setStatusSelectorOpen(false)}
        onStatusChange={handleStatusChange}
      />

      {/* Logout Confirmation Dialog */}
      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar src={user.profilePhoto} sx={{ width: 40, height: 40 }}>
              {user.name?.firstName?.[0]}{user.name?.lastName?.[0]}
            </Avatar>
            <Box>
              <Typography variant="h6">
                Log out of your account?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.name?.firstName} {user.name?.lastName}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            You'll be signed out of your account and will need to sign back in to continue using the chat.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button
            onClick={() => setLogoutDialogOpen(false)}
            variant="outlined"
            fullWidth
          >
            Cancel
          </Button>
          <Button
            onClick={confirmLogout}
            variant="contained"
            color="primary"
            fullWidth
          >
            Log Out
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default UserMenu;