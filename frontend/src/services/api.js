import axios from 'axios';

const BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('settleup_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Implement in-memory caching for GET requests
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const originalGet = api.get;
api.get = async (url, config) => {
  const key = url;
  if (cache.has(key)) {
    const { data, timestamp } = cache.get(key);
    if (Date.now() - timestamp < CACHE_DURATION) {
      return Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config, request: {} });
    }
  }
  
  const response = await originalGet.call(api, url, config);
  cache.set(key, { data: response.data, timestamp: Date.now() });
  return response;
};

// Invalidate cache on mutations
const clearCache = () => cache.clear();

const methodsToInvalidate = ['post', 'put', 'patch', 'delete'];
methodsToInvalidate.forEach((method) => {
  const originalMethod = api[method];
  api[method] = async (...args) => {
    clearCache();
    return originalMethod.apply(api, args);
  };
});

export default api;