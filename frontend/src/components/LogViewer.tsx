import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  TextField,
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
  Paper,
  IconButton,
  Collapse,
  Grid,
  Card,
  CardContent,
  Fab
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Download,
  Clear,
  Refresh,
  BugReport,
  Visibility
} from '@mui/icons-material';
import logger from '../services/logger';

interface LogViewerProps {
  open: boolean;
  onClose: () => void;
}

type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'USER_ACTION';

const LogViewer: React.FC<LogViewerProps> = ({ open, onClose }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState({
    level: '' as LogLevel | '',
    category: '',
    search: '',
    since: ''
  });
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    if (open) {
      loadLogs();
      loadStats();
    }
  }, [open]);

  useEffect(() => {
    applyFilters();
  }, [logs, filter]);

  const loadLogs = () => {
    const allLogs = logger.getLogs();
    setLogs(allLogs.reverse()); // Show newest first
  };

  const loadStats = () => {
    const logStats = logger.getLogStats();
    setStats(logStats);
  };

  const applyFilters = () => {
    let filtered = [...logs];

    if (filter.level) {
      filtered = filtered.filter(log => log.level === filter.level);
    }

    if (filter.category) {
      filtered = filtered.filter(log => 
        log.category.toLowerCase().includes(filter.category.toLowerCase())
      );
    }

    if (filter.search) {
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(filter.search.toLowerCase()) ||
        JSON.stringify(log.meta).toLowerCase().includes(filter.search.toLowerCase())
      );
    }

    if (filter.since) {
      const sinceDate = new Date(filter.since);
      filtered = filtered.filter(log => new Date(log.timestamp) >= sinceDate);
    }

    setFilteredLogs(filtered);
  };

  const handleToggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const handleExportLogs = () => {
    const logs = logger.exportLogs();
    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `app-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearLogs = () => {
    if (window.confirm('Are you sure you want to clear all logs?')) {
      logger.clearLogs();
      loadLogs();
      loadStats();
    }
  };

  const getLevelColor = (level: LogLevel): 'error' | 'warning' | 'info' | 'success' | 'default' => {
    switch (level) {
      case 'ERROR': return 'error';
      case 'WARN': return 'warning';
      case 'INFO': return 'info';
      case 'USER_ACTION': return 'success';
      default: return 'default';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const renderMetaData = (meta: any) => {
    if (!meta || typeof meta !== 'object') return null;
    
    return (
      <Box sx={{ mt: 1, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="caption" component="pre" sx={{ 
          whiteSpace: 'pre-wrap',
          fontSize: '0.75rem',
          maxHeight: 300,
          overflow: 'auto',
          display: 'block'
        }}>
          {JSON.stringify(meta, null, 2)}
        </Typography>
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <BugReport />
            <Typography variant="h6">Development Log Viewer</Typography>
          </Box>
          <Box>
            <IconButton onClick={loadLogs} title="Refresh">
              <Refresh />
            </IconButton>
            <IconButton onClick={handleExportLogs} title="Export Logs">
              <Download />
            </IconButton>
            <IconButton onClick={handleClearLogs} title="Clear Logs">
              <Clear />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary">
                  {stats.totalLogs || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Logs
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="error">
                  {stats.byLevel?.ERROR || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Errors
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="warning.main">
                  {stats.byLevel?.WARN || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Warnings
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="success.main">
                  {stats.byLevel?.USER_ACTION || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  User Actions
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Filters
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Level</InputLabel>
                <Select
                  value={filter.level}
                  label="Level"
                  onChange={(e) => setFilter(prev => ({ ...prev, level: e.target.value as LogLevel }))}
                >
                  <MenuItem value="">All Levels</MenuItem>
                  <MenuItem value="ERROR">Error</MenuItem>
                  <MenuItem value="WARN">Warning</MenuItem>
                  <MenuItem value="INFO">Info</MenuItem>
                  <MenuItem value="DEBUG">Debug</MenuItem>
                  <MenuItem value="USER_ACTION">User Action</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Category"
                value={filter.category}
                onChange={(e) => setFilter(prev => ({ ...prev, category: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Search"
                value={filter.search}
                onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="datetime-local"
                label="Since"
                value={filter.since}
                onChange={(e) => setFilter(prev => ({ ...prev, since: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Logs Table */}
        <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell width={50}></TableCell>
                <TableCell>Timestamp</TableCell>
                <TableCell>Level</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>User</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.map((log, index) => (
                <React.Fragment key={index}>
                  <TableRow hover>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleRow(index)}
                      >
                        {expandedRows.has(index) ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {formatTimestamp(log.timestamp)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.level}
                        color={getLevelColor(log.level)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {log.category}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ 
                        maxWidth: 300, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {log.message}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {log.userId || 'Anonymous'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ py: 0 }} colSpan={6}>
                      <Collapse in={expandedRows.has(index)} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2 }}>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" gutterBottom>
                                Details
                              </Typography>
                              <Typography variant="caption" component="div">
                                <strong>Session ID:</strong> {log.sessionId}
                              </Typography>
                              <Typography variant="caption" component="div">
                                <strong>URL:</strong> {log.url}
                              </Typography>
                              <Typography variant="caption" component="div" sx={{ 
                                maxWidth: '100%', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis' 
                              }}>
                                <strong>User Agent:</strong> {log.userAgent}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" gutterBottom>
                                Meta Data
                              </Typography>
                              {renderMetaData(log.meta)}
                            </Grid>
                          </Grid>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredLogs.length === 0 && (
          <Box textAlign="center" py={4}>
            <Typography variant="body2" color="text.secondary">
              No logs match the current filters
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// Development FAB to open log viewer
const LogViewerFAB: React.FC = () => {
  const [open, setOpen] = useState(false);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      <Fab
        color="secondary"
        size="small"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000
        }}
        onClick={() => setOpen(true)}
      >
        <Visibility />
      </Fab>
      <LogViewer open={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default LogViewer;
export { LogViewerFAB };