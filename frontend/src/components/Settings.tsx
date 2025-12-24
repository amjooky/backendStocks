import React, { useState, useEffect } from 'react';
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
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  VisibilityOff as VisibilityOffIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  Backup as BackupIcon,
  RestoreFromTrash as RestoreIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import axios from '../config/api';
import settingsService from '../services/settingsService';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'manager' | 'cashier';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SystemSettings {
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  tax_rate: number;
  currency: string;
  low_stock_threshold: number;
  auto_reorder: boolean;
  receipt_footer: string;
  backup_frequency: string;
}

const Settings: React.FC = () => {
  const { refreshCurrency } = useCurrency();
  const [currentTab, setCurrentTab] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    company_name: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    tax_rate: 0,
    currency: 'USD',
    low_stock_threshold: 10,
    auto_reorder: false,
    receipt_footer: '',
    backup_frequency: 'daily'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog states
  const [userDialog, setUserDialog] = useState(false);
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [resetDialog, setResetDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form data
  const [userForm, setUserForm] = useState<Partial<User & { password: string }>>({});
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [resetConfirmText, setResetConfirmText] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchSystemSettings();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const response = await settingsService.getSystemSettings();
      // Map API fields to local interface
      // Convert tax rate from decimal to percentage for display
      setSystemSettings({
        company_name: response.company_name || '',
        company_address: response.address || '',
        company_phone: response.phone || '',
        company_email: response.email || '',
        tax_rate: (response.tax_rate || 0) * 100, // Convert from decimal to percentage
        currency: response.currency || 'USD',
        low_stock_threshold: 10,
        auto_reorder: false,
        receipt_footer: '',
        backup_frequency: 'daily'
      });
    } catch (error) {
      console.error('Failed to fetch system settings:', error);
    }
  };

  const handleSaveUser = async () => {
    setLoading(true);
    try {
      // Convert field names to match backend expectations
      const userData = {
        ...userForm,
        firstName: userForm.first_name,
        lastName: userForm.last_name
      };
      // Remove the old field names
      delete userData.first_name;
      delete userData.last_name;

      if (selectedUser) {
        await axios.put(`/api/users/${selectedUser.id}`, userData);
        setSuccess('User updated successfully');
      } else {
        await axios.post('/api/users', userData);
        setSuccess('User created successfully');
      }
      setUserDialog(false);
      resetUserForm();
      fetchUsers();
    } catch (error: any) {
      console.error('Error details:', error.response?.data);
      setError(error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await axios.delete(`/api/users/${id}`);
      setSuccess('User deleted successfully');
      fetchUsers();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleToggleUserActive = async (user: User) => {
    try {
      await axios.patch(`/api/users/${user.id}/toggle`);
      setSuccess(`User ${!user.is_active ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Map local interface to API fields
      const apiSettings = {
        company_name: systemSettings.company_name,
        address: systemSettings.company_address,
        phone: systemSettings.company_phone,
        email: systemSettings.company_email,
        tax_rate: systemSettings.tax_rate / 100, // Convert percentage to decimal
        currency: systemSettings.currency
      };

      await settingsService.updateSystemSettings(apiSettings);

      // Also update tax settings to keep them in sync
      await settingsService.updateTaxSettings({
        default_tax_rate: systemSettings.tax_rate / 100
      });

      setSuccess('System settings updated successfully');

      // Clear cache to force refresh in POS
      settingsService.clearCache();

      // Refresh currency in all components
      await refreshCurrency();
    } catch (error: any) {
      setError(error.response?.data?.message || error.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await axios.put('/api/auth/change-password', {
        currentPassword: passwordForm.current_password,
        newPassword: passwordForm.new_password
      });
      setSuccess('Password changed successfully');
      setPasswordDialog(false);
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleBackupData = async () => {
    try {
      const response = await axios.get('/api/settings/backup', {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup_${new Date().toISOString().split('T')[0]}.db`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setSuccess('Database backup downloaded successfully');
    } catch (error: any) {
      setError('Failed to create backup');
    }
  };

  const handleResetDatabase = async () => {
    if (resetConfirmText !== 'RESET') {
      setError('Please type RESET to confirm');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/admin/reset-database', {
        confirmReset: 'YES_RESET_ALL_DATA'
      });
      setSuccess('System database has been reset successfully. You will be logged out.');
      setResetDialog(false);
      setResetConfirmText('');

      // Logout after major reset
      setTimeout(() => {
        window.location.href = '/login';
        localStorage.clear();
      }, 3000);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to reset database');
    } finally {
      setLoading(false);
    }
  };

  const openUserDialog = (user?: User) => {
    setSelectedUser(user || null);
    setUserForm(user ? { ...user } : { role: 'cashier', is_active: true });
    setUserDialog(true);
  };

  const resetUserForm = () => {
    setUserForm({ role: 'cashier', is_active: true });
    setSelectedUser(null);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'manager': return 'warning';
      case 'cashier': return 'info';
      default: return 'default';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <AdminIcon />;
      case 'manager': return <SecurityIcon />;
      case 'cashier': return <PersonIcon />;
      default: return <PersonIcon />;
    }
  };

  const renderUsersTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6">User Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => openUserDialog()}
        >
          Add User
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {getRoleIcon(user.role)}
                    <Box sx={{ ml: 2 }}>
                      <Typography variant="subtitle2">
                        {user.first_name} {user.last_name}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip
                    label={user.role.toUpperCase()}
                    color={getRoleColor(user.role) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.is_active ? 'Active' : 'Inactive'}
                    color={user.is_active ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => openUserDialog(user)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleToggleUserActive(user)}>
                    <Switch checked={user.is_active} size="small" />
                  </IconButton>
                  <IconButton onClick={() => handleDeleteUser(user.id)}>
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

  const renderSystemSettingsTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        System Configuration
      </Typography>

      <Grid container spacing={3}>
        {/* Company Information */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Company Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Company Name"
                    value={systemSettings.company_name}
                    onChange={(e) => setSystemSettings({
                      ...systemSettings,
                      company_name: e.target.value
                    })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Company Email"
                    value={systemSettings.company_email}
                    onChange={(e) => setSystemSettings({
                      ...systemSettings,
                      company_email: e.target.value
                    })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Company Address"
                    multiline
                    rows={2}
                    value={systemSettings.company_address}
                    onChange={(e) => setSystemSettings({
                      ...systemSettings,
                      company_address: e.target.value
                    })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Company Phone"
                    value={systemSettings.company_phone}
                    onChange={(e) => setSystemSettings({
                      ...systemSettings,
                      company_phone: e.target.value
                    })}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Business Settings */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Business Settings
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Tax Rate (%)"
                    type="number"
                    inputProps={{ min: 0, max: 100, step: 0.01 }}
                    value={systemSettings.tax_rate}
                    onChange={(e) => setSystemSettings({
                      ...systemSettings,
                      tax_rate: Number(e.target.value)
                    })}
                    helperText="This tax rate will be applied in the POS system"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Currency</InputLabel>
                    <Select
                      value={systemSettings.currency}
                      onChange={(e) => setSystemSettings({
                        ...systemSettings,
                        currency: e.target.value
                      })}
                    >
                      <MenuItem value="USD">USD - US Dollar</MenuItem>
                      <MenuItem value="EUR">EUR - Euro</MenuItem>
                      <MenuItem value="GBP">GBP - British Pound</MenuItem>
                      <MenuItem value="CAD">CAD - Canadian Dollar</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Low Stock Threshold"
                    type="number"
                    value={systemSettings.low_stock_threshold}
                    onChange={(e) => setSystemSettings({
                      ...systemSettings,
                      low_stock_threshold: Number(e.target.value)
                    })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={systemSettings.auto_reorder}
                        onChange={(e) => setSystemSettings({
                          ...systemSettings,
                          auto_reorder: e.target.checked
                        })}
                      />
                    }
                    label="Enable Auto Reorder"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Receipt Footer Message"
                    multiline
                    rows={3}
                    value={systemSettings.receipt_footer}
                    onChange={(e) => setSystemSettings({
                      ...systemSettings,
                      receipt_footer: e.target.value
                    })}
                    placeholder="Thank you for your business!"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Save Button */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleSaveSettings}
              disabled={loading}
              size="large"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );

  const renderSecurityTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Security & Account
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Change Password
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Update your account password to keep your account secure.
              </Typography>
              <Button
                variant="contained"
                onClick={() => setPasswordDialog(true)}
                startIcon={<SecurityIcon />}
              >
                Change Password
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Data Management
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Backup your database to prevent data loss.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleBackupData}
                  startIcon={<BackupIcon />}
                >
                  Backup Database
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card sx={{ borderColor: 'error.main', borderWidth: 1, borderStyle: 'solid' }}>
            <CardContent>
              <Typography variant="h6" color="error" gutterBottom>
                Danger Zone
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Resetting the database will delete all sales, products, and user data. This action is irreversible.
              </Typography>
              <Button
                variant="outlined"
                color="error"
                onClick={() => setResetDialog(true)}
                startIcon={<RestoreIcon />}
              >
                Reset System Database
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Typography variant="h4" gutterBottom>
        Settings & Administration
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
          <Tab label="Users" />
          <Tab label="System Settings" />
          <Tab label="Security" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {currentTab === 0 && renderUsersTab()}
          {currentTab === 1 && renderSystemSettingsTab()}
          {currentTab === 2 && renderSecurityTab()}
        </Box>
      </Paper>

      {/* User Dialog */}
      <Dialog open={userDialog} onClose={() => setUserDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedUser ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="First Name"
                value={userForm.first_name || ''}
                onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={userForm.last_name || ''}
                onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Username"
                value={userForm.username || ''}
                onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={userForm.email || ''}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={userForm.role || 'cashier'}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                >
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="manager">Manager</MenuItem>
                  <MenuItem value="cashier">Cashier</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={userForm.is_active || false}
                    onChange={(e) => setUserForm({ ...userForm, is_active: e.target.checked })}
                  />
                }
                label="Active User"
              />
            </Grid>
            {!selectedUser && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={userForm.password || ''}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  InputProps={{
                    endAdornment: (
                      <IconButton onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <VisibilityOffIcon /> : <ViewIcon />}
                      </IconButton>
                    )
                  }}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveUser} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialog} onClose={() => setPasswordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Current Password"
                type="password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({
                  ...passwordForm,
                  current_password: e.target.value
                })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="New Password"
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({
                  ...passwordForm,
                  new_password: e.target.value
                })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Confirm New Password"
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({
                  ...passwordForm,
                  confirm_password: e.target.value
                })}
                error={passwordForm.new_password !== passwordForm.confirm_password && passwordForm.confirm_password !== ''}
                helperText={
                  passwordForm.new_password !== passwordForm.confirm_password && passwordForm.confirm_password !== ''
                    ? 'Passwords do not match'
                    : ''
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleChangePassword}
            disabled={loading || passwordForm.new_password !== passwordForm.confirm_password}
          >
            {loading ? 'Changing...' : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Database Dialog */}
      <Dialog open={resetDialog} onClose={() => setResetDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon /> Warning: Irreversible Action
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            You are about to reset the entire system database. This will:
          </Typography>
          <ul>
            <li>Delete ALL product records</li>
            <li>Delete ALL sales history</li>
            <li>Delete ALL customers and suppliers</li>
            <li>Delete ALL user accounts (except default admin)</li>
          </ul>
          <Typography variant="body1" sx={{ mt: 2, fontWeight: 'bold' }} color="error">
            THIS CANNOT BE UNDONE.
          </Typography>
          <TextField
            fullWidth
            label='Type "RESET" to confirm'
            placeholder="RESET"
            value={resetConfirmText}
            onChange={(e) => setResetConfirmText(e.target.value)}
            sx={{ mt: 3 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setResetDialog(false);
            setResetConfirmText('');
          }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleResetDatabase}
            disabled={loading || resetConfirmText !== 'RESET'}
          >
            {loading ? 'Resetting...' : 'YES, RESET DATABASE'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Settings;
