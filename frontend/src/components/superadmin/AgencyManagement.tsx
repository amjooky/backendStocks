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
  Menu,
  Card,
  CardContent,
  Pagination,
  Tooltip,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  Business as BusinessIcon,
  Pause as SuspendIcon,
  PlayArrow as ActivateIcon,
  People as PeopleIcon,
  ShoppingCart as ProductsIcon,
  TrendingUp as RevenueIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
  Key as KeyIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import superadminService, { Agency, CreateAgencyData, UpdateAgencyData } from '../../services/superadminService';

const AgencyManagement: React.FC = () => {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Dialog states
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [suspendDialog, setSuspendDialog] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  
  // Form data
  const [agencyForm, setAgencyForm] = useState<CreateAgencyData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    subscription_plan: 'basic',
    max_users: 10,
    max_products: 1000,
  });
  const [suspendReason, setSuspendReason] = useState('');
  
  // Admin credentials state
  const [adminCredentials, setAdminCredentials] = useState<{
    username: string;
    password: string;
    email: string;
    changePasswordRequired: boolean;
  } | null>(null);
  const [credentialsDialog, setCredentialsDialog] = useState(false);
  
  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuAgency, setMenuAgency] = useState<Agency | null>(null);

  useEffect(() => {
    fetchAgencies();
  }, [page, searchQuery, statusFilter]);

  const fetchAgencies = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
      };
      
      const response = await superadminService.getAgencies(params);
      setAgencies(response.agencies || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalCount(response.pagination?.total || 0);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch agencies');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgency = async () => {
    setLoading(true);
    try {
      const response = await superadminService.createAgency(agencyForm);
      setAdminCredentials(response.adminCredentials);
      setSuccess('Agency and admin user created successfully');
      setCreateDialog(false);
      setCredentialsDialog(true);
      resetForm();
      fetchAgencies();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create agency');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAgency = async () => {
    if (!selectedAgency) return;
    
    setLoading(true);
    try {
      const updateData: UpdateAgencyData = {
        name: agencyForm.name,
        email: agencyForm.email,
        phone: agencyForm.phone,
        address: agencyForm.address,
        city: agencyForm.city,
        subscription_plan: agencyForm.subscription_plan,
        max_users: agencyForm.max_users,
        max_products: agencyForm.max_products,
      };
      
      await superadminService.updateAgency(selectedAgency.id, updateData);
      setSuccess('Agency updated successfully');
      setEditDialog(false);
      resetForm();
      fetchAgencies();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update agency');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendAgency = async () => {
    if (!selectedAgency) return;
    
    setLoading(true);
    try {
      await superadminService.suspendAgency(selectedAgency.id, suspendReason);
      setSuccess('Agency suspended successfully');
      setSuspendDialog(false);
      setSuspendReason('');
      setSelectedAgency(null);
      fetchAgencies();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to suspend agency');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateAgency = async (agency: Agency) => {
    setLoading(true);
    try {
      await superadminService.activateAgency(agency.id);
      setSuccess('Agency activated successfully');
      fetchAgencies();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to activate agency');
    } finally {
      setLoading(false);
    }
  };

  const handleViewAgency = async (agency: Agency) => {
    try {
      const detailedAgency = await superadminService.getAgency(agency.id);
      setSelectedAgency(detailedAgency);
      setViewDialog(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch agency details');
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setCreateDialog(true);
  };

  const openEditDialog = (agency: Agency) => {
    setSelectedAgency(agency);
    setAgencyForm({
      name: agency.name,
      email: agency.email,
      phone: agency.phone || '',
      address: agency.address || '',
      city: agency.city || '',
      subscription_plan: agency.subscription_plan,
      max_users: agency.max_users,
      max_products: agency.max_products,
    });
    setEditDialog(true);
  };

  const openSuspendDialog = (agency: Agency) => {
    setSelectedAgency(agency);
    setSuspendDialog(true);
  };

  const resetForm = () => {
    setAgencyForm({
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      subscription_plan: 'basic',
      max_users: 10,
      max_products: 1000,
    });
    setSelectedAgency(null);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, agency: Agency) => {
    setAnchorEl(event.currentTarget);
    setMenuAgency(agency);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuAgency(null);
  };

  const getStatusColor = (status: string, isActive: boolean) => {
    if (!isActive) return 'error';
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'enterprise': return 'primary';
      case 'pro': return 'secondary';
      case 'basic': return 'default';
      default: return 'default';
    }
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setSuccess(`${label} copied to clipboard!`);
    }).catch(() => {
      setError('Failed to copy to clipboard');
    });
  };

  const handleCopyAllCredentials = () => {
    if (!adminCredentials) return;
    
    const credentialsText = `
Agency Admin Login Credentials:
================================
Username: ${adminCredentials.username}
Password: ${adminCredentials.password}
Email: ${adminCredentials.email}

IMPORTANT: 
- The admin must change their password on first login
- Please share these credentials securely with the agency administrator
- Store these credentials safely as they cannot be retrieved later
`;
    
    navigator.clipboard.writeText(credentialsText).then(() => {
      setSuccess('All credentials copied to clipboard!');
    }).catch(() => {
      setError('Failed to copy credentials to clipboard');
    });
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BusinessIcon color="primary" />
            Agency Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage system agencies and their configurations
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
          size="large"
        >
          Create Agency
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" color="primary">
                    {totalCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Agencies
                  </Typography>
                </Box>
                <BusinessIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" color="success.main">
                    {agencies.filter(a => a.is_active && a.subscription_status === 'active').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Agencies
                  </Typography>
                </Box>
                <ActivateIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {agencies.filter(a => a.subscription_status === 'suspended').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Suspended
                  </Typography>
                </Box>
                <SuspendIcon sx={{ fontSize: 40, color: 'warning.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" color="info.main">
                    {agencies.filter(a => a.subscription_plan === 'enterprise').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Enterprise
                  </Typography>
                </Box>
                <RevenueIcon sx={{ fontSize: 40, color: 'info.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search agencies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchAgencies}
              fullWidth
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Agencies Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Agency</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Limits</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : agencies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No agencies found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              agencies.map((agency) => (
                <TableRow key={agency.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {agency.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ID: {agency.id}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">{agency.email}</Typography>
                      {agency.phone && (
                        <Typography variant="body2" color="text.secondary">
                          {agency.phone}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={agency.subscription_plan.toUpperCase()}
                      color={getPlanColor(agency.subscription_plan) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={agency.is_active ? agency.subscription_status.toUpperCase() : 'INACTIVE'}
                      color={getStatusColor(agency.subscription_status, agency.is_active) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        icon={<PeopleIcon />}
                        label={`${agency.user_count || 0}/${agency.max_users}`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        icon={<ProductsIcon />}
                        label={`${agency.product_count || 0}/${agency.max_products}`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(agency.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => handleViewAgency(agency)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEditDialog(agency)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, agency)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            color="primary"
          />
        </Box>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {menuAgency?.is_active && menuAgency?.subscription_status === 'active' ? (
          <MenuItem onClick={() => { openSuspendDialog(menuAgency); handleMenuClose(); }}>
            <SuspendIcon sx={{ mr: 1 }} />
            Suspend Agency
          </MenuItem>
        ) : (
          <MenuItem onClick={() => { handleActivateAgency(menuAgency!); handleMenuClose(); }}>
            <ActivateIcon sx={{ mr: 1 }} />
            Activate Agency
          </MenuItem>
        )}
      </Menu>

      {/* Create/Edit Agency Dialog */}
      <Dialog open={createDialog || editDialog} onClose={() => { setCreateDialog(false); setEditDialog(false); }} maxWidth="md" fullWidth>
        <DialogTitle>
          {createDialog ? 'Create New Agency' : 'Edit Agency'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Agency Name"
                value={agencyForm.name}
                onChange={(e) => setAgencyForm({ ...agencyForm, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={agencyForm.email}
                onChange={(e) => setAgencyForm({ ...agencyForm, email: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                value={agencyForm.phone}
                onChange={(e) => setAgencyForm({ ...agencyForm, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="City"
                value={agencyForm.city}
                onChange={(e) => setAgencyForm({ ...agencyForm, city: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                multiline
                rows={2}
                value={agencyForm.address}
                onChange={(e) => setAgencyForm({ ...agencyForm, address: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Subscription Plan</InputLabel>
                <Select
                  value={agencyForm.subscription_plan}
                  onChange={(e) => setAgencyForm({ ...agencyForm, subscription_plan: e.target.value as any })}
                >
                  <MenuItem value="basic">Basic</MenuItem>
                  <MenuItem value="pro">Pro</MenuItem>
                  <MenuItem value="enterprise">Enterprise</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Max Users"
                type="number"
                value={agencyForm.max_users}
                onChange={(e) => setAgencyForm({ ...agencyForm, max_users: parseInt(e.target.value) || 0 })}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Max Products"
                type="number"
                value={agencyForm.max_products}
                onChange={(e) => setAgencyForm({ ...agencyForm, max_products: parseInt(e.target.value) || 0 })}
                inputProps={{ min: 1 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateDialog(false); setEditDialog(false); }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={createDialog ? handleCreateAgency : handleUpdateAgency}
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : (createDialog ? 'Create' : 'Update')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Agency Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Agency Details</DialogTitle>
        <DialogContent>
          {selectedAgency && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Name</Typography>
                <Typography variant="body1">{selectedAgency.name}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Email</Typography>
                <Typography variant="body1">{selectedAgency.email}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Phone</Typography>
                <Typography variant="body1">{selectedAgency.phone || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">City</Typography>
                <Typography variant="body1">{selectedAgency.city || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">Address</Typography>
                <Typography variant="body1">{selectedAgency.address || 'N/A'}</Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Subscription & Limits
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">Subscription Plan</Typography>
                <Chip
                  label={selectedAgency.subscription_plan.toUpperCase()}
                  color={getPlanColor(selectedAgency.subscription_plan) as any}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">Status</Typography>
                <Chip
                  label={selectedAgency.is_active ? selectedAgency.subscription_status.toUpperCase() : 'INACTIVE'}
                  color={getStatusColor(selectedAgency.subscription_status, selectedAgency.is_active) as any}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">Created</Typography>
                <Typography variant="body1">
                  {new Date(selectedAgency.created_at).toLocaleDateString()}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Users</Typography>
                <Typography variant="body1">
                  {selectedAgency.user_count || 0} / {selectedAgency.max_users}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Products</Typography>
                <Typography variant="body1">
                  {selectedAgency.product_count || 0} / {selectedAgency.max_products}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Suspend Agency Dialog */}
      <Dialog open={suspendDialog} onClose={() => setSuspendDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Suspend Agency</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to suspend "{selectedAgency?.name}"?
          </Typography>
          <TextField
            fullWidth
            label="Reason for suspension"
            multiline
            rows={3}
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuspendDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleSuspendAgency}
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Suspend'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Admin Credentials Dialog */}
      <Dialog 
        open={credentialsDialog} 
        onClose={() => setCredentialsDialog(false)} 
        maxWidth="sm" 
        fullWidth
        disableEscapeKeyDown
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'primary.main', color: 'white' }}>
          <KeyIcon />
          Admin Credentials Created
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {adminCredentials && (
            <Box>
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <WarningIcon sx={{ mt: 0.5 }} />
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Important Security Notice
                    </Typography>
                    <Typography variant="body2">
                      These credentials will only be shown once. Please copy and store them securely.
                      The admin user must change their password on first login.
                    </Typography>
                  </Box>
                </Box>
              </Alert>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  Agency Admin Login Credentials:
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Username:</Typography>
                        <IconButton 
                          size="small" 
                          onClick={() => handleCopyToClipboard(adminCredentials.username, 'Username')}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Typography variant="h6" fontFamily="monospace" color="primary">
                        {adminCredentials.username}
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Temporary Password:</Typography>
                        <IconButton 
                          size="small" 
                          onClick={() => handleCopyToClipboard(adminCredentials.password, 'Password')}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Typography variant="h6" fontFamily="monospace" color="error">
                        {adminCredentials.password}
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Email:</Typography>
                        <IconButton 
                          size="small" 
                          onClick={() => handleCopyToClipboard(adminCredentials.email, 'Email')}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Typography variant="body1">
                        {adminCredentials.email}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Button
                    variant="outlined"
                    startIcon={<CopyIcon />}
                    onClick={handleCopyAllCredentials}
                    size="large"
                  >
                    Copy All Credentials
                  </Button>
                </Box>
                
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    • The admin user will be prompted to change their password on first login<br/>
                    • Make sure to share these credentials securely with the agency administrator<br/>
                    • These credentials cannot be retrieved again after closing this dialog
                  </Typography>
                </Alert>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            variant="contained" 
            onClick={() => {
              setCredentialsDialog(false);
              setAdminCredentials(null);
            }}
            size="large"
          >
            I Have Saved The Credentials
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AgencyManagement;