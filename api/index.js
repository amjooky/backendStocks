const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { specs, swaggerUi } = require('../swagger');
const { autoInitializeDatabase } = require('../scripts/autoInitDb');
require('dotenv').config();

const app = express();

// Trust proxy setting (for rate limiting behind proxies)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// Rate limiting - more relaxed for development
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress || 'unknown';
    }
});
app.use(limiter);

// ULTRA SIMPLE CORS - No options at all
console.log('🚨 USING ULTRA-SIMPLE CORS - NO OPTIONS');
app.use(cors());

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

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API Routes
app.use('/api/auth', require('../routes/auth'));
app.use('/api/categories', require('../routes/categories'));
app.use('/api/suppliers', require('../routes/suppliers'));
app.use('/api/products', require('../routes/products'));
app.use('/api/inventory', require('../routes/inventory'));
app.use('/api/customers', require('../routes/customers'));
app.use('/api/promotions', require('../routes/promotions'));
app.use('/api/sales', require('../routes/sales'));
app.use('/api/caisse', require('../routes/caisse'));
app.use('/api/debug', require('../routes/debug'));
app.use('/api/reports', require('../routes/reports'));
app.use('/api/users', require('../routes/users'));
app.use('/api/analytics', require('../routes/analytics'));
app.use('/api/notifications', require('../routes/notifications'));
app.use('/api/files', require('../routes/files'));
app.use('/api/settings', require('../routes/settings'));

// Debug endpoints
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
            corsMode: 'DEFAULT (allows all origins)'
        },
        timestamp: new Date().toISOString()
    });
});

app.get('/debug/db-status', async (req, res) => {
    try {
        const { getRow, getAllRows } = require('../config/database');
        
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

// Initialize database on cold start
(async () => {
    try {
        console.log('🚀 Initializing database for serverless...');
        await autoInitializeDatabase();
        console.log('✅ Database initialization completed');
    } catch (error) {
        console.error('❌ Failed to initialize database:', error);
    }
})();

module.exports = app;
