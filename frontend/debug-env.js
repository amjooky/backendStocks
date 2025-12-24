// Debug script to check environment variables
console.log('Environment Variables Debug:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('All REACT_APP vars:', Object.keys(process.env).filter(key => key.startsWith('REACT_APP_')));

// Test the axios configuration
import api from './src/config/api';
console.log('Axios baseURL:', api.defaults.baseURL);
