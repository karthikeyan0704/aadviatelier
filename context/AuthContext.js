import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_ENDPOINTS } from '../constants/ApiConfig';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStorageData();
  }, []);

  const loadStorageData = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('token');
      const storedUser = await SecureStore.getItemAsync('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
    } catch (e) {
      console.error('Failed to load storage', e);
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(async (credentials, deferStateUpdate = false) => {
    try {
      const response = await axios.post(API_ENDPOINTS.LOGIN, credentials);
      const { token, user } = response.data;
      
      // Set axios header synchronously BEFORE state updates trigger navigation
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      if (!deferStateUpdate) {
        setToken(token);
        setUser(user);
      }
      
      // Save to SecureStore
      await SecureStore.setItemAsync('token', token);
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      
      return { token, user };
    } catch (error) {
      throw error.response?.data?.message || 'Login failed';
    }
  }, []);

  const logout = useCallback(async () => {
    // Clear axios header synchronously
    delete axios.defaults.headers.common['Authorization'];
    
    setToken(null);
    setUser(null);
    
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
  }, []);

  const updateUserSession = useCallback(async (updatedUser) => {
    setUser(updatedUser);
    await SecureStore.setItemAsync('user', JSON.stringify(updatedUser));
  }, []);

  const setAuthData = useCallback((newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
  }, []);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response && error.response.status === 401) {
          await logout();
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, updateUserSession, setAuthData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
