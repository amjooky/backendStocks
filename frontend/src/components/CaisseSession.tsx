import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Box,
  Chip,
  Alert,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Receipt as ReceiptIcon,
  AttachMoney as MoneyIcon,
  History as HistoryIcon,
  AccountBalanceWallet,
  Store as StoreIcon,
  TrendingUp,
  Refresh as RefreshIcon,
  Dashboard as DashboardIcon,
  LocalAtm as CashIcon,
  CreditCard as CardIcon,
  PhoneAndroid as MobileIcon,
  Assessment as AssessmentIcon,
  Timer as TimerIcon,
  NotificationImportant as AlertIcon,
} from '@mui/icons-material';
import axios from '../config/api';
import settingsService from '../services/settingsService';

interface CaisseSession {
  id: string;
  session_name: string;
  opening_amount: number;
  current_amount: number;
  closing_amount?: number;
  expected_amount?: number;
  difference?: number;
  status: 'active' | 'closed';
  description?: string;
  closing_notes?: string;
  opened_at: string;
  closed_at?: string;
  total_sales?: number;
  total_revenue?: number;
  statistics?: {
    transactions_count: number;
    total_revenue: number;
    cash_revenue: number;
  };
}

interface Sale {
  id: number;
  sale_number: string;
  customer_first_name?: string;
  customer_last_name?: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
}

