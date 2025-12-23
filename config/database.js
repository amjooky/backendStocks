const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const dbPath = path.resolve(__dirname, '../database/stock_management.db');

// Single database connection with proper settings
let db = null;

// Initialize database connection with proper settings
const initializeDatabase = () => {
    if (db) {
        return db;
    }
    
    db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) {
            console.error('Error opening database:', err);
            throw err;
        }
        console.log('Connected to SQLite database');
    });
    
    // Enable WAL mode for better concurrency
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA synchronous = NORMAL;');
    db.exec('PRAGMA cache_size = 1000000;');
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec('PRAGMA temp_store = MEMORY;');
    
    return db;
};

// Create database connection
const createConnection = () => {
    return initializeDatabase();
};

// Retry helper function
const retryOperation = async (operation, maxRetries = 3, delay = 100) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            if (error.code === 'SQLITE_BUSY' && i < maxRetries - 1) {
                console.log(`Database busy, retrying in ${delay}ms... (attempt ${i + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
                continue;
            }
            throw error;
        }
    }
};

// Utility function to run queries with promises
const runQuery = (query, params = []) => {
    return retryOperation(() => {
        return new Promise((resolve, reject) => {
            const db = createConnection();
            db.run(query, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    });
};

// Utility function to get single row
const getRow = (query, params = []) => {
    return retryOperation(() => {
        return new Promise((resolve, reject) => {
            const db = createConnection();
            db.get(query, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    });
};

// Utility function to get all rows
const getAllRows = (query, params = []) => {
    return retryOperation(() => {
        return new Promise((resolve, reject) => {
            const db = createConnection();
            db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    });
};

// Utility function for transactions
const runTransaction = async (queries) => {
    return retryOperation(() => {
        return new Promise((resolve, reject) => {
            const db = createConnection();
            
            db.serialize(() => {
                db.run('BEGIN IMMEDIATE TRANSACTION', (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                });
                
                const results = [];
                let hasError = false;
                
                const processQuery = (index) => {
                    if (index >= queries.length) {
                        if (hasError) {
                            db.run('ROLLBACK', () => {
                                reject(new Error('Transaction failed'));
                            });
                        } else {
                            db.run('COMMIT', () => {
                                resolve(results);
                            });
                        }
                        return;
                    }
                    
                    const { query, params } = queries[index];
                    db.run(query, params, function(err) {
                        if (err) {
                            hasError = true;
                            db.run('ROLLBACK', () => {
                                reject(err);
                            });
                            return;
                        }
                        
                        results.push({ id: this.lastID, changes: this.changes });
                        processQuery(index + 1);
                    });
                };
                
                processQuery(0);
            });
        });
    });
};

module.exports = {
    createConnection,
    runQuery,
    getRow,
    getAllRows,
    runTransaction
};
