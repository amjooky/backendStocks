import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  ShoppingCart as ShoppingCartIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  DateRange as DateRangeIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import superadminService, { SystemAnalytics } from '../../services/superadminService';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const SystemAnalyticsComponent: React.FC = () => {
  const [analytics, setAnalytics] = useState<SystemAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('30'); // days
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const data = await superadminService.getSystemAnalytics();
      setAnalytics(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch analytics');
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const exportData = async () => {
    try {
      // In a real implementation, you would call an export endpoint
      const csvContent = generateCSVReport();
      downloadCSV(csvContent, `system_analytics_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err: any) {
      setError('Failed to export analytics data');
    }
  };

  const generateCSVReport = () => {
    if (!analytics) return '';

    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Agencies', analytics.overview.total_agencies.toString()],
      ['Total Users', analytics.overview.total_users.toString()],
      ['Total Products', analytics.overview.total_products.toString()],
      ['Today Revenue', analytics.overview.today_revenue.toString()],
      ['Month Revenue', analytics.overview.month_revenue.toString()],
      ['Today Sales', analytics.overview.today_sales.toString()],
      ['Month Sales', analytics.overview.month_sales.toString()],
    ];

    return [headers, ...rows].map(row => 
      row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const prepareRevenueChartData = () => {
    if (!analytics || !analytics.sales_trend) return [];
    
    return analytics.sales_trend.map(item => ({
      date: formatDate(item.date),
      revenue: item.revenue,
      sales: item.sales_count,
    })).reverse(); // Show chronologically
  };

  const prepareSubscriptionChartData = () => {
    if (!analytics) return [];
    
    return analytics.subscription_distribution.map(item => ({
      name: item.subscription_plan.charAt(0).toUpperCase() + item.subscription_plan.slice(1),
      value: item.count,
      percentage: item.percentage,
    }));
  };

  const prepareAgencyPerformanceData = () => {
    if (!analytics) return [];
    
    return analytics.top_agencies.map(agency => ({
      name: agency.name.length > 15 ? agency.name.substring(0, 15) + '...' : agency.name,
      revenue: agency.total_revenue,
      sales: agency.sales_count,
      users: agency.user_count,
    }));
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {label}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Typography key={index} variant="body2" sx={{ color: entry.color }}>
              {entry.name}: {entry.name === 'revenue' ? formatCurrency(entry.value) : entry.value}
            </Typography>
          ))}
        </Paper>
      );
    }
    return null;
  };

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
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AnalyticsIcon color="primary" />
              System Analytics
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Comprehensive system performance and usage analytics
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Period</InputLabel>
              <Select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <MenuItem value="7">Last 7 days</MenuItem>
                <MenuItem value="30">Last 30 days</MenuItem>
                <MenuItem value="90">Last 90 days</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={exportData}
              disabled={loading}
            >
              Export
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchAnalytics}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {analytics && (
          <>
            {/* Key Performance Indicators */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={2}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <BusinessIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h4" color="primary">
                      {analytics.overview.total_agencies}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Agencies
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <PeopleIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                    <Typography variant="h4" color="info.main">
                      {analytics.overview.total_users}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Users
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <ShoppingCartIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                    <Typography variant="h4" color="warning.main">
                      {analytics.overview.total_products}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Products
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <MoneyIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                    <Typography variant="h4" color="success.main">
                      {formatCurrency(analytics.overview.month_revenue)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Monthly Revenue
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <TrendingUpIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
                    <Typography variant="h4" color="secondary.main">
                      {analytics.overview.month_sales}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Monthly Sales
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Charts Section */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {/* Revenue Trend Chart */}
              <Grid item xs={12} lg={8}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Revenue Trend (Last 30 Days)
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={prepareRevenueChartData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stackId="1"
                          stroke="#8884d8"
                          fill="#8884d8"
                          fillOpacity={0.6}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Subscription Distribution */}
              <Grid item xs={12} lg={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Subscription Distribution
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={prepareSubscriptionChartData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) => `${name} ${percentage}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {prepareSubscriptionChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Agency Performance */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Top Agency Performance (Last 30 Days)
                    </Typography>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={prepareAgencyPerformanceData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="revenue" fill="#8884d8" name="Revenue (€)" />
                        <Bar dataKey="sales" fill="#82ca9d" name="Sales Count" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Detailed Analytics Tables */}
            <Grid container spacing={3}>
              {/* Top Agencies Table */}
              <Grid item xs={12} lg={8}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Agency Performance Details
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Rank</TableCell>
                            <TableCell>Agency</TableCell>
                            <TableCell>Plan</TableCell>
                            <TableCell align="right">Revenue</TableCell>
                            <TableCell align="right">Sales</TableCell>
                            <TableCell align="right">Users</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {analytics.top_agencies.map((agency, index) => (
                            <TableRow key={agency.id}>
                              <TableCell>
                                <Chip
                                  label={index + 1}
                                  size="small"
                                  color={index < 3 ? 'primary' : 'default'}
                                />
                              </TableCell>
                              <TableCell>{agency.name}</TableCell>
                              <TableCell>
                                <Chip
                                  label={agency.subscription_plan}
                                  size="small"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" color="success.main" fontWeight="bold">
                                  {formatCurrency(agency.total_revenue)}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">{agency.sales_count}</TableCell>
                              <TableCell align="right">{agency.user_count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* System Health Metrics */}
              <Grid item xs={12} lg={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      System Health Metrics
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Active Agencies
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="h6">
                            {analytics.top_agencies.filter(a => a.total_revenue > 0).length}
                          </Typography>
                          <Typography variant="body2" color="success.main">
                            {Math.round((analytics.top_agencies.filter(a => a.total_revenue > 0).length / analytics.overview.total_agencies) * 100)}%
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Divider />
                      
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Average Revenue per Agency
                        </Typography>
                        <Typography variant="h6" color="primary">
                          {formatCurrency(analytics.overview.month_revenue / Math.max(analytics.overview.total_agencies, 1))}
                        </Typography>
                      </Box>
                      
                      <Divider />
                      
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Users per Agency Ratio
                        </Typography>
                        <Typography variant="h6" color="info.main">
                          {Math.round(analytics.overview.total_users / Math.max(analytics.overview.total_agencies, 1))}
                        </Typography>
                      </Box>
                      
                      <Divider />
                      
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Products per Agency
                        </Typography>
                        <Typography variant="h6" color="warning.main">
                          {Math.round(analytics.overview.total_products / Math.max(analytics.overview.total_agencies, 1))}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        )}
      </Container>
    </LocalizationProvider>
  );
};

export default SystemAnalyticsComponent;
