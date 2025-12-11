import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Typography,
  Box,
  IconButton,
  alpha,
} from '@mui/material';
import {
  Circle,
  Close,
  CheckCircle,
} from '@mui/icons-material';

interface UserStatusSelectorProps {
  open: boolean;
  currentStatus: string;
  onClose: () => void;
  onStatusChange: (status: string) => void;
}

interface StatusOption {
  value: string;
  label: string;
  description: string;
  color: string;
  icon: React.ReactNode;
}

const UserStatusSelector: React.FC<UserStatusSelectorProps> = ({
  open,
  currentStatus,
  onClose,
  onStatusChange,
}) => {
  const statusOptions: StatusOption[] = [
    {
      value: 'online',
      label: 'Online',
      description: 'Available and ready to chat',
      color: '#4caf50',
      icon: <Circle sx={{ color: '#4caf50', fontSize: 16 }} />,
    },
    {
      value: 'away',
      label: 'Away',
      description: 'Not at computer, will respond when back',
      color: '#ff9800',
      icon: <Circle sx={{ color: '#ff9800', fontSize: 16 }} />,
    },
    {
      value: 'busy',
      label: 'Busy',
      description: 'In a meeting or focused on work',
      color: '#f44336',
      icon: <Circle sx={{ color: '#f44336', fontSize: 16 }} />,
    },
    {
      value: 'offline',
      label: 'Appear Offline',
      description: 'Won\'t receive notifications or appear online',
      color: '#9e9e9e',
      icon: <Circle sx={{ color: '#9e9e9e', fontSize: 16 }} />,
    },
  ];

  const handleStatusSelect = (status: string) => {
    onStatusChange(status);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxWidth: 400,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={600}>
            Set your status
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Let your colleagues know your availability
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <List sx={{ py: 0 }}>
          {statusOptions.map((status, index) => (
            <ListItem key={status.value} disablePadding>
              <ListItemButton
                onClick={() => handleStatusSelect(status.value)}
                selected={currentStatus === status.value}
                sx={{
                  py: 2,
                  px: 3,
                  '&.Mui-selected': {
                    bgcolor: alpha(status.color, 0.1),
                    borderLeft: `3px solid ${status.color}`,
                    '&:hover': {
                      bgcolor: alpha(status.color, 0.15),
                    },
                  },
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {status.icon}
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" fontWeight={500}>
                        {status.label}
                      </Typography>
                      {currentStatus === status.value && (
                        <CheckCircle 
                          sx={{ 
                            color: status.color, 
                            fontSize: 18 
                          }} 
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {status.description}
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        {/* Tips Section */}
        <Box sx={{ p: 3, bgcolor: 'grey.50', mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            💡 <strong>Tips:</strong>
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            • Your status is visible to all your colleagues
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            • Status automatically changes to 'Away' after 10 minutes of inactivity
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            • Use 'Busy' during meetings to reduce interruptions
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default UserStatusSelector;