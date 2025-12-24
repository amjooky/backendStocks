import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Alert } from '@mui/material';
import axios from '../config/api';

const DebugLogin: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    console.log('🔍 DEBUG LOGIN - Starting login process...');
    console.log('🔍 API Config:', {
      baseURL: (axios as any).defaults?.baseURL,
      windowDebugURL: (window as any).DEBUG_API_URL
    });

    setLoading(true);
    setError('');
    setResult(null);

    try {
      console.log('🔍 Making API call to /api/auth/login with:', { username, password });
      
      const response = await axios.post('/api/auth/login', {
        username,
        password
      });

      console.log('🔍 Login response:', response);
      console.log('🔍 Login response data:', response.data);

      setResult(response.data);
    } catch (err: any) {
      console.error('🔍 Login error:', err);
      console.error('🔍 Error response:', err.response);
      console.error('🔍 Error config:', err.config);
      
      if (err.response) {
        setError(`HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}`);
      } else if (err.request) {
        setError(`Network Error: ${err.message}`);
      } else {
        setError(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        🔍 Debug Login Component
      </Typography>
      
      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          API Configuration
        </Typography>
        <Typography variant="body2" component="pre" sx={{ background: '#f5f5f5', p: 2, borderRadius: 1 }}>
          {JSON.stringify({
            baseURL: (axios as any).defaults?.baseURL,
            windowDebugURL: (window as any).DEBUG_API_URL,
            envVar: process.env.REACT_APP_API_URL
          }, null, 2)}
        </Typography>
      </Paper>

      <TextField
        fullWidth
        label="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        margin="normal"
      />
      
      <TextField
        fullWidth
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        margin="normal"
      />

      <Button
        fullWidth
        variant="contained"
        onClick={handleLogin}
        disabled={loading}
        sx={{ mt: 2 }}
      >
        {loading ? 'Testing Login...' : 'Test Login'}
      </Button>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="body2" component="pre">
            {error}
          </Typography>
        </Alert>
      )}

      {result && (
        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="h6">Login Successful! ✅</Typography>
          <Typography variant="body2" component="pre" sx={{ mt: 1, background: '#f0f8f0', p: 1, borderRadius: 1 }}>
            {JSON.stringify(result, null, 2)}
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default DebugLogin;
