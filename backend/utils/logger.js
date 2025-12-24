const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '../logs');
        this.ensureLogDirectory();
        
        // Log levels
        this.levels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            HTTP: 3,
            DEBUG: 4
        };
        
        this.currentLevel = process.env.LOG_LEVEL 
            ? this.levels[process.env.LOG_LEVEL.toUpperCase()] 
            : this.levels.INFO;
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    formatLogMessage(level, category, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            category,
            message,
            meta: {
                ...meta,
                pid: process.pid,
                memory: process.memoryUsage(),
                env: process.env.NODE_ENV || 'development'
            }
        };
        
        return JSON.stringify(logEntry) + '\n';
    }

    shouldLog(level) {
        return this.levels[level] <= this.currentLevel;
    }

    writeToFile(filename, content) {
        const filepath = path.join(this.logDir, filename);
        fs.appendFileSync(filepath, content);
    }

    log(level, category, message, meta = {}) {
        if (!this.shouldLog(level)) return;

        const formattedMessage = this.formatLogMessage(level, category, message, meta);
        const dateStr = new Date().toISOString().split('T')[0];
        
        // Write to console with colors
        this.logToConsole(level, category, message, meta);
        
        // Write to files
        this.writeToFile(`app-${dateStr}.log`, formattedMessage);
        
        if (level === 'ERROR') {
            this.writeToFile(`error-${dateStr}.log`, formattedMessage);
        }
        
        if (category === 'HTTP') {
            this.writeToFile(`http-${dateStr}.log`, formattedMessage);
        }
        
        if (category === 'DATABASE') {
            this.writeToFile(`database-${dateStr}.log`, formattedMessage);
        }
        
        if (category === 'AUTH') {
            this.writeToFile(`auth-${dateStr}.log`, formattedMessage);
        }
    }

    logToConsole(level, category, message, meta) {
        const timestamp = new Date().toISOString();
        const colors = {
            ERROR: '\x1b[31m', // Red
            WARN: '\x1b[33m',  // Yellow
            INFO: '\x1b[36m',  // Cyan
            HTTP: '\x1b[32m',  // Green
            DEBUG: '\x1b[35m'  // Magenta
        };
        const reset = '\x1b[0m';
        
        const color = colors[level] || '';
        const prefix = `${color}[${timestamp}] ${level.padEnd(5)} ${category.padEnd(10)}${reset}`;
        
        console.log(`${prefix} ${message}`);
        
        if (Object.keys(meta).length > 0 && level === 'DEBUG') {
            console.log(`${' '.repeat(prefix.length - color.length - reset.length)} Meta:`, 
                JSON.stringify(meta, null, 2));
        }
    }

    // Convenience methods
    error(category, message, meta = {}) {
        this.log('ERROR', category, message, meta);
    }

    warn(category, message, meta = {}) {
        this.log('WARN', category, message, meta);
    }

    info(category, message, meta = {}) {
        this.log('INFO', category, message, meta);
    }

    http(message, meta = {}) {
        this.log('HTTP', 'HTTP', message, meta);
    }

    debug(category, message, meta = {}) {
        this.log('DEBUG', category, message, meta);
    }

    // Specific logging methods
    logAuth(action, userId, meta = {}) {
        this.log('INFO', 'AUTH', `Auth action: ${action}`, {
            userId,
            action,
            ...meta
        });
    }

    logDatabase(operation, query, duration, meta = {}) {
        this.log('DEBUG', 'DATABASE', `DB operation: ${operation}`, {
            query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
            duration: `${duration}ms`,
            ...meta
        });
    }

    logAPI(method, path, statusCode, duration, userId, meta = {}) {
        const level = statusCode >= 400 ? 'WARN' : 'HTTP';
        this.log(level, 'API', `${method} ${path} ${statusCode}`, {
            method,
            path,
            statusCode,
            duration: `${duration}ms`,
            userId,
            ...meta
        });
    }

    logPerformance(operation, duration, meta = {}) {
        this.log('INFO', 'PERFORMANCE', `${operation} took ${duration}ms`, {
            operation,
            duration,
            ...meta
        });
    }

    logError(error, context = '', meta = {}) {
        this.log('ERROR', 'ERROR', `${context}: ${error.message}`, {
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
                code: error.code
            },
            context,
            ...meta
        });
    }

    // Request logging middleware
    requestLogger() {
        return (req, res, next) => {
            const startTime = Date.now();
            const originalSend = res.send;
            
            // Capture response data
            res.send = function(data) {
                res.locals.responseData = data;
                originalSend.call(this, data);
            };

            res.on('finish', () => {
                const duration = Date.now() - startTime;
                const userId = req.user ? req.user.id : null;
                
                const meta = {
                    userAgent: req.get('User-Agent'),
                    ip: req.ip,
                    headers: req.headers,
                    body: req.method !== 'GET' ? req.body : undefined,
                    query: req.query,
                    responseSize: res.get('Content-Length')
                };

                this.logAPI(req.method, req.path, res.statusCode, duration, userId, meta);
            });

            next();
        };
    }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;