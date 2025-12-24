import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  Assessment as ReportIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as MoneyIcon,
  Inventory as InventoryIcon,
  People as PeopleIcon,
  LocalOffer as PromotionIcon,
  DateRange as DateIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  ShoppingCart as ShoppingCartIcon,
} from '@mui/icons-material';
import axios from '../config/api';
import { useNavigate } from 'react-router-dom';

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

interface ReportData {
  sales_summary: {
    total_sales: number;
    total_revenue: number;
    average_order_value: number;
    total_transactions: number;
  };
  inventory_summary: {
    total_products: number;
    low_stock_count: number;
    out_of_stock_count: number;
    total_inventory_value: number;
  };
  customer_summary: {
    total_customers: number;
    new_customers: number;
    returning_customers: number;
    customer_retention_rate: number;
  };
  promotion_summary: {
    active_promotions: number;
    total_discount_given: number;
    promotion_usage: number;
    most_used_promotion: string;
  };
  top_products: Array<{
    id: number;
    name: string;
    sku: string;
    quantity_sold: number;
    revenue: number;
  }>;
  sales_by_payment_method: Array<{
    payment_method: string;
    count: number;
    total_amount: number;
  }>;
  daily_sales: Array<{
    date: string;
    sales_count: number;
    revenue: number;
  }>;
}

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState(0);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [customerSegments, setCustomerSegments] = useState<CustomerSegment[]>([]);
  const [dateFilter, setDateFilter] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
    end_date: new Date().toISOString().split('T')[0]
  });
  const [reportType, setReportType] = useState('summary');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAllData();
  }, [dateFilter]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchReportData(),
        fetchFinancialData(),
        fetchCustomerSegments()
      ]);
    } catch (error) {
      console.error('Failed to fetch all data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportData = async () => {
    try {
      const params = new URLSearchParams({
        start_date: dateFilter.start_date,
        end_date: dateFilter.end_date,
        report_type: reportType
      });

      const response = await axios.get(`/api/reports/comprehensive?${params.toString()}`);
      setReportData(response.data);
    } catch (error: any) {
      setError('Failed to fetch report data');
      console.error('Report fetch error:', error);
      throw error;
    }
  };

  const fetchFinancialData = async () => {
    try {
      const params = new URLSearchParams({
        startDate: dateFilter.start_date,
        endDate: dateFilter.end_date,
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
      setCustomerSegments(response.data.segments || []);
    } catch (error) {
      console.error('Failed to fetch customer segments:', error);
      // Don't throw - this is optional data
    }
  };

  const handleDateChange = (field: 'start_date' | 'end_date', value: string) => {
    setDateFilter(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const exportReport = async (format: 'pdf' | 'excel') => {
    try {
      const params = new URLSearchParams({
        start_date: dateFilter.start_date,
        end_date: dateFilter.end_date,
        format,
        report_type: reportType
      });

      const response = await axios.get(`/api/reports/export?${params.toString()}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${dateFilter.start_date}_to_${dateFilter.end_date}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const renderSummaryCards = () => {
    if (!reportData) return null;

    return (
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Sales Summary */}
        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MoneyIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Sales Performance</Typography>
              </Box>
              <Typography variant="h4" color="primary" gutterBottom>
                ${reportData.sales_summary.total_revenue.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Revenue
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>{reportData.sales_summary.total_sales}</strong> total sales
                </Typography>
                <Typography variant="body2">
                  <strong>${reportData.sales_summary.average_order_value.toFixed(2)}</strong> avg order value
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Inventory Summary */}
        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <InventoryIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Inventory Status</Typography>
              </Box>
              <Typography variant="h4" color="success.main" gutterBottom>
                {reportData.inventory_summary.total_products}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Products
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color={reportData.inventory_summary.low_stock_count > 0 ? 'warning.main' : 'textSecondary'}>
                  <strong>{reportData.inventory_summary.low_stock_count}</strong> low stock
                </Typography>
                <Typography variant="body2" color={reportData.inventory_summary.out_of_stock_count > 0 ? 'error.main' : 'textSecondary'}>
                  <strong>{reportData.inventory_summary.out_of_stock_count}</strong> out of stock
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Customer Summary */}
        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PeopleIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Customer Metrics</Typography>
              </Box>
              <Typography variant="h4" color="info.main" gutterBottom>
                {reportData.customer_summary.total_customers}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Customers
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>{reportData.customer_summary.new_customers}</strong> new customers
                </Typography>
                <Typography variant="body2">
                  <strong>{reportData.customer_summary.customer_retention_rate.toFixed(1)}%</strong> retention rate
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Promotion Summary */}
        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PromotionIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Promotions</Typography>
              </Box>
              <Typography variant="h4" color="warning.main" gutterBottom>
                {reportData.promotion_summary.active_promotions}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Active Promotions
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>${reportData.promotion_summary.total_discount_given.toFixed(2)}</strong> discount given
                </Typography>
                <Typography variant="body2">
                  <strong>{reportData.promotion_summary.promotion_usage}</strong> times used
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderTopProducts = () => {
    if (!reportData?.top_products) return null;

    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Top Selling Products
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell align="right">Quantity Sold</TableCell>
                <TableCell align="right">Revenue</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData.top_products.map((product, index) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ 
                        minWidth: 24, 
                        height: 24, 
                        borderRadius: '50%', 
                        bgcolor: index < 3 ? 'primary.main' : 'grey.400', 
                        color: 'white', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        mr: 2,
                        fontSize: '0.75rem'
                      }}>
                        {index + 1}
                      </Box>
                      {product.name}
                    </Box>
                  </TableCell>
                  <TableCell>{product.sku}</TableCell>
                  <TableCell align="right">{product.quantity_sold}</TableCell>
                  <TableCell align="right">${product.revenue.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };

  const renderPaymentMethodAnalysis = () => {
    if (!reportData?.sales_by_payment_method) return null;

    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Sales by Payment Method
        </Typography>
        <Grid container spacing={2}>
          {reportData.sales_by_payment_method.map((method) => {
            const percentage = reportData.sales_summary.total_transactions > 0 
              ? (method.count / reportData.sales_summary.total_transactions * 100).toFixed(1)
              : 0;
            
            return (
              <Grid item xs={12} md={4} key={method.payment_method}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {method.payment_method.toUpperCase()}
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {method.count}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {percentage}% of transactions
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Revenue: <strong>${method.total_amount.toFixed(2)}</strong>
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Paper>
    );
  };

  const renderDailySalesChart = () => {
    if (!reportData?.daily_sales) return null;

    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Daily Sales Trend
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell align="right">Sales Count</TableCell>
                <TableCell align="right">Revenue</TableCell>
                <TableCell align="right">Avg Order Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData.daily_sales.map((day) => (
                <TableRow key={day.date}>
                  <TableCell>{new Date(day.date).toLocaleDateString()}</TableCell>
                  <TableCell align="right">{day.sales_count}</TableCell>
                  <TableCell align="right">${day.revenue.toFixed(2)}</TableCell>
                  <TableCell align="right">
                    ${day.sales_count > 0 ? (day.revenue / day.sales_count).toFixed(2) : '0.00'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };

  const renderInventoryReport = () => {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Inventory Analysis
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Inventory Health
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">Total Products</Typography>
                  <Typography variant="h4">{reportData?.inventory_summary.total_products || 0}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">Inventory Value</Typography>
                  <Typography variant="h5">${reportData?.inventory_summary.total_inventory_value?.toFixed(2) || '0.00'}</Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Low Stock Items:</Typography>
                  <Typography variant="body2" color="warning.main">
                    {reportData?.inventory_summary.low_stock_count || 0}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Out of Stock:</Typography>
                  <Typography variant="body2" color="error.main">
                    {reportData?.inventory_summary.out_of_stock_count || 0}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Typography variant="h4" gutterBottom>
        Reports & Analytics
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Date Range and Export Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={dateFilter.start_date}
              onChange={(e) => handleDateChange('start_date', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={dateFilter.end_date}
              onChange={(e) => handleDateChange('end_date', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Report Type</InputLabel>
              <Select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <MenuItem value="summary">Summary</MenuItem>
                <MenuItem value="detailed">Detailed</MenuItem>
                <MenuItem value="inventory">Inventory</MenuItem>
                <MenuItem value="sales">Sales Only</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              onClick={fetchAllData}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Generate'}
            </Button>
          </Grid>
          <Grid item xs={12} md={2}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => exportReport('pdf')}
                size="small"
              >
                PDF
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => exportReport('excel')}
                size="small"
              >
                Excel
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs for different report views */}
      <Paper>
        <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
          <Tab label="Overview" />
          <Tab label="Sales Analysis" />
          <Tab label="Inventory Report" />
          <Tab label="Customer Insights" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {currentTab === 0 && (
            <Box>
              <Typography variant="h5" gutterBottom>
                Business Overview
                <Typography variant="body2" color="textSecondary" component="span" sx={{ ml: 1 }}>
                  ({dateFilter.start_date} to {dateFilter.end_date})
                </Typography>
              </Typography>
              
              {renderSummaryCards()}
              
              {/* Enhanced Financial Overview */}
              {financialData && (
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Enhanced Financial Overview
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" color="primary">
                          ${financialData.revenue.toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Revenue
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" color="success.main">
                          ${financialData.profit.toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Profit
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" color="warning.main">
                          ${financialData.taxes.toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Taxes
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" color="info.main">
                          ${financialData.cashFlow.toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Cash Flow
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              )}
              
              {renderTopProducts()}
              {renderPaymentMethodAnalysis()}
              
              {/* Quick Actions */}
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<ReportIcon />}
                    onClick={() => navigate('/')}
                  >
                    Go to Dashboard
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ShoppingCartIcon />}
                    onClick={() => navigate('/sales')}
                  >
                    View Sales
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<InventoryIcon />}
                    onClick={() => navigate('/products')}
                  >
                    Manage Inventory
                  </Button>
                </Box>
              </Paper>
            </Box>
          )}

          {currentTab === 1 && (
            <Box>
              <Typography variant="h5" gutterBottom>
                Sales Performance Analysis
              </Typography>
              {renderSummaryCards()}
              {renderDailySalesChart()}
              {renderPaymentMethodAnalysis()}
            </Box>
          )}

          {currentTab === 2 && (
            <Box>
              {renderInventoryReport()}
              {renderTopProducts()}
            </Box>
          )}

          {currentTab === 3 && (
            <Box>
              <Typography variant="h5" gutterBottom>
                Customer Insights
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Customer Statistics
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="textSecondary">Total Customers</Typography>
                        <Typography variant="h4">{reportData?.customer_summary.total_customers || 0}</Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="textSecondary">New Customers</Typography>
                        <Typography variant="h5" color="success.main">
                          {reportData?.customer_summary.new_customers || 0}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="textSecondary">Returning Customers</Typography>
                        <Typography variant="h5" color="info.main">
                          {reportData?.customer_summary.returning_customers || 0}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="textSecondary">Retention Rate</Typography>
                        <Typography variant="h5" color="primary.main">
                          {reportData?.customer_summary.customer_retention_rate?.toFixed(1) || 0}%
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Customer Value Metrics
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="textSecondary">Average Order Value</Typography>
                        <Typography variant="h4">
                          ${reportData?.sales_summary.average_order_value?.toFixed(2) || '0.00'}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ mt: 2 }}>
                        Based on {reportData?.sales_summary.total_transactions || 0} total transactions
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              
              {/* Customer Segments */}
              {customerSegments.length > 0 && (
                <Paper sx={{ p: 3, mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Customer Segments
                  </Typography>
                  <Grid container spacing={2}>
                    {customerSegments.map((segment) => (
                      <Grid item xs={12} sm={6} md={4} key={segment.name}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h5" color="primary">
                              {segment.customer_count}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {segment.name}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              )}
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default Reports;
