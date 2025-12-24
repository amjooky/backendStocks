import React, { useState, useEffect, useContext } from 'react';
import { useCurrency } from '../contexts/CurrencyContext';
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
  Card,
  CardContent,
  CardActions,
  Box,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Autocomplete,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  ShoppingCart,
  Store as StoreIcon,
  Person as PersonIcon,
  QrCodeScanner as ScannerIcon,
} from '@mui/icons-material';
import axios from '../config/api';
import BarcodeScanner from './BarcodeScanner';
import settingsService from '../services/settingsService';

interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  current_stock: number;
  category_name: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  loyalty_points: number;
}

interface Promotion {
  id: number;
  name: string;
  type: 'percentage' | 'fixed' | 'buy_x_get_y';
  value: number;
  min_quantity: number;
}

interface CaisseSession {
  id: string;
  session_name: string;
  opening_amount: number;
  status: 'active' | 'closed';
  opened_at: string;
}

const POS: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [checkoutDialog, setCheckoutDialog] = useState(false);
  const [receiptDialog, setReceiptDialog] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [activeSession, setActiveSession] = useState<CaisseSession | null>(null);

  // Currency formatting is now handled by useCurrency hook
  const formatCurrencySync = (amount: number) => {
    return formatCurrency(amount);
  };

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchPromotions();
    loadTaxRate();
    fetchActiveSession();
  }, []);

  useEffect(() => {
    updateTaxCalculation();
  }, [cart, selectedPromotion, taxRate]);

  useEffect(() => {
    if (searchTerm.trim()) {
      setFilteredProducts(
        products.filter(product =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.sku.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredProducts([]);
    }
  }, [searchTerm, products]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products');
      // Handle the API response structure: { products: [], pagination: {} }
      const productsData = response.data.products || response.data || [];
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      console.log('Fetching customers from /api/customers...');
      const response = await axios.get('/api/customers');
      console.log('Customer API response:', response.data);
      // Handle potential API response structure variations
      const customersData = response.data.customers || response.data || [];
      console.log('Parsed customers data:', customersData);
      setCustomers(Array.isArray(customersData) ? customersData : []);
    } catch (error: any) {
      console.error('Failed to fetch customers:', error);
      console.error('Error details:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        console.error('Authentication error - token might be expired');
      } else if (error.response?.status === 429) {
        console.error('Rate limit exceeded');
        setError('Too many requests. Please wait and try again.');
      } else {
        setError(`Failed to load customers: ${error.message}`);
      }
    }
  };

  const fetchPromotions = async () => {
    try {
      const response = await axios.get('/api/promotions');
      // Handle potential API response structure variations
      const promotionsData = response.data.promotions || response.data || [];
      const promotionsArray = Array.isArray(promotionsData) ? promotionsData : [];
      setPromotions(promotionsArray.filter((p: any) => p.is_active));
    } catch (error) {
      console.error('Failed to fetch promotions:', error);
    }
  };

  const fetchActiveSession = async () => {
    try {
      const response = await axios.get('/api/caisse/active-session');
      setActiveSession(response.data);
    } catch (error) {
      // No active session is fine, POS can still work
      setActiveSession(null);
      console.log('No active caisse session found');
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.current_stock) {
        setError('Insufficient stock available');
        return;
      }
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * (product.price || 0) }
          : item
      ));
    } else {
      if (product.current_stock <= 0) {
        setError('Product out of stock');
        return;
      }
      setCart([...cart, {
        product,
        quantity: 1,
        subtotal: product.price || 0
      }]);
    }
    setError('');
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find(p => p.id === productId);
    if (product && newQuantity > product.current_stock) {
      setError('Insufficient stock available');
      return;
    }

    setCart(cart.map(item =>
      item.product.id === productId
        ? { ...item, quantity: newQuantity, subtotal: newQuantity * (item.product.price || 0) }
        : item
    ));
    setError('');
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setSelectedPromotion(null);
    setAmountPaid(0);
    setError('');
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + item.subtotal, 0);
  };

  const calculateDiscount = () => {
    if (!selectedPromotion) return 0;
    const subtotal = calculateSubtotal();
    
    // For now, skip minimum purchase check since POS doesn't track quantities per promotion
    // if (subtotal < (selectedPromotion.min_quantity || 0)) return 0;
    
    if (selectedPromotion.type === 'percentage') {
      return subtotal * ((selectedPromotion.value || 0) / 100);
    } else if (selectedPromotion.type === 'fixed') {
      return selectedPromotion.value || 0;
    }
    return 0;
  };

  const calculateTotal = () => {
    const subtotalAfterDiscount = calculateSubtotal() - calculateDiscount();
    return subtotalAfterDiscount + taxAmount;
  };

  const calculateSubtotalAfterDiscount = () => {
    return calculateSubtotal() - calculateDiscount();
  };

  const calculateChange = () => {
    return amountPaid - calculateTotal();
  };

  const handleCheckout = async () => {
    // Clear any previous errors
    setError('');
    
    // Validate cart
    if (cart.length === 0) {
      setError('❌ Cart is empty. Please add items before checkout.');
      return;
    }

    // Validate stock levels before checkout
    const stockErrors = [];
    for (const item of cart) {
      const product = products.find(p => p.id === item.product.id);
      if (!product || product.current_stock < item.quantity) {
        stockErrors.push(`❌ ${item.product.name}: Only ${product?.current_stock || 0} available, but ${item.quantity} requested`);
      }
    }
    
    if (stockErrors.length > 0) {
      setError('Stock Issues:\n' + stockErrors.join('\n'));
      return;
    }

    // Validate payment for cash transactions
    if (paymentMethod === 'cash' && amountPaid < calculateTotal()) {
      const shortfall = calculateTotal() - amountPaid;
      setError(`❌ Insufficient payment: Need ${formatCurrencySync(shortfall)} more (Total: ${formatCurrencySync(calculateTotal())}, Paid: ${formatCurrencySync(amountPaid)})`);
      return;
    }

    setLoading(true);
    try {
      console.log('Processing payment...', {
        items: cart.length,
        total: calculateTotal(),
        paymentMethod,
        customer: selectedCustomer?.first_name + ' ' + selectedCustomer?.last_name
      });
      
      // Build sale data, only including fields that have values
      const saleData: any = {
        paymentMethod: paymentMethod,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.price || 0,
          discountAmount: 0
        })),
        notes: `Amount Paid: ${paymentMethod === 'cash' ? formatCurrencySync(amountPaid) : formatCurrencySync(calculateTotal())}${paymentMethod === 'cash' && calculateChange() > 0 ? `, Change: ${formatCurrencySync(calculateChange())}` : ''}`
      };

      // Only add customerId if a customer is selected
      if (selectedCustomer?.id) {
        saleData.customerId = selectedCustomer.id;
      }

      // Only add promotions if one is selected
      if (selectedPromotion) {
        saleData.appliedPromotions = [{
          promotionId: selectedPromotion.id,
          discountAmount: calculateDiscount()
        }];
      }

      // Add active caisse session if available
      if (activeSession?.id) {
        saleData.caisseSessionId = activeSession.id;
      }

      console.log('Sending sale data:', saleData);
      
      const response = await axios.post('/api/sales', saleData);
      console.log('Sale successful:', response.data);
      
      setLastSale(response.data);
      setCheckoutDialog(false);
      setReceiptDialog(true);
      clearCart();
      
      // Refresh products to update stock
      await fetchProducts();
      
      // Show success message briefly
      setTimeout(() => {
        setError('✅ Payment processed successfully!');
        setTimeout(() => setError(''), 3000);
      }, 100);
      
    } catch (error: any) {
      console.error('Payment error:', error);
      
      let errorMessage = 'Failed to process payment';
      
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.message?.includes('Insufficient stock')) {
          errorMessage = `❌ ${errorData.message}. Available: ${errorData.available}, Requested: ${errorData.requested}`;
        } else if (errorData.errors && Array.isArray(errorData.errors)) {
          errorMessage = `❌ Validation Error: ${errorData.errors.map((e: any) => e.msg).join(', ')}`;
        } else {
          errorMessage = `❌ ${errorData.message || 'Bad Request'}`;
        }
      } else if (error.response?.status === 401) {
        errorMessage = '❌ Authentication failed. Please log in again.';
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else if (error.response?.status === 429) {
        errorMessage = '❌ Too many requests. Please wait a moment and try again.';
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        errorMessage = '❌ Network error. Please check your connection and try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories for category buttons
  const categories = Array.from(new Set(products.map(p => p.category_name).filter(Boolean)));
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  // Filter products by category
  const categoryFilteredProducts = selectedCategory 
    ? products.filter(p => p.category_name === selectedCategory)
    : products;
  
  // Get final products to display (either searched or category filtered)
  const displayProducts = searchTerm.trim() 
    ? filteredProducts 
    : categoryFilteredProducts;

  const numberButtons = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '00', 'C'];
  
  const handleNumberPad = (value: string) => {
    if (value === 'C') {
      setAmountPaid(0);
    } else if (paymentMethod === 'cash' && checkoutDialog) {
      const current = amountPaid.toString();
      const newValue = value === '00' ? current + '00' : current + value;
      setAmountPaid(Number(newValue) / 100); // Divide by 100 for decimal places
    }
  };

  // Handle barcode scan
  const loadTaxRate = async () => {
    try {
      const rate = await settingsService.getTaxRate();
      setTaxRate(rate);
    } catch (error) {
      console.error('Failed to load tax rate:', error);
      setTaxRate(0);
    }
  };

  const updateTaxCalculation = async () => {
    try {
      const subtotalAfterDiscount = calculateSubtotal() - calculateDiscount();
      const tax = await settingsService.calculateTax(subtotalAfterDiscount);
      setTaxAmount(tax);
    } catch (error) {
      console.error('Failed to calculate tax:', error);
      setTaxAmount(0);
    }
  };

  const handleBarcodeScan = (barcode: string) => {
    console.log('Scanned barcode:', barcode);
    
    // Try to find product by SKU or barcode (using SKU field as barcode for now)
    const product = products.find(p => 
      p.sku.toLowerCase() === barcode.toLowerCase() ||
      p.name.toLowerCase().includes(barcode.toLowerCase())
    );
    
    if (product) {
      addToCart(product);
      setError('');
    } else {
      setError(`Product with barcode '${barcode}' not found`);
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5' }}>
      {error && (
        <Alert 
          severity={error.includes('✅') ? 'success' : 'error'} 
          sx={{ m: 1, whiteSpace: 'pre-line' }} 
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}
      
      {/* Main POS Layout */}
      <Box sx={{ display: 'flex', flex: 1, gap: 1, p: 1 }}>
        
        {/* Left Panel - Receipt/Transaction Display */}
        <Box sx={{ width: '300px', display: 'flex', flexDirection: 'column' }}>
          {/* Receipt Header */}
          <Paper sx={{ p: 2, mb: 1, bgcolor: 'white', minHeight: '80px' }}>
            <Typography variant="h6" sx={{ fontSize: '14px', fontWeight: 'bold' }}>
              TRANSACTION
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Items: {cart.length} | Total: {formatCurrencySync(calculateTotal())}
            </Typography>
            {activeSession ? (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <StoreIcon sx={{ fontSize: '12px', color: 'success.main', mr: 0.5 }} />
                <Typography variant="caption" sx={{ fontSize: '10px', color: 'success.main' }}>
                  Session: {activeSession.session_name}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <StoreIcon sx={{ fontSize: '12px', color: 'warning.main', mr: 0.5 }} />
                <Typography variant="caption" sx={{ fontSize: '10px', color: 'warning.main' }}>
                  No active session
                </Typography>
              </Box>
            )}
          </Paper>
          
          {/* Receipt Items */}
          <Paper sx={{ flex: 1, p: 1, bgcolor: 'white', overflow: 'auto' }}>
            {cart.length === 0 ? (
              <Typography color="textSecondary" align="center" sx={{ mt: 4, fontSize: '12px' }}>
                No items in cart
              </Typography>
            ) : (
              <Box>
                {cart.map((item) => (
                  <Box key={item.product.id} sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    borderBottom: '1px solid #eee',
                    py: 1,
                    fontSize: '12px'
                  }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                        {item.product.name}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '10px', color: 'gray' }}>
                        {formatCurrencySync(item.product.price || 0)} x {item.quantity}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                        <RemoveIcon sx={{ fontSize: '12px' }} />
                      </IconButton>
                      <Typography sx={{ fontSize: '11px', minWidth: '20px', textAlign: 'center' }}>
                        {item.quantity}
                      </Typography>
                      <IconButton size="small" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>
                        <AddIcon sx={{ fontSize: '12px' }} />
                      </IconButton>
                      <Typography sx={{ fontSize: '11px', fontWeight: 'bold', minWidth: '50px', textAlign: 'right' }}>
                        {formatCurrencySync(item.subtotal)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
                
                {/* Total Section */}
                <Box sx={{ mt: 2, pt: 1, borderTop: '2px solid #000' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: '12px' }}>Subtotal:</Typography>
                    <Typography sx={{ fontSize: '12px' }}>{formatCurrencySync(calculateSubtotal())}</Typography>
                  </Box>
                  {selectedPromotion && calculateDiscount() > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: '12px', color: 'green' }}>Discount:</Typography>
                      <Typography sx={{ fontSize: '12px', color: 'green' }}>-{formatCurrencySync(calculateDiscount())}</Typography>
                    </Box>
                  )}
                  {taxRate > 0 && taxAmount > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: '12px' }}>Tax ({(taxRate * 100).toFixed(1)}%):</Typography>
                      <Typography sx={{ fontSize: '12px' }}>{formatCurrencySync(taxAmount)}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #000', pt: 0.5 }}>
                    <Typography sx={{ fontSize: '14px', fontWeight: 'bold' }}>TOTAL:</Typography>
                    <Typography sx={{ fontSize: '14px', fontWeight: 'bold' }}>{formatCurrencySync(calculateTotal())}</Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </Paper>
        </Box>
        
        {/* Middle Panel - Product Buttons */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          {/* Category Buttons */}
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <Button 
              variant={selectedCategory === '' ? 'contained' : 'outlined'}
              onClick={() => setSelectedCategory('')}
              sx={{ minHeight: '50px', bgcolor: selectedCategory === '' ? '#2196F3' : '#E3F2FD', color: '#000' }}
            >
              ALL
            </Button>
            {categories.map((category, index) => {
              const colors = ['#FF9800', '#4CAF50', '#F44336', '#9C27B0', '#00BCD4'];
              const bgColor = colors[index % colors.length];
              return (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'contained' : 'outlined'}
                  onClick={() => setSelectedCategory(category)}
                  sx={{ 
                    minHeight: '50px', 
                    bgcolor: selectedCategory === category ? bgColor : bgColor + '30',
                    color: '#000',
                    fontSize: '12px'
                  }}
                >
                  {category?.toUpperCase()}
                </Button>
              );
            })}
          </Box>
          
          {/* Search Bar with Scan Button */}
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search products or scan barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
                endAdornment: searchTerm && (
                  <IconButton size="small" onClick={() => setSearchTerm('')}>
                    <ClearIcon />
                  </IconButton>
                )
              }}
            />
            <Tooltip title="Scan Barcode">
              <Button
                variant="contained"
                onClick={() => setScannerOpen(true)}
                sx={{ 
                  minWidth: '50px', 
                  bgcolor: '#2196F3', 
                  '&:hover': { bgcolor: '#1976D2' }
                }}
              >
                <ScannerIcon />
              </Button>
            </Tooltip>
          </Box>
          
          {/* Product Grid */}
          <Box sx={{ 
            flex: 1, 
            bgcolor: 'white', 
            border: '1px solid #ddd', 
            borderRadius: 1, 
            p: 1,
            overflow: 'auto'
          }}>
            <Grid container spacing={1}>
              {displayProducts.slice(0, 40).map((product) => (
                <Grid item xs={3} sm={2.4} md={2} key={product.id}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => addToCart(product)}
                    disabled={product.current_stock <= 0}
                    sx={{
                      minHeight: '80px',
                      maxHeight: '80px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      bgcolor: product.current_stock > 0 ? '#E8F5E8' : '#FFEBEE',
                      border: '1px solid #ddd',
                      color: '#000',
                      fontSize: '10px',
                      textTransform: 'none',
                      '&:hover': {
                        bgcolor: product.current_stock > 0 ? '#C8E6C9' : '#FFCDD2'
                      }
                    }}
                  >
                    <Typography sx={{ fontSize: '10px', fontWeight: 'bold', textAlign: 'center', lineHeight: 1.2 }}>
                      {product.name.substring(0, 20)}
                    </Typography>
                    <Typography sx={{ fontSize: '11px', color: 'primary.main', fontWeight: 'bold' }}>
                      ${(product.price || 0).toFixed(2)}
                    </Typography>
                    <Typography sx={{ fontSize: '9px', color: product.current_stock > 0 ? 'green' : 'red' }}>
                      Stock: {product.current_stock}
                    </Typography>
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
        
        {/* Right Panel - Number Pad & Actions */}
        <Box sx={{ width: '200px', display: 'flex', flexDirection: 'column', gap: 1 }}>
          
          {/* Customer & Promotion */}
          <Paper sx={{ p: 1, bgcolor: '#FFF3E0' }}>
            <Autocomplete
              size="small"
              options={customers}
              value={selectedCustomer}
              onChange={(event, newValue) => {
                setSelectedCustomer(newValue);
              }}
              getOptionLabel={(option) => {
                if (!option) return 'Walk-in';
                return `${option.first_name || ''} ${option.last_name || ''}`.trim() || 'Walk-in';
              }}
              isOptionEqualToValue={(option, value) => option?.id === value?.id}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props as any;
                return (
                  <Box component="li" key={option.id} {...otherProps}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '13px' }}>
                        {option.first_name} {option.last_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                        {option.phone} • {option.loyalty_points || 0} pts
                      </Typography>
                    </Box>
                  </Box>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Customer"
                  placeholder="Walk-in or search..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <PersonIcon sx={{ ml: 1, mr: 0.5, color: 'action.active', fontSize: '16px' }} />
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                  sx={{ 
                    '& .MuiInputBase-root': {
                      fontSize: '13px'
                    },
                    '& .MuiInputBase-input': {
                      fontSize: '13px'
                    }
                  }}
                />
              )}
              sx={{ mb: 1, bgcolor: 'white', borderRadius: 1 }}
            />
            
            <Autocomplete
              size="small"
              options={promotions}
              value={selectedPromotion}
              onChange={(event, newValue) => {
                setSelectedPromotion(newValue);
              }}
              getOptionLabel={(option) => {
                if (!option || typeof option === 'string') return '';
                return option.name;
              }}
              isOptionEqualToValue={(option, value) => option.id === value?.id}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Box>
                    <Typography variant="body2">
                      {option.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.type === 'percentage' && `${option.value}% OFF`}
                      {option.type === 'fixed' && `$${option.value} OFF`}
                      {option.type === 'buy_x_get_y' && `Buy ${option.min_quantity} Get ${option.value}`}
                    </Typography>
                  </Box>
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Promotion"
                  placeholder="No promotion or search..."
                  sx={{ fontSize: '12px' }}
                />
              )}
              sx={{ bgcolor: 'white', borderRadius: 1 }}
            />
          </Paper>
          
          {/* Number Pad */}
          <Paper sx={{ p: 1, bgcolor: 'white' }}>
            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mb: 1 }}>
              NUMBER PAD
            </Typography>
            <Grid container spacing={0.5}>
              {numberButtons.map((num) => (
                <Grid item xs={4} key={num}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => handleNumberPad(num)}
                    sx={{
                      minHeight: '35px',
                      fontSize: '14px',
                      bgcolor: num === 'C' ? '#ffebee' : 'white',
                      color: '#000',
                      border: '1px solid #ddd'
                    }}
                  >
                    {num}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Paper>
          
          {/* Action Buttons */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button
              variant="contained"
              onClick={clearCart}
              sx={{ bgcolor: '#ff9800', color: 'white', py: 1.5 }}
            >
              CLEAR
            </Button>
            
            <Button
              variant="contained"
              onClick={() => setCheckoutDialog(true)}
              disabled={cart.length === 0}
              sx={{ 
                bgcolor: '#4caf50', 
                color: 'white', 
                py: 2, 
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              PAY
              <br />
              ${calculateTotal().toFixed(2)}
            </Button>
          </Box>
          
        </Box>
      </Box>

      {/* Checkout Dialog */}
      <Dialog open={checkoutDialog} onClose={() => setCheckoutDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Complete Payment</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Order Summary */}
            <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="subtitle1" gutterBottom>Order Summary</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>Subtotal:</Typography>
                <Typography>${calculateSubtotal().toFixed(2)}</Typography>
              </Box>
              {selectedPromotion && calculateDiscount() > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.main' }}>
                  <Typography>Discount:</Typography>
                  <Typography>-${calculateDiscount().toFixed(2)}</Typography>
                </Box>
              )}
              {taxRate > 0 && taxAmount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Tax ({(taxRate * 100).toFixed(1)}%):</Typography>
                  <Typography>${taxAmount.toFixed(2)}</Typography>
                </Box>
              )}
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6">${calculateTotal().toFixed(2)}</Typography>
              </Box>
            </Box>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
              >
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="card">Card</MenuItem>
                <MenuItem value="mobile">Mobile Payment</MenuItem>
              </Select>
            </FormControl>

            {paymentMethod === 'cash' && (
              <>
                <TextField
                  fullWidth
                  label="Amount Paid"
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  sx={{ mb: 2 }}
                />
                {amountPaid > 0 && (
                  <Typography color={calculateChange() >= 0 ? 'success.main' : 'error.main'}>
                    Change: ${calculateChange().toFixed(2)}
                  </Typography>
                )}
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckoutDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCheckout}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Complete Sale'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={receiptDialog} onClose={() => setReceiptDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ textAlign: 'center' }}>
          <ReceiptIcon sx={{ mr: 1 }} />
          Sale Receipt
        </DialogTitle>
        <DialogContent>
          {lastSale && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Stock Management System
              </Typography>
              <Typography variant="body2" gutterBottom>
                Receipt #: {lastSale.id}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Date: {new Date(lastSale.created_at).toLocaleString()}
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              {lastSale.items?.map((item: any, index: number) => (
                <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>{item.product_name} x{item.quantity}</Typography>
                  <Typography>${(item.subtotal || 0).toFixed(2)}</Typography>
                </Box>
              ))}
              
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Subtotal:</Typography>
                <Typography>${(lastSale.subtotal || 0).toFixed(2)}</Typography>
              </Box>
              {(lastSale.discount_amount || 0) > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="success.main">Discount:</Typography>
                  <Typography color="success.main">-${(lastSale.discount_amount || 0).toFixed(2)}</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6">${(lastSale.total_amount || 0).toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Payment Method:</Typography>
                <Typography>{(lastSale.payment_method || 'UNKNOWN').toUpperCase()}</Typography>
              </Box>
              {(lastSale.change_given || 0) > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Change:</Typography>
                  <Typography>${(lastSale.change_given || 0).toFixed(2)}</Typography>
                </Box>
              )}
              
              <Typography variant="body2" sx={{ mt: 2 }}>
                Thank you for your purchase!
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReceiptDialog(false)}>Close</Button>
          <Button variant="contained" onClick={() => window.print()}>
            Print Receipt
          </Button>
        </DialogActions>
      </Dialog>

      {/* Barcode Scanner */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScan}
        title="Scan Product Barcode"
      />
    </Box>
  );
};

export default POS;
