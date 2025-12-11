const fs = require('fs');
const path = require('path');
const { runQuery } = require('../config/database');

// Direct initialization method without child process
const directInitialize = async () => {
    try {
        console.log('🔄 Running direct database initialization...');
        
        // Import and run initialization directly
        const { initializeDatabase } = require('./initDatabase');
        await initializeDatabase();
        
        console.log('✅ Direct database initialization completed');
    } catch (error) {
        console.error('❌ Direct initialization failed:', error);
        throw error;
    }
};

// Function to check if database is initialized
const isDatabaseInitialized = async () => {
    try {
        console.log('🔍 Checking database initialization status...');
        const { getAllRows } = require('../config/database');
        
        // Check if users table exists
        const tables = await getAllRows("SELECT name FROM sqlite_master WHERE type='table' AND name='users';");
        
        if (tables.length === 0) {
            console.log('📝 Users table does not exist');
            return false;
        }
        
        // Check if admin user exists
        const result = await getAllRows("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
        const hasAdmin = result && result[0] && result[0].count > 0;
        
        console.log(`👤 Admin users found: ${result[0]?.count || 0}`);
        return hasAdmin;
    } catch (error) {
        console.log('⚠️ Database check failed (likely uninitialized):', error.message);
        return false;
    }
};

// Function to auto-initialize database if needed
const autoInitializeDatabase = async () => {
    try {
        console.log('🚀 Starting database auto-initialization check...');
        
        const isInitialized = await isDatabaseInitialized();
        
        if (!isInitialized) {
            console.log('📦 Database not initialized. Starting initialization...');
            
            // Try direct initialization first (better for Railway)
            try {
                await directInitialize();
            } catch (directError) {
                console.log('⚠️ Direct initialization failed, trying child process method...');
                console.error('Direct error:', directError.message);
                
                // Fallback to child process method
                const { exec } = require('child_process');
                const initScriptPath = path.join(__dirname, 'initDatabase.js');
                
                return new Promise((resolve, reject) => {
                    exec(`node "${initScriptPath}"`, (error, stdout, stderr) => {
                        if (error) {
                            console.error('❌ Child process initialization failed:', error);
                            reject(error);
                        } else {
                            console.log('✅ Child process initialization successful!');
                            if (stdout) console.log('Output:', stdout);
                            if (stderr) console.log('Warnings:', stderr);
                            resolve();
                        }
                    });
                });
            }
        } else {
            console.log('✅ Database already initialized.');
        }
    } catch (error) {
        console.error('❌ Error during auto-initialization:', error);
        throw error;
    }
};

module.exports = { autoInitializeDatabase };
