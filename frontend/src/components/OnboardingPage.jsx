import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/SelfAuthContext';

const availableTracks = [
    'Ethereum',
    'Solana',
    'Polygon',
    'Bitcoin',
    'Cardano',
    'Avalanche',
    'Arbitrum',
    'Optimism',
    'Base',
    'Sui',
    'Aptos',
    'Near',
    'Cosmos',
    'Polkadot',
    'Chainlink',
    'Self Protocol',
    'Flow',
    'Starknet',
    'zkSync',
    'DeFi',
    'NFTs',
    'GameFi',
    'DAOs',
    'Web3 Social',
    'Privacy Tech',
    'Infrastructure',
    'Developer Tools',
    'Other'
];

const OnboardingPage = () => {
    const [username, setUsername] = useState('');
    const [selectedTracks, setSelectedTracks] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);
    const navigate = useNavigate();
    const { completeOnboarding } = useAuth();

    // Load user data on component mount
    useEffect(() => {
        const loadUserData = async () => {
            try {
                const token = localStorage.getItem('token');

                if (!token) {
                    console.error('No token found, redirecting to auth');
                    navigate('/auth');
                    return;
                }

                const response = await fetch(`http://localhost:3001/api/auth/user/${token}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'success' && data.userData) {
                        setUser(data.userData);

                        // If user already has username, redirect to game
                        if (data.userData.username && data.userData.username.trim() !== '') {
                            navigate('/game');
                            return;
                        }
                    } else {
                        console.error('Invalid user data response');
                        navigate('/auth');
                        return;
                    }
                } else {
                    console.error('Failed to load user data');
                    navigate('/auth');
                    return;
                }
            } catch (error) {
                console.error('Error loading user data:', error);
                navigate('/auth');
                return;
            } finally {
                setIsLoading(false);
            }
        };

        loadUserData();
    }, [navigate]);

    const handleTrackToggle = (track) => {
        setSelectedTracks(prev => {
            if (prev.includes(track)) {
                return prev.filter(t => t !== track);
            } else {
                return [...prev, track];
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!username.trim()) {
            setError('Username is required');
            return;
        }

        if (username.trim().length < 3) {
            setError('Username must be at least 3 characters long');
            return;
        }

        if (selectedTracks.length === 0) {
            setError('Please select at least one track');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            setError('Authentication token not found. Please try again.');
            return;
        }

        setIsSubmitting(true);

        try {
            // Call the new token-based onboarding API
            const response = await fetch('http://localhost:3001/api/auth/onboarding', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: token,
                    did: user.did,
                    username: username.trim(),
                    tracks: selectedTracks
                })
            });

            const data = await response.json();

            if (response.ok && data.status === 'success') {
                console.log('Onboarding completed successfully');
                // Redirect to game
                navigate('/game');
            } else {
                setError(data.message || 'Failed to complete onboarding');
            }
        } catch (error) {
            console.error('Onboarding error:', error);
            setError('Network error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Show loading state while fetching user data
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-blue-900 to-purple-900 flex items-center justify-center p-4">
                <div className="text-center text-white">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
                    <h2 className="text-2xl font-bold mb-2">Loading Your Profile...</h2>
                    <p className="text-blue-200">Please wait while we prepare your onboarding</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-900 to-purple-900 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white text-center">
                    <h1 className="text-3xl font-bold pixel-text mb-2">Welcome to CryptoVerse!</h1>
                    <p className="text-blue-100 normal-text">Let's set up your profile to get started</p>
                    {user && (
                        <p className="text-sm text-blue-200 mt-2">
                            Verified as: {user.name} ({user.nationality})
                        </p>
                    )}
                </div>

                {/* Form */}
                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Username Section */}
                        <div>
                            <label htmlFor="username" className="block text-lg font-semibold text-gray-700 mb-3 pixel-text">
                                Choose Your Username
                            </label>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg normal-text"
                                placeholder="Enter your unique username"
                                disabled={isSubmitting}
                                maxLength={20}
                            />
                            <p className="text-sm text-gray-500 mt-1 normal-text">
                                This will be your display name in the game (3-20 characters)
                            </p>
                        </div>

                        {/* Tracks Selection */}
                        <div>
                            <label className="block text-lg font-semibold text-gray-700 mb-3 pixel-text">
                                Select Your Web3 Interests
                            </label>
                            <p className="text-sm text-gray-600 mb-4 normal-text">
                                Choose the blockchain ecosystems, protocols, and Web3 areas you're interested in (select as many as you like):
                            </p>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto p-2 border rounded-lg bg-gray-50">
                                {availableTracks.map((track) => (
                                    <label
                                        key={track}
                                        className={`
                      flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all
                      ${selectedTracks.includes(track)
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-gray-300 bg-white hover:border-gray-400'
                                            }
                      ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedTracks.includes(track)}
                                            onChange={() => handleTrackToggle(track)}
                                            className="sr-only"
                                            disabled={isSubmitting}
                                        />
                                        <span className="font-medium normal-text">{track}</span>
                                        {selectedTracks.includes(track) && (
                                            <span className="ml-2 text-blue-500">✓</span>
                                        )}
                                    </label>
                                ))}
                            </div>

                            {selectedTracks.length > 0 && (
                                <p className="text-sm text-green-600 mt-2 normal-text">
                                    Selected: {selectedTracks.join(', ')}
                                </p>
                            )}
                        </div>

                        {/* Error Display */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg normal-text">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting || !username.trim() || selectedTracks.length === 0}
                            className={`
                w-full py-4 px-6 rounded-lg font-bold text-lg pixel-text transition-all
                ${isSubmitting || !username.trim() || selectedTracks.length === 0
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transform hover:scale-105'
                                }
              `}
                        >
                            {isSubmitting ? 'Setting Up Your Profile...' : 'Complete Setup & Enter Game'}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-8 py-4 text-center">
                    <p className="text-sm text-gray-500 normal-text">
                        You can update your preferences later in your profile settings
                    </p>
                </div>
            </div>
        </div>
    );
};

export default OnboardingPage;