import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import UserOnboarding from '../components/UserOnboarding';

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
  const [showUserOnboarding, setShowUserOnboarding] = useState(false);
  const [pendingUserData, setPendingUserData] = useState(null);
  const [userToken, setUserToken] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Check authentication on app start
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken');

      // Business pages that don't need Self Protocol authentication
      const businessPages = ['/', '/auth', '/business', '/onboarding', '/workwithus', '/admin'];
      const isBusinessPage = businessPages.includes(location.pathname);

      // If no token, redirect to auth (except for business pages)
      if (!token) {
        setLoading(false);
        if (!isBusinessPage) {
          // navigate('/auth');
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
          if (!isBusinessPage) {
            navigate('/auth');
          }
        }
      } else {
        // Token validation failed, clear and redirect
        localStorage.removeItem('authToken');
        if (!isBusinessPage) {
          navigate('/auth');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('authToken');
      // Business pages that don't need Self Protocol authentication
      const businessPages = ['/', '/auth', '/business', '/onboarding', '/workwithus', '/admin'];
      const isBusinessPage = businessPages.includes(location.pathname);
      
      if (!isBusinessPage) {
        navigate('/auth');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelfVerificationSuccess = async (did) => {
    try {
      setError(null);
      console.log('Self verification successful for DID:', did);

      // Store DID for reference
      localStorage.setItem('self_user_did', did);

      // The DID here is just a completion signal from the frontend polling
      // The actual user data comes from the session polling response
      // This is called when session polling finds verification complete

      // No navigation here - the component handles the token and onboarding flow
      console.log('Verification success handled, token should be stored by component');

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
          did: user.did,
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

  const handleVerificationComplete = (sessionData) => {
    console.log('Verification complete with session data:', sessionData);

    // Store the token immediately
    localStorage.setItem('authToken', sessionData.token);
    setUserToken(sessionData.token);
    setPendingUserData(sessionData.userData);

    if (sessionData.needsOnboarding) {
      // Show step-by-step onboarding modal
      navigate('/onboarding');
      // setShowUserOnboarding(true);
    } else {
      // User already completed onboarding, set user and navigate to game
      setUser(sessionData.userData);
      navigate('/game');
    }
  };

  const handleOnboardingComplete = (completedUserData) => {
    console.log('Onboarding completed:', completedUserData);
    setUser(completedUserData);
    setShowUserOnboarding(false);
    setPendingUserData(null);
    setUserToken(null);
    navigate('/game');
  };

  const handleOnboardingClose = () => {
    setShowUserOnboarding(false);
    // Keep token and user data in case they want to complete onboarding later
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('self_user_did');
    setUser(null);
    setError(null);
    setShowUserOnboarding(false);
    setPendingUserData(null);
    setUserToken(null);
    navigate('/auth');
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    token: localStorage.getItem('authToken'),
    showUserOnboarding,
    pendingUserData,
    userToken,
    handleSelfVerificationSuccess,
    handleSelfVerificationError,
    handleVerificationComplete,
    handleOnboardingComplete,
    handleOnboardingClose,
    completeOnboarding,
    logout,
    checkAuth,
  };

  return (
    <SelfAuthContext.Provider value={value}>
      {children}
      {/* Step-by-step User Onboarding Modal */}
      {showUserOnboarding && (
        <UserOnboarding
          isOpen={showUserOnboarding}
          onClose={handleOnboardingClose}
          onComplete={handleOnboardingComplete}
          userToken={userToken}
          userData={pendingUserData}
        />
      )}
    </SelfAuthContext.Provider>
  );
};