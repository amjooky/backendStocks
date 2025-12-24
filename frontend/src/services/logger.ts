interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  meta?: Record<string, any>;
  userId?: string;
  sessionId: string;
  userAgent: string;
  url: string;
}

type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'USER_ACTION';

class FrontendLogger {
  private logs: LogEntry[] = [];
  private sessionId: string;
  private userId?: string;
  private maxLogs = 1000; // Keep last 1000 logs in memory
  private logLevel: LogLevel;
  private enableConsole = true;
  private enableStorage = true;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.logLevel = this.getLogLevel();
    this.setupUnhandledErrorCatching();
    this.setupPerformanceMonitoring();
    this.loadStoredLogs();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getLogLevel(): LogLevel {
    const level = process.env.REACT_APP_LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'DEBUG' : 'INFO');
    return level as LogLevel;
  }

  private getLevelPriority(level: LogLevel): number {
    const priorities = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3,
      USER_ACTION: 2
    };
    return priorities[level] || 3;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.getLevelPriority(level) <= this.getLevelPriority(this.logLevel);
  }

  private setupUnhandledErrorCatching(): void {
    // Catch unhandled errors
    window.addEventListener('error', (event) => {
      this.logError('UNHANDLED_ERROR', event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError('UNHANDLED_PROMISE_REJECTION', 
        new Error(event.reason?.message || 'Unhandled promise rejection'), {
        reason: event.reason,
        promise: event.promise
      });
    });
  }

  private setupPerformanceMonitoring(): void {
    // Monitor page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (perfData) {
          // Use modern timing properties with fallback for older browsers
          const navigationStart = (perfData as any).navigationStart || performance.timeOrigin;
          this.logPerformance('PAGE_LOAD', {
            loadTime: perfData.loadEventEnd - navigationStart,
            domContentLoaded: perfData.domContentLoadedEventEnd - navigationStart,
            networkTime: perfData.responseEnd - perfData.requestStart,
            renderTime: perfData.loadEventEnd - perfData.responseEnd,
            // Modern timing API properties
            domInteractive: perfData.domInteractive,
            domComplete: perfData.domComplete,
            loadEventStart: perfData.loadEventStart,
            loadEventEnd: perfData.loadEventEnd
          });
        } else {
          // Fallback for browsers that don't support Navigation Timing API
          this.logPerformance('PAGE_LOAD', {
            timestamp: Date.now(),
            note: 'Navigation timing not available'
          });
        }
      }, 0);
    });
  }

  private loadStoredLogs(): void {
    if (!this.enableStorage) return;
    
    try {
      const storedLogs = localStorage.getItem('app_logs');
      if (storedLogs) {
        const parsedLogs = JSON.parse(storedLogs) as LogEntry[];
        // Keep only logs from last 24 hours
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        this.logs = parsedLogs.filter(log => 
          new Date(log.timestamp).getTime() > oneDayAgo
        );
      }
    } catch (error) {
      console.warn('Failed to load stored logs:', error);
    }
  }

  private persistLogs(): void {
    if (!this.enableStorage) return;
    
    try {
      // Store only last 500 logs to avoid localStorage quota issues
      const logsToStore = this.logs.slice(-500);
      localStorage.setItem('app_logs', JSON.stringify(logsToStore));
    } catch (error) {
      console.warn('Failed to persist logs:', error);
      // Clear old logs if storage is full
      try {
        localStorage.removeItem('app_logs');
      } catch {}
    }
  }

  private createLogEntry(level: LogLevel, category: string, message: string, meta?: Record<string, any>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      meta: {
        ...meta,
        performance: {
          memory: (performance as any).memory ? {
            used: (performance as any).memory.usedJSHeapSize,
            total: (performance as any).memory.totalJSHeapSize,
            limit: (performance as any).memory.jsHeapSizeLimit
          } : undefined
        }
      },
      userId: this.userId,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
  }

  private writeLog(logEntry: LogEntry): void {
    // Add to memory
    this.logs.push(logEntry);
    
    // Trim logs if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output with styling
    if (this.enableConsole) {
      this.outputToConsole(logEntry);
    }

    // Persist to storage periodically
    if (this.logs.length % 10 === 0) {
      this.persistLogs();
    }
  }

  private outputToConsole(logEntry: LogEntry): void {
    const colors = {
      ERROR: 'color: #ff4444; font-weight: bold;',
      WARN: 'color: #ffaa00; font-weight: bold;',
      INFO: 'color: #44aaff;',
      DEBUG: 'color: #888888;',
      USER_ACTION: 'color: #44ff44; font-weight: bold;'
    };

    const style = colors[logEntry.level] || '';
    const prefix = `%c[${logEntry.timestamp}] ${logEntry.level.padEnd(12)} ${logEntry.category.padEnd(15)}`;
    
    console.log(`${prefix}%c ${logEntry.message}`, style, 'color: inherit;');
    
    if (logEntry.meta && Object.keys(logEntry.meta).length > 0) {
      console.groupCollapsed('Meta data');
      console.table(logEntry.meta);
      console.groupEnd();
    }
  }

  // Public API methods
  setUserId(userId: string): void {
    this.userId = userId;
    this.info('AUTH', `User logged in: ${userId}`);
  }

  clearUserId(): void {
    const previousUserId = this.userId;
    this.userId = undefined;
    this.info('AUTH', `User logged out: ${previousUserId}`);
  }

  log(level: LogLevel, category: string, message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog(level)) return;
    
    const logEntry = this.createLogEntry(level, category, message, meta);
    this.writeLog(logEntry);
  }

  // Convenience methods
  error(category: string, message: string, meta?: Record<string, any>): void {
    this.log('ERROR', category, message, meta);
  }

  warn(category: string, message: string, meta?: Record<string, any>): void {
    this.log('WARN', category, message, meta);
  }

  info(category: string, message: string, meta?: Record<string, any>): void {
    this.log('INFO', category, message, meta);
  }

  debug(category: string, message: string, meta?: Record<string, any>): void {
    this.log('DEBUG', category, message, meta);
  }

  userAction(action: string, details?: Record<string, any>): void {
    this.log('USER_ACTION', 'USER', `User action: ${action}`, details);
  }

  // Specialized logging methods
  logError(category: string, error: Error, context?: Record<string, any>): void {
    this.error(category, error.message, {
      name: error.name,
      stack: error.stack,
      ...context
    });
  }

  logAPI(method: string, url: string, status: number, duration: number, data?: any): void {
    const level = status >= 400 ? 'WARN' : 'INFO';
    this.log(level, 'API', `${method} ${url} ${status}`, {
      method,
      url,
      status,
      duration,
      data: data ? JSON.stringify(data).substring(0, 500) : undefined
    });
  }

  logPerformance(operation: string, metrics: Record<string, any>): void {
    this.info('PERFORMANCE', `${operation}`, metrics);
  }

  logNavigation(from: string, to: string): void {
    this.info('NAVIGATION', `Navigation: ${from} → ${to}`, {
      from,
      to,
      timestamp: Date.now()
    });
  }

  // Utility methods
  getLogs(filters?: { level?: LogLevel; category?: string; since?: Date }): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filters?.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filters.level);
    }

    if (filters?.category) {
      filteredLogs = filteredLogs.filter(log => 
        log.category.toLowerCase().includes(filters.category!.toLowerCase())
      );
    }

    if (filters?.since) {
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) >= filters.since!
      );
    }

    return filteredLogs;
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  clearLogs(): void {
    this.logs = [];
    if (this.enableStorage) {
      localStorage.removeItem('app_logs');
    }
    this.info('SYSTEM', 'Logs cleared');
  }

  getLogStats(): Record<string, any> {
    const stats = {
      totalLogs: this.logs.length,
      byLevel: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      sessionId: this.sessionId,
      userId: this.userId,
      memoryUsage: (performance as any).memory ? {
        used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + 'MB',
        total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024) + 'MB'
      } : undefined
    };

    this.logs.forEach(log => {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
    });

    return stats;
  }
}

// Create singleton instance
const logger = new FrontendLogger();

// Development helpers
if (process.env.NODE_ENV === 'development') {
  (window as any).logger = logger;
  (window as any).clearLogs = () => logger.clearLogs();
  (window as any).exportLogs = () => {
    const logs = logger.exportLogs();
    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `app-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  (window as any).logStats = () => console.table(logger.getLogStats());
}

export default logger;