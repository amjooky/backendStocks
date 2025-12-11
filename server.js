const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { specs, swaggerUi } = require('./swagger');
const { autoInitializeDatabase } = require('./scripts/autoInitDb');
const logger = require('./utils/logger');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy setting (for rate limiting behind proxies)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// Rate limiting - more relaxed for development
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // increased to 1000 for development
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Use a more permissive key generator for development
    keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress || 'unknown';
    }
});
app.use(limiter);

// ULTRA SIMPLE CORS - No options at all
console.log('🚨 USING ULTRA-SIMPLE CORS - NO OPTIONS');
console.log('🚀 DEPLOYMENT TIMESTAMP:', new Date().toISOString(), '- FORCE DEPLOY');
app.use(cors()); // Use default cors() with no configuration

// Request logging middleware
app.use(logger.requestLogger());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCssUrl: null,
    customJs: null,
    swaggerOptions: {
        persistAuthorization: true
    }
}));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/products', require('./routes/products'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/promotions', require('./routes/promotions'));
app.use('/api/sales', require('./routes/sales'));
// app.use('/api/receipts', require('./routes/receipts'));
app.use('/api/caisse', require('./routes/caisse'));
app.use('/api/debug', require('./routes/debug'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/users', require('./routes/users'));

// New Extended API Routes
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/files', require('./routes/files'));
app.use('/api/settings', require('./routes/settings'));

// Superadmin API Routes (requires superadmin role)
app.use('/api/superadmin', require('./routes/superadmin'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        message: 'Stock Management System API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Debug endpoint to check requests
app.get('/debug/request', (req, res) => {
    res.status(200).json({
        origin: req.headers.origin,
        userAgent: req.headers['user-agent'],
        headers: req.headers,
        timestamp: new Date().toISOString()
    });
});

app.post('/debug/cors', (req, res) => {
    res.status(200).json({
        message: 'CORS test successful',
        origin: req.headers.origin,
        method: req.method,
        timestamp: new Date().toISOString(),
        body: req.body
    });
});

// Enhanced CORS debug endpoint
app.get('/debug/cors-info', (req, res) => {
    res.status(200).json({
        message: 'CORS Configuration Debug Info - Using Default CORS (all origins allowed)',
        request: {
            origin: req.headers.origin,
            userAgent: req.headers['user-agent'],
            method: req.method,
            headers: req.headers,
            ip: req.ip,
            ips: req.ips
        },
        server: {
            environment: process.env.NODE_ENV,
            corsMode: 'DEFAULT (allows all origins)',
            port: PORT
        },
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Database status endpoint for debugging
app.get('/debug/db-status', async (req, res) => {
    try {
        const { getRow, getAllRows } = require('./config/database');
        
        // Check if users table exists and has data
        const tableInfo = await getAllRows("SELECT name FROM sqlite_master WHERE type='table';");
        const userCount = await getRow("SELECT COUNT(*) as count FROM users");
        const adminExists = await getRow("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
        
        res.json({
            message: 'Database status check',
            tables: tableInfo,
            userCount: userCount?.count || 0,
            adminCount: adminExists?.count || 0,
            jwtSecret: process.env.JWT_SECRET ? 'Present' : 'Missing',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            error: 'Database check failed',
            message: error.message,
            code: error.code
        });
    }
});

// Ensure caisse-related tables/columns exist (idempotent)
const ensureCaisseTables = async () => {
    try {
        console.log('🔧 Ensuring caisse tables are present...');
        const { getAllRows, runQuery } = require('./config/database');

        // Create caisse_sessions table if it doesn't exist
        await runQuery(`CREATE TABLE IF NOT EXISTS caisse_sessions (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            session_name VARCHAR(100) NOT NULL,
            opening_amount DECIMAL(10, 2) NOT NULL,
            current_amount DECIMAL(10, 2) NOT NULL,
            closing_amount DECIMAL(10, 2),
            expected_amount DECIMAL(10, 2),
            difference DECIMAL(10, 2),
            status TEXT CHECK(status IN ('active', 'closed')) DEFAULT 'active',
            description TEXT,
            closing_notes TEXT,
            opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            closed_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Add helpful indexes
        await runQuery(`CREATE INDEX IF NOT EXISTS idx_caisse_sessions_user ON caisse_sessions (user_id)`);
        await runQuery(`CREATE INDEX IF NOT EXISTS idx_caisse_sessions_status ON caisse_sessions (status)`);

        // Check if sales table has caisse_session_id column; if not, add it
        const pragma = await getAllRows(`PRAGMA table_info(sales)`);
        const hasSessionId = Array.isArray(pragma) && pragma.some(col => col.name === 'caisse_session_id');
        if (!hasSessionId) {
            console.log('🧩 Adding caisse_session_id column to sales table...');
            await runQuery(`ALTER TABLE sales ADD COLUMN caisse_session_id TEXT`);
        }

        console.log('✅ Caisse tables verified.');
    } catch (err) {
        console.error('❌ Failed to ensure caisse tables:', err.message);
    }
};

// Ensure notifications table exists (idempotent)
const ensureNotificationsTable = async () => {
    try {
        console.log('🔔 Ensuring notifications table is present...');
        const { runQuery } = require('./config/database');

        // Create notifications table if it doesn't exist
        await runQuery(`CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(255),
            message TEXT NOT NULL,
            priority VARCHAR(20) DEFAULT 'low',
            status VARCHAR(20) DEFAULT 'unread',
            data TEXT,
            recipient VARCHAR(255),
            subject VARCHAR(255),
            read_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`);

        // Add helpful indexes
        await runQuery(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id)`);
        await runQuery(`CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications (status)`);
        await runQuery(`CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications (type)`);

        console.log('✅ Notifications table verified.');
    } catch (err) {
        console.error('❌ Failed to ensure notifications table:', err.message);
    }
};

// Initialize database and start server
const startServer = async () => {
    try {
        logger.info('STARTUP', '🚀 Starting server initialization...');
        logger.info('STARTUP', '🔐 JWT_SECRET status: ' + (process.env.JWT_SECRET ? 'Present' : 'MISSING!'));
        
        // Auto-initialize database if needed
        logger.info('STARTUP', '📊 Initializing database...');
        const dbStartTime = Date.now();
        await autoInitializeDatabase();
        logger.logPerformance('Database initialization', Date.now() - dbStartTime);
        
        // Ensure caisse tables and columns exist
        const caisseStartTime = Date.now();
        await ensureCaisseTables();
        logger.logPerformance('Caisse tables setup', Date.now() - caisseStartTime);
        
        // Ensure notifications table exists
        const notificationsStartTime = Date.now();
        await ensureNotificationsTable();
        logger.logPerformance('Notifications table setup', Date.now() - notificationsStartTime);
        
        // Start server
        app.listen(PORT, () => {
            logger.info('STARTUP', `🚀 Server is running on port ${PORT}`);
            logger.info('STARTUP', `🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info('STARTUP', `📊 API Health Check: http://localhost:${PORT}/health`);
            logger.info('STARTUP', `📚 API Documentation: http://localhost:${PORT}/api-docs`);
            logger.info('STARTUP', `⚡ Server fully initialized - ${new Date().toISOString()}`);
        });
    } catch (error) {
        logger.logError(error, 'Server startup failed');
        process.exit(1);
    }
};

startServer();
