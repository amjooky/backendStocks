import React from 'react';
import { Box, Card, Typography, Button } from '@mui/material';
import api from '../config/api';

interface DebugAuthProps {
  user: any;
  token: string | null;
  loading: boolean;
}

const DebugAuth: React.FC<DebugAuthProps> = ({ user, token, loading }) => {
  const clearStorage = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  const testLogin = async () => {
    try {
      const response = await api.post('/api/auth/login', {
        username: 'admin',
        password: 'admin123'
      });

      const data = response.data;
      console.log('Login test result:', data);

      if (data.token) {
        localStorage.setItem('token', data.token);
        console.log('Token saved:', data.token);
        window.location.reload();
      }
    } catch (error) {
      console.error('Login test error:', error);
    }
  };

  const testProfile = async () => {
    try {
      const response = await api.get('/api/auth/profile');

      const data = response.data;
      console.log('Profile test result:', data);
    } catch (error) {
      console.error('Profile test error:', error);
    }
  };

  return (
    <Box sx={{ position: 'fixed', top: 16, left: 16, zIndex: 9999 }}>
      <Card sx={{ p: 2, minWidth: 300, maxWidth: 400 }}>
        <Typography variant="h6" gutterBottom>
          🔍 Debug Auth State
        </Typography>

        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
        </Typography>

        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Token:</strong> {token ? `${token.substring(0, 20)}...` : 'None'}
        </Typography>

        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>User:</strong> {user ? JSON.stringify(user, null, 2) : 'None'}
        </Typography>

        <Typography variant="body2" sx={{ mb: 2 }}>
          <strong>LocalStorage Token:</strong> {localStorage.getItem('token') ? 'Present' : 'None'}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button size="small" variant="contained" onClick={testLogin}>
            Test Login
          </Button>
          <Button size="small" variant="outlined" onClick={testProfile}>
            Test Profile
          </Button>
          <Button size="small" variant="text" onClick={clearStorage} color="error">
            Clear Storage
          </Button>
        </Box>
      </Card>
    </Box>
  );
};

export default DebugAuth;