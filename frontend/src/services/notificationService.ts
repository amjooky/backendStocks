import React from 'react';
import axios from '../config/api';

export interface Notification {
  id: number;
  type: 'stock_alert' | 'stock_warning' | 'info' | 'success' | 'error';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  data?: {
    product_id?: number;
    product_name?: string;
    sku?: string;
    current_stock?: number;
    min_stock_level?: number;
    category?: string;
    supplier?: string;
    stock_status?: 'out_of_stock' | 'low_stock';
    triggered_by?: string;
  };
  status: 'active' | 'read' | 'archived' | 'resolved';
  created_at: string;
  read_at?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  stock_alerts: number;
  stock_warnings: number;
}

class NotificationService {
  private notifications: Notification[] = [];
  private listeners: ((notifications: Notification[]) => void)[] = [];
  private statsListeners: ((stats: NotificationStats) => void)[] = [];
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPolling = false;

  // Subscribe to notification updates
  subscribe(callback: (notifications: Notification[]) => void): () => void {
    this.listeners.push(callback);
    // Immediately call with current notifications
    callback(this.notifications);
    
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Subscribe to stats updates
  subscribeToStats(callback: (stats: NotificationStats) => void): () => void {
    this.statsListeners.push(callback);
    // Fetch and call with current stats
    this.fetchStats().then(callback);
    
    return () => {
      this.statsListeners = this.statsListeners.filter(listener => listener !== callback);
    };
  }

  // Start polling for new notifications
  startPolling(intervalMs = 30000) { // 30 seconds
    if (this.isPolling) return;
    
    this.isPolling = true;
    
    // Fetch immediately
    this.fetchNotifications();
    
    // Then poll at intervals
    this.pollingInterval = setInterval(() => {
      this.fetchNotifications();
      this.checkStockAlerts();
    }, intervalMs);
  }

  // Stop polling
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
  }

  // Fetch notifications from server
  async fetchNotifications(status?: string): Promise<Notification[]> {
    try {
      const params = status ? { status } : {};
      const response = await axios.get('/api/notifications', { params });
      
      this.notifications = response.data.notifications || [];
      this.notifyListeners();
      this.notifyStatsListeners();
      
      return this.notifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  // Fetch notification statistics
  async fetchStats(): Promise<NotificationStats> {
    try {
      const response = await axios.get('/api/notifications/stats');
      const stats = response.data;
      this.notifyStatsListeners(stats);
      return stats;
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      return {
        total: 0,
        unread: 0,
        read: 0,
        stock_alerts: 0,
        stock_warnings: 0
      };
    }
  }

  // Check for new stock alerts
  async checkStockAlerts(): Promise<void> {
    try {
      const response = await axios.get('/api/notifications/check-stock-alerts');
      
      if (response.data.newAlerts.length > 0) {
        // Refresh notifications if new alerts were created
        await this.fetchNotifications();
        
        // Show browser notification if supported
        if ('Notification' in window && Notification.permission === 'granted') {
          response.data.newAlerts.forEach((alert: any) => {
            const title = alert.status === 'out_of_stock' ? 
              'Stock Rupture Alert!' : 
              'Low Stock Warning';
            
            new Notification(title, {
              body: `${alert.product} (${alert.sku}) - ${alert.current_stock} units`,
              icon: '/icon-192x192.png',
              tag: `stock-${alert.sku}`, // Prevent duplicate notifications
            });
          });
        }
      }
    } catch (error) {
      console.error('Error checking stock alerts:', error);
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: number): Promise<void> {
    try {
      await axios.patch(`/api/notifications/${notificationId}/read`);
      
      // Update local state
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.status = 'read';
        notification.read_at = new Date().toISOString();
        this.notifyListeners();
        this.notifyStatsListeners();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllAsRead(): Promise<void> {
    try {
      await axios.patch('/api/notifications/mark-all-read');
      
      // Update local state
      this.notifications.forEach(notification => {
        if (notification.status === 'active') {
          notification.status = 'read';
          notification.read_at = new Date().toISOString();
        }
      });
      
      this.notifyListeners();
      this.notifyStatsListeners();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Delete notification
  async deleteNotification(notificationId: number): Promise<void> {
    try {
      await axios.delete(`/api/notifications/${notificationId}`);
      
      // Remove from local state
      this.notifications = this.notifications.filter(n => n.id !== notificationId);
      this.notifyListeners();
      this.notifyStatsListeners();
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Send custom notification
  async sendNotification(type: 'email' | 'sms' | 'push', recipient: string, message: string, subject?: string): Promise<void> {
    try {
      await axios.post('/api/notifications/send', {
        type,
        recipient,
        message,
        subject
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  // Trigger low stock alerts manually
  async triggerLowStockAlerts(): Promise<any> {
    try {
      const response = await axios.post('/api/notifications/low-stock');
      
      // Refresh notifications
      await this.fetchNotifications();
      
      return response.data;
    } catch (error) {
      console.error('Error triggering low stock alerts:', error);
      throw error;
    }
  }

  // Request browser notification permission
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission;
    }
    return 'denied';
  }

  // Get current notifications (without server call)
  getNotifications(): Notification[] {
    return this.notifications;
  }

  // Get unread count
  getUnreadCount(): number {
    return this.notifications.filter(n => n.status === 'active').length;
  }

  // Get stock alerts count
  getStockAlertsCount(): number {
    return this.notifications.filter(n => 
      n.status === 'active' && (n.type === 'stock_alert' || n.type === 'stock_warning')
    ).length;
  }

  // Private methods
  private notifyListeners() {
    this.listeners.forEach(callback => callback(this.notifications));
  }

  private async notifyStatsListeners(stats?: NotificationStats) {
    const finalStats = stats || await this.fetchStats();
    this.statsListeners.forEach(callback => callback(finalStats));
  }
}

// Create and export singleton instance
export const notificationService = new NotificationService();

// React hook for using notifications
export function useNotifications() {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [stats, setStats] = React.useState<NotificationStats>({
    total: 0,
    unread: 0,
    read: 0,
    stock_alerts: 0,
    stock_warnings: 0
  });

  React.useEffect(() => {
    const unsubscribe = notificationService.subscribe(setNotifications);
    const unsubscribeStats = notificationService.subscribeToStats(setStats);
    
    // Start polling when component mounts
    notificationService.startPolling();
    
    return () => {
      unsubscribe();
      unsubscribeStats();
      notificationService.stopPolling();
    };
  }, []);

  return {
    notifications,
    stats,
    markAsRead: notificationService.markAsRead.bind(notificationService),
    markAllAsRead: notificationService.markAllAsRead.bind(notificationService),
    deleteNotification: notificationService.deleteNotification.bind(notificationService),
    triggerLowStockAlerts: notificationService.triggerLowStockAlerts.bind(notificationService),
    requestPermission: notificationService.requestNotificationPermission.bind(notificationService)
  };
}

export default notificationService;
