import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-gesture-handler';

import { AuthState, User } from './src/types';
import ApiService from './src/services/api';
import SocketService from './src/services/socket';
import AppNavigator from './src/navigation/AppNavigator';

const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
};

const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    token: null,
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Initialize app and restore session
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('Initializing app...');
      
      // Try to restore previous session
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      
      if (token && userData) {
        console.log('Found stored session, verifying...');
        const user = JSON.parse(userData);
        
        // Set token for API calls
        ApiService.setAuthToken(token);
        
        // Verify token is still valid
        const response = await ApiService.verifyAuth();
        
        if (!response.error && response.data) {
          console.log('Session restored successfully');
          setCurrentUser(response.data.user);
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            user: response.data.user,
            token: token,
          });
          
          // Connect to socket
          SocketService.connect(response.data.user._id, response.data.user.fullName);
          return;
        } else {
          console.log('Token invalid, clearing session');
          await clearStoredSession();
        }
      }
      
      // No valid session found
      console.log('No valid session found');
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        token: null,
      });
    } catch (error) {
      console.error('App initialization error:', error);
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        token: null,
      });
    }
  };

  const handleLogin = async (user: User, token: string) => {
    try {
      console.log('Login successful, storing session...');
      
      // Store session data
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
      
      // Set token for API calls
      ApiService.setAuthToken(token);
      
      // Update state
      setCurrentUser(user);
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        user: user,
        token: token,
      });
      
      // Connect to socket
      SocketService.connect(user._id, user.fullName);
      
      console.log('User logged in:', user.fullName);
    } catch (error) {
      console.error('Login storage error:', error);
      Alert.alert('Error', 'Failed to save login session');
    }
  };

  const handleLogout = async () => {
    try {
      console.log('Logging out user...');
      
      // Clear stored session
      await clearStoredSession();
      
      // Disconnect socket
      SocketService.disconnect();
      
      // Clear API token
      ApiService.clearAuthToken();
      
      // Update state
      setCurrentUser(null);
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        token: null,
      });
      
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const clearStoredSession = async () => {
    try {
      await AsyncStorage.multiRemove([STORAGE_KEYS.AUTH_TOKEN, STORAGE_KEYS.USER_DATA]);
      console.log('Stored session cleared');
    } catch (error) {
      console.error('Clear session error:', error);
    }
  };

  // Show loading screen during initialization
  if (authState.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <AppNavigator
        authState={authState}
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />
      <StatusBar style="light" backgroundColor="#007AFF" />
    </>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

export default App;