const CaisseSession: React.FC = () => {
  const [sessions, setSessions] = useState<CaisseSession[]>([]);
  const [activeSession, setActiveSession] = useState<CaisseSession | null>(null);
  const [sessionSales, setSessionSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshKey, setRefreshKey] = useState(0); // Force refresh trigger
  const [currentTime, setCurrentTime] = useState(new Date());
  const [taxRate, setTaxRate] = useState(0);
  const [realtimeStats, setRealtimeStats] = useState({
    todaysSales: 0,
    todaysRevenue: 0,
    averageTicket: 0,
    cashPercentage: 0
  });
  
  // Dialog states
  const [openSessionDialog, setOpenSessionDialog] = useState(false);
  const [closeSessionDialog, setCloseSessionDialog] = useState(false);
  const [sessionDetailsDialog, setSessionDetailsDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<CaisseSession | null>(null);
  
  // Form states
  const [sessionName, setSessionName] = useState('');
  const [openingAmount, setOpeningAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [closingAmount, setClosingAmount] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState('');

  // Initial load and refresh when refreshKey changes
  useEffect(() => {
    fetchSessions();
    fetchActiveSession();
    loadTaxRate();
    fetchRealtimeStats();
  }, [refreshKey]);

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-refresh every 10 seconds for dynamic updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSessions();
      fetchActiveSession();
      fetchRealtimeStats();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, []); // Remove activeSession dependency to avoid recreation

  const fetchSessions = async () => {
    try {
      const response = await axios.get('/api/caisse/sessions');
      setSessions(response.data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const fetchActiveSession = async () => {
    try {
      const response = await axios.get('/api/caisse/active-session');
      setActiveSession(response.data);
    } catch (error) {
      // No active session is normal
      setActiveSession(null);
    }
  };

  const fetchSessionDetails = async (sessionId: string) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/caisse/sessions/${sessionId}`);
      setSelectedSession(response.data.session);
      setSessionSales(response.data.sales);
      setSessionDetailsDialog(true);
    } catch (error) {
      setError('Failed to fetch session details');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSession = async () => {
    if (!sessionName.trim()) {
      setError('Session name is required');
      return;
    }

    if (openingAmount < 0) {
      setError('Opening amount must be non-negative');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/caisse/sessions', {
        sessionName: sessionName.trim(),
        openingAmount,
        description: description.trim() || undefined
      });

      setOpenSessionDialog(false);
      resetFormData();
      await fetchSessions();
      await fetchActiveSession();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to open session');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;

    if (closingAmount < 0) {
      setError('Closing amount must be non-negative');
      return;
    }

    setLoading(true);
    try {
      await axios.put(`/api/caisse/sessions/${activeSession.id}/close`, {
        closingAmount,
        notes: closingNotes.trim() || undefined
      });

      setCloseSessionDialog(false);
      resetFormData();
      
      // Force refresh to ensure updated data
      await fetchSessions();
      await fetchActiveSession();
      
      // Trigger a full refresh
      setRefreshKey(prev => prev + 1);
      
      setActiveSession(null);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to close session');
    } finally {
      setLoading(false);
    }
  };

  const resetFormData = () => {
    setSessionName('');
    setOpeningAmount(0);
    setDescription('');
    setClosingAmount(0);
    setClosingNotes('');
  };

  const loadTaxRate = async () => {
    try {
      const rate = await settingsService.getTaxRate();
      setTaxRate(rate);
    } catch (error) {
      console.error('Failed to load tax rate:', error);
    }
  };

  const fetchRealtimeStats = async () => {
    try {
      // Get today's date in YYYY-MM-DD format for better comparison
      const today = new Date().toISOString().split('T')[0];
      
      console.log('Fetching today\'s stats for date:', today);
      
      // Try to use the summary endpoint first for better performance
      try {
        const summaryResponse = await axios.get('/api/sales/summary/today');
        const summaryData = summaryResponse.data;
        
        if (summaryData && summaryData.summary) {
          const { summary, paymentMethods } = summaryData;
          
          // Calculate cash percentage from payment methods
          const cashMethod = paymentMethods?.find((pm: any) => pm.payment_method === 'cash');
          const cashRevenue = cashMethod?.total || 0;
          const cashPercentage = summary.total_revenue > 0 ? (cashRevenue / summary.total_revenue) * 100 : 0;
          
          console.log('Summary data:', { 
            sales: summary.total_sales, 
            revenue: summary.total_revenue, 
            cashPercentage 
          });
          
          setRealtimeStats({
            todaysSales: summary.total_sales,
            todaysRevenue: summary.total_revenue,
            averageTicket: summary.average_sale,
            cashPercentage
          });
          return;
        }
      } catch (summaryError) {
        console.log('Summary endpoint not available, falling back to sales list');
      }
      
      // Fallback: get all sales and filter
      const salesResponse = await axios.get(`/api/sales?startDate=${today}&endDate=${today}&limit=100`);
      const salesData = salesResponse.data?.sales || [];
      
      console.log('Sales data:', salesData.length, 'sales found');
      
      const todaysSales = salesData.length;
      const todaysRevenue = salesData.reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);
      const averageTicket = todaysSales > 0 ? todaysRevenue / todaysSales : 0;
      
      // Calculate cash percentage
      const cashSales = salesData.filter((sale: any) => 
        sale.payment_method && sale.payment_method.toLowerCase() === 'cash'
      );
      const cashRevenue = cashSales.reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);
      const cashPercentage = todaysRevenue > 0 ? (cashRevenue / todaysRevenue) * 100 : 0;
      
      console.log('Calculated stats:', { todaysSales, todaysRevenue, averageTicket, cashPercentage });
      
      setRealtimeStats({
        todaysSales,
        todaysRevenue,
        averageTicket,
        cashPercentage
      });
      
    } catch (error) {
      console.error('Failed to fetch realtime stats:', error);
      
      // Fallback to session-based calculation
      const today = new Date().toISOString().split('T')[0];
      const todaySessions = sessions.filter(session => {
        const sessionDate = new Date(session.opened_at).toISOString().split('T')[0];
        return sessionDate === today;
      });
      
      console.log('Using session fallback, sessions:', todaySessions.length);
      
      const todaysRevenue = todaySessions.reduce((sum, s) => sum + (s.total_revenue || 0), 0);
      const todaysSales = todaySessions.reduce((sum, s) => sum + (s.total_sales || 0), 0);
      const averageTicket = todaysSales > 0 ? todaysRevenue / todaysSales : 0;
      const cashRevenue = todaySessions.reduce((sum, s) => sum + (s.statistics?.cash_revenue || 0), 0);
      const cashPercentage = todaysRevenue > 0 ? (cashRevenue / todaysRevenue) * 100 : 0;
      
      setRealtimeStats({
        todaysSales,
        todaysRevenue,
        averageTicket,
        cashPercentage
      });
    }
  };

  const getSessionStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      {/* Header with Real-time Clock */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          🏪 Caisse Session Management
        </Typography>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
            {currentTime.toLocaleTimeString()}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {currentTime.toLocaleDateString()}
          </Typography>
          {taxRate > 0 && (
            <Typography variant="body2" sx={{ color: 'success.main', fontSize: '0.8rem' }}>
              Tax: {(taxRate * 100).toFixed(1)}%
            </Typography>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Active Session Panel */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <StoreIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Active Session</Typography>
            </Box>
            
            {activeSession ? (
              <Box>
                <Card sx={{ mb: 2, bgcolor: 'success.50' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6">{activeSession.session_name}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          Opened: {new Date(activeSession.opened_at).toLocaleString()}
                        </Typography>
                        {activeSession.description && (
                          <Typography variant="body2">{activeSession.description}</Typography>
                        )}
                      </Box>
                      <Chip label="Active" color="success" />
                    </Box>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'primary.50', borderRadius: 1 }}>
                          <Typography variant="body2" color="textSecondary">Opening Amount</Typography>
                          <Typography variant="h6">${activeSession.opening_amount.toFixed(2)}</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'success.50', borderRadius: 1 }}>
                          <Typography variant="body2" color="textSecondary">Revenue Today</Typography>
                          <Typography variant="h6">
                            ${activeSession.statistics?.total_revenue?.toFixed(2) || '0.00'}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'info.50', borderRadius: 1 }}>
                          <Typography variant="body2" color="textSecondary">Transactions</Typography>
                          <Typography variant="h6">
                            {activeSession.statistics?.transactions_count || 0}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'warning.50', borderRadius: 1 }}>
                          <Typography variant="body2" color="textSecondary">Cash Revenue</Typography>
                          <Typography variant="h6">
                            ${activeSession.statistics?.cash_revenue?.toFixed(2) || '0.00'}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<CloseIcon />}
                      onClick={() => setCloseSessionDialog(true)}
                      fullWidth
                      sx={{ mt: 2 }}
                    >
                      Close Session
                    </Button>
                  </CardContent>
                </Card>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <AccountBalanceWallet sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  No Active Session
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Open a new caisse session to start processing sales
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenSessionDialog(true)}
                >
                  Open New Session
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Session History */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <HistoryIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Session History</Typography>
              </Box>
              <IconButton 
                onClick={() => {
                  setRefreshKey(prev => prev + 1);
                }}
                size="small"
                sx={{ color: 'primary.main' }}
                title="Refresh Sessions"
              >
                <RefreshIcon />
              </IconButton>
            </Box>
            
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {sessions.length === 0 ? (
                <Typography color="textSecondary" align="center" sx={{ py: 4 }}>
                  No sessions found
                </Typography>
              ) : (
                <List>
                  {sessions.slice(0, 10).map((session) => (
                    <ListItem
                      key={session.id}
                      button
                      onClick={() => fetchSessionDetails(session.id)}
                      sx={{ 
                        border: 1, 
                        borderColor: 'divider', 
                        borderRadius: 1, 
                        mb: 1,
                        bgcolor: session.status === 'active' ? 'success.50' : 'background.paper'
                      }}
                    >
                      <ListItemText
                        primary={session.session_name}
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              {session.status === 'closed' ? 'Closed' : 'Opened'}: {' '}
                              {new Date(
                                session.status === 'closed' && session.closed_at 
                                  ? session.closed_at 
                                  : session.opened_at
                              ).toLocaleDateString()}
                            </Typography>
                            {session.total_revenue !== undefined && (
                              <Typography variant="body2" color="primary">
                                Revenue: ${session.total_revenue.toFixed(2)}
                                {session.total_sales && ` (${session.total_sales} sales)`}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Chip 
                          label={session.status} 
                          color={getSessionStatusColor(session.status) as any}
                          size="small"
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Enhanced Real-time Analytics */}
        <Grid item xs={12}>
          <Paper sx={{ 
            p: 3, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            color: 'white',
            '& .MuiTypography-root': {
              color: 'white !important'
            }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white' }}>
                📊 Today's Real-time Analytics
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton 
                  onClick={fetchRealtimeStats}
                  size="small"
                  sx={{ color: 'white' }}
                  title="Refresh Analytics"
                >
                  <RefreshIcon />
                </IconButton>
                <TimerIcon sx={{ color: 'white' }} />
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Auto-refresh every 10s
                </Typography>
              </Box>
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <TrendingUp sx={{ fontSize: 48, color: '#4CAF50', mb: 1 }} />
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'white' }}>
                      {realtimeStats.todaysSales}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      Today's Sales
                    </Typography>
                    {realtimeStats.todaysSales > 0 && (
                      <Typography variant="caption" sx={{ color: '#4CAF50' }}>
                        ${realtimeStats.averageTicket.toFixed(2)} avg ticket
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <MoneyIcon sx={{ fontSize: 48, color: '#2196F3', mb: 1 }} />
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'white' }}>
                      ${realtimeStats.todaysRevenue.toFixed(0)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      Today's Revenue
                    </Typography>
                    {taxRate > 0 && realtimeStats.todaysRevenue > 0 && (
                      <Typography variant="caption" sx={{ color: '#2196F3' }}>
                        ~${(realtimeStats.todaysRevenue * taxRate).toFixed(2)} tax collected
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <CashIcon sx={{ fontSize: 48, color: '#FF9800', mb: 1 }} />
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'white' }}>
                      {realtimeStats.cashPercentage.toFixed(0)}%
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      Cash Payments
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', mt: 1 }}>
                      <CashIcon sx={{ fontSize: 16, color: '#FF9800' }} />
                      <CardIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }} />
                      <MobileIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.3)' }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <StoreIcon sx={{ fontSize: 48, color: '#9C27B0', mb: 1 }} />
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'white' }}>
                      {sessions.filter(s => s.status === 'active').length}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      Active Sessions
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#9C27B0' }}>
                      {sessions.length} total sessions
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Payment Methods Breakdown */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              💳 Payment Methods Breakdown (Today)
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.50', borderRadius: 2 }}>
                  <CashIcon sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />
                  <Typography variant="h6" sx={{ color: 'warning.main' }}>
                    {realtimeStats.cashPercentage.toFixed(0)}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Cash
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.50', borderRadius: 2 }}>
                  <CardIcon sx={{ fontSize: 32, color: 'info.main', mb: 1 }} />
                  <Typography variant="h6" sx={{ color: 'info.main' }}>
                    {(100 - realtimeStats.cashPercentage - 5).toFixed(0)}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Card
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 2 }}>
                  <MobileIcon sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
                  <Typography variant="h6" sx={{ color: 'success.main' }}>
                    5%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Mobile
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Session Performance */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              🎯 Session Performance
            </Typography>
            {activeSession ? (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2">Session Duration</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {Math.floor((currentTime.getTime() - new Date(activeSession.opened_at).getTime()) / (1000 * 60))} min
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2">Transactions/Hour</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {activeSession.statistics?.transactions_count ? 
                      Math.round((activeSession.statistics.transactions_count / 
                        Math.max(1, (currentTime.getTime() - new Date(activeSession.opened_at).getTime()) / (1000 * 60 * 60))) * 10) / 10
                      : 0}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2">Expected vs Actual</Typography>
                  <Typography variant="body2" sx={{ 
                    fontWeight: 'bold',
                    color: (activeSession.statistics?.total_revenue || 0) > activeSession.opening_amount ? 'success.main' : 'warning.main'
                  }}>
                    ${((activeSession.statistics?.total_revenue || 0) - activeSession.opening_amount).toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1, textAlign: 'center' }}>
                  <Typography variant="body2" color="textSecondary">Current Efficiency</Typography>
                  <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    {activeSession.statistics?.transactions_count && activeSession.statistics?.transactions_count > 0 ? '🔥' : '💤'}
                    {activeSession.statistics?.transactions_count || 0 > 5 ? ' High' : ' Normal'}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <AssessmentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography color="textSecondary">
                  No active session to analyze
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Open Session Dialog */}
      <Dialog open={openSessionDialog} onClose={() => setOpenSessionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Open New Caisse Session</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Session Name"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="e.g., Morning Shift - John"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Opening Amount"
              type="number"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(Number(e.target.value))}
              InputProps={{ startAdornment: '$' }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Description (Optional)"
              multiline
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any additional notes about this session"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSessionDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleOpenSession}
            disabled={loading || !sessionName.trim()}
          >
            {loading ? 'Opening...' : 'Open Session'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Close Session Dialog */}
      <Dialog open={closeSessionDialog} onClose={() => setCloseSessionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Close Caisse Session</DialogTitle>
        <DialogContent>
          {activeSession && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {activeSession.session_name}
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Opening Amount</Typography>
                  <Typography variant="h6">${activeSession.opening_amount.toFixed(2)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Cash Sales Today</Typography>
                  <Typography variant="h6">
                    ${activeSession.statistics?.cash_revenue?.toFixed(2) || '0.00'}
                  </Typography>
                </Grid>
              </Grid>

              <Typography variant="body2" color="textSecondary" gutterBottom>
                Expected Cash Amount: ${((activeSession.opening_amount || 0) + (activeSession.statistics?.cash_revenue || 0)).toFixed(2)}
              </Typography>

              <TextField
                fullWidth
                label="Actual Closing Amount"
                type="number"
                value={closingAmount}
                onChange={(e) => setClosingAmount(Number(e.target.value))}
                InputProps={{ startAdornment: '$' }}
                sx={{ mb: 2 }}
              />

              {closingAmount > 0 && (
                <Typography 
                  color={
                    (closingAmount - (activeSession.opening_amount + (activeSession.statistics?.cash_revenue || 0))) >= 0 
                      ? 'success.main' 
                      : 'error.main'
                  }
                  sx={{ mb: 2 }}
                >
                  Difference: ${(closingAmount - (activeSession.opening_amount + (activeSession.statistics?.cash_revenue || 0))).toFixed(2)}
                </Typography>
              )}

              <TextField
                fullWidth
                label="Closing Notes (Optional)"
                multiline
                rows={3}
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="Any discrepancies, issues, or notes about this session"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseSessionDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleCloseSession}
            disabled={loading}
          >
            {loading ? 'Closing...' : 'Close Session'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Session Details Dialog */}
      <Dialog 
        open={sessionDetailsDialog} 
        onClose={() => setSessionDetailsDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Session Details</DialogTitle>
        <DialogContent>
          {selectedSession && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedSession.session_name}
              </Typography>
              
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">Status</Typography>
                  <Chip 
                    label={selectedSession.status} 
                    color={getSessionStatusColor(selectedSession.status) as any}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">Duration</Typography>
                  <Typography variant="body1">
                    {new Date(selectedSession.opened_at).toLocaleString()} - {' '}
                    {selectedSession.closed_at 
                      ? new Date(selectedSession.closed_at).toLocaleString()
                      : 'Active'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">Opening Amount</Typography>
                  <Typography variant="h6">${selectedSession.opening_amount.toFixed(2)}</Typography>
                </Grid>
                {selectedSession.closing_amount !== undefined && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">Closing Amount</Typography>
                    <Typography variant="h6">${selectedSession.closing_amount.toFixed(2)}</Typography>
                  </Grid>
                )}
              </Grid>

              {sessionSales.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Sales ({sessionSales.length})
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Sale #</TableCell>
                          <TableCell>Customer</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Payment</TableCell>
                          <TableCell>Time</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sessionSales.map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell>{sale.sale_number}</TableCell>
                            <TableCell>
                              {sale.customer_first_name && sale.customer_last_name
                                ? `${sale.customer_first_name} ${sale.customer_last_name}`
                                : 'Walk-in'}
                            </TableCell>
                            <TableCell>${sale.total_amount.toFixed(2)}</TableCell>
                            <TableCell>
                              <Chip label={sale.payment_method.toUpperCase()} size="small" />
                            </TableCell>
                            <TableCell>
                              {new Date(sale.created_at).toLocaleTimeString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSessionDetailsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CaisseSession;
