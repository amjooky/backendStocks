import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../contexts/CurrencyContext';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  IconButton,
  Alert,
  Skeleton,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  Badge,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as MoneyIcon,
  Inventory as InventoryIcon,
  People as PeopleIcon,
  ShoppingCart as ShoppingCartIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Analytics as AnalyticsIcon,
  Business as BusinessIcon,
  Security as SecurityIcon,
  SupervisorAccount as SupervisorAccountIcon,
} from '@mui/icons-material';
import axios from '../config/api';
import settingsService from '../services/settingsService';

// Get current user from localStorage or context
const getCurrentUser = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.userId,
      username: payload.username,
      role: payload.role,
      agency_id: payload.agencyId
    };
  } catch {
    return null;
  }
};

interface SuperadminStats {
  overview: {
    total_agencies: number;
    total_users: number;
    total_products: number;
    today_sales: number;
    today_revenue: number;
    week_sales: number;
    week_revenue: number;
    month_sales: number;
    month_revenue: number;
  };
  top_agencies: Array<{
    id: number;
    name: string;
    subscription_plan: string;
    sales_count: number;
    total_revenue: number;
    user_count: number;
  }>;
  subscription_distribution: Array<{
    subscription_plan: string;
    count: number;
    percentage: number;
  }>;
}

interface DashboardStats {
  today: {
    total_sales: number;
    total_revenue: number;
    total_discounts: number;
  };
  month: {
    total_sales: number;
    total_revenue: number;
    total_discounts: number;
  };
  inventory: {
    total_products: number;
    low_stock_count: number;
    out_of_stock_count: number;
    total_inventory_value: number;
  };
  topProducts: Array<{
    name: string;
    sku: string;
    total_sold: number;
    total_revenue: number;
  }>;
  recentSales: Array<{
    id: number;
    sale_number: string;
    total_amount: number;
    created_at: string;
    customer_name: string;
    cashier_name: string;
  }>;
  lowStockProducts: Array<{
    id: number;
    name: string;
    sku: string;
    current_stock: number;
    min_stock_level: number;
  }>;
}

interface FinancialData {
  revenue: number;
  profit: number;
  taxes: number;
  cashFlow: number;
}

