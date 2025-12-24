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
  Box,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  IconButton,
  Card,
  CardContent,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Search as SearchIcon,
  Receipt as ReceiptIcon,
  Undo as RefundIcon,
  FilterList as FilterIcon,
  Payment as PaymentIcon,
  Person as PersonIcon,
  LocalOffer as OfferIcon,
  DateRange as DateIcon,
  TrendingUp as TrendingUpIcon,
  Dashboard as DashboardIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import axios from '../config/api';
import { useNavigate } from 'react-router-dom';

interface Sale {
  id: number;
  customer_id: number;
  customer_name: string;
  promotion_id: number;
  promotion_name: string;
  payment_method: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  change_given: number;
  status: 'completed' | 'refunded' | 'partially_refunded';
  created_at: string;
  updated_at: string;
  items: SaleItem[];
}

interface SaleItem {
  id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface SalesStats {
  total_sales: number;
  total_revenue: number;
  average_order_value: number;
  total_refunds: number;
  today_sales: number;
  today_revenue: number;
  this_month_sales: number;
  this_month_revenue: number;
}

const Sales: React.FC = () => {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState(0);
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({
    start_date: '',
    end_date: ''
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog states
  const [viewDialog, setViewDialog] = useState(false);
  const [refundDialog, setRefundDialog] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState<string>('');

  useEffect(() => {
    fetchSales();
    fetchSalesStats();
  }, []);

  useEffect(() => {
    filterSales();
  }, [sales, searchTerm, dateFilter, statusFilter, paymentMethodFilter]);

  const fetchSales = async () => {
    try {
      const params = new URLSearchParams();
      if (dateFilter.start_date) params.append('startDate', dateFilter.start_date);
      if (dateFilter.end_date) params.append('endDate', dateFilter.end_date);

      const response = await axios.get(`/api/sales?${params.toString()}`);
      setSales(response.data.sales || []);
    } catch (error) {
      setError('Failed to fetch sales');
    }
  };

  const fetchSalesStats = async () => {
    try {
      const response = await axios.get('/api/reports/sales-stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch sales stats:', error);
    }
  };

  const filterSales = () => {
    let filtered = sales;

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(sale =>
        sale.id.toString().includes(searchTerm) ||
        sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.payment_method.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sale => sale.status === statusFilter);
    }

    // Filter by payment method
    if (paymentMethodFilter !== 'all') {
      filtered = filtered.filter(sale => sale.payment_method === paymentMethodFilter);
    }

    setFilteredSales(filtered);
  };

  const handleViewSale = (sale: Sale) => {
    setSelectedSale(sale);
    setViewDialog(true);
  };

  const handleRefundSale = (sale: Sale) => {
    setSelectedSale(sale);
    setRefundAmount(sale.total_amount);
    setRefundReason('');
    setRefundDialog(true);
  };

  const processRefund = async () => {
    if (!selectedSale) return;

    setLoading(true);
    try {
      await axios.post(`/api/sales/${selectedSale.id}/refund`, {
        reason: refundReason
      });

      setSuccess('Refund processed successfully');
      setRefundDialog(false);
      fetchSales();
      fetchSalesStats();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to process refund');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'refunded': return 'error';
      case 'partially_refunded': return 'warning';
      default: return 'default';
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash': return 'success';
      case 'card': return 'primary';
      case 'mobile': return 'info';
      default: return 'default';
    }
  };

  const renderSalesTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Sale ID</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Customer</TableCell>
            <TableCell>Items</TableCell>
            <TableCell>Payment</TableCell>
            <TableCell>Total</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredSales.map((sale) => (
            <TableRow key={sale.id}>
              <TableCell>
                <Typography variant="subtitle2">#{sale.id}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {new Date(sale.created_at).toLocaleDateString()}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {new Date(sale.created_at).toLocaleTimeString()}
                </Typography>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PersonIcon fontSize="small" sx={{ mr: 1 }} />
                  <Typography variant="body2">
                    {sale.customer_name || 'Walk-in Customer'}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {sale.items?.length || 0} items
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={(sale.payment_method || 'N/A').toUpperCase()}
                  color={getPaymentMethodColor(sale.payment_method || '') as any}
                  size="small"
                  icon={<PaymentIcon />}
                />
              </TableCell>
              <TableCell>
                <Typography variant="subtitle2">
                  ${sale.total_amount.toFixed(2)}
                </Typography>
                {sale.discount_amount > 0 && (
                  <Typography variant="caption" color="success.main">
                    (${sale.discount_amount.toFixed(2)} discount)
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Chip
                  label={(sale.status || 'unknown').replace('_', ' ').toUpperCase()}
                  color={getStatusColor(sale.status || 'unknown') as any}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <IconButton onClick={() => handleViewSale(sale)}>
                  <ViewIcon />
                </IconButton>
                {sale.status === 'completed' && (
                  <IconButton onClick={() => handleRefundSale(sale)}>
                    <RefundIcon />
                  </IconButton>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderSalesStats = () => (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h4" color="primary">
              {stats?.total_sales || 0}
            </Typography>
            <Typography color="textSecondary">
              Total Sales
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h4" color="success.main">
              ${stats?.total_revenue?.toFixed(2) || '0.00'}
            </Typography>
            <Typography color="textSecondary">
              Total Revenue
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h4" color="info.main">
              ${stats?.average_order_value?.toFixed(2) || '0.00'}
            </Typography>
            <Typography color="textSecondary">
              Avg Order Value
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h4" color="error.main">
              ${stats?.total_refunds?.toFixed(2) || '0.00'}
            </Typography>
            <Typography color="textSecondary">
              Total Refunds
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderTodayStats = () => (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Today's Performance
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="h5" color="primary">
                  {stats?.today_sales || 0}
                </Typography>
                <Typography color="textSecondary">Sales</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="h5" color="success.main">
                  ${stats?.today_revenue?.toFixed(2) || '0.00'}
                </Typography>
                <Typography color="textSecondary">Revenue</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              This Month's Performance
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="h5" color="primary">
                  {stats?.this_month_sales || 0}
                </Typography>
                <Typography color="textSecondary">Sales</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="h5" color="success.main">
                  ${stats?.this_month_revenue?.toFixed(2) || '0.00'}
                </Typography>
                <Typography color="textSecondary">Revenue</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Typography variant="h4" gutterBottom>
        Sales Management
      </Typography>

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

      <Paper sx={{ mt: 2 }}>
        <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
          <Tab label="Sales History" />
          <Tab label="Sales Analytics" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {currentTab === 0 && (
            <>
              {/* Filters */}
              <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      placeholder="Search sales..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      InputProps={{
                        startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      label="Start Date"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={dateFilter.start_date}
                      onChange={(e) => setDateFilter({ ...dateFilter, start_date: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      label="End Date"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={dateFilter.end_date}
                      onChange={(e) => setDateFilter({ ...dateFilter, end_date: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <MenuItem value="all">All Status</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                        <MenuItem value="refunded">Refunded</MenuItem>
                        <MenuItem value="partially_refunded">Partially Refunded</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControl fullWidth>
                      <InputLabel>Payment Method</InputLabel>
                      <Select
                        value={paymentMethodFilter}
                        onChange={(e) => setPaymentMethodFilter(e.target.value)}
                      >
                        <MenuItem value="all">All Methods</MenuItem>
                        <MenuItem value="cash">Cash</MenuItem>
                        <MenuItem value="card">Card</MenuItem>
                        <MenuItem value="mobile">Mobile</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={1}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={fetchSales}
                      startIcon={<FilterIcon />}
                    >
                      Filter
                    </Button>
                  </Grid>
                </Grid>
              </Paper>

              {/* Sales Stats */}
              {stats && renderSalesStats()}

              {/* Sales Table */}
              {renderSalesTable()}
            </>
          )}

          {currentTab === 1 && (
            <>
              <Typography variant="h6" gutterBottom>
                Sales Analytics & Performance
              </Typography>
              
              {/* Today and Month Stats */}
              {stats && renderTodayStats()}

              {/* Additional Analytics can be added here */}
              {/* Quick Actions */}
              <Paper sx={{ p: 3, mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                  <Button
                    variant="outlined"
                    startIcon={<DashboardIcon />}
                    onClick={() => navigate('/')}
                  >
                    Go to Dashboard
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<AssessmentIcon />}
                    onClick={() => navigate('/reports')}
                  >
                    View Reports
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ReceiptIcon />}
                    onClick={() => navigate('/pos')}
                  >
                    Open POS
                  </Button>
                </Box>
              </Paper>
              
              <Paper sx={{ p: 3, mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Payment Method Distribution
                </Typography>
                <Grid container spacing={2}>
                  {['cash', 'card', 'mobile'].map((method) => {
                    const methodSales = sales.filter(sale => sale.payment_method === method);
                    const percentage = sales.length > 0 ? (methodSales.length / sales.length * 100).toFixed(1) : 0;
                    return (
                      <Grid item xs={12} md={4} key={method}>
                        <Card>
                          <CardContent>
                            <Typography variant="h4" color={getPaymentMethodColor(method)}>
                              {methodSales.length}
                            </Typography>
                            <Typography color="textSecondary">
                              {method.toUpperCase()} ({percentage}%)
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </Paper>
            </>
          )}
        </Box>
      </Paper>

      {/* Sale Details Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Sale Details - #{selectedSale?.id}
        </DialogTitle>
        <DialogContent>
          {selectedSale && (
            <Box>
              <Grid container spacing={3}>
                {/* Sale Info */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Sale Information</Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Date & Time</Typography>
                    <Typography>{new Date(selectedSale.created_at).toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Customer</Typography>
                    <Typography>{selectedSale.customer_name || 'Walk-in Customer'}</Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Payment Method</Typography>
                    <Chip label={(selectedSale.payment_method || 'N/A').toUpperCase()} 
                          color={getPaymentMethodColor(selectedSale.payment_method || '') as any} />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Status</Typography>
                    <Chip label={(selectedSale.status || 'unknown').replace('_', ' ').toUpperCase()} 
                          color={getStatusColor(selectedSale.status || 'unknown') as any} />
                  </Box>
                  {selectedSale.promotion_name && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="textSecondary">Promotion Applied</Typography>
                      <Chip icon={<OfferIcon />} label={selectedSale.promotion_name} color="success" />
                    </Box>
                  )}
                </Grid>

                {/* Sale Summary */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Sale Summary</Typography>
                  <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Subtotal:</Typography>
                    <Typography>${(selectedSale.subtotal || 0).toFixed(2)}</Typography>
                  </Box>
                  {(selectedSale.discount_amount || 0) > 0 && (
                    <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                      <Typography color="success.main">Discount:</Typography>
                      <Typography color="success.main">-${(selectedSale.discount_amount || 0).toFixed(2)}</Typography>
                    </Box>
                  )}
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6">Total:</Typography>
                    <Typography variant="h6">${(selectedSale.total_amount || 0).toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Amount Paid:</Typography>
                    <Typography>${(selectedSale.amount_paid || 0).toFixed(2)}</Typography>
                  </Box>
                  {(selectedSale.change_given || 0) > 0 && (
                    <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>Change Given:</Typography>
                      <Typography>${(selectedSale.change_given || 0).toFixed(2)}</Typography>
                    </Box>
                  )}
                </Grid>

                {/* Items */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Items Purchased</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Product</TableCell>
                          <TableCell>SKU</TableCell>
                          <TableCell>Quantity</TableCell>
                          <TableCell>Unit Price</TableCell>
                          <TableCell>Subtotal</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedSale.items?.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.product_name}</TableCell>
                            <TableCell>{item.product_sku}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>${item.unit_price.toFixed(2)}</TableCell>
                            <TableCell>${item.subtotal.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>Close</Button>
          {selectedSale?.status === 'completed' && (
            <Button variant="contained" color="error" onClick={() => {
              setViewDialog(false);
              handleRefundSale(selectedSale);
            }}>
              Process Refund
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={refundDialog} onClose={() => setRefundDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Process Refund - Sale #{selectedSale?.id}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" gutterBottom>
              Original Amount: ${selectedSale?.total_amount.toFixed(2)}
            </Typography>
            
            <TextField
              fullWidth
              label="Refund Amount"
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(Number(e.target.value))}
              sx={{ mb: 2 }}
              inputProps={{ max: selectedSale?.total_amount }}
            />
            
            <TextField
              fullWidth
              label="Refund Reason"
              multiline
              rows={3}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Enter reason for refund..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefundDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={processRefund}
            disabled={loading || refundAmount <= 0}
          >
            {loading ? 'Processing...' : 'Process Refund'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Sales;
