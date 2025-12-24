import React, { useState, useEffect } from 'react';
import { useCurrency } from '../contexts/CurrencyContext';
import { motion, AnimatePresence, Variants } from 'framer-motion';
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
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Avatar,
  Button,
  Menu,
  MenuItem,
  Badge,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Home,
  Package,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Users,
  ShoppingCart,
  RefreshCw,
  Bell,
  Settings,
  LogOut,
  CheckCircle,
  XCircle,
  BarChart3,
  Activity,
} from 'lucide-react';
import { Chart, registerables } from 'chart.js/auto';
import { Pie, Bar, Line } from 'react-chartjs-2';

// Register all Chart.js components
Chart.register(...registerables);

// Add cleanup function to prevent memory leaks
const cleanupCharts = () => {
  // Clean up any existing chart instances
  const chart = Chart.getChart('inventoryPieChart');
  if (chart) {
    chart.destroy();
  }
};
import axios from '../config/api';
import { mockApi } from '../services/mockDashboardService';
import settingsService from '../services/settingsService';

// Types matching Flutter app
interface DashboardData {
  today: {
    totalSales: number;
    totalRevenue: number;
    totalDiscounts: number;
  };
  month: {
    totalSales: number;
    totalRevenue: number;
    totalDiscounts: number;
  };
  inventory: {
    totalProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    totalInventoryValue: number;
  };
  topProducts: Array<{
    name: string;
    sku: string;
    totalSold: number;
    totalRevenue: number;
  }>;
  lowStockProducts: Array<{
    id: number;
    name: string;
    sku: string;
    currentStock: number;
    minStockLevel: number;
  }>;
}

interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
}

