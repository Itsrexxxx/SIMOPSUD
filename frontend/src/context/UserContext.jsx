import { createContext, useContext, useState, useEffect } from 'react';

/**
 * UserContext - Global state management for authenticated user
 * Provides user data, loading states, and auth functions
 */
const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user from localStorage on component mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      if (storedUser && token) {
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error('Failed to load user from storage:', err);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Login user - saves token and user data to localStorage
   */
  const login = (userData, token) => {
    try {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      setError(null);
    } catch (err) {
      console.error('Failed to save user data:', err);
      setError('Failed to save user data');
    }
  };

  /**
   * Logout user - clears user data and token
   */
  const logout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  };

  /**
   * Update user profile data
   */
  const updateUser = (userData) => {
    try {
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (err) {
      console.error('Failed to update user:', err);
      setError('Failed to update user data');
    }
  };

  /**
   * Check if user has specific role
   */
  const hasRole = (role) => {
    return user?.role === role || (role === 'Admin' && user?.role === 'Administrator') || (role === 'Operator' && user?.role === 'Analyst') || (role === 'Pimpinan' && user?.role === 'Executive');
  };

  /**
   * Check if user has one of multiple roles
   */
  const hasAnyRole = (roles) => {
    return roles.includes(user?.role);
  };

  /**
   * Check if user is approved
   */
  const isApproved = () => {
    return user?.is_approved === true;
  };

  /**
   * Get user's full name with rank
   */
  const getDisplayName = () => {
    return user?.full_name || 'User';
  };

  /**
   * Get user initials for avatar fallback
   */
  const getInitials = () => {
    if (!user?.full_name) return 'U';
    return user.full_name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    updateUser,
    hasRole,
    hasAnyRole,
    isApproved,
    getDisplayName,
    getInitials,
    isAuthenticated: !!user,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

/**
 * Hook to use UserContext
 */
export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
