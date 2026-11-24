import axios from 'axios';

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

if (!isLocalhost) {
  const rawApiUrl = import.meta.env.VITE_API_URL || 'https://gms-api.gms-website.workers.dev';
  const API_ORIGIN = rawApiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');

  // 1. Set default baseURL for all direct axios.get('/api/...') / axios.post('/api/...') calls
  axios.defaults.baseURL = API_ORIGIN;

  // 2. Ensure custom axios.create({ baseURL: '/api' }) instances (e.g. Quotation.jsx) also target API_ORIGIN
  const originalCreate = axios.create.bind(axios);
  axios.create = (config = {}) => {
    const updatedConfig = { ...config };
    if (typeof updatedConfig.baseURL === 'string' && updatedConfig.baseURL.startsWith('/api')) {
      updatedConfig.baseURL = `${API_ORIGIN}${updatedConfig.baseURL}`;
    } else if (!updatedConfig.baseURL) {
      updatedConfig.baseURL = API_ORIGIN;
    }
    return originalCreate(updatedConfig);
  };

  // 3. Rewrite relative fetch('/api/...') calls (e.g. Ledger.jsx) to API_ORIGIN
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      if (typeof input === 'string' && input.startsWith('/api')) {
        return originalFetch(`${API_ORIGIN}${input}`, init);
      }
      if (input instanceof Request && input.url.startsWith(`${window.location.origin}/api`)) {
        const rewrittenUrl = input.url.replace(window.location.origin, API_ORIGIN);
        return originalFetch(new Request(rewrittenUrl, input), init);
      }
      return originalFetch(input, init);
    };
  }
}
