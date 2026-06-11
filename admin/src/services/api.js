/**
 * API Client — Axios instance with JWT interceptor.
 * 
 * P6-01: Auto-attach access token, auto-refresh on 401.
 * Base URL from environment variable.
 */

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Request interceptor — attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('amb_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('amb_refresh_token');
        if (!refreshToken) throw new Error('No refresh token');
        
        const { data } = await axios.post(`${API_BASE}/auth/token/refresh`, {
          refresh_token: refreshToken,
        });
        localStorage.setItem('amb_access_token', data.access_token);
        localStorage.setItem('amb_refresh_token', data.refresh_token);
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('amb_access_token');
        localStorage.removeItem('amb_refresh_token');
        localStorage.removeItem('amb_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
