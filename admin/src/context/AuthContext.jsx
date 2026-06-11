/**
 * Auth Context — manages JWT auth state, login/logout, role guards.
 * P6-02: JWT stored in localStorage (httpOnly cookie for production).
 */

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('amb_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('amb_access_token'));
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post('/admin/auth/login', { email, password });
      localStorage.setItem('amb_access_token', data.access_token);
      localStorage.setItem('amb_refresh_token', data.refresh_token);

      // Fetch user profile
      const profile = await api.get('/me');
      const userData = { ...profile.data, role: data.role };
      localStorage.setItem('amb_user', JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Login failed' };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('amb_access_token');
    localStorage.removeItem('amb_refresh_token');
    localStorage.removeItem('amb_user');
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout, isSuperAdmin, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
