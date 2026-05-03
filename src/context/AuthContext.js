import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../api/axiosConfig";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        const storedToken = await AsyncStorage.getItem("token");

        if (storedUser && storedToken) {
          setUser(JSON.parse(storedUser));
          api.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
        }
      } catch (error) {
        console.error("Error loading auth data", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    const { user: userData, token } = response.data;

    setUser(userData);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;

    await AsyncStorage.setItem("user", JSON.stringify(userData));
    await AsyncStorage.setItem("token", token);
    await AsyncStorage.setItem("biometricToken", token);
    await AsyncStorage.setItem("biometricUser", JSON.stringify(userData));
  };

  const register = async (name, email, password, role, parentPin) => {
    const payload = { name, email, password, role };
    if (parentPin) payload.parentPin = parentPin;
    
    const response = await api.post("/auth/register", payload);

    const { user: userData, token } = response.data;

    setUser(userData);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;

    await AsyncStorage.setItem("user", JSON.stringify(userData));
    await AsyncStorage.setItem("token", token);
    await AsyncStorage.setItem("biometricToken", token);
    await AsyncStorage.setItem("biometricUser", JSON.stringify(userData));
  };

  const updateUser = async (updatedUserData) => {
    setUser(updatedUserData);
    await AsyncStorage.setItem("user", JSON.stringify(updatedUserData));
    await AsyncStorage.setItem("biometricUser", JSON.stringify(updatedUserData));
  };

  const logout = async () => {
    setUser(null);
    delete api.defaults.headers.common.Authorization;

    await AsyncStorage.removeItem("user");
    await AsyncStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, logout, register, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};