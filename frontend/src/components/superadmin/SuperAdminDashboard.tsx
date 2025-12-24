import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  LinearProgress,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Tabs,
  Tab,
} from '@mui/material';
import {
  SupervisorAccount as SupervisorAccountIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Assessment as AssessmentIcon,
  Security as SecurityIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  Analytics as AnalyticsIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import superadminService, { SystemAnalytics } from '../../services/superadminService';

const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<SystemAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [currentTab, setCurrentTab] = useState(0);

  useEffect(() => {
    fetchAnalytics();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchAnalytics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const data = await superadminService.getSystemAnalytics();
      setAnalytics(data);
      setLastRefresh(new Date());
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch system analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency = 'EUR') => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const getSystemHealth = () => {
    if (!analytics) return 'unknown';
    
    const totalAgencies = analytics.overview.total_agencies;
    const activeAgencies = analytics.top_agencies.filter(a => a.total_revenue > 0).length;
    const healthPercentage = totalAgencies > 0 ? (activeAgencies / totalAgencies) * 100 : 0;
    
    if (healthPercentage >= 80) return 'excellent';
    if (healthPercentage >= 60) return 'good';
    if (healthPercentage >= 40) return 'warning';
    return 'critical';
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'success';
      case 'good': return 'info';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'excellent': return <CheckCircleIcon color="success" />;
      case 'good': return <CheckCircleIcon color="info" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'critical': return <ErrorIcon color="error" />;
      default: return <WarningIcon />;
    }
  };

  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      {/* Key Metrics */}
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" color="primary">
                  {analytics?.overview.total_agencies || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Agencies
                </Typography>
              </Box>
              <BusinessIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" color="info.main">
                  {analytics?.overview.total_users || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Users
                </Typography>
              </Box>
              <PeopleIcon sx={{ fontSize: 40, color: 'info.main', opacity: 0.7 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" color="success.main">
                  {formatCurrency(analytics?.overview.today_revenue || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Today's Revenue
                </Typography>
              </Box>
              <MoneyIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.7 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" color="warning.main">
                  {analytics?.overview.today_sales || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Today's Sales
                </Typography>
              </Box>
              <TrendingUpIcon sx={{ fontSize: 40, color: 'warning.main', opacity: 0.7 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* System Health */}
      <Grid item xs={12} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              System Health
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              {getHealthIcon(getSystemHealth())}
              <Box>
                <Typography variant="h5" color={`${getHealthColor(getSystemHealth())}.main`}>
                  {getSystemHealth().toUpperCase()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Overall system status
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" gutterBottom>Performance Metrics</Typography>
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption">Active Agencies</Typography>
              <LinearProgress 
                variant="determinate" 
                value={analytics ? (analytics.top_agencies.filter(a => a.total_revenue > 0).length / analytics.overview.total_agencies) * 100 : 0}
                sx={{ height: 6, borderRadius: 3 }}
                color="primary"
              />
            </Box>
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption">User Engagement</Typography>
              <LinearProgress 
                variant="determinate" 
                value={75} // This would be calculated from actual login data
                sx={{ height: 6, borderRadius: 3 }}
                color="info"
              />
            </Box>
            <Box>
              <Typography variant="caption">Revenue Target</Typography>
              <LinearProgress 
                variant="determinate" 
                value={analytics ? Math.min((analytics.overview.month_revenue / 50000) * 100, 100) : 0} // 50k target
                sx={{ height: 6, borderRadius: 3 }}
                color="success"
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Top Performing Agencies */}
      <Grid item xs={12} md={8}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Top Performing Agencies (Last 30 Days)
              </Typography>
              <Button 
                size="small" 
                onClick={() => navigate('/superadmin/agencies')}
                endIcon={<BusinessIcon />}
              >
                View All
              </Button>
            </Box>
            <List dense>
              {analytics?.top_agencies.slice(0, 6).map((agency, index) => (
                <ListItem key={agency.id} divider>
                  <ListItemIcon>
                    <Chip
                      label={index + 1}
                      size="small"
                      color={index < 3 ? 'primary' : 'default'}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2">{agency.name}</Typography>
                        <Typography variant="h6" color="success.main">
                          {formatCurrency(agency.total_revenue)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Chip label={agency.subscription_plan} size="small" variant="outlined" />
                        <Chip label={`${agency.sales_count} sales`} size="small" />
                        <Chip label={`${agency.user_count} users`} size="small" />
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderAnalyticsTab = () => (
    <Grid container spacing={3}>
      {/* Revenue Analytics */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Revenue Analytics
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {formatCurrency(analytics?.overview.month_revenue || 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Monthly Revenue
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main">
                    {formatCurrency(analytics?.overview.week_revenue || 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Weekly Revenue
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary.main">
                    {formatCurrency((analytics?.overview.month_revenue || 0) / Math.max(analytics?.overview.total_agencies || 1, 1))}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Avg Revenue per Agency
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="subtitle1" gutterBottom>
              Sales Performance
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Today</Typography>
                  <Typography variant="h6">{analytics?.overview.today_sales || 0} sales</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box>
                  <Typography variant="body2" color="text.secondary">This Month</Typography>
                  <Typography variant="h6">{analytics?.overview.month_sales || 0} sales</Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Subscription Distribution */}
      <Grid item xs={12} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Subscription Distribution
            </Typography>
            <Box sx={{ mt: 2 }}>
              {analytics?.subscription_distribution.map((sub) => (
                <Box key={sub.subscription_plan} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {sub.subscription_plan}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {sub.count} ({sub.percentage}%)
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={sub.percentage} 
                    sx={{ height: 8, borderRadius: 1 }}
                    color={sub.subscription_plan === 'enterprise' ? 'primary' : sub.subscription_plan === 'pro' ? 'secondary' : 'inherit'}
                  />
                </Box>
              ))}
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Products in System
              </Typography>
              <Typography variant="h5" color="primary">
                {analytics?.overview.total_products || 0}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderQuickActionsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Agency Management
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={() => navigate('/superadmin/agencies')}
                fullWidth
              >
                Create New Agency
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<BusinessIcon />}
                onClick={() => navigate('/superadmin/agencies')}
                fullWidth
              >
                Manage Agencies
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<PeopleIcon />}
                onClick={() => navigate('/superadmin/users')}
                fullWidth
              >
                Manage Users
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              System Monitoring
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button 
                variant="outlined" 
                startIcon={<SecurityIcon />}
                onClick={() => navigate('/superadmin/audit')}
                fullWidth
              >
                View Audit Logs
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<AnalyticsIcon />}
                onClick={() => navigate('/superadmin/analytics')}
                fullWidth
              >
                System Analytics
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<SettingsIcon />}
                onClick={() => navigate('/settings')}
                fullWidth
              >
                System Settings
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* System Alerts */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              System Alerts & Notifications
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {analytics && analytics.overview.total_agencies === 0 && (
                <Alert severity="warning">
                  No agencies created yet. Create your first agency to start using the system.
                </Alert>
              )}
              {analytics && analytics.overview.today_sales === 0 && (
                <Alert severity="info">
                  No sales recorded today. Check if agencies are actively using the system.
                </Alert>
              )}
              {analytics && analytics.subscription_distribution.some(s => s.subscription_plan === 'basic' && s.percentage > 70) && (
                <Alert severity="info">
                  Most agencies are on basic plans. Consider promoting premium features.
                </Alert>
              )}
              {analytics && analytics.overview.total_users < 10 && (
                <Alert severity="warning">
                  Low user count detected. Consider onboarding more users to increase system adoption.
                </Alert>
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  if (loading && !analytics) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SupervisorAccountIcon color="primary" />
            System Administration
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Multi-tenant system management and monitoring
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </Typography>
          <IconButton onClick={fetchAnalytics} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Paper sx={{ width: '100%' }}>
        <Tabs 
          value={currentTab} 
          onChange={(_, newValue) => setCurrentTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Overview" />
          <Tab label="Analytics" />
          <Tab label="Quick Actions" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {currentTab === 0 && renderOverviewTab()}
          {currentTab === 1 && renderAnalyticsTab()}
          {currentTab === 2 && renderQuickActionsTab()}
        </Box>
      </Paper>
    </Container>
  );
};

export default SuperAdminDashboard;