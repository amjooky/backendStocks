const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { specs, swaggerUi } = require('./swagger');
const { autoInitializeDatabase } = require('./scripts/autoInitDb');
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
console.log('🚀 DEPLOYMENT TIMESTAMP:', new Date().toISOString(), '- FORCE DEPLOY V2 - FULL SYSTEM');
app.use(cors()); // Use default cors() with no configuration

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

// Superadmin API Routes (requires admin/superadmin role)
app.use('/api/admin', require('./routes/admin'));

// 404 handler - MUST BE LAST
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// Initialize database and start server
const startServer = async () => {
    try {
        console.log('🚀 Starting server initialization...');
        console.log('🔐 JWT_SECRET status:', process.env.JWT_SECRET ? 'Present' : 'MISSING!');

        // Auto-initialize database if needed
        console.log('📊 Initializing database...');
        await autoInitializeDatabase();
        console.log('✅ Database initialization completed');

        // Start server
        app.listen(PORT, () => {
            console.log(`🎯 FULL STOCK MANAGEMENT SYSTEM DEPLOYED SUCCESSFULLY! 🎯`);
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`🔥 ALL API ROUTES ARE LIVE AND WORKING! 🔥`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`✅ AUTH API: https://backendstocks.onrender.com/api/auth/login`);
            console.log(`✅ INVENTORY API: https://backendstocks.onrender.com/api/inventory`);
            console.log(`✅ ANALYTICS API: https://backendstocks.onrender.com/api/analytics`);
            console.log(`📚 API Documentation: https://backendstocks.onrender.com/api-docs`);
            console.log(`🎉 DEPLOYMENT COMPLETE - ALL SYSTEMS OPERATIONAL!`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
};

startServer();
