import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const API_URL = 'http://localhost:3001/api';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if business is logged in on app start
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('businessToken');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setBusiness(data.data.business);
      } else {
        localStorage.removeItem('businessToken');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('businessToken');
    } finally {
      setLoading(false);
    }
  };

  const signup = async (businessData) => {
    try {
      setError(null);
      setLoading(true);

      console.log('Sending signup request with data:', businessData);
      
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(businessData),
      });

      const data = await response.json();
      console.log('Signup response:', { status: response.status, data });

      if (response.ok) {
        localStorage.setItem('businessToken', data.token);
        setBusiness(data.data.business);
        return { success: true, business: data.data.business };
      } else {
        const errorMessage = data.message || data.errors?.join(', ') || 'Registration failed';
        console.error('Signup failed:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signin = async (email, password) => {
    try {
      setError(null);
      setLoading(true);

      const response = await fetch(`${API_URL}/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('businessToken', data.token);
        setBusiness(data.data.business);
        return { success: true, business: data.data.business };
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('businessToken');
      setBusiness(null);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      setError(null);
      const token = localStorage.getItem('businessToken');

      const response = await fetch(`${API_URL}/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (response.ok) {
        setBusiness(data.data.business);
        return { success: true, business: data.data.business };
      } else {
        throw new Error(data.message || 'Profile update failed');
      }
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  const updatePassword = async (passwordData) => {
    try {
      setError(null);
      const token = localStorage.getItem('businessToken');

      const response = await fetch(`${API_URL}/auth/password`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(passwordData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('businessToken', data.token);
        setBusiness(data.data.business);
        return { success: true, message: data.message };
      } else {
        throw new Error(data.message || 'Password update failed');
      }
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  const value = {
    business,
    loading,
    error,
    signup,
    signin,
    logout,
    updateProfile,
    updatePassword,
    checkAuth,
    isAuthenticated: !!business,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};