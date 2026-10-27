import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

let _apiRefreshing = null;
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry && typeof window !== 'undefined') {
      const token = window.localStorage.getItem('token');
      if (token && original.url !== '/auth/refresh' && !original.url?.endsWith('/auth/login')) {
        original._retry = true;
        try {
          if (!_apiRefreshing) _apiRefreshing = api.post('/auth/refresh').then((r) => r.data).finally(() => { _apiRefreshing = null; });
          const data = await _apiRefreshing;
          if (data?.access_token) {
            window.localStorage.setItem('token', data.access_token);
            if (data?.user) window.localStorage.setItem('user', JSON.stringify(data.user));
            original.headers.Authorization = `Bearer ${data.access_token}`;
            return api(original);
          }
        } catch {}
      }
      window.localStorage.removeItem('token');
      window.localStorage.removeItem('user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// helper: ambil total dari header X-Total-Count bila ada, fallback panjang data
export function extractTotal(response, fallbackData = []) {
  const h = response?.headers?.['x-total-count'] ?? response?.headers?.['X-Total-Count'];
  if (h != null && h !== '') return Number(h);
  if (Array.isArray(fallbackData)) return fallbackData.length;
  if (Array.isArray(response?.data)) return response.data.length;
  return 0;
}

export const dashboardAPI = {
  getSummary: () => api.get('/dashboard/summary'),
};

export const situationalOverviewAPI = {
  getTracks: (params = {}) => api.get('/situational-overview/tracks', { params }),
};

export const aircraftAPI = {
  getTypes: (params = {}) => api.get('/aircraft/types/', { params }),
  createType: (data) => api.post('/aircraft/types/', data),
  updateType: (id, data) => api.patch(`/aircraft/types/${id}`, data),
  deleteType: (id) => api.delete(`/aircraft/types/${id}`),
  getUnits: (params = {}) => api.get('/aircraft/units/', { params }),
  getUnitStats: () => api.get('/aircraft/units/stats'),
  createUnit: (data) => api.post('/aircraft/units/', data),
  updateUnitStatus: (id, data) => api.patch(`/aircraft/units/${id}`, data),
  deleteUnit: (id) => api.delete(`/aircraft/units/${id}`),
};

export const airbaseAPI = {
  getAll: (params = {}) => api.get('/airbase/', { params }),
  getStats: () => api.get('/airbase/stats'),
  getById: (id) => api.get(`/airbase/${id}`),
  getAvturLogs: (id, params = {}) => api.get(`/airbase/${id}/avtur-logs`, { params }),
  refillAvtur: (id, liters) => api.post(`/airbase/${id}/avtur-refill`, { liters }),
  create: (data) => api.post('/airbase/', data),
  update: (id, data) => api.patch(`/airbase/${id}`, data),
  delete: (id) => api.delete(`/airbase/${id}`),
  readinessHistory: (id, params = {}) => api.get(`/airbase-data/${id}/readiness-history`, { params }),
  updateReadiness: (id, data) => api.post(`/airbase-data/${id}/readiness`, data),
  previewImport: (file) => { const data = new FormData(); data.append('file', file); return api.post('/airbase-data/import/preview', data); },
  commitImport: (batchId) => api.post(`/airbase-data/import/${batchId}/commit`),
  rollbackImport: (batchId) => api.post(`/airbase-data/import/${batchId}/rollback`),
};

export const flightMissionAPI = {
  predictETA: (data) => api.post('/flight-missions/predict-eta', data),
  create: (data) => api.post('/flight-missions/', data),
  getAll: (params = {}) => api.get('/flight-missions/', { params }),
  getById: (id) => api.get(`/flight-missions/${id}`),
  update: (id, data) => api.put(`/flight-missions/${id}`, data),
  updateStatus: (id, data) => api.patch(`/flight-missions/${id}/status`, data),
  approve: (id, data = {}) => api.post(`/flight-missions/${id}/approve`, data),
  delete: (id) => api.delete(`/flight-missions/${id}`),
};

export const weatherAPI = {
  getByBase: (baseId) => api.get(`/weather/${baseId}`),
};

export const auditAPI = {
  getAll: (params = {}) => api.get('/audit/', { params }),
  exportCsv: (params = {}) => api.get('/audit/export', { params, responseType: 'blob' }),
};

export default api;