interface CustomerSegment {
  name: string;
  customer_count: number;
}

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [superadminStats, setSuperadminStats] = useState<SuperadminStats | null>(null);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [customerSegments, setCustomerSegments] = useState<CustomerSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const currentUser = getCurrentUser();
  const isSuperadmin = currentUser?.role === 'superadmin';

  useEffect(() => {
    fetchAllData();
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchAllData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError('');

    try {
      if (isSuperadmin) {
        await fetchSuperadminStats();
      } else {
        await Promise.all([
          fetchDashboardStats(),
          fetchFinancialData(),
          fetchCustomerSegments(),
        ]);
      }
      setLastRefresh(new Date());
    } catch (err) {
      setError(t('messages.networkError'));
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuperadminStats = async () => {
    try {
      const response = await axios.get('/api/superadmin/analytics');
      setSuperadminStats(response.data);
    } catch (error) {
      console.error('Failed to fetch superadmin stats:', error);
      throw error;
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get('/api/reports/dashboard');
      setDashboardStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      throw error;
    }
  };

  const fetchFinancialData = async () => {
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const params = new URLSearchParams({
        startDate: thirtyDaysAgo.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      });

      const response = await axios.get(`/api/analytics/financials?${params}`);
      setFinancialData(response.data);
    } catch (error) {
      console.error('Failed to fetch financial data:', error);
      // Don't throw - this is optional data
    }
  };

  const fetchCustomerSegments = async () => {
    try {
      const response = await axios.get('/api/analytics/customers/segments');
      setCustomerSegments(response.data.segments);
    } catch (error) {
      console.error('Failed to fetch customer segments:', error);
      // Don't throw - this is optional data
    }
  };

  // Currency formatting is now handled by useCurrency hook

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const renderMetricCard = (
    title: string,
    value: string | number,
    subtitle: string,
    icon: React.ReactNode,
    color: 'primary' | 'success' | 'warning' | 'error' | 'info',
    trend?: number
  ) => (
    <Card sx={{ height: '100%', position: 'relative' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ color: `${color}.main`, mr: 1 }}>{icon}</Box>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          {trend !== undefined && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {trend > 0 ? (
                <TrendingUpIcon sx={{ color: 'success.main', fontSize: 20 }} />
              ) : trend < 0 ? (
                <TrendingDownIcon sx={{ color: 'error.main', fontSize: 20 }} />
              ) : null}
              <Typography
                variant="caption"
                sx={{
                  color: trend > 0 ? 'success.main' : trend < 0 ? 'error.main' : 'text.secondary',
                  ml: 0.5
                }}
              >
                {trend > 0 && '+'}
                {trend.toFixed(1)}%
              </Typography>
            </Box>
          )}
        </Box>
        <Typography variant="h4" color={`${color}.main`} gutterBottom>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      </CardContent>
    </Card>
  );

  const renderQuickActions = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {t('dashboard.quickActions')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ShoppingCartIcon />}
            onClick={() => navigate('/sales')}
          >
            {t('dashboard.openPOS')}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<InventoryIcon />}
            onClick={() => navigate('/products')}
          >
            {t('dashboard.manageProducts')}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AssessmentIcon />}
            onClick={() => navigate('/reports')}
          >
            {t('dashboard.viewReports')}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading && !dashboardStats) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Typography variant="h4" gutterBottom>
          {t('dashboard.title')}
        </Typography>
        <Grid container spacing={3}>
          {[...Array(4)].map((_, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" height={40} />
                  <Skeleton variant="text" width="80%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  // Render Superadmin Dashboard
  if (isSuperadmin && superadminStats) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SupervisorAccountIcon color="primary" />
              System Management Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Multi-tenant system overview and analytics
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip label={`${currentUser?.username} (Superadmin)`} color="primary" variant="outlined" />
            <Typography variant="body2" color="text.secondary">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </Typography>
            <IconButton onClick={fetchAllData} disabled={loading}>
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

        {/* System Overview Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            {renderMetricCard(
              'Active Agencies',
              superadminStats.overview.total_agencies,
              'Total system agencies',
              <BusinessIcon />,
              'primary'
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            {renderMetricCard(
              'Total Users',
              superadminStats.overview.total_users,
              'Across all agencies',
              <PeopleIcon />,
              'info'
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            {renderMetricCard(
              'Today\'s Revenue',
              formatCurrency(superadminStats.overview.today_revenue),
              'System-wide sales',
              <MoneyIcon />,
              'success'
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            {renderMetricCard(
              'Month Revenue',
              formatCurrency(superadminStats.overview.month_revenue),
              'Last 30 days total',
              <TrendingUpIcon />,
              'success'
            )}
          </Grid>
        </Grid>

        {/* Top Agencies and Subscription Distribution */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={{ height: 400 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Performing Agencies (Last 30 Days)
                </Typography>
                <List>
                  {superadminStats.top_agencies.slice(0, 8).map((agency, index) => (
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
                            <Typography variant="subtitle1">{agency.name}</Typography>
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
          <Grid item xs={12} md={4}>
            <Card sx={{ height: 400 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Subscription Distribution
                </Typography>
                <Box sx={{ mt: 2 }}>
                  {superadminStats.subscription_distribution.map((sub) => (
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
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<BusinessIcon />}
                    onClick={() => navigate('/admin/agencies')}
                  >
                    Manage Agencies
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<PeopleIcon />}
                    onClick={() => navigate('/admin/users')}
                  >
                    User Management
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<SecurityIcon />}
                    onClick={() => navigate('/admin/audit')}
                  >
                    Audit Logs
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AnalyticsIcon />}
                    onClick={() => navigate('/admin/reports')}
                  >
                    System Reports
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    );
  }

  // Regular Dashboard
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1">
            {t('dashboard.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Role: {currentUser?.role}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.lastUpdated', { time: lastRefresh.toLocaleTimeString() })}
          </Typography>
          <IconButton onClick={fetchAllData} disabled={loading}>
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

      {dashboardStats && (
        <>
          {/* Key Metrics Row */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              {renderMetricCard(
                t('dashboard.todaysSales'),
                dashboardStats.today.total_sales,
                t('dashboard.totalTransactionsToday'),
                <ShoppingCartIcon />,
                'primary'
              )}
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              {renderMetricCard(
                t('dashboard.todaysRevenue'),
                formatCurrency(dashboardStats.today.total_revenue),
                t('dashboard.totalRevenueToday'),
                <MoneyIcon />,
                'success'
              )}
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              {renderMetricCard(
                t('dashboard.lowStock'),
                dashboardStats.inventory.low_stock_count,
                t('dashboard.itemsBelowMin'),
                <WarningIcon />,
                'warning'
              )}
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              {renderMetricCard(
                t('dashboard.outOfStock'),
                dashboardStats.inventory.out_of_stock_count,
                t('dashboard.itemsOutOfStock'),
                <ErrorIcon />,
                'error'
              )}
            </Grid>
          </Grid>

          {/* Financial Overview */}
          {financialData && (
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={8}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {t('dashboard.financialOverviewLast30Days')}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} md={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" color="primary">
                            {formatCurrency(financialData.revenue)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t('dashboard.revenue')}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" color="success.main">
                            {formatCurrency(financialData.profit)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t('dashboard.profit')}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" color="warning.main">
                            {formatCurrency(financialData.taxes)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t('dashboard.taxes')}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" color="info.main">
                            {formatCurrency(financialData.cashFlow)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t('dashboard.cashFlow')}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                {renderQuickActions()}
              </Grid>
            </Grid>
          )}

          {/* Content Row */}
          <Grid container spacing={3}>
            {/* Top Products */}
            <Grid item xs={12} md={4}>
              <Card sx={{ height: 400 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t('dashboard.topProductsThisMonth')}
                  </Typography>
                  <List>
                    {dashboardStats.topProducts.length > 0 ? (
                      dashboardStats.topProducts.slice(0, 5).map((product, index) => (
                        <ListItem key={`${product.sku}-${index}`} disablePadding>
                          <ListItemIcon>
                            <Chip
                              label={index + 1}
                              size="small"
                              color={index < 3 ? 'primary' : 'default'}
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={product.name}
                            secondary={
                              <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>{t('dashboard.sold', { count: product.total_sold })}</span>
                                <span>{formatCurrency(product.total_revenue)}</span>
                              </span>
                            }
                          />
                        </ListItem>
                      ))
                    ) : (
                      <ListItem>
                        <ListItemText
                          primary={
                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                              {t('common.noData')}
                            </Typography>
                          }
                        />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Recent Sales */}
            <Grid item xs={12} md={4}>
              <Card sx={{ height: 400 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t('dashboard.recentSales')}
                  </Typography>
                  <List>
                    {dashboardStats.recentSales.length > 0 ? (
                      dashboardStats.recentSales.slice(0, 8).map((sale) => (
                        <ListItem key={sale.id} divider>
                          <ListItemText
                            primary={
                              <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="subtitle2" component="span">
                                  {sale.sale_number}
                                </Typography>
                                <Typography variant="subtitle2" color="primary" component="span">
                                  {formatCurrency(sale.total_amount)}
                                </Typography>
                              </span>
                            }
                            secondary={
                              <span>
                                <Typography variant="caption" display="block" component="span">
                                  {sale.customer_name || t('dashboard.walkInCustomer')}
                                </Typography>
                                <br />
                                <Typography variant="caption" color="text.secondary" component="span">
                                  {new Date(sale.created_at).toLocaleString()}
                                </Typography>
                              </span>
                            }
                          />
                        </ListItem>
                      ))
                    ) : (
                      <ListItem>
                        <ListItemText
                          primary={
                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                              {t('common.noData')}
                            </Typography>
                          }
                        />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Low Stock Alerts & Customer Segments */}
            <Grid item xs={12} md={4}>
              <Card sx={{ height: 400 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t('dashboard.stockAlerts')}
                  </Typography>
                  <List>
                    {dashboardStats.lowStockProducts.length > 0 ? (
                      dashboardStats.lowStockProducts.slice(0, 6).map((product) => (
                        <ListItem key={product.id}>
                          <ListItemIcon>
                            <WarningIcon color="warning" />
                          </ListItemIcon>
                          <ListItemText
                            primary={product.name}
                            secondary={
                              <span>
                                <Typography variant="caption" component="span">
                                  {t('dashboard.sku')}: {product.sku}
                                </Typography>
                                <br />
                                <Typography variant="caption" color="warning.main" component="span">
                                  {t('dashboard.leftMin', { current: product.current_stock, min: product.min_stock_level })}
                                </Typography>
                              </span>
                            }
                          />
                        </ListItem>
                      ))
                    ) : (
                      <ListItem>
                        <ListItemText
                          primary={
                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                              {t('common.noData')}
                            </Typography>
                          }
                        />
                      </ListItem>
                    )}
                  </List>

                  {customerSegments.length > 0 && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        {t('dashboard.customerSegments')}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {customerSegments.map((segment) => (
                          <Chip
                            key={segment.name}
                            label={`${segment.name}: ${segment.customer_count}`}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Monthly Comparison */}
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t('dashboard.monthlyPerformance')}
                  </Typography>
                  <Grid container spacing={4}>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="primary">
                          {dashboardStats.month.total_sales}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t('dashboard.totalSalesThisMonth')}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="success.main">
                          {formatCurrency(dashboardStats.month.total_revenue)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t('dashboard.monthlyRevenue')}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="info.main">
                          {formatCurrency(dashboardStats.inventory.total_inventory_value)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t('dashboard.inventoryValue')}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Container>
  );
};

export default Dashboard;
