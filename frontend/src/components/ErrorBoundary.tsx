import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper, Alert, Collapse } from '@mui/material';
import { ExpandMore, ExpandLess, BugReport } from '@mui/icons-material';
import logger from '../services/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  expanded: boolean;
  errorId: string;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    expanded: false,
    errorId: ''
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.state.errorId || `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Log comprehensive error information
    logger.error('ERROR_BOUNDARY', `React error caught: ${error.message}`, {
      errorId,
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      // Additional context
      props: Object.keys(this.props).reduce((acc, key) => {
        if (key !== 'children') {
          acc[key] = this.props[key as keyof Props];
        }
        return acc;
      }, {} as Record<string, any>)
    });

    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleReload = () => {
    logger.userAction('ERROR_BOUNDARY_RELOAD', {
      errorId: this.state.errorId,
      error: this.state.error?.name
    });
    window.location.reload();
  };

  private handleGoHome = () => {
    logger.userAction('ERROR_BOUNDARY_GO_HOME', {
      errorId: this.state.errorId,
      error: this.state.error?.name
    });
    window.location.href = '/';
  };

  private handleToggleDetails = () => {
    this.setState(prev => ({ expanded: !prev.expanded }));
    logger.userAction('ERROR_BOUNDARY_TOGGLE_DETAILS', {
      errorId: this.state.errorId,
      expanded: !this.state.expanded
    });
  };

  private copyErrorInfo = () => {
    const errorInfo = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };

    navigator.clipboard.writeText(JSON.stringify(errorInfo, null, 2)).then(() => {
      logger.userAction('ERROR_BOUNDARY_COPY_INFO', {
        errorId: this.state.errorId
      });
      alert('Error information copied to clipboard');
    });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="100vh"
          p={3}
          bgcolor="background.default"
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 600,
              width: '100%',
              textAlign: 'center'
            }}
          >
            <BugReport 
              sx={{ 
                fontSize: 64, 
                color: 'error.main', 
                mb: 2 
              }} 
            />
            
            <Typography variant="h4" gutterBottom color="error">
              Oops! Something went wrong
            </Typography>
            
            <Typography variant="body1" paragraph color="text.secondary">
              An unexpected error occurred in the application. Our team has been notified 
              and is working on a fix.
            </Typography>

            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="subtitle2" gutterBottom>
                Error ID: {this.state.errorId}
              </Typography>
              <Typography variant="body2">
                {this.state.error?.message}
              </Typography>
            </Alert>

            <Box sx={{ mb: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={this.handleReload}
              >
                Reload Page
              </Button>
              
              <Button
                variant="outlined"
                onClick={this.handleGoHome}
              >
                Go to Dashboard
              </Button>
            </Box>

            <Button
              onClick={this.handleToggleDetails}
              startIcon={this.state.expanded ? <ExpandLess /> : <ExpandMore />}
              size="small"
            >
              {this.state.expanded ? 'Hide' : 'Show'} Technical Details
            </Button>

            <Collapse in={this.state.expanded}>
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Error Details:
                </Typography>
                <Typography variant="caption" component="pre" sx={{ 
                  whiteSpace: 'pre-wrap', 
                  fontSize: '0.75rem',
                  maxHeight: 200,
                  overflow: 'auto',
                  display: 'block',
                  textAlign: 'left'
                }}>
                  {this.state.error?.stack}
                </Typography>
                
                {this.state.errorInfo?.componentStack && (
                  <>
                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                      Component Stack:
                    </Typography>
                    <Typography variant="caption" component="pre" sx={{ 
                      whiteSpace: 'pre-wrap', 
                      fontSize: '0.75rem',
                      maxHeight: 200,
                      overflow: 'auto',
                      display: 'block',
                      textAlign: 'left'
                    }}>
                      {this.state.errorInfo.componentStack}
                    </Typography>
                  </>
                )}

                <Box sx={{ mt: 2 }}>
                  <Button
                    size="small"
                    onClick={this.copyErrorInfo}
                    variant="outlined"
                  >
                    Copy Error Info
                  </Button>
                </Box>
              </Box>
            </Collapse>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;