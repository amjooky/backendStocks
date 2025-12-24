import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import logger from '../services/logger';

// Extend the Axios config interface to include metadata
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: {
    startTime: number;
  };
}

// Interface for API error response
interface ApiErrorResponse {
  message: string;
  expired?: boolean;
}

// Create axios instance
// Prefer environment variable, but default to localhost for development
let baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Determine runtime environment and force local backend when appropriate
if (typeof window !== 'undefined') {
  const host = window.location.hostname;
  const isLocalhost = host === 'localhost' || host === '127.0.0.1';
  const isLAN = /^192\.168\./.test(host) || /^10\./.test(host);
  const forceLocal = process.env.REACT_APP_FORCE_LOCAL_BACKEND === 'true';

  if (forceLocal) {
    baseURL = 'http://localhost:5000';
    console.warn('🔗 Forcing local backend because FORCE_LOCAL is set');
  }
}

// Only switch to production backend if explicitly configured and not in a local/LAN context
if (baseURL.includes('your-backend-url')) {
  baseURL = 'https://backendstocks.onrender.com';
  console.error('🔧 FIXED: Detected placeholder URL, using configured Render URL');
}

// Debug logging for API config (only in development)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('🔧 API Configuration:');
  console.log('  REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
  console.log('  Final baseURL:', baseURL);
  
  // Also put it on the window for debugging
  (window as any).DEBUG_API_URL = baseURL;
}

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{resolve: Function, reject: Function}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config: ExtendedAxiosRequestConfig) => {
    const startTime = Date.now();
    config.metadata = { startTime };
    
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log API request
    logger.debug('API_REQUEST', `${config.method?.toUpperCase()} ${config.url}`, {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      hasToken: !!token,
      headers: config.headers,
      params: config.params,
      data: config.data ? JSON.stringify(config.data).substring(0, 500) : undefined
    });
    
    return config;
  },
  (error: AxiosError) => {
    logger.error('API_REQUEST', `Request interceptor error: ${error.message}`, {
      error: error.name,
      code: error.code,
      config: error.config
    });
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors and token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log successful API response
    const config = response.config as ExtendedAxiosRequestConfig;
    const duration = config.metadata?.startTime ? Date.now() - config.metadata.startTime : 0;
    
    logger.logAPI(
      config.method?.toUpperCase() || 'GET',
      config.url || '',
      response.status,
      duration,
      {
        responseSize: JSON.stringify(response.data).length,
        responseHeaders: response.headers,
        cached: response.headers['x-cache'] === 'HIT'
      }
    );
    
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as ExtendedAxiosRequestConfig & { _retry?: boolean };
    const duration = originalRequest?.metadata?.startTime ? Date.now() - originalRequest.metadata.startTime : 0;
    
    // Log API error
    logger.logAPI(
      originalRequest?.method?.toUpperCase() || 'UNKNOWN',
      originalRequest?.url || 'unknown',
      error.response?.status || 0,
      duration,
      {
        errorMessage: error.message,
        errorCode: error.code,
        responseData: error.response?.data,
        isTimeout: error.code === 'ECONNABORTED',
        isNetworkError: !error.response
      }
    );

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const errorData = error.response.data as ApiErrorResponse;
      
      // If token is expired, try to refresh it
      if (errorData?.expired && !isRefreshing) {
        isRefreshing = true;
        originalRequest._retry = true;
        
        try {
          const token = localStorage.getItem('token');
          if (token) {
            // Try to refresh token
            const response = await axios.post(`${api.defaults.baseURL}/api/auth/refresh-token`, {}, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            const newToken = response.data.token;
            localStorage.setItem('token', newToken);
            
            // Update the authorization header
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            
            processQueue(null, newToken);
            isRefreshing = false;
            
            // Retry the original request
            return api(originalRequest);
          }
        } catch (refreshError) {
          processQueue(refreshError, null);
          isRefreshing = false;
          
          // Refresh failed, redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else if (isRefreshing) {
        // If a refresh is in progress, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      } else {
        // Token is invalid, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
