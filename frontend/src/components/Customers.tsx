import React, { useState, useEffect } from 'react';
import {
  Container,
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
  IconButton,
  Alert,
  Avatar,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import axios from '../config/api';

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  loyalty_points: number;
  created_at: string;
  updated_at: string;
}

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog states
  const [customerDialog, setCustomerDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Form data
  const [customerForm, setCustomerForm] = useState<Partial<Customer>>({});

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm]);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('/api/customers');
      // Handle the API response structure: { customers: [], pagination: {} }
      const customersData = response.data.customers || response.data || [];
      const customersArray = Array.isArray(customersData) ? customersData : [];
      setCustomers(customersArray);
      setFilteredCustomers(customersArray);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setError('Failed to fetch customers');
    }
  };

  const filterCustomers = () => {
    if (searchTerm.trim()) {
      setFilteredCustomers(
        customers.filter(customer =>
          (customer.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (customer.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (customer.phone || '').includes(searchTerm)
        )
      );
    } else {
      setFilteredCustomers(customers);
    }
  };

  const handleSaveCustomer = async () => {
    setLoading(true);
    setError('');
    
    // Basic validation
    if (!customerForm.name || customerForm.name.trim() === '') {
      setError('Customer name is required');
      setLoading(false);
      return;
    }
    
    try {
      // Filter out empty string fields to avoid validation errors
      const cleanedForm = Object.fromEntries(
        Object.entries(customerForm).filter(([key, value]) => 
          value !== undefined && value !== null && value !== ''
        )
      );
      
      if (selectedCustomer) {
        await axios.put(`/api/customers/${selectedCustomer.id}`, cleanedForm);
        setSuccess('Customer updated successfully');
      } else {
        await axios.post('/api/customers', cleanedForm);
        setSuccess('Customer created successfully');
      }
      setCustomerDialog(false);
      setCustomerForm({});
      setSelectedCustomer(null);
      fetchCustomers();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    
    try {
      await axios.delete(`/api/customers/${id}`);
      setSuccess('Customer deleted successfully');
      fetchCustomers();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete customer');
    }
  };

  const openCustomerDialog = (customer?: Customer) => {
    setSelectedCustomer(customer || null);
    setCustomerForm(customer ? { ...customer } : {});
    setCustomerDialog(true);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Typography variant="h4" gutterBottom>
        Customer Management
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

      {/* Search and Add */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => openCustomerDialog()}
            >
              Add Customer
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Customers Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Customer</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Loyalty Points</TableCell>
              <TableCell>Created Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="textSecondary">
                    No customers found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                        <PersonIcon />
                      </Avatar>
                      <Typography variant="subtitle2">
                        {customer.name || 'Unknown Customer'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      {customer.email && (
                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                          <EmailIcon fontSize="small" sx={{ mr: 1 }} />
                          {customer.email}
                        </Typography>
                      )}
                      {customer.phone && (
                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                          <PhoneIcon fontSize="small" sx={{ mr: 1 }} />
                          {customer.phone}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{customer.loyalty_points || 0}</TableCell>
                  <TableCell>
                    {new Date(customer.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => openCustomerDialog(customer)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteCustomer(customer.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Customer Dialog */}
      <Dialog open={customerDialog} onClose={() => setCustomerDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedCustomer ? 'Edit Customer' : 'Add New Customer'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Customer Name"
                value={customerForm.name || ''}
                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={customerForm.email || ''}
                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone"
                value={customerForm.phone || ''}
                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                multiline
                rows={3}
                value={customerForm.address || ''}
                onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomerDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveCustomer} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Customers;
