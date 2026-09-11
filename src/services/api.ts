import axios, { type AxiosError } from 'axios';
import { useAuthStore } from '../stores/auth';
import type { ValidationErrorResponse } from '../types';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ValidationErrorResponse>) => {
    if (error.response?.status === 401) {
      const auth = useAuthStore();
      auth.clearAuth();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export function isAxiosError(error: unknown): error is AxiosError<ValidationErrorResponse> {
  return axios.isAxiosError(error);
}
