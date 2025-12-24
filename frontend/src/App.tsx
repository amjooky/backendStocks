import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import POS from './components/POS';
import Products from './components/Products';
import Customers from './components/Customers';
import Promotions from './components/Promotions';
import Sales from './components/Sales';
import Reports from './components/Reports';
import Settings from './components/Settings';
import CaisseSession from './components/CaisseSession';
import Dashboard from './components/Dashboard';
import Analytics from './components/Analytics';
import LanguageSelector from './components/common/LanguageSelector';
import NotificationCenter from './components/NotificationCenter';

// SuperAdmin Components
import SuperAdminDashboard from './components/superadmin/SuperAdminDashboard';
import AgencyManagement from './components/superadmin/AgencyManagement';
import UserManagement from './components/superadmin/UserManagement';
import SystemAnalytics from './components/superadmin/SystemAnalytics';
import AuditLog from './components/superadmin/AuditLog';
import './i18n';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider, CssBaseline, createTheme, Card } from '@mui/material';
import { ThemeContext } from './contexts/ThemeContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import i18n from './i18n';
import logger from './services/logger';
import ErrorBoundary from './components/ErrorBoundary';
import { LogViewerFAB } from './components/LogViewer';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Divider,
  Chip,
  Paper,
  useTheme,
  alpha,
  CircularProgress,
  Snackbar,
  Alert,
  TextField,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  Menu,
  MenuItem,
  Breadcrumbs,
  Link,
  Collapse,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
  People as PeopleIcon,
  LocalOffer as OffersIcon,
  Receipt as ReceiptIcon,
  Assessment as ReportsIcon,
  Assessment as AssessmentIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  AccountBalanceWallet as CaisseIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Store as StoreIcon,
  MoveToInbox as StockIcon,
  Visibility,
  VisibilityOff,
  Search as SearchIcon,
  KeyboardArrowDown,
  Home as HomeIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';

// Types
interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'superadmin' | 'admin' | 'manager' | 'cashier';
  agency_id?: number;
  agency_name?: string;
}


