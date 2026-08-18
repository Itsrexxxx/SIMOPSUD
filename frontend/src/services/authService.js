import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE,
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
 * Handle responses and errors
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
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
};

/**
 * User Admin Service - Admin-only operations
 */
export const userAdminService = {
  /**
   * Get pending user registrations
   */
  getPendingUsers: async (skip = 0, limit = 100) => {
    try {
      const response = await apiClient.get('/users/pending', {
        params: { skip, limit },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch pending users' };
    }
  },

  /**
   * Get all users (admin only)
   */
  getAllUsers: async (skip = 0, limit = 100) => {
    try {
      const response = await apiClient.get('/users/all', {
        params: { skip, limit },
      });
      return response.data;
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
