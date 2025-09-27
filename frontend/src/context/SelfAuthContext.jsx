import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const SelfAuthContext = createContext();

const API_URL = 'http://localhost:3001/api';

export const useAuth = () => {
  const context = useContext(SelfAuthContext);
  if (!context) {
    throw new Error('useAuth must be used within a SelfAuthProvider');
  }
  return context;
};

export const SelfAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Check authentication on app start
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken');

      // If no token, redirect to auth (except for landing page)
      if (!token) {
        setLoading(false);
        if (location.pathname !== '/' && location.pathname !== '/auth') {
          navigate('/auth');
        }
        return;
      }

      // Validate token with backend
      const response = await fetch(`${API_URL}/auth/user/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setUser(data.userData);
        } else {
          // Invalid token, clear and redirect
          localStorage.removeItem('authToken');
          if (location.pathname !== '/' && location.pathname !== '/auth') {
            navigate('/auth');
          }
        }
      } else {
        // Token validation failed, clear and redirect
        localStorage.removeItem('authToken');
        if (location.pathname !== '/' && location.pathname !== '/auth') {
          navigate('/auth');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('authToken');
      if (location.pathname !== '/' && location.pathname !== '/auth') {
        navigate('/auth');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelfVerificationSuccess = async (userIdentifier) => {
    try {
      setError(null);
      console.log('Self verification successful for:', userIdentifier);

      // store this in local storage for later use
      localStorage.setItem('self_user_identifier', userIdentifier);

      // settimeout for 1 second
      setTimeout(() => {
      }, 1000);

      console.log('Navigating to /check-auth');

      navigate('/check-auth');

      // Give backend time to process the verification
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check verification status to get user data and token
      const response = await fetch(`${API_URL}/auth/status/${userIdentifier}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.exists && data.isVerified) {
          // User exists and is verified, get full user data
          const userResponse = await fetch(`${API_URL}/auth/user/${data.token}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (userResponse.ok) {
            const userData = await userResponse.json();
            localStorage.setItem('authToken', data.token);
            setUser(userData.userData);

            // Check if user needs onboarding
            if (!userData.userData.onboardingCompleted) {
              navigate('/onboarding');
            } else {
              navigate('/game');
            }
          } else {
            setError('Failed to get user data after verification.');
          }
        } else {
          setError('Verification completed but user not found. Please try again.');
        }
      } else {
        setError('Failed to check verification status. Please try again.');
      }
    } catch (error) {
      console.error('Error handling Self verification:', error);
      setError('Failed to complete authentication. Please try again.');
    }
  };

  const handleSelfVerificationError = (error) => {
    console.error('Self verification error:', error);
    setError(typeof error === 'string' ? error : 'Verification failed. Please try again.');
  };

  const completeOnboarding = async (username, tracks) => {
    try {
      setError(null);

      if (!user) {
        throw new Error('No user found. Please complete Self verification first.');
      }

      const response = await fetch(`${API_URL}/auth/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIdentifier: user.userIdentifier,
          username,
          tracks
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        // Update user state with onboarding data
        setUser(data.userData);
        navigate('/game');
        return { success: true };
      } else {
        return { success: false, error: data.message || 'Onboarding failed' };
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    setError(null);
    navigate('/auth');
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    token: localStorage.getItem('authToken'),
    handleSelfVerificationSuccess,
    handleSelfVerificationError,
    completeOnboarding,
    logout,
    checkAuth,
  };

  return (
    <SelfAuthContext.Provider value={value}>
      {children}
    </SelfAuthContext.Provider>
  );
};