// Enable debug logging
process.env.DEBUG = 'express:*';

// Start the server
require('./server');

console.log('Server started with debug logging enabled');
