import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_ENDPOINTS } from '../constants/ApiConfig';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshPromiseRef = useRef(null);

  const clearAuth = useCallback(async () => {
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('user');
  }, []);

  const refreshAccessToken = useCallback(async () => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    refreshPromiseRef.current = (async () => {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) throw new Error('Session expired');

      const response = await fetch(API_ENDPOINTS.REFRESH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) throw new Error('Session expired');

      const data = await response.json();
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      setToken(data.token);
      await SecureStore.setItemAsync('token', data.token);
      await SecureStore.setItemAsync('refreshToken', data.refreshToken);
      return data.token;
    })();

    try {
      return await refreshPromiseRef.current;
    } finally {
      refreshPromiseRef.current = null;
    }
  }, []);

  useEffect(() => {
    loadStorageData();
  }, []);

  const loadStorageData = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('token');
      const storedUser = await SecureStore.getItemAsync('user');
      const storedRefreshToken = await SecureStore.getItemAsync('refreshToken');
      
      if (storedToken && storedUser && storedRefreshToken) {
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
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw 'Network error or invalid server response';
      }

      if (!response.ok) {
        throw data.message || 'Login failed';
      }

      const { token, user } = data;
      
      // Set axios header synchronously BEFORE state updates trigger navigation
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      if (!deferStateUpdate) {
        setToken(token);
        setUser(user);
      }
      
      // Save to SecureStore
      await SecureStore.setItemAsync('token', token);
      await SecureStore.setItemAsync('refreshToken', data.refreshToken);
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      
      return { token, user };
    } catch (error) {
      throw typeof error === 'string' ? error : (error.message || 'Login failed');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (refreshToken) {
        await fetch(API_ENDPOINTS.LOGOUT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } finally {
      await clearAuth();
    }
  }, [clearAuth]);

  const authenticatedFetch = useCallback(async (url, options = {}) => {
    const request = async (accessToken) => fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${accessToken}` },
    });

    let response = await request(token);
    if (response.status !== 401) return response;
    const newToken = await refreshAccessToken();
    return request(newToken);
  }, [token, refreshAccessToken]);

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
          const originalRequest = error.config;
          if (originalRequest?._retry || originalRequest?.url === API_ENDPOINTS.REFRESH) {
            await clearAuth();
            return Promise.reject(error);
          }
          try {
            originalRequest._retry = true;
            const newToken = await refreshAccessToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axios(originalRequest);
          } catch (refreshError) {
            await clearAuth();
          }
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [clearAuth, refreshAccessToken]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, updateUserSession, setAuthData, authenticatedFetch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