// Login Component
const Login: React.FC<{ onLogin: (credentials: { email: string; password: string }) => Promise<boolean> }> = ({ onLogin }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email');
    if (savedEmail) setEmail(savedEmail);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email) {
      setError(t('login.emailRequired'));
      setLoading(false);
      return;
    }
    if (!password) {
      setError(t('login.passwordRequired'));
      setLoading(false);
      return;
    }

    try {
      const success = await onLogin({ email, password });
      if (success) {
        if (remember) {
          localStorage.setItem('remembered_email', email);
        } else {
          localStorage.removeItem('remembered_email');
        }
      }
    } catch (err) {
      setError(t('login.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: (theme) => `
        linear-gradient(135deg, 
          ${alpha(theme.palette.primary.main, 0.15)} 0%, 
          ${alpha(theme.palette.secondary.main || '#1976d2', 0.15)} 35%,
          ${alpha('#e3f2fd', 0.8)} 65%,
          ${alpha(theme.palette.primary.light || '#42a5f5', 0.12)} 100%
        ),
        radial-gradient(circle at 20% 80%, ${alpha('#2196f3', 0.1)} 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, ${alpha('#1976d2', 0.1)} 0%, transparent 50%)
      `,
      p: 2,
    }}>
      {/* Language Selector in top right corner */}
      <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
        <LanguageSelector />
      </Box>
      
      <Container maxWidth="sm">
        <Paper 
          elevation={12} 
          sx={{ 
            p: 4, 
            borderRadius: 4, 
            background: (theme) => `linear-gradient(145deg, 
              ${alpha(theme.palette.background.paper, 0.98)} 0%, 
              ${alpha(theme.palette.background.paper, 0.95)} 100%
            )`,
            backdropFilter: 'blur(20px)',
            border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Logo/Icon */}
            <Box sx={{ 
              p: 2, 
              borderRadius: '50%', 
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
              mb: 2,
              background: (theme) => `linear-gradient(135deg, 
                ${alpha(theme.palette.primary.main, 0.2)} 0%, 
                ${alpha(theme.palette.primary.light || theme.palette.primary.main, 0.1)} 100%
              )`
            }}>
              <Avatar sx={{ 
                width: 56, 
                height: 56, 
                bgcolor: 'primary.main',
                background: (theme) => `linear-gradient(135deg, 
                  ${theme.palette.primary.main} 0%, 
                  ${theme.palette.primary.dark || theme.palette.primary.main} 100%
                )`
              }}>
                <StoreIcon sx={{ fontSize: 30 }} />
              </Avatar>
            </Box>
            
            {/* App Title */}
            <Typography 
              component="h1" 
              variant="h4" 
              gutterBottom 
              sx={{ 
                fontWeight: 600,
                background: (theme) => `linear-gradient(45deg, 
                  ${theme.palette.primary.main} 30%, 
                  ${theme.palette.primary.dark || theme.palette.primary.main} 90%
                )`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                textAlign: 'center',
                mb: 1
              }}
            >
              {t('common.appTitle')}
            </Typography>
            
            {/* Login Title */}
            <Typography component="h2" variant="h5" gutterBottom sx={{ fontWeight: 500 }}>
              {t('login.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
              {t('login.subtitle')}
            </Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2, width: '100%' }}>
              <TextField
                fullWidth
                label="Username"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                autoComplete="username"
              />
              <TextField
                fullWidth
                label={t('login.password')}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                autoComplete="current-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                        onClick={() => setShowPassword((s) => !s)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                <FormControlLabel
                  control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} color="primary" />}
                  label={t('login.rememberMe')}
                />
                <Button size="small" variant="text">{t('login.forgotPassword')}</Button>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2, py: 1.2, fontWeight: 600 }}
                disabled={loading}
              >
                {loading ? t('login.loggingIn') : t('login.loginButton')}
              </Button>

              <Typography variant="caption" color="text.secondary" align="center" display="block">
                {t('login.defaultCredentials')}: admin / admin123
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};


// Enhanced Layout Component
const EnhancedLayout: React.FC<{ children: React.ReactNode; user: User | null; onLogout: () => void }> = ({ 
  children, 
  user, 
  onLogout 
}) => {
  // All hooks must be called at the top level
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<{[key: string]: boolean}>({});
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  // If user is null, don't render the layout
  if (!user) {
    return null;
  }
  
  const drawerWidth = 280;
  const miniDrawerWidth = 70;
  
  // Notifications are now handled by the NotificationCenter component
  
  const menuItems = [
    { 
      textKey: 'navigation.dashboard', 
      icon: <DashboardIcon />, 
      path: '/', 
      roles: ['superadmin', 'admin', 'manager', 'cashier'] 
    },
    // Superadmin-only items
    ...(user?.role === 'superadmin' ? [
      {
        textKey: 'System Management',
        icon: <SettingsIcon />,
        path: '/superadmin',
        roles: ['superadmin'],
        children: [
          { textKey: 'System Dashboard', icon: <DashboardIcon />, path: '/superadmin/dashboard', roles: ['superadmin'] },
          { textKey: 'Agencies', icon: <StoreIcon />, path: '/superadmin/agencies', roles: ['superadmin'] },
          { textKey: 'Users', icon: <PeopleIcon />, path: '/superadmin/users', roles: ['superadmin'] },
          { textKey: 'System Analytics', icon: <AnalyticsIcon />, path: '/superadmin/analytics', roles: ['superadmin'] },
          { textKey: 'Audit Log', icon: <AssessmentIcon />, path: '/superadmin/audit', roles: ['superadmin'] },
        ]
      }
    ] : []),
    { 
      textKey: 'navigation.sales', 
      icon: <ShoppingCartIcon />, 
      path: '/sales',
      roles: ['superadmin', 'admin', 'manager', 'cashier'],
      children: [
        { textKey: 'navigation.pos', icon: <ShoppingCartIcon />, path: '/pos', roles: ['superadmin', 'admin', 'manager', 'cashier'] },
        { textKey: 'navigation.caisseSession', icon: <CaisseIcon />, path: '/caisse', roles: ['superadmin', 'admin', 'manager', 'cashier'] },
        { textKey: 'navigation.sales', icon: <ReceiptIcon />, path: '/sales', roles: ['superadmin', 'admin', 'manager', 'cashier'] },
      ]
    },
    { 
      textKey: 'navigation.inventory', 
      icon: <InventoryIcon />, 
      path: '/inventory',
      roles: ['superadmin', 'admin', 'manager'],
      children: [
        { textKey: 'navigation.products', icon: <InventoryIcon />, path: '/products', roles: ['superadmin', 'admin', 'manager'] },
        { textKey: 'navigation.stockManagement', icon: <StockIcon />, path: '/stock', roles: ['superadmin', 'admin', 'manager'] },
      ]
    },
    { 
      textKey: 'navigation.customers', 
      icon: <PeopleIcon />, 
      path: '/customers', 
      roles: ['superadmin', 'admin', 'manager', 'cashier'] 
    },
    { 
      textKey: 'navigation.promotions', 
      icon: <OffersIcon />, 
      path: '/promotions', 
      roles: ['superadmin', 'admin', 'manager'] 
    },
    { 
      textKey: 'navigation.analytics', 
      icon: <AnalyticsIcon />, 
      path: '/analytics',
      roles: ['superadmin', 'admin', 'manager'],
      children: [
        { textKey: 'navigation.reports', icon: <ReportsIcon />, path: '/reports', roles: ['superadmin', 'admin', 'manager'] },
        { textKey: 'navigation.analytics', icon: <AnalyticsIcon />, path: '/analytics', roles: ['superadmin', 'admin', 'manager'] },
      ]
    },
    { 
      textKey: 'navigation.settings', 
      icon: <SettingsIcon />, 
      path: '/settings', 
      roles: ['superadmin', 'admin'] 
    },
  ];
  
  const handleMenuToggle = (key: string) => {
    setExpandedMenus(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  const isCurrentPath = (path: string) => location.pathname === path;
  
  const getBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ name: t('navigation.dashboard'), path: '/' }];
    
    let currentPath = '';
    pathSegments.forEach(segment => {
      currentPath += `/${segment}`;
      const menuItem = menuItems.find(item => item.path === currentPath) || 
                      menuItems.flatMap(item => item.children || []).find(child => child.path === currentPath);
      if (menuItem) {
        breadcrumbs.push({ name: t(menuItem.textKey), path: currentPath });
      }
    });
    
    return breadcrumbs;
  };
  
  const renderMenuItem = (item: any, isChild = false) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus[item.textKey];
    const isActive = isCurrentPath(item.path) || (hasChildren && item.children?.some((child: any) => isCurrentPath(child.path)));
    
    return (
      <React.Fragment key={item.textKey}>
        <ListItemButton
          onClick={() => {
            if (hasChildren) {
              handleMenuToggle(item.textKey);
            } else {
              navigate(item.path);
              if (!drawerOpen) setDrawerOpen(false);
            }
          }}
          sx={{
            minHeight: 48,
            px: 2.5,
            pl: isChild ? 4 : 2.5,
            mb: 0.5,
            mx: 1,
            borderRadius: 2,
            backgroundColor: isActive ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
            border: isActive ? `1px solid ${alpha(theme.palette.primary.main, 0.2)}` : '1px solid transparent',
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            },
            transition: 'all 0.2s ease-in-out',
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 0,
              mr: drawerOpen ? 2 : 'auto',
              justifyContent: 'center',
              color: isActive ? 'primary.main' : 'text.secondary',
            }}
          >
            {item.icon}
          </ListItemIcon>
          <ListItemText
            primary={t(item.textKey)}
            sx={{
              opacity: drawerOpen ? 1 : 0,
              '& .MuiTypography-root': {
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'primary.main' : 'text.primary',
              }
            }}
          />
          {hasChildren && drawerOpen && (
            isExpanded ? <ExpandLess /> : <ExpandMore />
          )}
        </ListItemButton>
        
        {hasChildren && (
          <Collapse in={isExpanded && drawerOpen} timeout="auto">
            <List component="div" disablePadding>
              {item.children.filter((child: any) => child.roles.includes(user?.role || 'guest')).map((child: any) => 
                renderMenuItem(child, true)
              )}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };
  
  return (
    <Box sx={{ display: 'flex' }}>
      {/* Enhanced Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerOpen ? drawerWidth : miniDrawerWidth,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
          '& .MuiDrawer-paper': {
            width: drawerOpen ? drawerWidth : miniDrawerWidth,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflowX: 'hidden',
            backgroundColor: alpha(theme.palette.background.paper, 0.98),
            backdropFilter: 'blur(20px)',
            borderRight: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
          },
        }}
      >
        {/* Logo Section */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: drawerOpen ? 'space-between' : 'center',
            px: drawerOpen ? 2 : 1,
            py: 2,
            minHeight: 64,
          }}
        >
          {drawerOpen && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ 
                  bgcolor: 'primary.main', 
                  width: 40, 
                  height: 40,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
                }}>
                  <StoreIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight="bold" color="primary.main">
                    StockPro
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Management Suite
                  </Typography>
                </Box>
              </Box>
            </motion.div>
          )}
          <IconButton 
            onClick={() => setDrawerOpen(!drawerOpen)}
            sx={{ 
              color: 'text.secondary',
              '&:hover': { color: 'primary.main' }
            }}
          >
            {drawerOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </Box>
        
        <Divider sx={{ mx: 1 }} />
        
        {/* Navigation Menu */}
        <List sx={{ px: 0, py: 2, flexGrow: 1 }}>
          {menuItems
            .filter(item => item.roles.includes(user?.role || 'guest'))
            .map(item => renderMenuItem(item))
          }
        </List>
        
        {/* User Profile Section */}
        <Box sx={{ p: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.12)}` }}>
          {drawerOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2,
                p: 1.5,
                borderRadius: 2,
                background: alpha(theme.palette.primary.main, 0.05),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
              }}>
                <Avatar sx={{ 
                  width: 36, 
                  height: 36, 
                  bgcolor: 'primary.main',
                  fontSize: '0.9rem'
                }}>
                  {user?.first_name?.[0] || 'U'}{user?.last_name?.[0] || 'S'}
                </Avatar>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap>
                    {user?.first_name || 'User'} {user?.last_name || 'Name'}
                  </Typography>
                  <Chip 
                    label={user?.role?.toUpperCase() || 'USER'} 
                    size="small" 
                    variant="outlined"
                    sx={{ 
                      height: 20, 
                      fontSize: '0.7rem',
                      borderColor: 'primary.main',
                      color: 'primary.main'
                    }} 
                  />
                </Box>
              </Box>
            </motion.div>
          )}
        </Box>
      </Drawer>
      
      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Enhanced Top Bar */}
        <AppBar 
          position="sticky" 
          elevation={0}
          sx={{ 
            backgroundColor: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(20px)',
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
            color: 'text.primary'
          }}
        >
          <Toolbar sx={{ gap: 2 }}>
            {/* Breadcrumbs */}
            <Box sx={{ flexGrow: 1 }}>
              <Breadcrumbs>
                {getBreadcrumbs().map((crumb, index) => (
                  <Link
                    key={crumb.path}
                    color={index === getBreadcrumbs().length - 1 ? 'primary.main' : 'text.secondary'}
                    href={crumb.path}
                    underline="hover"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(crumb.path);
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      fontWeight: index === getBreadcrumbs().length - 1 ? 600 : 400,
                    }}
                  >
                    {index === 0 && <HomeIcon sx={{ fontSize: 16 }} />}
                    {crumb.name}
                  </Link>
                ))}
              </Breadcrumbs>
            </Box>
            
            {/* Search Bar */}
            <TextField
              size="small"
              placeholder={t('common.search')}
              sx={{
                minWidth: 300,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  backgroundColor: alpha(theme.palette.background.paper, 0.8),
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
            
            {/* Language Selector */}
            <LanguageSelector />
            
            {/* Notifications */}
            <NotificationCenter
              variant="icon"
              showBadge={true}
              onNotificationClick={(notification) => {
                // Handle notification click if needed
                console.log('Notification clicked:', notification);
              }}
            />
            
            {/* User Menu */}
            <IconButton 
              onClick={(e) => setUserMenuAnchor(e.currentTarget)}
              sx={{ p: 0 }}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                {user?.first_name?.[0] || 'U'}{user?.last_name?.[0] || 'S'}
              </Avatar>
              <KeyboardArrowDown sx={{ ml: 0.5, color: 'text.secondary' }} />
            </IconButton>
            
            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={() => setUserMenuAnchor(null)}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle1">{user?.first_name || 'User'} {user?.last_name || 'Name'}</Typography>
                <Typography variant="body2" color="text.secondary">{user?.email || 'user@example.com'}</Typography>
                <Chip label={user?.role?.toUpperCase() || 'USER'} size="small" sx={{ mt: 1 }} />
              </Box>
              <MenuItem onClick={() => navigate('/settings')}>
                <SettingsIcon sx={{ mr: 2 }} />
                {t('common.settings')}
              </MenuItem>
              <Divider />
              <MenuItem onClick={onLogout} sx={{ color: 'error.main' }}>
                <LogoutIcon sx={{ mr: 2 }} />
                {t('common.logout')}
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        
        {/* Page Content */}
        <Box sx={{ flexGrow: 1, p: 3 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </Box>
      </Box>
    </Box>
  );
};

// Main App Component
const App: React.FC = () => {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const navigate = useNavigate();
  const location = useLocation();
  const [previousLocation, setPreviousLocation] = useState<string | null>(null);
  
  // Navigation logging
  useEffect(() => {
    if (previousLocation && previousLocation !== location.pathname) {
      logger.logNavigation(previousLocation, location.pathname);
    }
    setPreviousLocation(location.pathname);
  }, [location.pathname, previousLocation]);
  
  const showNotification = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // Auto-login on app start
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      console.log('🔐 Initializing authentication...');
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      // If we have a stored user but no token, clear the user
      if (storedUser && !storedToken) {
        console.log('🔍 Found stored user but no token, clearing user data');
        localStorage.removeItem('user');
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }
      
      // If we have a stored user and token, try to validate
      if (storedToken) {
        console.log('🔑 Found stored token, validating...');
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/profile`, {
            headers: { 
              'Authorization': `Bearer ${storedToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            if (isMounted) {
              console.log('✅ Token valid, user authenticated:', userData.username || 'Unknown user');
              logger.info('AUTH', `Token validation successful for user: ${userData.username}`);
              logger.setUserId(userData.id || userData.username);
              
              // Update user data in local storage
              const userToStore = userData.user || userData;
              localStorage.setItem('user', JSON.stringify(userToStore));
              
              setUser(userToStore);
              setToken(storedToken);
            }
          } else {
            console.log('❌ Token validation failed with status:', response.status);
            logger.warn('AUTH', `Token validation failed with status: ${response.status}`);
            if (isMounted) {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              setToken(null);
              setUser(null);
            }
          }
        } catch (error) {
          console.error('❌ Auth initialization error:', error);
          if (isMounted) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      } else {
        console.log('🔓 No stored token found, user not authenticated');
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = async (credentials: { email: string; password: string }) => {
    try {
      console.log('Attempting login with credentials:', credentials.email);
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: credentials.email, 
          password: credentials.password 
        })
      });

      const data = await response.json();
      
      if (response.ok && data.token) {
        console.log('Login successful, token received');
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        
        logger.info('AUTH', `Login successful for user: ${credentials.email}`);
        logger.setUserId(data.user?.id || credentials.email);
        logger.userAction('LOGIN', { username: credentials.email, success: true });
        
        // Use a small timeout to ensure state updates before navigation
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 100);
        
        return true;
      } else {
        const errorMessage = data.message || 'Login failed. Please check your credentials.';
        console.error('Login failed:', errorMessage);
        logger.warn('AUTH', `Login failed for user: ${credentials.email}`, { 
          status: response.status, 
          error: errorMessage 
        });
        logger.userAction('LOGIN_FAILED', { username: credentials.email, error: errorMessage });
        showNotification(errorMessage, 'error');
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      showNotification(t('auth.loginError'), 'error');
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      logger.userAction('LOGOUT', { userId: user?.id || user?.username });
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      logger.clearUserId();
      logger.info('AUTH', 'User logged out successfully');
      showNotification(t('auth.logoutSuccess'), 'success');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      showNotification(t('auth.logoutError'), 'error');
    }
  };

  // Removed the redirect effect that was causing the refresh loop

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        sx={{
          background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
        }}
      >
        <Card sx={{ p: 4, textAlign: 'center', minWidth: 300 }}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Loading StockPro...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Initializing your management suite
          </Typography>
        </Card>
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <Box sx={{ minHeight: '100vh' }}>
        {/* Notification Snackbar */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnackbarOpen(false)}
            severity={snackbarSeverity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>

        {/* App Routes */}
        <AnimatePresence mode="wait">
          <Routes>
            {/* Public Route - Login */}
            <Route
              path="/login"
              element={
                token ? (
                  <Navigate to="/" replace />
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Login onLogin={handleLogin} />
                  </motion.div>
                )
              }
            />

            {/* Protected Routes */}
            <Route
              path="/*"
              element={
                token && user ? (
                  <EnhancedLayout user={user} onLogout={handleLogout}>
                    <Routes>
                      {/* Main Dashboard - choose based on user role */}
                      <Route
                        path="/"
                        element={
                          user?.role === 'superadmin' ? (
                            <SuperAdminDashboard />
                          ) : (
                            <Dashboard />
                          )
                        }
                      />
                      
                      {/* SuperAdmin Routes */}
                      {user?.role === 'superadmin' && (
                        <>
                          <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
                          <Route path="/superadmin/agencies" element={<AgencyManagement />} />
                          <Route path="/superadmin/users" element={<UserManagement />} />
                          <Route path="/superadmin/analytics" element={<SystemAnalytics />} />
                          <Route path="/superadmin/audit" element={<AuditLog />} />
                        </>
                      )}
                      
                      {/* Regular Agency Routes */}
                      <Route path="/products" element={<Products />} />
                      <Route path="/pos" element={<POS />} />
                      <Route path="/caisse" element={<CaisseSession />} />
                      <Route path="/sales" element={<Sales />} />
                      <Route path="/customers" element={<Customers />} />
                      <Route path="/promotions" element={<Promotions />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </EnhancedLayout>
                ) : (
                  <Navigate to="/login" state={{ from: location }} replace />
                )
              }
            />
          </Routes>
      </AnimatePresence>
      
      {/* Development Log Viewer */}
      <LogViewerFAB />
      
    </Box>
    </ErrorBoundary>
  );
};