const EnhancedDashboard: React.FC = () => {
  const theme = useTheme();
  const { formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      let dashboardResponse;
      
      // Try to fetch from API first
      try {
        dashboardResponse = await axios.get('/api/reports/dashboard');
      } catch (apiError) {
        console.log('API not available, using mock data');
        // Use mock data if API fails
        dashboardResponse = { data: await mockApi.getDashboard() };
      }
      
      // Transform the data to match our interface
      const transformedData: DashboardData = {
        today: {
          totalSales: dashboardResponse.data.today?.total_sales || 0,
          totalRevenue: dashboardResponse.data.today?.total_revenue || 0,
          totalDiscounts: dashboardResponse.data.today?.total_discounts || 0,
        },
        month: {
          totalSales: dashboardResponse.data.month?.total_sales || 0,
          totalRevenue: dashboardResponse.data.month?.total_revenue || 0,
          totalDiscounts: dashboardResponse.data.month?.total_discounts || 0,
        },
        inventory: {
          totalProducts: dashboardResponse.data.inventory?.total_products || 0,
          lowStockProducts: dashboardResponse.data.inventory?.low_stock_count || 0,
          outOfStockProducts: dashboardResponse.data.inventory?.out_of_stock_count || 0,
          totalInventoryValue: dashboardResponse.data.inventory?.total_inventory_value || 0,
        },
        topProducts: dashboardResponse.data.topProducts?.map((p: any) => ({
          name: p.name,
          sku: p.sku,
          totalSold: p.total_sold,
          totalRevenue: p.total_revenue,
        })) || [],
        lowStockProducts: dashboardResponse.data.lowStockProducts?.map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          currentStock: p.current_stock,
          minStockLevel: p.min_stock_level,
        })) || [],
      };

      setDashboardData(transformedData);

      // Fetch current user
      try {
        const userResponse = await axios.get('/api/auth/me');
        setCurrentUser(userResponse.data);
      } catch (error) {
        // Use mock user if API fails
        const mockUser = await mockApi.getCurrentUser();
        setCurrentUser(mockUser as any);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  // Currency formatting is now handled by useCurrency hook

  // Animation variants with proper typing
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
      },
    },
  };

  // Stat Card Component
  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    delay?: number;
  }> = ({ title, value, icon, color, delay = 0 }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay * 0.1, duration: 0.3 }}
    >
      <Card
        sx={{
          height: '100%',
          background: theme.palette.background.paper,
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
          '&:hover': {
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            transform: 'translateY(-2px)',
          },
          transition: 'all 0.3s ease',
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                backgroundColor: alpha(color, 0.1),
                display: 'inline-flex',
              }}
            >
              {React.cloneElement(icon as React.ReactElement, {
                size: 24,
                color: color,
              })}
            </Box>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>
              {value}
            </Typography>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 0.5 }}>
              {title}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Box sx={{ textAlign: 'center' }}>
          <LinearProgress sx={{ width: 200, mb: 2 }} />
          <Typography>Loading dashboard...</Typography>
        </Box>
      </Box>
    );
  }

  const stats = dashboardData?.inventory;
  const inStock = (stats?.totalProducts || 0) - (stats?.lowStockProducts || 0) - (stats?.outOfStockProducts || 0);

  // Chart container styles
  const chartContainerStyle = {
    position: 'relative' as const,
    height: '300px',
    width: '100%',
  };

  // Chart data and options with unique IDs
  const pieChartData = {
    id: 'inventoryPieChart',
    labels: ['In Stock', 'Low Stock', 'Out of Stock'],
    datasets: [
      {
        data: [inStock, stats?.lowStockProducts || 0, stats?.outOfStockProducts || 0],
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
        borderWidth: 0,
      },
    ],
  };

  // Common chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart',
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  // Clean up charts on unmount or when data changes
  useEffect(() => {
    return () => {
      cleanupCharts();
    };
  }, [dashboardData]);

  return (
    <Box sx={{ backgroundColor: '#F8FAFC', minHeight: '100vh' }}>
      {/* App Bar */}
      <Box
        sx={{
          backgroundColor: 'white',
          borderBottom: `1px solid ${theme.palette.divider}`,
          px: 3,
          py: 2,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#1E293B' }}>
            Dashboard - {dashboardData?.today.totalSales || 0} Sales Today
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              onClick={handleRefresh}
              disabled={refreshing}
              sx={{
                animation: refreshing ? 'spin 1s linear infinite' : 'none',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' },
                },
              }}
            >
              <RefreshCw size={20} />
            </IconButton>
            <IconButton>
              <Badge badgeContent={3} color="error">
                <Bell size={20} />
              </Badge>
            </IconButton>
            <Avatar
              sx={{
                bgcolor: '#3B82F6',
                width: 36,
                height: 36,
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
              onClick={(e) => setAnchorEl(e.currentTarget)}
            >
              {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          {/* Welcome Section */}
          <motion.div variants={itemVariants}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
                color: 'white',
                mb: 3,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Grid container alignItems="center">
                  <Grid item xs={12} md={8}>
                    <Typography variant="body1" sx={{ opacity: 0.9, mb: 0.5 }}>
                      Good {getGreeting()}!
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Your stock overview
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      Total Products: {dashboardData?.inventory.totalProducts || 0}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4} sx={{ textAlign: 'right' }}>
                    <BarChart3 size={64} style={{ opacity: 0.5 }} />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Products"
                value={dashboardData?.inventory.totalProducts || 0}
                icon={<Package />}
                color="#10B981"
                delay={0}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Low Stock"
                value={dashboardData?.inventory.lowStockProducts || 0}
                icon={<AlertTriangle />}
                color="#F59E0B"
                delay={1}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Out of Stock"
                value={dashboardData?.inventory.outOfStockProducts || 0}
                icon={<XCircle />}
                color="#EF4444"
                delay={2}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Value"
                value={formatCurrency(dashboardData?.inventory.totalInventoryValue || 0)}
                icon={<DollarSign />}
                color="#8B5CF6"
                delay={3}
              />
            </Grid>
          </Grid>

          {/* Charts and Lists */}
          <Grid container spacing={3}>
            {/* Inventory Chart */}
            <Grid item xs={12} md={4}>
              <motion.div variants={itemVariants}>
                <Card sx={{ height: 400 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1E293B' }}>
                      Inventory Overview
                    </Typography>
                    <Box sx={{ height: 300, position: 'relative' }}>
                      <div style={chartContainerStyle}>
                        {dashboardData && (
                          <Pie 
                            data={pieChartData}
                            options={{
                              ...chartOptions,
                              plugins: {
                                ...chartOptions.plugins,
                                title: {
                                  display: true,
                                  text: 'Inventory Distribution',
                                  font: {
                                    size: 16,
                                    weight: 'bold'
                                  },
                                  padding: { bottom: 20 }
                                }
                              }
                            }}
                            key={`pie-${JSON.stringify(dashboardData.inventory)}`}
                            id="inventoryPieChart"
                            redraw
                          />
                        )}
                      </div>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>

            {/* Low Stock Alerts */}
            <Grid item xs={12} md={4}>
              <motion.div variants={itemVariants}>
                <Card sx={{ height: 400, overflow: 'auto' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <AlertTriangle size={20} color="#F59E0B" style={{ marginRight: 8 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#1E293B' }}>
                        Low Stock Alerts
                      </Typography>
                    </Box>
                    {dashboardData?.lowStockProducts && dashboardData.lowStockProducts.length > 0 ? (
                      <List sx={{ p: 0 }}>
                        {dashboardData.lowStockProducts.slice(0, 5).map((product) => (
                          <ListItem
                            key={product.id}
                            sx={{
                              backgroundColor: '#FEF3C7',
                              borderRadius: 2,
                              mb: 1,
                              border: '1px solid rgba(245, 158, 11, 0.2)',
                            }}
                          >
                            <ListItemText
                              primary={
                                <Typography sx={{ fontWeight: 500, color: '#92400E' }}>
                                  {product.name}
                                </Typography>
                              }
                              secondary={
                                <Typography variant="caption" sx={{ color: 'rgba(146, 64, 14, 0.8)' }}>
                                  SKU: {product.sku}
                                </Typography>
                              }
                            />
                            <Chip
                              label={`${product.currentStock} left`}
                              sx={{
                                backgroundColor: '#F59E0B',
                                color: 'white',
                                fontWeight: 500,
                                height: 24,
                              }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <CheckCircle size={48} color="#10B981" />
                        <Typography variant="h6" sx={{ mt: 2, fontWeight: 600, color: '#1E293B' }}>
                          All Good!
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748B', mt: 1 }}>
                          No low stock alerts at the moment
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>

            {/* Top Products */}
            <Grid item xs={12} md={4}>
              <motion.div variants={itemVariants}>
                <Card sx={{ height: 400, overflow: 'auto' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1E293B' }}>
                      Top Selling Products
                    </Typography>
                    {dashboardData?.topProducts && dashboardData.topProducts.length > 0 ? (
                      <List sx={{ p: 0 }}>
                        {dashboardData.topProducts.slice(0, 5).map((product, index) => (
                          <ListItem
                            key={`${product.sku}-${index}`}
                            sx={{
                              backgroundColor: '#F8FAFC',
                              borderRadius: 2,
                              mb: 1,
                            }}
                          >
                            <ListItemText
                              primary={
                                <Typography sx={{ fontWeight: 500, color: '#1E293B' }}>
                                  {product.name}
                                </Typography>
                              }
                              secondary={
                                <Typography variant="caption" sx={{ color: '#64748B' }}>
                                  SKU: {product.sku}
                                </Typography>
                              }
                            />
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography sx={{ fontWeight: 600, color: '#3B82F6' }}>
                                {product.totalSold} sold
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748B' }}>
                                {formatCurrency(product.totalRevenue)}
                              </Typography>
                            </Box>
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="body2" sx={{ color: '#64748B' }}>
                          No sales data available
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          </Grid>

          {/* Today's Stats */}
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12}>
              <motion.div variants={itemVariants}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: '#1E293B' }}>
                      Today's Performance
                    </Typography>
                    <Grid container spacing={4}>
                      <Grid item xs={12} md={4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <ShoppingCart size={32} color="#3B82F6" />
                          <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 2, color: '#1E293B' }}>
                            {dashboardData?.today.totalSales || 0}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#64748B', mt: 1 }}>
                            Total Sales
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <TrendingUp size={32} color="#10B981" />
                          <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 2, color: '#1E293B' }}>
                            {formatCurrency(dashboardData?.today.totalRevenue || 0)}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#64748B', mt: 1 }}>
                            Revenue
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Activity size={32} color="#8B5CF6" />
                          <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 2, color: '#1E293B' }}>
                            {formatCurrency(dashboardData?.month.totalRevenue || 0)}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#64748B', mt: 1 }}>
                            Monthly Revenue
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          </Grid>
        </motion.div>
      </Container>

      {/* User Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{
          sx: {
            mt: 1.5,
            minWidth: 200,
          },
        }}
      >
        <MenuItem>
          <ListItemIcon>
            <Users size={16} />
          </ListItemIcon>
          Profile ({currentUser?.displayName || 'User'})
        </MenuItem>
        <MenuItem>
          <ListItemIcon>
            <Settings size={16} />
          </ListItemIcon>
          Settings
        </MenuItem>
        <MenuItem sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <LogOut size={16} color="#EF4444" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default EnhancedDashboard;
