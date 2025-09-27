import React from 'react';
import { useAuth } from '../context/SelfAuthContext';
import { useLocation } from 'react-router-dom';

const AuthGuard = ({ children }) => {
    const { user, loading, isAuthenticated } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-900 to-purple-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white text-xl pixel-text">Loading CryptoVerse...</p>
                </div>
            </div>
        );
    }

    // Allow access to landing page, auth page, and onboarding without full authentication
    const publicPaths = ['/', '/auth', '/onboarding'];
    const isPublicPath = publicPaths.includes(location.pathname);

    if (isPublicPath) {
        return children;
    }

    // For protected routes, require authentication
    if (!isAuthenticated) {
        // The AuthProvider will handle the redirect to /auth
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-900 to-purple-900">
                <div className="text-center">
                    <p className="text-white text-xl pixel-text">Redirecting to authentication...</p>
                </div>
            </div>
        );
    }

    // User is authenticated, show content with user info bar for game pages
    const showUserBar = !['/auth', '/onboarding'].includes(location.pathname);

    return (
        <div>
            {/* User info bar for authenticated pages */}
            {showUserBar && user && (
                <div className="bg-black bg-opacity-50 text-white p-2 text-sm flex justify-between items-center">
                    <div className="pixel-text">
                        Welcome, {user.username || user.name} | Level: {user.gameData?.level || 1} | XP: {user.gameData?.experience || 0}
                    </div>
                    <div className="text-xs opacity-75 normal-text flex items-center space-x-4">
                        <span>{user.isVerified ? '✓ Verified' : 'Unverified'}</span>
                        {user.tracks && user.tracks.length > 0 && (
                            <span>Tracks: {user.tracks.slice(0, 2).join(', ')}{user.tracks.length > 2 ? '...' : ''}</span>
                        )}
                    </div>
                </div>
            )}
            {children}
        </div>
    );
};

export default AuthGuard;