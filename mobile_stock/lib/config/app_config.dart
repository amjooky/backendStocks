class AppConfig {
  // API configuration
  static const String apiBaseUrl = 'https://backendstocks.onrender.com/api';
  static const Duration apiTimeout = Duration(seconds: 30);

  // App settings
  static const String appName = 'Stock Manager';
  static const String appVersion = '1.0.0';
  
  // Feature flags
  static const bool enableOfflineMode = false;
  static const bool enableAnalytics = true;
  static const bool enablePushNotifications = false;

  // Theme configuration
  static const bool useDarkMode = false;
  static const String primaryColor = '#007AFF';
  static const String accentColor = '#FF9500';

  // Cache configuration
  static const Duration cacheTimeout = Duration(hours: 24);
  static const int maxCacheSize = 50; // In MB
  
  // Pagination defaults
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;
  
  // Stock level thresholds
  static const int lowStockThreshold = 10;
  static const int criticalStockThreshold = 5;
  
  // Date formats
  static const String defaultDateFormat = 'yyyy-MM-dd';
  static const String defaultTimeFormat = 'HH:mm:ss';
  static const String defaultDateTimeFormat = 'yyyy-MM-dd HH:mm:ss';
  
  // Currency configuration
  static const String defaultCurrency = 'USD';
  static const int decimalPlaces = 2;
  
  // Report configuration
  static const int maxReportItems = 1000;
  static const Duration reportCacheTimeout = Duration(hours: 1);
  
  // Image configuration
  static const int maxImageSize = 5; // In MB
  static const List<String> allowedImageTypes = ['jpg', 'jpeg', 'png'];
  static const int maxImageDimension = 2048; // pixels
  
  // Error reporting
  static const bool enableErrorReporting = true;
  static const String errorReportingEmail = 'support@stockmanager.com';
  
  // Performance monitoring
  static const bool enablePerformanceMonitoring = true;
  static const Duration slowRequestThreshold = Duration(seconds: 5);
  
  // Security
  static const bool enforceStrongPasswords = true;
  static const int minPasswordLength = 8;
  static const Duration sessionTimeout = Duration(hours: 24);
  static const int maxLoginAttempts = 5;
  static const Duration loginLockoutDuration = Duration(minutes: 30);
  
  // Audit logging
  static const bool enableAuditLogging = true;
  static const Duration auditLogRetention = Duration(days: 90);
  
  // Backup configuration
  static const bool enableAutoBackup = true;
  static const Duration backupInterval = Duration(days: 1);
  static const int maxBackupSize = 100; // In MB
  static const int maxBackupCount = 7;
}