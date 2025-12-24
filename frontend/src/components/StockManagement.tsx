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
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Tab,
  Tabs,
} from '@mui/material';
import {
  QrCodeScanner as ScannerIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Inventory as InventoryIcon,
  Search as SearchIcon,
  Save as SaveIcon,
  Clear as ClearIcon,
  History as HistoryIcon,
  TrendingUp as StockInIcon,
  TrendingDown as StockOutIcon,
  Tune as AdjustmentIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import axios from '../config/api';
import BarcodeScanner from './BarcodeScanner';
import { notificationService } from '../services/notificationService';

interface Product {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  current_stock: number;
  minimum_stock: number;
  cost: number;
  price: number;
  category_name: string;
  supplier_name: string;
}

interface StockMovement {
  id: number;
  product_id: number;
  product_name: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reference: string;
  notes: string;
  user_name: string;
  created_at: string;
}

const StockManagement: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Stock operation dialog
  const [stockDialog, setStockDialog] = useState(false);
  const [operationType, setOperationType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [quantity, setQuantity] = useState<number>(0);
  const [newStock, setNewStock] = useState<number>(0);
  const [costPerUnit, setCostPerUnit] = useState<number>(0);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchStockMovements();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products');
      const productsData = response.data.products || response.data || [];
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (error) {
      setError('Failed to fetch products');
      setProducts([]);
    }
  };

  const fetchStockMovements = async () => {
    try {
      const response = await axios.get('/api/inventory/movements');
      const movementsData = response.data.movements || response.data || [];
      setStockMovements(Array.isArray(movementsData) ? movementsData : []);
    } catch (error) {
      setError('Failed to fetch stock movements');
      setStockMovements([]);
    }
  };

  const filterProducts = () => {
    if (searchTerm.trim()) {
      setFilteredProducts(
        products.filter(product =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.barcode.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredProducts(products);
    }
  };

  const handleBarcodeScan = (barcode: string) => {
    console.log('Scanned barcode:', barcode);
    
    // Find product by barcode or SKU
    const product = products.find(p => 
      p.barcode.toLowerCase() === barcode.toLowerCase() ||
      p.sku.toLowerCase() === barcode.toLowerCase()
    );
    
    if (product) {
      setSelectedProduct(product);
      setError('');
      setSuccess(`Product found: ${product.name}`);
    } else {
      setError(`Product with barcode '${barcode}' not found`);
      setSelectedProduct(null);
    }
    
    setScannerOpen(false);
  };

  const openStockDialog = (type: 'in' | 'out' | 'adjustment', product?: Product) => {
    if (product) {
      setSelectedProduct(product);
    }
    
    if (!selectedProduct && !product) {
      setError('Please select a product first');
      return;
    }

    setOperationType(type);
    setQuantity(0);
    setNewStock(selectedProduct?.current_stock || product?.current_stock || 0);
    setCostPerUnit(selectedProduct?.cost || product?.cost || 0);
    setReference('');
    setNotes('');
    setStockDialog(true);
  };

  const handleStockOperation = async () => {
    if (!selectedProduct) {
      setError('No product selected');
      return;
    }

    if (operationType !== 'adjustment' && quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    if (operationType === 'adjustment' && newStock < 0) {
      setError('New stock cannot be negative');
      return;
    }

    setLoading(true);
    try {
      let endpoint = '';
      let data: any = {
        productId: selectedProduct.id,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      switch (operationType) {
        case 'in':
          endpoint = '/api/inventory/stock-in';
          data.quantity = quantity;
          data.costPerUnit = costPerUnit || undefined;
          break;
        case 'out':
          endpoint = '/api/inventory/stock-out';
          data.quantity = quantity;
          break;
        case 'adjustment':
          endpoint = '/api/inventory/adjustment';
          data.newStock = newStock;
          break;
      }

      await axios.post(endpoint, data);
      
      const operationNames = {
        'in': 'Stock added',
        'out': 'Stock removed',
        'adjustment': 'Stock adjusted'
      };
      
      setSuccess(`${operationNames[operationType]} successfully!`);
      setStockDialog(false);
      
      // Refresh data
      await fetchProducts();
      await fetchStockMovements();
      
      // Check for new stock alerts after stock operation
      try {
        await notificationService.checkStockAlerts();
      } catch (error) {
        console.warn('Failed to check stock alerts:', error);
      }
      
      // Update selected product with new stock level
      const updatedProduct = products.find(p => p.id === selectedProduct.id);
      if (updatedProduct) {
        setSelectedProduct(updatedProduct);
      }
      
    } catch (error: any) {
      setError(error.response?.data?.message || `Failed to ${operationType === 'in' ? 'add' : operationType === 'out' ? 'remove' : 'adjust'} stock`);
    } finally {
      setLoading(false);
    }
  };

  const clearSelection = () => {
    setSelectedProduct(null);
    setSearchTerm('');
    setError('');
    setSuccess('');
  };

  const getLowStockProducts = () => {
    return products.filter(product => 
      (product.current_stock || 0) <= (product.minimum_stock || 0)
    );
  };

  const getStockStatus = (product: Product) => {
    const current = product.current_stock || 0;
    const minimum = product.minimum_stock || 0;
    
    if (current === 0) return { status: 'Out of Stock', color: 'error' as const };
    if (current <= minimum) return { status: 'Low Stock', color: 'warning' as const };
    return { status: 'In Stock', color: 'success' as const };
  };

  const renderInventoryOverview = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <InventoryIcon color="primary" sx={{ mr: 2, fontSize: 40 }} />
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Total Products
                </Typography>
                <Typography variant="h5">
                  {products.length}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <WarningIcon color="warning" sx={{ mr: 2, fontSize: 40 }} />
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Low Stock
                </Typography>
                <Typography variant="h5">
                  {getLowStockProducts().length}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <StockInIcon color="success" sx={{ mr: 2, fontSize: 40 }} />
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Recent Stock In
                </Typography>
                <Typography variant="h5">
                  {stockMovements.filter(m => m.movement_type === 'in').length}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <HistoryIcon color="info" sx={{ mr: 2, fontSize: 40 }} />
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Total Movements
                </Typography>
                <Typography variant="h5">
                  {stockMovements.length}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderStockOperations = () => (
    <Box>
      {/* Product Search/Selection */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Product Selection
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search products by name, SKU, or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ScannerIcon />}
              onClick={() => setScannerOpen(true)}
            >
              Scan Barcode
            </Button>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={clearSelection}
            >
              Clear Selection
            </Button>
          </Grid>
        </Grid>

        {/* Selected Product Display */}
        {selectedProduct && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.50', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              Selected Product
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography><strong>Name:</strong> {selectedProduct.name}</Typography>
                <Typography><strong>SKU:</strong> {selectedProduct.sku}</Typography>
                <Typography><strong>Barcode:</strong> {selectedProduct.barcode}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography><strong>Category:</strong> {selectedProduct.category_name}</Typography>
                <Typography><strong>Supplier:</strong> {selectedProduct.supplier_name}</Typography>
                <Typography><strong>Cost:</strong> ${selectedProduct.cost?.toFixed(2) || '0.00'}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography><strong>Current Stock:</strong> {selectedProduct.current_stock || 0}</Typography>
                <Typography><strong>Minimum Stock:</strong> {selectedProduct.minimum_stock || 0}</Typography>
                <Chip 
                  label={getStockStatus(selectedProduct).status}
                  color={getStockStatus(selectedProduct).color}
                  size="small"
                />
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Stock Operation Buttons */}
        {selectedProduct && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Stock Operations
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  startIcon={<StockInIcon />}
                  onClick={() => openStockDialog('in')}
                >
                  Add Stock
                </Button>
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  fullWidth
                  variant="contained"
                  color="error"
                  startIcon={<StockOutIcon />}
                  onClick={() => openStockDialog('out')}
                >
                  Remove Stock
                </Button>
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  fullWidth
                  variant="contained"
                  color="info"
                  startIcon={<AdjustmentIcon />}
                  onClick={() => openStockDialog('adjustment')}
                >
                  Adjust Stock
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Product Search Results */}
      {searchTerm && filteredProducts.length > 0 && !selectedProduct && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Search Results
          </Typography>
          <List>
            {filteredProducts.slice(0, 10).map((product) => (
              <ListItem 
                key={product.id}
                button
                onClick={() => setSelectedProduct(product)}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}
              >
                <ListItemText
                  primary={`${product.name} (${product.sku})`}
                  secondary={`Stock: ${product.current_stock || 0} | Category: ${product.category_name}`}
                />
                <ListItemSecondaryAction>
                  <Chip 
                    label={getStockStatus(product).status}
                    color={getStockStatus(product).color}
                    size="small"
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );

  const renderStockMovements = () => (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Recent Stock Movements
      </Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Previous</TableCell>
              <TableCell>New Stock</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Reference</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stockMovements.slice(0, 20).map((movement) => (
              <TableRow key={movement.id}>
                <TableCell>
                  {new Date(movement.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>{movement.product_name}</TableCell>
                <TableCell>
                  <Chip
                    label={movement.movement_type.toUpperCase()}
                    color={
                      movement.movement_type === 'in' ? 'success' :
                      movement.movement_type === 'out' ? 'error' : 'info'
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>{movement.quantity}</TableCell>
                <TableCell>{movement.previous_stock}</TableCell>
                <TableCell>{movement.new_stock}</TableCell>
                <TableCell>{movement.user_name}</TableCell>
                <TableCell>{movement.reference || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Typography variant="h4" gutterBottom>
        Stock Management
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

      {/* Overview Cards */}
      {renderInventoryOverview()}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          variant="fullWidth"
        >
          <Tab label="Stock Operations" />
          <Tab label="Stock Movements" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {currentTab === 0 && renderStockOperations()}
      {currentTab === 1 && renderStockMovements()}

      {/* Barcode Scanner Dialog */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScan}
      />

      {/* Stock Operation Dialog */}
      <Dialog open={stockDialog} onClose={() => setStockDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {operationType === 'in' ? 'Add Stock' : 
           operationType === 'out' ? 'Remove Stock' : 'Adjust Stock'}
        </DialogTitle>
        <DialogContent>
          {selectedProduct && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Product: {selectedProduct.name} ({selectedProduct.sku})
              </Typography>
              <Typography color="textSecondary">
                Current Stock: {selectedProduct.current_stock || 0}
              </Typography>
            </Box>
          )}

          <Grid container spacing={2}>
            {operationType !== 'adjustment' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  inputProps={{ min: 1 }}
                />
              </Grid>
            )}

            {operationType === 'adjustment' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="New Stock Level"
                  type="number"
                  value={newStock}
                  onChange={(e) => setNewStock(Number(e.target.value))}
                  inputProps={{ min: 0 }}
                />
              </Grid>
            )}

            {operationType === 'in' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Cost Per Unit (Optional)"
                  type="number"
                  value={costPerUnit}
                  onChange={(e) => setCostPerUnit(Number(e.target.value))}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Reference Number (Optional)"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="PO-001, INV-123, etc."
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes (Optional)"
                multiline
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes about this stock operation..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStockDialog(false)}>Cancel</Button>
          <Button
            onClick={handleStockOperation}
            variant="contained"
            disabled={loading}
            startIcon={<SaveIcon />}
          >
            {loading ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StockManagement;
