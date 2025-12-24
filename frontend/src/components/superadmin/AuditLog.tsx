import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  Pagination,
  Tooltip,
  CircularProgress,
  Button,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  Security as SecurityIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  DateRange as DateRangeIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import superadminService, { AuditLog as AuditLogType, AuditLogFilters, Agency } from '../../services/superadminService';

const AuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogType[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;
  
  // Filters
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 20,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogType | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  
  // Date filters
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchLogs();
    fetchAgencies();
  }, [page, filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const searchFilters = {
        ...filters,
        page,
        limit,
        start_date: startDate ? startDate.toISOString().split('T')[0] : undefined,
        end_date: endDate ? endDate.toISOString().split('T')[0] : undefined,
      };
      
      const response = await superadminService.getAuditLogs(searchFilters);
      setLogs(response.logs || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalCount(response.pagination?.total || 0);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgencies = async () => {
    try {
      const response = await superadminService.getAgencies({ limit: 1000 });
      setAgencies(response.agencies || []);
    } catch (err: any) {
      console.error('Failed to fetch agencies:', err);
    }
  };

  const handleFilterChange = (key: keyof AuditLogFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
    setPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({ page: 1, limit: 20 });
    setStartDate(null);
    setEndDate(null);
    setPage(1);
  };

  const openDetailDialog = (log: AuditLogType) => {
    setSelectedLog(log);
    setDetailDialog(true);
  };

  const getActionColor = (action: string): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('create')) return 'success';
    if (actionLower.includes('update') || actionLower.includes('edit')) return 'info';
    if (actionLower.includes('delete') || actionLower.includes('suspend')) return 'error';
    if (actionLower.includes('login') || actionLower.includes('auth')) return 'primary';
    if (actionLower.includes('lock') || actionLower.includes('unlock')) return 'warning';
    return 'default';
  };

  const getResourceTypeIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'agencies': return '🏢';
      case 'users': return '👤';
      case 'products': return '📦';
      case 'sales': return '💰';
      case 'auth': return '🔐';
      default: return '📋';
    }
  };

  const formatJsonData = (jsonString: string | null | undefined) => {
    if (!jsonString) return 'N/A';
    try {
      const data = JSON.parse(jsonString);
      return JSON.stringify(data, null, 2);
    } catch {
      return jsonString;
    }
  };

  const exportLogs = async () => {
    try {
      const allFilters = {
        ...filters,
        start_date: startDate ? startDate.toISOString().split('T')[0] : undefined,
        end_date: endDate ? endDate.toISOString().split('T')[0] : undefined,
        limit: 10000, // Export more records
      };
      
      const response = await superadminService.getAuditLogs(allFilters);
      const csvContent = convertToCSV(response.logs);
      downloadCSV(csvContent, `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err: any) {
      setError('Failed to export audit logs');
    }
  };

  const convertToCSV = (data: AuditLogType[]) => {
    const headers = ['Timestamp', 'User', 'Agency', 'Action', 'Resource', 'IP Address'];
    const rows = data.map(log => [
      new Date(log.timestamp).toLocaleString(),
      `${log.first_name || ''} ${log.last_name || ''} (${log.username || 'N/A'})`.trim(),
      log.agency_name || 'System',
      log.action,
      log.resource_type,
      log.ip_address || 'N/A'
    ]);
    
    return [headers, ...rows].map(row => 
      row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon color="primary" />
              Audit Log
            </Typography>
            <Typography variant="body1" color="text.secondary">
              System activity monitoring and security audit trail
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={exportLogs}
              disabled={loading}
            >
              Export CSV
            </Button>
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
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
                      Total Logs
                    </Typography>
                  </Box>
                  <SecurityIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7 }} />
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
                      {logs.filter(l => l.action.toLowerCase().includes('login')).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Login Activities
                    </Typography>
                  </Box>
                  <span style={{ fontSize: 40, opacity: 0.7 }}>🔐</span>
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
                      {logs.filter(l => l.action.toLowerCase().includes('create')).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Create Actions
                    </Typography>
                  </Box>
                  <span style={{ fontSize: 40, opacity: 0.7 }}>✨</span>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" color="error.main">
                      {logs.filter(l => l.action.toLowerCase().includes('delete') || l.action.toLowerCase().includes('suspend')).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Critical Actions
                    </Typography>
                  </Box>
                  <span style={{ fontSize: 40, opacity: 0.7 }}>⚠️</span>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Collapse in={showFilters}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Agency</InputLabel>
                  <Select
                    value={filters.agency_id || ''}
                    onChange={(e) => handleFilterChange('agency_id', e.target.value)}
                  >
                    <MenuItem value="">All Agencies</MenuItem>
                    {agencies.map(agency => (
                      <MenuItem key={agency.id} value={agency.id}>
                        {agency.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  label="Action"
                  value={filters.action || ''}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                  placeholder="e.g., login, create"
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Resource Type</InputLabel>
                  <Select
                    value={filters.resource_type || ''}
                    onChange={(e) => handleFilterChange('resource_type', e.target.value)}
                  >
                    <MenuItem value="">All Types</MenuItem>
                    <MenuItem value="agencies">Agencies</MenuItem>
                    <MenuItem value="users">Users</MenuItem>
                    <MenuItem value="products">Products</MenuItem>
                    <MenuItem value="sales">Sales</MenuItem>
                    <MenuItem value="auth">Authentication</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(date) => setStartDate(date)}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(date) => setEndDate(date)}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={fetchLogs}
                    size="small"
                  >
                    Apply
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={clearFilters}
                    size="small"
                  >
                    Clear
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Collapse>

        {/* Audit Log Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Agency</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Resource</TableCell>
                <TableCell>IP Address</TableCell>
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
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No audit logs found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(log.timestamp).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {log.first_name && log.last_name 
                            ? `${log.first_name} ${log.last_name}` 
                            : 'Unknown User'
                          }
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          @{log.username || 'N/A'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {log.agency_name || 'System'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.action}
                        color={getActionColor(log.action)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>{getResourceTypeIcon(log.resource_type)}</span>
                        <Typography variant="body2">
                          {log.resource_type}
                          {log.resource_id && (
                            <Typography variant="caption" color="text.secondary" component="span">
                              #{log.resource_id}
                            </Typography>
                          )}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {log.ip_address || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => openDetailDialog(log)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
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

        {/* Log Detail Dialog */}
        <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Audit Log Details</DialogTitle>
          <DialogContent>
            {selectedLog && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Timestamp</Typography>
                  <Typography variant="body1">{new Date(selectedLog.timestamp).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Action</Typography>
                  <Chip
                    label={selectedLog.action}
                    color={getActionColor(selectedLog.action)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">User</Typography>
                  <Typography variant="body1">
                    {selectedLog.first_name && selectedLog.last_name 
                      ? `${selectedLog.first_name} ${selectedLog.last_name} (@${selectedLog.username})` 
                      : `@${selectedLog.username || 'Unknown'}`
                    }
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Agency</Typography>
                  <Typography variant="body1">{selectedLog.agency_name || 'System'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Resource Type</Typography>
                  <Typography variant="body1">
                    {getResourceTypeIcon(selectedLog.resource_type)} {selectedLog.resource_type}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Resource ID</Typography>
                  <Typography variant="body1">{selectedLog.resource_id || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">IP Address</Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                    {selectedLog.ip_address || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">User Agent</Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                    {selectedLog.user_agent || 'N/A'}
                  </Typography>
                </Grid>
                
                {selectedLog.old_values && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>Old Values</Typography>
                    <Paper sx={{ p: 1, backgroundColor: 'background.default' }}>
                      <pre style={{ fontSize: '0.75rem', margin: 0, whiteSpace: 'pre-wrap' }}>
                        {formatJsonData(selectedLog.old_values)}
                      </pre>
                    </Paper>
                  </Grid>
                )}
                
                {selectedLog.new_values && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>New Values</Typography>
                    <Paper sx={{ p: 1, backgroundColor: 'background.default' }}>
                      <pre style={{ fontSize: '0.75rem', margin: 0, whiteSpace: 'pre-wrap' }}>
                        {formatJsonData(selectedLog.new_values)}
                      </pre>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
};

export default AuditLog;