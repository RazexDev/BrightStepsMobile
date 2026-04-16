import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/axiosConfig';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for token when app opens
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        const storedToken = await AsyncStorage.getItem('token');
        if (storedUser && storedToken) {
          setUser(JSON.parse(storedUser));
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        }
      } catch (error) {
        console.error("Error loading auth data", error);
      }
      setIsLoading(false);
    };
    loadUser();
  }, []);

  const login = async (email, password) => {
    try {
      // Calls your existing Node.js backend!
      const response = await api.post('/auth/login', { email, password });
      const { user: userData, token } = response.data;
      
      setUser(userData);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await AsyncStorage.setItem('token', token);
      
      // Save biometric credentials securely
      await AsyncStorage.setItem('biometricToken', token);
      await AsyncStorage.setItem('biometricUser', JSON.stringify(userData));
    } catch (error) {
      throw error;
    }
  };
  const register = async (name, email, password, role) => {
    try {
      // Calls your existing Node.js POST /auth/register route
      const response = await api.post('/auth/register', { name, email, password, role });
      const { user: userData, token } = response.data;
      
      setUser(userData);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await AsyncStorage.setItem('token', token);
      
      // Save biometric credentials securely
      await AsyncStorage.setItem('biometricToken', token);
      await AsyncStorage.setItem('biometricUser', JSON.stringify(userData));
    } catch (error) {
      throw error;
    }
  };

  const updateUser = async (updatedUserData) => {
    setUser(updatedUserData);
    await AsyncStorage.setItem('user', JSON.stringify(updatedUserData));
  };

  const logout = async () => {
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('token');
    // CRITICAL: Do NOT remove biometricToken and biometricUser here!
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};