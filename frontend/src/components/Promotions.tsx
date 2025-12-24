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
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  LocalOffer as OfferIcon,
  Percent as PercentIcon,
  AttachMoney as MoneyIcon,
  DateRange as DateIcon,
  Category as CategoryIcon,
  Inventory as ProductIcon,
} from '@mui/icons-material';
import axios from '../config/api';

interface Promotion {
  id: number;
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  minimum_purchase: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  usage_limit: number;
  usage_count: number;
  applicable_to: 'all' | 'category' | 'product';
  applicable_categories: string;
  applicable_products: string;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  sku: string;
}

const Promotions: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredPromotions, setFilteredPromotions] = useState<Promotion[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog states
  const [promotionDialog, setPromotionDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);

  // Form data
  const [promotionForm, setPromotionForm] = useState<Partial<Promotion>>({
    discount_type: 'percentage',
    applicable_to: 'all',
    is_active: true,
    minimum_purchase: 0,
    usage_limit: 0
  });

  useEffect(() => {
    fetchPromotions();
    fetchCategories();
    fetchProducts();
  }, []);

  useEffect(() => {
    filterPromotions();
  }, [promotions, searchTerm, filterStatus]);

  const fetchPromotions = async () => {
    try {
      const response = await axios.get('/api/promotions/all');
      setPromotions(response.data);
    } catch (error) {
      setError('Failed to fetch promotions');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products');
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const filterPromotions = () => {
    let filtered = promotions;

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(promotion =>
        promotion.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        promotion.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    const now = new Date();
    if (filterStatus === 'active') {
      filtered = filtered.filter(promotion => 
        promotion.is_active && 
        new Date(promotion.start_date) <= now && 
        new Date(promotion.end_date) >= now
      );
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter(promotion => !promotion.is_active);
    } else if (filterStatus === 'expired') {
      filtered = filtered.filter(promotion => new Date(promotion.end_date) < now);
    }

    setFilteredPromotions(filtered);
  };

  const handleSavePromotion = async () => {
    setLoading(true);
    try {
      // Map frontend form data to backend expected format
      const formData = {
        name: promotionForm.name,
        description: promotionForm.description,
        type: promotionForm.discount_type === 'percentage' ? 'percentage' : 'fixed',
        value: promotionForm.discount_value,
        minQuantity: promotionForm.minimum_purchase || 0,
        maxUses: promotionForm.usage_limit === 0 ? null : promotionForm.usage_limit,
        startDate: promotionForm.start_date,
        endDate: promotionForm.end_date,
        productIds: promotionForm.applicable_to === 'product' && promotionForm.applicable_products
          ? promotionForm.applicable_products.split(',').map(id => parseInt(id.trim())).filter(Boolean)
          : [],
        isActive: promotionForm.is_active
      };

      if (selectedPromotion) {
        await axios.put(`/api/promotions/${selectedPromotion.id}`, formData);
        setSuccess('Promotion updated successfully');
      } else {
        await axios.post('/api/promotions', formData);
        setSuccess('Promotion created successfully');
      }
      setPromotionDialog(false);
      resetForm();
      fetchPromotions();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to save promotion');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePromotion = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this promotion?')) return;
    
    try {
      await axios.delete(`/api/promotions/${id}`);
      setSuccess('Promotion deleted successfully');
      fetchPromotions();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete promotion');
    }
  };

  const handleToggleActive = async (promotion: Promotion) => {
    try {
      await axios.patch(`/api/promotions/${promotion.id}/toggle`);
      setSuccess(`Promotion ${!promotion.is_active ? 'activated' : 'deactivated'} successfully`);
      fetchPromotions();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update promotion status');
    }
  };

  const openPromotionDialog = (promotion?: Promotion) => {
    setSelectedPromotion(promotion || null);
    setPromotionForm(promotion ? { ...promotion } : {
      discount_type: 'percentage',
      applicable_to: 'all',
      is_active: true,
      minimum_purchase: 0,
      usage_limit: 0
    });
    setPromotionDialog(true);
  };

  const resetForm = () => {
    setPromotionForm({
      discount_type: 'percentage',
      applicable_to: 'all',
      is_active: true,
      minimum_purchase: 0,
      usage_limit: 0
    });
    setSelectedPromotion(null);
  };

  const getPromotionStatus = (promotion: Promotion) => {
    const now = new Date();
    const startDate = new Date(promotion.start_date);
    const endDate = new Date(promotion.end_date);

    if (!promotion.is_active) {
      return { label: 'Inactive', color: 'default' as const };
    }
    if (endDate < now) {
      return { label: 'Expired', color: 'error' as const };
    }
    if (startDate > now) {
      return { label: 'Scheduled', color: 'info' as const };
    }
    return { label: 'Active', color: 'success' as const };
  };

  const formatDiscountValue = (promotion: Promotion) => {
    const value = promotion.discount_value || 0;
    if (promotion.discount_type === 'percentage') {
      return `${value}%`;
    }
    return `$${value.toFixed(2)}`;
  };

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Typography variant="h4" gutterBottom>
        Promotions Management
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

      {/* Filters and Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search promotions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Filter by Status</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
              >
                <MenuItem value="all">All Promotions</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="expired">Expired</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => openPromotionDialog()}
            >
              Create Promotion
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Promotions Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary">
                {promotions.length}
              </Typography>
              <Typography color="textSecondary">
                Total Promotions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="success.main">
                {promotions.filter(p => {
                  const now = new Date();
                  return p.is_active && new Date(p.start_date) <= now && new Date(p.end_date) >= now;
                }).length}
              </Typography>
              <Typography color="textSecondary">
                Active Promotions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="info.main">
                {promotions.filter(p => new Date(p.start_date) > new Date()).length}
              </Typography>
              <Typography color="textSecondary">
                Scheduled
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="error.main">
                {promotions.filter(p => new Date(p.end_date) < new Date()).length}
              </Typography>
              <Typography color="textSecondary">
                Expired
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Promotions Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Promotion</TableCell>
              <TableCell>Discount</TableCell>
              <TableCell>Dates</TableCell>
              <TableCell>Usage</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPromotions.map((promotion) => {
              const status = getPromotionStatus(promotion);
              return (
                <TableRow key={promotion.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2">
                        {promotion.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {promotion.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                        {promotion.applicable_to === 'category' && (
                          <Chip size="small" icon={<CategoryIcon />} label="Category Specific" />
                        )}
                        {promotion.applicable_to === 'product' && (
                          <Chip size="small" icon={<ProductIcon />} label="Product Specific" />
                        )}
                        {promotion.minimum_purchase > 0 && (
                          <Chip size="small" label={`Min: $${promotion.minimum_purchase}`} />
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {promotion.discount_type === 'percentage' ? 
                        <PercentIcon sx={{ mr: 1 }} /> : 
                        <MoneyIcon sx={{ mr: 1 }} />
                      }
                      <Typography variant="h6">
                        {formatDiscountValue(promotion)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {new Date(promotion.start_date).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body2">
                        to {new Date(promotion.end_date).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {promotion.usage_count} / {promotion.usage_limit === 0 ? '∞' : promotion.usage_limit}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={status.label}
                      color={status.color}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => {
                      setSelectedPromotion(promotion);
                      setViewDialog(true);
                    }}>
                      <ViewIcon />
                    </IconButton>
                    <IconButton onClick={() => openPromotionDialog(promotion)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleToggleActive(promotion)}>
                      <Switch checked={promotion.is_active} size="small" />
                    </IconButton>
                    <IconButton onClick={() => handleDeletePromotion(promotion.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Promotion Dialog */}
      <Dialog open={promotionDialog} onClose={() => setPromotionDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedPromotion ? 'Edit Promotion' : 'Create New Promotion'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Promotion Name"
                value={promotionForm.name || ''}
                onChange={(e) => setPromotionForm({ ...promotionForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={promotionForm.is_active || false}
                    onChange={(e) => setPromotionForm({ ...promotionForm, is_active: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={promotionForm.description || ''}
                onChange={(e) => setPromotionForm({ ...promotionForm, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Discount Type</InputLabel>
                <Select
                  value={promotionForm.discount_type || 'percentage'}
                  onChange={(e) => setPromotionForm({ ...promotionForm, discount_type: e.target.value as any })}
                >
                  <MenuItem value="percentage">Percentage (%)</MenuItem>
                  <MenuItem value="fixed_amount">Fixed Amount ($)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Discount Value"
                type="number"
                value={promotionForm.discount_value || ''}
                onChange={(e) => setPromotionForm({ ...promotionForm, discount_value: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={promotionForm.start_date?.split('T')[0] || ''}
                onChange={(e) => setPromotionForm({ ...promotionForm, start_date: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={promotionForm.end_date?.split('T')[0] || ''}
                onChange={(e) => setPromotionForm({ ...promotionForm, end_date: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Minimum Purchase Amount"
                type="number"
                value={promotionForm.minimum_purchase || ''}
                onChange={(e) => setPromotionForm({ ...promotionForm, minimum_purchase: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Usage Limit (0 = unlimited)"
                type="number"
                value={promotionForm.usage_limit || ''}
                onChange={(e) => setPromotionForm({ ...promotionForm, usage_limit: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Applicable To</InputLabel>
                <Select
                  value={promotionForm.applicable_to || 'all'}
                  onChange={(e) => setPromotionForm({ ...promotionForm, applicable_to: e.target.value as any })}
                >
                  <MenuItem value="all">All Products</MenuItem>
                  <MenuItem value="category">Specific Categories</MenuItem>
                  <MenuItem value="product">Specific Products</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {promotionForm.applicable_to === 'category' && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Select Categories</InputLabel>
                  <Select
                    multiple
                    value={promotionForm.applicable_categories?.split(',').filter(Boolean) || []}
                    onChange={(e) => setPromotionForm({ 
                      ...promotionForm, 
                      applicable_categories: Array.isArray(e.target.value) ? e.target.value.join(',') : e.target.value 
                    })}
                  >
                    {categories.map(category => (
                      <MenuItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            {promotionForm.applicable_to === 'product' && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Select Products</InputLabel>
                  <Select
                    multiple
                    value={promotionForm.applicable_products?.split(',').filter(Boolean) || []}
                    onChange={(e) => setPromotionForm({ 
                      ...promotionForm, 
                      applicable_products: Array.isArray(e.target.value) ? e.target.value.join(',') : e.target.value 
                    })}
                  >
                    {products.map(product => (
                      <MenuItem key={product.id} value={product.id.toString()}>
                        {product.name} ({product.sku})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPromotionDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSavePromotion} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Promotion Details</DialogTitle>
        <DialogContent>
          {selectedPromotion && (
            <Box>
              <Typography variant="h5" gutterBottom>
                {selectedPromotion.name}
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedPromotion.description}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Discount</Typography>
                  <Typography variant="h6">{formatDiscountValue(selectedPromotion)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Status</Typography>
                  <Chip label={getPromotionStatus(selectedPromotion).label} 
                        color={getPromotionStatus(selectedPromotion).color} />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Start Date</Typography>
                  <Typography>{new Date(selectedPromotion.start_date).toLocaleDateString()}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">End Date</Typography>
                  <Typography>{new Date(selectedPromotion.end_date).toLocaleDateString()}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Usage Count</Typography>
                  <Typography>{selectedPromotion.usage_count} / {selectedPromotion.usage_limit === 0 ? 'Unlimited' : selectedPromotion.usage_limit}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Minimum Purchase</Typography>
                  <Typography>${selectedPromotion.minimum_purchase}</Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>Close</Button>
          <Button variant="contained" onClick={() => {
            if (selectedPromotion) {
              openPromotionDialog(selectedPromotion);
              setViewDialog(false);
            }
          }}>
            Edit Promotion
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Promotions;
