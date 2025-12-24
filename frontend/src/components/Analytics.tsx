import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Analytics as AnalyticsIcon,
  Assessment as AssessmentIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  FileDownload as DownloadIcon,
} from '@mui/icons-material';
import axios from '../config/api';

interface InventoryForecast {
  product_id: number;
  days_to_stockout: number;
  recommended_reorder_qty: number;
}

interface CustomerSegment {
  name: string;
  customer_count: number;
}

interface FinancialData {
  revenue: number;
  profit: number;
  taxes: number;
  cashFlow: number;
}

interface SalesReport {
  salesSummary: Array<{
    period: string;
    total_sales: number;
    total_revenue: number;
    total_discounts: number;
    average_sale: number;
    unique_customers: number;
  }>;
  paymentMethods: Array<{
    payment_method: string;
    count: number;
    total_revenue: number;
  }>;
  topProducts: Array<{
    name: string;
    sku: string;
    total_sold: number;
    total_revenue: number;
    times_sold: number;
  }>;
  cashierPerformance: Array<{
    username: string;
    first_name: string;
    last_name: string;
    total_sales: number;
    total_revenue: number;
  }>;
  period: {
    startDate: string;
    endDate: string;
    groupBy: string;
  };
}

const Analytics: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Date filters
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    groupBy: 'day',
  });

  // Data states
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [inventoryForecast, setInventoryForecast] = useState<InventoryForecast[]>([]);
  const [customerSegments, setCustomerSegments] = useState<CustomerSegment[]>([]);
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError('');

    try {
      await Promise.all([
        fetchFinancialAnalytics(),
        fetchInventoryForecast(),
        fetchCustomerSegments(),
        fetchSalesReport(),
      ]);
    } catch (err) {
      setError('Failed to fetch analytics data');
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFinancialAnalytics = async () => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      const response = await axios.get(`/api/analytics/financials?${params}`);
      setFinancialData(response.data);
    } catch (error) {
      console.error('Failed to fetch financial analytics:', error);
    }
  };

  const fetchInventoryForecast = async () => {
    try {
      const response = await axios.get('/api/analytics/inventory/forecast?horizonDays=30');
      setInventoryForecast(response.data.forecasts || []);
    } catch (error) {
      console.error('Failed to fetch inventory forecast:', error);
    }
  };

  const fetchCustomerSegments = async () => {
    try {
      const response = await axios.get('/api/analytics/customers/segments');
      setCustomerSegments(response.data.segments || []);
    } catch (error) {
      console.error('Failed to fetch customer segments:', error);
    }
  };

  const fetchSalesReport = async () => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        groupBy: dateRange.groupBy,
      });
      const response = await axios.get(`/api/reports/sales?${params}`);
      setSalesReport(response.data);
    } catch (error) {
      console.error('Failed to fetch sales report:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const exportData = async (format: 'csv' | 'pdf') => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        format,
      });
      
      const response = await axios.get(`/api/products/bulk/export?${params}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics_${dateRange.startDate}_${dateRange.endDate}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const renderFinancialAnalytics = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        Financial Analytics
      </Typography>
      
      {financialData ? (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <MoneyIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h4" color="primary">
                  {formatCurrency(financialData.revenue)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Revenue
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h4" color="success.main">
                  {formatCurrency(financialData.profit)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Net Profit
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <AssessmentIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                <Typography variant="h4" color="warning.main">
                  {formatCurrency(financialData.taxes)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tax Obligations
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <AnalyticsIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="h4" color="info.main">
                  {formatCurrency(financialData.cashFlow)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cash Flow
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          No financial data available for the selected period.
        </Alert>
      )}

      {/* Profit Margin Analysis */}
      {financialData && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Financial Ratios & Metrics
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" color="success.main">
                    {financialData.revenue > 0 ? 
                      ((financialData.profit / financialData.revenue) * 100).toFixed(1) : 0}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Profit Margin
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" color="info.main">
                    {financialData.revenue > 0 ? 
                      ((financialData.taxes / financialData.revenue) * 100).toFixed(1) : 0}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tax Rate
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" color="primary">
                    {financialData.profit > 0 && financialData.cashFlow > 0 ? 
                      (financialData.cashFlow / financialData.profit).toFixed(1) : 0}x
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cash Flow Ratio
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );

  const renderInventoryAnalytics = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        Inventory Forecasting & Analysis
      </Typography>
      
      {inventoryForecast.length > 0 ? (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Stock-out Predictions (Next 30 Days)
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Product ID</TableCell>
                    <TableCell>Days to Stock-out</TableCell>
                    <TableCell>Recommended Reorder Qty</TableCell>
                    <TableCell>Priority</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inventoryForecast.slice(0, 10).map((forecast, index) => (
                    <TableRow key={forecast.product_id}>
                      <TableCell>{forecast.product_id}</TableCell>
                      <TableCell>
                        <Chip 
                          label={`${forecast.days_to_stockout} days`}
                          color={
                            forecast.days_to_stockout < 7 ? 'error' :
                            forecast.days_to_stockout < 14 ? 'warning' : 'success'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{forecast.recommended_reorder_qty}</TableCell>
                      <TableCell>
                        <Chip 
                          label={
                            forecast.days_to_stockout < 7 ? 'High' :
                            forecast.days_to_stockout < 14 ? 'Medium' : 'Low'
                          }
                          color={
                            forecast.days_to_stockout < 7 ? 'error' :
                            forecast.days_to_stockout < 14 ? 'warning' : 'success'
                          }
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          No inventory forecasting data available. This feature requires historical sales data.
        </Alert>
      )}

      {/* Inventory Health Summary */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Inventory Health Summary
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Inventory forecasting helps predict when products will run out of stock based on 
            historical sales patterns. Use this information to plan purchases and avoid stockouts.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip label="High Priority: Reorder within 7 days" color="error" />
            <Chip label="Medium Priority: Reorder within 14 days" color="warning" />
            <Chip label="Low Priority: Monitor closely" color="success" />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  const renderCustomerAnalytics = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        Customer Segmentation & Analysis
      </Typography>
      
      {customerSegments.length > 0 ? (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {customerSegments.map((segment, index) => (
            <Grid item xs={12} md={4} key={segment.name}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <PeopleIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h4" color="primary">
                    {segment.customer_count}
                  </Typography>
                  <Typography variant="h6" gutterBottom>
                    {segment.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Customer Segment
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          Customer segmentation data will be available once you have customer purchase history.
        </Alert>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Customer Insights
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Customer segmentation helps identify different groups of customers based on their 
            purchasing behavior, frequency, and value. Use these insights to create targeted 
            marketing campaigns and improve customer retention.
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle1" gutterBottom>
            Segment Definitions:
          </Typography>
          <Box sx={{ pl: 2 }}>
            <Typography variant="body2" paragraph>
              • <strong>VIP Customers:</strong> High-value customers with frequent purchases
            </Typography>
            <Typography variant="body2" paragraph>
              • <strong>Regular Customers:</strong> Consistent customers with moderate spending
            </Typography>
            <Typography variant="body2" paragraph>
              • <strong>New Customers:</strong> Recently acquired customers (last 30 days)
            </Typography>
            <Typography variant="body2" paragraph>
              • <strong>At-Risk Customers:</strong> Previously active customers who haven't purchased recently
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  const renderSalesAnalytics = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        Sales Performance Analytics
      </Typography>
      
      {salesReport ? (
        <>
          {/* Sales Summary */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sales Performance Overview
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Period</TableCell>
                      <TableCell align="right">Sales Count</TableCell>
                      <TableCell align="right">Revenue</TableCell>
                      <TableCell align="right">Avg Sale</TableCell>
                      <TableCell align="right">Customers</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {salesReport.salesSummary.slice(0, 10).map((period, index) => (
                      <TableRow key={index}>
                        <TableCell>{period.period}</TableCell>
                        <TableCell align="right">{period.total_sales}</TableCell>
                        <TableCell align="right">{formatCurrency(period.total_revenue)}</TableCell>
                        <TableCell align="right">{formatCurrency(period.average_sale)}</TableCell>
                        <TableCell align="right">{period.unique_customers}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Payment Methods Distribution
                  </Typography>
                  {salesReport.paymentMethods.map((method) => (
                    <Box key={method.payment_method} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">
                          {method.payment_method.toUpperCase()}
                        </Typography>
                        <Typography variant="body2">
                          {method.count} transactions
                        </Typography>
                      </Box>
                      <Typography variant="h6" color="primary">
                        {formatCurrency(method.total_revenue)}
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Top Performing Products
                  </Typography>
                  {salesReport.topProducts.slice(0, 5).map((product, index) => (
                    <Box key={product.sku} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Chip 
                          label={index + 1} 
                          size="small" 
                          color={index < 3 ? 'primary' : 'default'}
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="body2" sx={{ flexGrow: 1 }}>
                          {product.name}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {product.total_sold} sold • {formatCurrency(product.total_revenue)}
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Cashier Performance */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Staff Performance
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Cashier</TableCell>
                      <TableCell align="right">Total Sales</TableCell>
                      <TableCell align="right">Total Revenue</TableCell>
                      <TableCell align="right">Avg Sale Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {salesReport.cashierPerformance.map((cashier, index) => (
                      <TableRow key={cashier.username}>
                        <TableCell>
                          {cashier.first_name} {cashier.last_name}
                          <Typography variant="caption" display="block" color="text.secondary">
                            @{cashier.username}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{cashier.total_sales}</TableCell>
                        <TableCell align="right">{formatCurrency(cashier.total_revenue)}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(
                            cashier.total_sales > 0 ? 
                            cashier.total_revenue / cashier.total_sales : 0
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      ) : (
        <Alert severity="info">
          No sales data available for the selected period.
        </Alert>
      )}
    </Box>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Advanced Analytics
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={() => exportData('csv')}
          >
            Export CSV
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={() => exportData('pdf')}
          >
            Export PDF
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Date Range Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Group By</InputLabel>
              <Select
                value={dateRange.groupBy}
                onChange={(e) => setDateRange(prev => ({ ...prev, groupBy: e.target.value }))}
              >
                <MenuItem value="day">Daily</MenuItem>
                <MenuItem value="week">Weekly</MenuItem>
                <MenuItem value="month">Monthly</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="contained"
              onClick={fetchAnalyticsData}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : <AnalyticsIcon />}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Analytics Tabs */}
      <Paper>
        <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
          <Tab label="Financial Analytics" />
          <Tab label="Inventory Forecasting" />
          <Tab label="Customer Insights" />
          <Tab label="Sales Performance" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {currentTab === 0 && renderFinancialAnalytics()}
          {currentTab === 1 && renderInventoryAnalytics()}
          {currentTab === 2 && renderCustomerAnalytics()}
          {currentTab === 3 && renderSalesAnalytics()}
        </Box>
      </Paper>
    </Container>
  );
};

export default Analytics;
