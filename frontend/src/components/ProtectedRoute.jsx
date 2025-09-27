import React from 'react';
import { useAuth } from '../context/AuthContext';
import SelfAuthentication from './SelfAuthenticationFixed';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isLoading, user, userIdentifier, handleAuthSuccess, handleAuthError } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-900 to-purple-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white text-xl">Loading CryptoVerse...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-900 to-purple-900">
                <div className="w-full max-w-md">
                    <SelfAuthentication
                        userIdentifier={userIdentifier}
                        onAuthSuccess={handleAuthSuccess}
                        onAuthError={handleAuthError}
                    />
                </div>
            </div>
        );
    }

    // User is authenticated, show the protected content
    return (
        <div>
            {/* User info bar */}
            <div className="bg-black bg-opacity-50 text-white p-2 text-sm flex justify-between items-center">
                <div>
                    Welcome, {user.name} | Level: {user.gameData?.level || 1} | XP: {user.gameData?.experience || 0}
                </div>
                <div className="text-xs opacity-75">
                    Verified ✓ | {user.nationality || 'Unknown'}
                </div>
            </div>
            {children}
        </div>
    );
};

export default ProtectedRoute;