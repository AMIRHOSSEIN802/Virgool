import axios from 'axios';
import { API_BASE_URL } from './constants';

const TOKEN_STORAGE_KEY = 'virgool.access-token';

let accessToken: string | null = null;

// Restore a persisted session token (client only — SSR has no storage).
if (typeof window !== 'undefined') {
  try {
    accessToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    accessToken = null;
  }
}

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (typeof window !== 'undefined') {
    try {
      if (token) {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch {
      // storage unavailable — token stays in memory for this session only
    }
  }
};

export const getAccessToken = () => accessToken;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setAccessToken(null);
    }
    return Promise.reject(error);
  }
);

export default api;
