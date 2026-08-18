import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// --- Aircraft API ---
export const aircraftAPI = {
  getTypes: () => api.get('/aircraft/types'),
  createType: (data) => api.post('/aircraft/types', data),
  getUnits: () => api.get('/aircraft/units'),
  createUnit: (data) => api.post('/aircraft/units', data),
  updateUnitStatus: (id, data) => api.patch(`/aircraft/units/${id}`, data),
  deleteUnit: (id) => api.delete(`/aircraft/units/${id}`),
};

// --- Airbase API ---
export const airbaseAPI = {
  getAll: () => api.get('/airbase/'),
  create: (data) => api.post('/airbase/', data),
  update: (id, data) => api.put(`/airbase/${id}`, data),
  delete: (id) => api.delete(`/airbase/${id}`),
};

// --- Scenarios API ---
export const scenarioAPI = {
  getAll: () => api.get('/scenarios/'),
  create: (data) => api.post('/scenarios/', data),
  delete: (id) => api.delete(`/scenarios/${id}`),
  runSimulation: (data) => api.post('/scenarios/run-simulation', data),
};

export default api;
