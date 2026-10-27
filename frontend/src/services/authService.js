import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 10000,
});

/**
 * Add authorization token to requests
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Handle responses and errors — sliding refresh: coba refresh sebelum paksa logout
 */
let _refreshing = null;
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry && !original.url?.endsWith('/auth/login') && !original.url?.endsWith('/auth/refresh')) {
      original._retry = true;
      const token = localStorage.getItem('token');
      if (token) {
        try {
          if (!_refreshing) _refreshing = apiClient.post('/auth/refresh').then((r) => r.data).finally(() => { _refreshing = null; });
          const data = await _refreshing;
          if (data?.access_token) {
            localStorage.setItem('token', data.access_token);
            if (data?.user) localStorage.setItem('user', JSON.stringify(data.user));
            original.headers.Authorization = `Bearer ${data.access_token}`;
            return apiClient(original);
          }
        } catch {}
      }
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Auth Service - Handles authentication API calls
 */
export const authService = {
  /**
   * Register new user
   */
  register: async (userData) => {
    try {
      const response = await apiClient.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Registration failed' };
    }
  },

  /**
   * Login user
   */
  login: async (username, password) => {
    try {
      const response = await apiClient.post('/auth/login', {
        username,
        password,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Login failed' };
    }
  },

  /**
   * Logout user
   */
  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  /**
   * Get current user profile
   */
  getCurrentUser: async () => {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch user' };
    }
  },

  /**
   * Refresh authentication token
   */
  refreshToken: async () => {
    try {
      const response = await apiClient.post('/auth/refresh');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Token refresh failed' };
    }
  },

  /**
   * Update user profile
   */
  updateProfile: async (userData) => {
    try {
      const response = await apiClient.put('/auth/profile', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Profile update failed' };
    }
  },

  /**
   * Change password
   */
  changePassword: async (oldPassword, newPassword) => {
    try {
      const response = await apiClient.put('/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Password change failed' };
    }
  },

  forgotPassword: async (usernameOrEmail) => {
    try {
      const response = await apiClient.post('/auth/forgot-password', { username_or_email: usernameOrEmail });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Password reset request failed' };
    }
  },

  resetPassword: async (token, newPassword) => {
    try {
      const response = await apiClient.post('/auth/reset-password', { token, new_password: newPassword });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Password reset failed' };
    }
  },
};

/**
 * User Admin Service - Admin-only operations
 */
export const userAdminService = {
  createUser: async (userData) => {
    try {
      const response = await apiClient.post('/users/', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create user' };
    }
  },
  /**
   * Get pending user registrations
   */
  getPendingUsers: async (params = {}) => {
    const skip = params.skip ?? 0;
    const limit = params.limit ?? 20;
    const q = params.q ?? undefined;
    try {
      const response = await apiClient.get('/users/pending', { params: { skip, limit, q } });
      const total = Number(response.headers?.['x-total-count'] ?? response.headers?.['X-Total-Count'] ?? 0);
      return { data: response.data, total, headers: response.headers };
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch pending users' };
    }
  },

  /**
   * Get all users (admin only) — supports {skip,limit,q} or legacy (skip,limit)
   */
  getAllUsers: async (...args) => {
    let params = {};
    if (args.length === 1 && typeof args[0] === 'object') params = args[0];
    else { params.skip = args[0] ?? 0; params.limit = args[1] ?? 20; if (args[2]) params.q = args[2]; }
    const { skip = 0, limit = 20, q } = params;
    try {
      const response = await apiClient.get('/users/all', { params: { skip, limit, q: q || undefined } });
      const total = Number(response.headers?.['x-total-count'] ?? response.headers?.['X-Total-Count'] ?? (Array.isArray(response.data) ? response.data.length : 0));
      // keep backward compat: if caller expects array, attach total as property
      const data = response.data;
      if (Array.isArray(data)) { data._total = total; data._headers = response.headers; }
      return response.headers?.['x-total-count'] ? { data, total, headers: response.headers } : data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch users' };
    }
  },

  /**
   * Approve user and assign role
   */
  approveUser: async (userId, roleData) => {
    try {
      const response = await apiClient.put(`/users/${userId}/approve-and-assign`, roleData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to approve user' };
    }
  },

  /**
   * Reject/delete user registration
   */
  rejectUser: async (userId) => {
    try {
      await apiClient.delete(`/users/${userId}/reject`);
      return { success: true };
    } catch (error) {
      throw error.response?.data || { message: 'Failed to reject user' };
    }
  },

  /**
   * Get pending users count and stats
   */
  getPendingStats: async () => {
    try {
      const response = await apiClient.get('/users/stats/pending-count');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch stats' };
    }
  },
};

export default apiClient;
