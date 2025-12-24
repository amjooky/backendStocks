import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  Menu,
  MenuItem,
  Divider,
  Alert,
  Tooltip,
  Fab,
  Slide,
  Snackbar,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  MarkEmailRead as MarkReadIcon,
  DoneAll as MarkAllReadIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Inventory as InventoryIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useNotifications, notificationService } from '../services/notificationService';
import type { Notification } from '../services/notificationService';
import { useTranslation } from 'react-i18next';

interface NotificationCenterProps {
  variant?: 'fab' | 'button' | 'icon';
  showBadge?: boolean;
  onNotificationClick?: (notification: Notification) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  variant = 'icon',
  showBadge = true,
  onNotificationClick
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { notifications, stats, markAsRead, markAllAsRead, deleteNotification, triggerLowStockAlerts, requestPermission } = useNotifications();
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  const isMenuOpen = Boolean(anchorEl);
  const unreadCount = stats.unread;
  const stockAlertsCount = stats.stock_alerts;

  useEffect(() => {
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      requestPermission();
    }
  }, []);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
    setDialogOpen(true);
    handleMenuClose();
    
    // Mark as read if it's not already read
    if (notification.status === 'active') {
      markAsRead(notification.id);
    }
    
    // Call custom click handler if provided
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markAsRead(notificationId);
      showSnackbar('Notification marked as read', 'success');
    } catch (error) {
      showSnackbar('Error marking notification as read', 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      await markAllAsRead();
      showSnackbar('All notifications marked as read', 'success');
      handleMenuClose();
    } catch (error) {
      showSnackbar('Error marking all notifications as read', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (notificationId: number) => {
    try {
      await deleteNotification(notificationId);
      showSnackbar('Notification deleted', 'success');
      if (selectedNotification?.id === notificationId) {
        setDialogOpen(false);
      }
    } catch (error) {
      showSnackbar('Error deleting notification', 'error');
    }
  };

  const handleTriggerStockAlerts = async () => {
    try {
      setLoading(true);
      const result = await triggerLowStockAlerts();
      showSnackbar(result.message || 'Stock alerts triggered', 'success');
      handleMenuClose();
    } catch (error) {
      showSnackbar('Error triggering stock alerts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'stock_alert':
        return <ErrorIcon sx={{ color: theme.palette.error.main }} />;
      case 'stock_warning':
        return <WarningIcon sx={{ color: theme.palette.warning.main }} />;
      case 'success':
        return <SuccessIcon sx={{ color: theme.palette.success.main }} />;
      case 'error':
        return <ErrorIcon sx={{ color: theme.palette.error.main }} />;
      case 'info':
      default:
        return <InfoIcon sx={{ color: theme.palette.info.main }} />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'stock_alert':
        return 'error' as const;
      case 'stock_warning':
        return 'warning' as const;
      case 'success':
        return 'success' as const;
      case 'error':
        return 'error' as const;
      case 'info':
      default:
        return 'info' as const;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return theme.palette.error.main;
      case 'medium':
        return theme.palette.warning.main;
      case 'low':
      default:
        return theme.palette.info.main;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const renderNotificationButton = () => {
    const buttonContent = (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {stockAlertsCount > 0 ? (
          <NotificationsActiveIcon sx={{ color: theme.palette.error.main }} />
        ) : (
          <NotificationsIcon />
        )}
        {variant === 'button' && (
          <Typography variant="button">
            {t('common.notifications')}
          </Typography>
        )}
      </Box>
    );

    if (variant === 'fab') {
      return (
        <Fab
          color={stockAlertsCount > 0 ? 'error' : 'primary'}
          onClick={handleMenuOpen}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1000,
          }}
        >
          <Badge badgeContent={showBadge ? unreadCount : 0} color="error">
            <NotificationsIcon />
          </Badge>
        </Fab>
      );
    }

    return (
      <IconButton
        onClick={handleMenuOpen}
        sx={{ color: 'inherit' }}
      >
        <Badge badgeContent={showBadge ? unreadCount : 0} color="error">
          {buttonContent}
        </Badge>
      </IconButton>
    );
  };

  return (
    <>
      {renderNotificationButton()}

      {/* Notification Menu */}
      <Menu
        anchorEl={anchorEl}
        open={isMenuOpen}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 600,
            overflow: 'hidden',
            borderRadius: 2,
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {t('common.notifications')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {unreadCount > 0 && (
                <Tooltip title="Mark all as read">
                  <IconButton size="small" onClick={handleMarkAllAsRead} disabled={loading}>
                    {loading ? <CircularProgress size={16} /> : <MarkAllReadIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Trigger stock alerts">
                <IconButton size="small" onClick={handleTriggerStockAlerts} disabled={loading}>
                  {loading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          {/* Stats */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              size="small"
              icon={<NotificationsIcon />}
              label={`${unreadCount} unread`}
              color="primary"
              variant={unreadCount > 0 ? 'filled' : 'outlined'}
            />
            {stockAlertsCount > 0 && (
              <Chip
                size="small"
                icon={<WarningIcon />}
                label={`${stockAlertsCount} stock alerts`}
                color="error"
              />
            )}
          </Box>
        </Box>

        {/* Notifications List */}
        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
          {notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <NotificationsIcon sx={{ fontSize: 48, color: theme.palette.text.disabled, mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No notifications yet
              </Typography>
            </Box>
          ) : (
            notifications.slice(0, 10).map((notification) => (
              <MenuItem
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  borderLeft: `4px solid ${getPriorityColor(notification.priority)}`,
                  backgroundColor: notification.status === 'active' 
                    ? alpha(getPriorityColor(notification.priority), 0.05)
                    : 'transparent',
                  '&:hover': {
                    backgroundColor: alpha(getPriorityColor(notification.priority), 0.1),
                  },
                  py: 1.5,
                  px: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, width: '100%' }}>
                  {getNotificationIcon(notification.type)}
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: notification.status === 'active' ? 'bold' : 'normal',
                        mb: 0.5,
                      }}
                      noWrap
                    >
                      {notification.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        mb: 0.5,
                      }}
                    >
                      {notification.message}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.disabled">
                        {formatTimeAgo(notification.created_at)}
                      </Typography>
                      {notification.status === 'active' && (
                        <Chip
                          size="small"
                          label="New"
                          color="primary"
                          sx={{ height: 16, fontSize: '0.65rem' }}
                        />
                      )}
                    </Box>
                  </Box>
                </Box>
              </MenuItem>
            ))
          )}
        </Box>

        {/* Footer */}
        {notifications.length > 10 && (
          <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Button fullWidth variant="text" onClick={() => setDialogOpen(true)}>
              View All Notifications
            </Button>
          </Box>
        )}
      </Menu>

      {/* Notification Detail Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {selectedNotification && getNotificationIcon(selectedNotification.type)}
            <Typography variant="h6">
              {selectedNotification?.title || 'Notification Details'}
            </Typography>
          </Box>
          <IconButton onClick={() => setDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent dividers>
          {selectedNotification ? (
            <Box>
              <Alert
                severity={getNotificationColor(selectedNotification.type)}
                sx={{ mb: 2 }}
              >
                <Typography variant="body1" sx={{ mb: 1 }}>
                  {selectedNotification.message}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Created: {new Date(selectedNotification.created_at).toLocaleString()}
                  {selectedNotification.read_at && (
                    <>
                      <br />
                      Read: {new Date(selectedNotification.read_at).toLocaleString()}
                    </>
                  )}
                </Typography>
              </Alert>

              {/* Stock-specific details */}
              {selectedNotification.data && (
                <Card variant="outlined" sx={{ mt: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <InventoryIcon fontSize="small" />
                      Product Details
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1 }}>
                      {selectedNotification.data.product_name && (
                        <Typography variant="body2">
                          <strong>Product:</strong> {selectedNotification.data.product_name}
                        </Typography>
                      )}
                      {selectedNotification.data.sku && (
                        <Typography variant="body2">
                          <strong>SKU:</strong> {selectedNotification.data.sku}
                        </Typography>
                      )}
                      {selectedNotification.data.current_stock !== undefined && (
                        <Typography variant="body2">
                          <strong>Current Stock:</strong> {selectedNotification.data.current_stock}
                        </Typography>
                      )}
                      {selectedNotification.data.min_stock_level !== undefined && (
                        <Typography variant="body2">
                          <strong>Minimum Stock:</strong> {selectedNotification.data.min_stock_level}
                        </Typography>
                      )}
                      {selectedNotification.data.category && (
                        <Typography variant="body2">
                          <strong>Category:</strong> {selectedNotification.data.category}
                        </Typography>
                      )}
                      {selectedNotification.data.supplier && (
                        <Typography variant="body2">
                          <strong>Supplier:</strong> {selectedNotification.data.supplier}
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Box>
          ) : (
            <Typography>No notification selected</Typography>
          )}
        </DialogContent>
        
        <DialogActions>
          {selectedNotification && (
            <>
              {selectedNotification.status === 'active' && (
                <Button
                  startIcon={<MarkReadIcon />}
                  onClick={() => handleMarkAsRead(selectedNotification.id)}
                >
                  Mark as Read
                </Button>
              )}
              <Button
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => handleDelete(selectedNotification.id)}
              >
                Delete
              </Button>
            </>
          )}
          <Button onClick={() => setDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default NotificationCenter;