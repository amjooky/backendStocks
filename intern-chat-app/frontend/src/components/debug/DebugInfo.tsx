import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material';
import { ExpandMore, InfoOutlined } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { usersAPI } from '../../services/api';

const DebugInfo: React.FC = () => {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    const results: any = {};

    try {
      console.log('🔧 Starting API tests...');
      
      // Test 1: Current user info
      results.currentUser = {
        status: 'success',
        data: user
      };

      // Test 2: Try to get colleagues
      try {
        console.log('🔧 Testing colleagues API...');
        const colleaguesResponse = await usersAPI.getColleagues();
        results.colleagues = {
          status: 'success',
          data: colleaguesResponse.data,
          count: colleaguesResponse.data?.data?.colleagues?.length || 0
        };
      } catch (error: any) {
        results.colleagues = {
          status: 'error',
          error: error.response?.data?.message || error.message,
          statusCode: error.response?.status
        };
      }

      // Test 3: Try to get all users (admin only)
      try {
        console.log('🔧 Testing users API...');
        const usersResponse = await usersAPI.getUsers();
        results.allUsers = {
          status: 'success',
          count: usersResponse.data?.data?.length || 0
        };
      } catch (error: any) {
        results.allUsers = {
          status: 'error',
          error: error.response?.data?.message || error.message,
          statusCode: error.response?.status
        };
      }

      setTestResults(results);
      console.log('🔧 Test results:', results);

    } catch (error) {
      console.error('🔧 Test failed:', error);
      setTestResults({ error: 'Test failed' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">No user logged in</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={1} sx={{ p: 2, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <InfoOutlined color="info" />
          <Typography variant="h6" color="info.main">Debug Info</Typography>
        </Box>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle2">Current User Info</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ '& > *': { mb: 1 } }}>
              <Typography variant="body2"><strong>Name:</strong> {user.name?.firstName} {user.name?.lastName}</Typography>
              <Typography variant="body2"><strong>Email:</strong> {user.email}</Typography>
              <Typography variant="body2"><strong>Role:</strong> {user.role}</Typography>
              <Typography variant="body2"><strong>Department:</strong> {user.department}</Typography>
              <Typography variant="body2"><strong>Status:</strong> {user.status}</Typography>
            </Box>
          </AccordionDetails>
        </Accordion>

        <Box sx={{ mt: 2 }}>
          <Button 
            variant="outlined" 
            onClick={testAPI} 
            disabled={loading}
            size="small"
          >
            {loading ? 'Testing APIs...' : 'Test Colleagues API'}
          </Button>
        </Box>

        {testResults && (
          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2">API Test Results</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(testResults, null, 2)}
                </pre>
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          💡 Check the browser console for detailed logs
        </Typography>
      </Paper>
    </Box>
  );
};

export default DebugInfo;