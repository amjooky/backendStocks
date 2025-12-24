import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  Tabs,
  Tab,
  Card,
  CardContent,
  Fab,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  LocalShipping as ShippingIcon,
  QrCodeScanner as ScannerIcon,
} from '@mui/icons-material';
import axios from '../config/api';
import BarcodeScanner from './BarcodeScanner';
import { notificationService } from '../services/notificationService';

interface Product {
  id: number;
  name: string;
  description: string;
  sku: string;
  barcode: string;
  price: number;
  cost: number;
  current_stock: number;
  minimum_stock: number;
  category_id: number;
  category_name: string;
  supplier_id: number;
  supplier_name: string;
  created_at: string;
  updated_at: string;
  // Database field names
  cost_price?: number;
  selling_price?: number;
  min_stock_level?: number;
  // API field names for forms
  sellingPrice?: number;
  costPrice?: number;
  quantity?: number;
  minimumStock?: number;
  categoryId?: number;
  supplierId?: number;
}

interface Category {
  id: number;
  name: string;
  description: string;
}

interface Supplier {
  id: number;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
}

interface StockMovement {
  id: number;
  product_id: number;
  product_name: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reference_number: string;
  notes: string;
  created_at: string;
}

const Products: React.FC = () => {
  const { t } = useTranslation();
  const [currentTab, setCurrentTab] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | ''>('');
  const [selectedSupplier, setSelectedSupplier] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);

  // Dialog states
  const [productDialog, setProductDialog] = useState(false);
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [supplierDialog, setSupplierDialog] = useState(false);
  const [stockDialog, setStockDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategoryItem, setSelectedCategoryItem] = useState<Category | null>(null);
  const [selectedSupplierItem, setSelectedSupplierItem] = useState<Supplier | null>(null);

  // Form data
  const [productForm, setProductForm] = useState<Partial<Product>>({});
  const [categoryForm, setCategoryForm] = useState<Partial<Category>>({});
  const [supplierForm, setSupplierForm] = useState<Partial<Supplier>>({});
  const [stockForm, setStockForm] = useState({
    product_id: 0,
    movement_type: 'in' as 'in' | 'out' | 'adjustment',
    quantity: 0,
    reference_number: '',
    notes: ''
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchSuppliers();
    fetchStockMovements();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, selectedCategory, selectedSupplier]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products');
      // Handle the API response structure: { products: [], pagination: {} }
      const productsData = response.data.products || response.data || [];
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (error) {
      setError(t('messages.networkError'));
      setProducts([]); // Set empty array on error to prevent filter errors
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories');
      // Handle potential API response structure variations
      const categoriesData = response.data.categories || response.data || [];
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      setError('Failed to fetch categories');
      setCategories([]); // Set empty array on error
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get('/api/suppliers');
      // Handle potential API response structure variations
      const suppliersData = response.data.suppliers || response.data || [];
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
    } catch (error) {
      setError('Failed to fetch suppliers');
      setSuppliers([]); // Set empty array on error
    }
  };

  const fetchStockMovements = async () => {
    try {
      const response = await axios.get('/api/inventory/movements');
      // Handle potential API response structure variations
      const movementsData = response.data.movements || response.data || [];
      setStockMovements(Array.isArray(movementsData) ? movementsData : []);
    } catch (error) {
      setError('Failed to fetch stock movements');
      setStockMovements([]); // Set empty array on error
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(product => product.category_id === selectedCategory);
    }

    if (selectedSupplier) {
      filtered = filtered.filter(product => product.supplier_id === selectedSupplier);
    }

    setFilteredProducts(filtered);
  };

  const handleSaveProduct = async () => {
    setLoading(true);
    try {
      // Transform form data to match API expectations
      const apiData = {
        name: productForm.name,
        description: productForm.description,
        sku: productForm.sku,
        barcode: productForm.barcode,
        categoryId: productForm.category_id || productForm.categoryId,
        supplierId: productForm.supplier_id || productForm.supplierId,
        costPrice: productForm.cost || productForm.costPrice,
        sellingPrice: productForm.price || productForm.sellingPrice,
        minStockLevel: productForm.minimum_stock || productForm.minimumStock,
        initialStock: productForm.current_stock || productForm.quantity
      };

      console.log('Sending product data:', apiData); // Debug log

      if (selectedProduct) {
        await axios.put(`/api/products/${selectedProduct.id}`, apiData);
        setSuccess(t('messages.productUpdated'));
      } else {
        await axios.post('/api/products', apiData);
        setSuccess(t('messages.productAdded'));
      }
      setProductDialog(false);
      setProductForm({});
      setSelectedProduct(null);
      fetchProducts();
    } catch (error: any) {
      console.error('Product save error:', error);
      setError(error.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm(t('products.deleteConfirm'))) return;
    
    try {
      console.log(`Attempting to delete product ID: ${id}`);
      await axios.delete(`/api/products/${id}`);
      setSuccess(t('messages.productDeleted'));
      fetchProducts();
    } catch (error: any) {
      console.error('Delete error:', error);
      console.error('Error response:', error.response);
      
      // Handle specific 409 conflict error for products with stock
      if (error.response?.status === 409) {
        const message = error.response.data?.message;
        if (message && message.includes('remaining stock')) {
          setError('Cannot delete product with remaining stock. Please adjust the stock to zero first using the Stock Movement feature.');
        } else {
          setError(message || 'Cannot delete this product due to a conflict.');
        }
      } else {
        const errorMessage = error.response?.data?.message || 
                            error.response?.data?.errors?.[0]?.msg || 
                            `Failed to delete product. Status: ${error.response?.status}`;
        setError(errorMessage);
      }
    }
  };

  const handleSaveCategory = async () => {
    setLoading(true);
    try {
      if (selectedCategoryItem) {
        await axios.put(`/api/categories/${selectedCategoryItem.id}`, categoryForm);
        setSuccess('Category updated successfully');
      } else {
        await axios.post('/api/categories', categoryForm);
        setSuccess('Category created successfully');
      }
      setCategoryDialog(false);
      setCategoryForm({});
      setSelectedCategoryItem(null);
      fetchCategories();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSupplier = async () => {
    setLoading(true);
    try {
      if (selectedSupplierItem) {
        await axios.put(`/api/suppliers/${selectedSupplierItem.id}`, supplierForm);
        setSuccess('Supplier updated successfully');
      } else {
        await axios.post('/api/suppliers', supplierForm);
        setSuccess('Supplier created successfully');
      }
      setSupplierDialog(false);
      setSupplierForm({});
      setSelectedSupplierItem(null);
      fetchSuppliers();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to save supplier');
    } finally {
      setLoading(false);
    }
  };

  const handleStockMovement = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      let data: any = {
        productId: stockForm.product_id,
        reference: stockForm.reference_number || undefined,
        notes: stockForm.notes || undefined,
      };

      switch (stockForm.movement_type) {
        case 'in':
          endpoint = '/api/inventory/stock-in';
          data.quantity = stockForm.quantity;
          break;
        case 'out':
          endpoint = '/api/inventory/stock-out';
          data.quantity = stockForm.quantity;
          break;
        case 'adjustment':
          endpoint = '/api/inventory/adjustment';
          data.newStock = stockForm.quantity; // For adjustment, quantity represents the new stock level
          break;
      }

      await axios.post(endpoint, data);
      setSuccess('Stock movement recorded successfully');
      setStockDialog(false);
      setStockForm({
        product_id: 0,
        movement_type: 'in',
        quantity: 0,
        reference_number: '',
        notes: ''
      });
      fetchProducts();
      fetchStockMovements();
      
      // Check for new stock alerts after stock operation
      try {
        await notificationService.checkStockAlerts();
      } catch (error) {
        console.warn('Failed to check stock alerts:', error);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to record stock movement');
    } finally {
      setLoading(false);
    }
  };

  const openProductDialog = (product?: Product) => {
    setSelectedProduct(product || null);
    if (product) {
      // Map database field names to form field names for editing
      setProductForm({
        ...product,
        // Ensure both field name formats are available
        cost: product.cost_price || product.cost,
        costPrice: product.cost_price || product.costPrice,
        price: product.selling_price || product.price,
        sellingPrice: product.selling_price || product.sellingPrice,
        minimum_stock: product.min_stock_level || product.minimum_stock,
        minimumStock: product.min_stock_level || product.minimumStock,
        quantity: product.current_stock || product.quantity,
        current_stock: product.current_stock || product.current_stock
      });
    } else {
      setProductForm({});
    }
    setProductDialog(true);
  };

  const openCategoryDialog = (category?: Category) => {
    setSelectedCategoryItem(category || null);
    setCategoryForm(category ? { ...category } : {});
    setCategoryDialog(true);
  };

  const openSupplierDialog = (supplier?: Supplier) => {
    setSelectedSupplierItem(supplier || null);
    setSupplierForm(supplier ? { ...supplier } : {});
    setSupplierDialog(true);
  };

  const getLowStockProducts = () => {
    return products.filter(product => (product.current_stock || 0) <= (product.minimum_stock || 0));
  };

  const getOutOfStockProducts = () => {
    return products.filter(product => (product.current_stock || 0) === 0);
  };

  const handleBarcodeScan = (barcode: string) => {
    console.log('Scanned barcode:', barcode);
    
    // Find product by barcode or SKU
    const product = products.find(p => 
      p.barcode.toLowerCase() === barcode.toLowerCase() ||
      p.sku.toLowerCase() === barcode.toLowerCase()
    );
    
    if (product) {
      setSearchTerm(barcode);
      setSuccess(`Product found: ${product.name}`);
    } else {
      setError(`Product with barcode '${barcode}' not found`);
    }
    
    setScannerOpen(false);
  };

  const renderProductsTab = () => (
    <Box>
      {/* Filters and Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder={t('common.search') + '...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>{t('products.category')}</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as number | '')}
              >
                <MenuItem value="">{t('common.all')} {t('products.category')}</MenuItem>
                {categories.map(category => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>{t('products.supplier')}</InputLabel>
              <Select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value as number | '')}
              >
                <MenuItem value="">{t('common.all')} {t('products.supplier')}</MenuItem>
                {suppliers.map(supplier => (
                  <MenuItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={1}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ScannerIcon />}
              onClick={() => setScannerOpen(true)}
            >
              {t('barcodeScanner.scanProduct')}
            </Button>
          </Grid>
          <Grid item xs={12} md={1}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => openProductDialog()}
            >
              {t('common.add')}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Left sidebar lists + Products Table */}
      <Grid container spacing={2}>
        {/* Left sidebar */}
        <Grid item xs={12} md={3}>
          <Box sx={{ position: 'sticky', top: 16 }}>
            {/* Out of Stock List */}
            <Paper sx={{ mb: 2, borderLeft: '4px solid #f44336', bgcolor: '#ffebee' }}>
              <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningIcon sx={{ color: '#f44336' }} />
                <Typography variant="subtitle1" sx={{ color: '#d32f2f', fontWeight: 'bold' }}>
                  {t('dashboard.outOfStock')} ({getOutOfStockProducts().length})
                </Typography>
              </Box>
              <Divider />
              <List dense sx={{ maxHeight: 320, overflow: 'auto', bgcolor: 'white' }}>
                {getOutOfStockProducts().length === 0 && (
                  <ListItem>
                    <ListItemText primary={t('common.noData')} />
                  </ListItem>
                )}
                {getOutOfStockProducts().map(product => (
                  <ListItem key={product.id} secondaryAction={
                    <IconButton edge="end" size="small" onClick={() => { setStockForm({ ...stockForm, product_id: product.id, movement_type: 'in' }); setStockDialog(true); }}>
                      <TrendingUpIcon fontSize="small" />
                    </IconButton>
                  }>
                    <ListItemText 
                      primary={`${product.name} (${product.sku})`}
                      secondary={`Category: ${product.category_name} • Supplier: ${product.supplier_name} • Min: ${product.minimum_stock || 0}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>

            {/* Low Stock List */}
            <Paper sx={{ borderLeft: '4px solid #ff9800', bgcolor: '#fff3e0' }}>
              <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningIcon sx={{ color: '#ff9800' }} />
                <Typography variant="subtitle1" sx={{ color: '#f57c00', fontWeight: 'bold' }}>
                  {t('dashboard.lowStock')} ({getLowStockProducts().length})
                </Typography>
              </Box>
              <Divider />
              <List dense sx={{ maxHeight: 320, overflow: 'auto', bgcolor: 'white' }}>
                {getLowStockProducts().length === 0 && (
                  <ListItem>
                    <ListItemText primary={t('common.noData')} />
                  </ListItem>
                )}
                {getLowStockProducts().map(product => (
                  <ListItem key={product.id} secondaryAction={
                    <IconButton edge="end" size="small" onClick={() => { setStockForm({ ...stockForm, product_id: product.id, movement_type: 'in' }); setStockDialog(true); }}>
                      <TrendingUpIcon fontSize="small" />
                    </IconButton>
                  }>
                    <ListItemText 
                      primary={`${product.name} (${product.sku})`}
                      secondary={`Stock: ${product.current_stock || 0} / Min: ${product.minimum_stock || 0} • Category: ${product.category_name}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Box>
        </Grid>

        {/* Right content - products table */}
        <Grid item xs={12} md={9}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('products.productName')}</TableCell>
                  <TableCell>{t('products.sku')}</TableCell>
                  <TableCell>{t('products.category')}</TableCell>
                  <TableCell>{t('common.price')}</TableCell>
                  <TableCell>{t('common.stock')}</TableCell>
                  <TableCell>{t('common.status')}</TableCell>
                  <TableCell>{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">{product.name}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          {product.supplier_name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{product.sku}</TableCell>
                    <TableCell>{product.category_name}</TableCell>
                    <TableCell>${(product.selling_price || product.price || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">{product.current_stock || 0}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {t('products.minimumStock')}: {product.minimum_stock || 0}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          (product.current_stock || 0) === 0 ? t('dashboard.outOfStock') :
                          (product.current_stock || 0) <= (product.minimum_stock || 0) ? t('dashboard.lowStock') : t('common.inStock')
                        }
                        color={
                          (product.current_stock || 0) === 0 ? 'error' :
                          (product.current_stock || 0) <= (product.minimum_stock || 0) ? 'warning' : 'success'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => openProductDialog(product)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteProduct(product.id)}>
                        <DeleteIcon />
                      </IconButton>
                      <IconButton onClick={() => { setStockForm({ ...stockForm, product_id: product.id }); setStockDialog(true); }}>
                        <ShippingIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Box>
  );

  const renderCategoriesTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">{t('products.categories')}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => openCategoryDialog()}
        >
          {t('products.addCategory')}
        </Button>
      </Box>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('common.name')}</TableCell>
              <TableCell>{t('common.description')}</TableCell>
              <TableCell>{t('products.productsCount')}</TableCell>
              <TableCell>{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>{category.name}</TableCell>
                <TableCell>{category.description}</TableCell>
                <TableCell>
                  {products.filter(p => p.category_id === category.id).length}
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => openCategoryDialog(category)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={async () => {
                    if (window.confirm('Are you sure you want to delete this category?')) {
                      try {
                        await axios.delete(`/api/categories/${category.id}`);
                        setSuccess('Category deleted successfully');
                        fetchCategories();
                      } catch (error: any) {
                        setError(error.response?.data?.message || 'Failed to delete category');
                      }
                    }
                  }}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderSuppliersTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">{t('products.suppliers')}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => openSupplierDialog()}
        >
          {t('products.addSupplier')}
        </Button>
      </Box>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Contact Person</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Products Count</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell>{supplier.name}</TableCell>
                <TableCell>{supplier.contact_person}</TableCell>
                <TableCell>{supplier.email}</TableCell>
                <TableCell>{supplier.phone}</TableCell>
                <TableCell>
                  {products.filter(p => p.supplier_id === supplier.id).length}
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => openSupplierDialog(supplier)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={async () => {
                    if (window.confirm('Are you sure you want to delete this supplier?')) {
                      try {
                        await axios.delete(`/api/suppliers/${supplier.id}`);
                        setSuccess('Supplier deleted successfully');
                        fetchSuppliers();
                      } catch (error: any) {
                        setError(error.response?.data?.message || 'Failed to delete supplier');
                      }
                    }
                  }}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderStockMovementsTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Stock Movements</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setStockDialog(true)}
        >
          Add Movement
        </Button>
      </Box>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Reference</TableCell>
              <TableCell>Notes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stockMovements.map((movement) => (
              <TableRow key={movement.id}>
                <TableCell>
                  {new Date(movement.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>{movement.product_name}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    icon={movement.movement_type === 'in' ? <TrendingUpIcon /> : <TrendingDownIcon />}
                    label={movement.movement_type.toUpperCase()}
                    color={movement.movement_type === 'in' ? 'success' : 'error'}
                  />
                </TableCell>
                <TableCell>{movement.quantity}</TableCell>
                <TableCell>{movement.reference_number}</TableCell>
                <TableCell>{movement.notes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Typography variant="h4" gutterBottom>
        {t('products.title')}
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
          <Tab label={t('navigation.products')} />
          <Tab label={t('products.categories')} />
          <Tab label={t('products.suppliers')} />
          <Tab label={t('stockManagement.stockMovements')} />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {currentTab === 0 && renderProductsTab()}
          {currentTab === 1 && renderCategoriesTab()}
          {currentTab === 2 && renderSuppliersTab()}
          {currentTab === 3 && renderStockMovementsTab()}
        </Box>
      </Paper>

      {/* Product Dialog */}
      <Dialog open={productDialog} onClose={() => setProductDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedProduct ? t('products.editProduct') : t('products.addProduct')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('products.productName')}
                value={productForm.name || ''}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('products.sku')}
                value={productForm.sku || ''}
                onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('common.description')}
                multiline
                rows={3}
                value={productForm.description || ''}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('products.barcode')}
                value={productForm.barcode || ''}
                onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('products.category')}</InputLabel>
                <Select
                  value={productForm.category_id || ''}
                  onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value as number, categoryId: e.target.value as number })}
                >
                  {categories.map(category => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('products.supplier')}</InputLabel>
                <Select
                  value={productForm.supplier_id || ''}
                  onChange={(e) => setProductForm({ ...productForm, supplier_id: e.target.value as number, supplierId: e.target.value as number })}
                >
                  {suppliers.map(supplier => (
                    <MenuItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('products.costPrice')}
                type="number"
                value={productForm.cost || productForm.costPrice || ''}
                onChange={(e) => setProductForm({ ...productForm, cost: Number(e.target.value), costPrice: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('products.sellingPrice')}
                type="number"
                value={productForm.price || productForm.sellingPrice || ''}
                onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value), sellingPrice: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('products.stockQuantity')}
                type="number"
                value={productForm.current_stock || productForm.quantity || ''}
                onChange={(e) => setProductForm({ ...productForm, current_stock: Number(e.target.value), quantity: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('products.minimumStock')}
                type="number"
                value={productForm.minimum_stock || productForm.minimumStock || ''}
                onChange={(e) => setProductForm({ ...productForm, minimum_stock: Number(e.target.value), minimumStock: Number(e.target.value) })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProductDialog(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleSaveProduct} disabled={loading}>
            {loading ? t('common.saving') : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialog} onClose={() => setCategoryDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedCategoryItem ? 'Edit Category' : 'Add New Category'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Category Name"
            value={categoryForm.name || ''}
            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={3}
            value={categoryForm.description || ''}
            onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveCategory} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Supplier Dialog */}
      <Dialog open={supplierDialog} onClose={() => setSupplierDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedSupplierItem ? 'Edit Supplier' : 'Add New Supplier'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Supplier Name"
                value={supplierForm.name || ''}
                onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Contact Person"
                value={supplierForm.contact_person || ''}
                onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={supplierForm.email || ''}
                onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                value={supplierForm.phone || ''}
                onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSupplierDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveSupplier} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stock Movement Dialog */}
      <Dialog open={stockDialog} onClose={() => setStockDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Stock Movement</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Product</InputLabel>
                <Select
                  value={stockForm.product_id || ''}
                  onChange={(e) => setStockForm({ ...stockForm, product_id: e.target.value as number })}
                >
                  {products.map(product => (
                    <MenuItem key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Movement Type</InputLabel>
                <Select
                  value={stockForm.movement_type}
                  onChange={(e) => setStockForm({ ...stockForm, movement_type: e.target.value as any })}
                >
                  <MenuItem value="in">Stock In</MenuItem>
                  <MenuItem value="out">Stock Out</MenuItem>
                  <MenuItem value="adjustment">Adjustment</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={stockForm.movement_type === 'adjustment' ? 'New Stock Level' : 'Quantity'}
                type="number"
                value={stockForm.quantity || ''}
                onChange={(e) => setStockForm({ ...stockForm, quantity: Number(e.target.value) })}
                helperText={stockForm.movement_type === 'adjustment' ? 'Enter the new total stock level' : 'Enter the quantity to add/remove'}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Reference Number"
                value={stockForm.reference_number || ''}
                onChange={(e) => setStockForm({ ...stockForm, reference_number: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={stockForm.notes || ''}
                onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStockDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleStockMovement} disabled={loading}>
            {loading ? 'Recording...' : 'Record Movement'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Barcode Scanner Dialog */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScan}
      />
    </Container>
  );
};

export default Products;