// App Wrapper with Theme and Router
const AppWrapper: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  const theme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: '#1976d2',
        light: '#42a5f5',
        dark: '#1565c0',
        contrastText: '#fff',
      },
      secondary: {
        main: '#dc004e',
        light: '#ff5983',
        dark: '#9a0036',
        contrastText: '#fff',
      },
      success: {
        main: '#2e7d32',
        light: '#4caf50',
        dark: '#1b5e20',
      },
      warning: {
        main: '#ed6c02',
        light: '#ff9800',
        dark: '#e65100',
      },
      error: {
        main: '#d32f2f',
        light: '#f44336',
        dark: '#c62828',
      },
      background: {
        default: isDarkMode ? '#0a1929' : '#f5f5f5',
        paper: isDarkMode ? '#132f4c' : '#ffffff',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 700,
      },
      h2: {
        fontWeight: 600,
      },
      h3: {
        fontWeight: 600,
      },
      h4: {
        fontWeight: 600,
      },
      h5: {
        fontWeight: 600,
      },
      h6: {
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: isDarkMode 
              ? '0 4px 20px 0 rgba(0,0,0,0.3)' 
              : '0 4px 20px 0 rgba(0,0,0,0.1)',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            textTransform: 'none',
            fontWeight: 600,
            padding: '8px 24px',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
    },
  });

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', JSON.stringify(newMode));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <I18nextProvider i18n={i18n}>
        <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
          <CurrencyProvider>
            <App />
          </CurrencyProvider>
        </ThemeContext.Provider>
      </I18nextProvider>
    </ThemeProvider>
  );
};

export default AppWrapper;
