/**
 * Axios API Client — P5-03
 * JWT interceptor: attach access token, auto-refresh on 401, logout on failure.
 * Base URL from .env (REACT_APP_API_URL or __DEV__ fallback).
 */
import { Platform } from 'react-native';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { store } from '../store';
import { logout, setTokens } from '../store/slices/authSlice';

// Use Render deployment endpoint in production; local host routing for dev.
const LOCAL_API_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
const BASE_URL = __DEV__
  ? `${LOCAL_API_HOST}/api/v1`
  : 'https://raja1-glbd.onrender.com/api/v1';
// const BASE_URL = "http://192.168.1.38:8000/api/v1"

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = store.getState().auth;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue: { resolve: Function; reject: Function }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  res => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(token => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    const { refreshToken } = store.getState().auth;
    if (!refreshToken) {
      store.dispatch(logout());
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post(`${BASE_URL}/auth/token/refresh`, {
        refresh_token: refreshToken,
      });
      store.dispatch(setTokens({ accessToken: data.access_token, refreshToken: data.refresh_token }));
      processQueue(null, data.access_token);
      original.headers.Authorization = `Bearer ${data.access_token}`;
      return api(original);
    } catch (err) {
      processQueue(err);
      store.dispatch(logout());
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
