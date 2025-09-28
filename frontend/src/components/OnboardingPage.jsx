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
            <div 
                className="flex flex-col items-center justify-center min-h-screen"
                style={{
                    fontFamily: "monospace",
                    backgroundImage: "url(/src/assets/bg-sections.png)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                }}
            >
                <div
                    className="animate-spin rounded-full h-12 w-12 border-b-2 mb-4"
                    style={{ borderColor: "#44ff44" }}
                ></div>
                <div
                    style={{
                        backgroundColor: "#2a1810",
                        border: "3px solid #8b4513",
                        borderRadius: "0",
                        boxShadow: "6px 6px 0px #1a0f08, inset 2px 2px 0px #d2b48c, inset -2px -2px 0px #654321",
                        padding: "25px",
                        imageRendering: "pixelated",
                        textShadow: "2px 2px 0px #1a0f08",
                        textAlign: "center",
                    }}
                >
                    <p 
                        className="text-xl font-bold uppercase tracking-wider"
                        style={{
                            fontFamily: "monospace",
                            color: "#d2b48c",
                            fontWeight: "bold",
                        }}
                    >
                        ⚙️ LOADING YOUR PROFILE...
                    </p>
                    <p 
                        className="mt-2 uppercase tracking-wider"
                        style={{
                            fontFamily: "monospace",
                            color: "#ffd700",
                            fontWeight: "bold",
                        }}
                    >
                        PLEASE WAIT WHILE WE PREPARE YOUR ONBOARDING
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div 
            className="min-h-screen py-8 px-6"
            style={{
                fontFamily: "monospace",
                backgroundImage: "url(/src/assets/bg-sections.png)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
            }}
        >
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div
                        style={{
                            backgroundColor: "#2a1810",
                            border: "3px solid #8b4513",
                            borderRadius: "0",
                            boxShadow: "6px 6px 0px #1a0f08, inset 2px 2px 0px #d2b48c, inset -2px -2px 0px #654321",
                            padding: "25px",
                            imageRendering: "pixelated",
                            textShadow: "2px 2px 0px #1a0f08",
                            textAlign: "center",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            position: "relative",
                        }}
                    >
                        {/* Medieval decorative border pattern */}
                        <div
                            style={{
                                position: "absolute",
                                top: "2px",
                                left: "2px",
                                right: "2px",
                                height: "2px",
                                background: "linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)",
                                imageRendering: "pixelated",
                            }}
                        />
                        <div
                            style={{
                                position: "absolute",
                                bottom: "2px",
                                left: "2px",
                                right: "2px",
                                height: "2px",
                                background: "linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)",
                                imageRendering: "pixelated",
                            }}
                        />

                        <div className="flex items-center justify-center gap-4 mb-3">
                            <span style={{ color: "#d2b48c", fontSize: "2rem" }}>🚀</span>
                            <h1
                                className="text-4xl font-bold uppercase tracking-wider"
                                style={{
                                    fontFamily: "monospace",
                                    textShadow: "3px 3px 0px #1a0f08",
                                    color: "#d2b48c",
                                    fontWeight: "bold",
                                }}
                            >
                                WELCOME TO CRYPTOVERSE
                            </h1>
                            <span style={{ color: "#d2b48c", fontSize: "2rem" }}>🚀</span>
                        </div>
                        <p
                            className="uppercase tracking-wider text-lg"
                            style={{
                                fontFamily: "monospace",
                                color: "#ffd700",
                                fontWeight: "bold",
                            }}
                        >
                            SET UP YOUR PROFILE TO BEGIN YOUR WEB3 JOURNEY
                        </p>
                        {user && (
                            <p 
                                className="text-sm mt-2 uppercase tracking-wider"
                                style={{
                                    fontFamily: "monospace",
                                    color: "#d2b48c",
                                    fontWeight: "bold",
                                }}
                            >
                                VERIFIED AS: {user.name} ({user.nationality})
                            </p>
                        )}
                    </div>
                </div>

                {/* Form */}
                <div
                    style={{
                        backgroundColor: "#2a1810",
                        border: "3px solid #8b4513",
                        borderRadius: "0",
                        boxShadow: "6px 6px 0px #1a0f08, inset 2px 2px 0px #d2b48c, inset -2px -2px 0px #654321",
                        padding: "25px",
                        imageRendering: "pixelated",
                        textShadow: "2px 2px 0px #1a0f08",
                        position: "relative",
                    }}
                >
                    {/* Medieval decorative border pattern */}
                    <div
                        style={{
                            position: "absolute",
                            top: "2px",
                            left: "2px",
                            right: "2px",
                            height: "2px",
                            background: "linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)",
                            imageRendering: "pixelated",
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            bottom: "2px",
                            left: "2px",
                            right: "2px",
                            height: "2px",
                            background: "linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)",
                            imageRendering: "pixelated",
                        }}
                    />

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Username Section */}
                        <div>
                            <label 
                                htmlFor="username" 
                                className="block text-lg font-bold mb-4 uppercase tracking-wider"
                                style={{
                                    fontFamily: "monospace",
                                    color: "#d2b48c",
                                    fontWeight: "bold",
                                }}
                            >
                                ⚔️ CHOOSE YOUR USERNAME
                            </label>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 font-bold uppercase tracking-wider"
                                style={{
                                    fontFamily: "monospace",
                                    backgroundColor: "#1a0f08",
                                    border: "2px solid #8b4513",
                                    borderRadius: "0",
                                    boxShadow: "3px 3px 0px #1a0f08",
                                    color: "#d2b48c",
                                    textShadow: "1px 1px 0px #1a0f08",
                                }}
                                placeholder="ENTER YOUR UNIQUE USERNAME"
                                disabled={isSubmitting}
                                maxLength={20}
                            />
                            <p 
                                className="text-sm mt-2 uppercase tracking-wider"
                                style={{
                                    fontFamily: "monospace",
                                    color: "#ffd700",
                                    fontWeight: "bold",
                                }}
                            >
                                THIS WILL BE YOUR DISPLAY NAME IN THE GAME (3-20 CHARACTERS)
                            </p>
                        </div>

                        {/* Tracks Selection */}
                        <div>
                            <label 
                                className="block text-lg font-bold mb-4 uppercase tracking-wider"
                                style={{
                                    fontFamily: "monospace",
                                    color: "#d2b48c",
                                    fontWeight: "bold",
                                }}
                            >
                                🛡️ SELECT YOUR WEB3 INTERESTS
                            </label>
                            <p 
                                className="text-sm mb-6 uppercase tracking-wider"
                                style={{
                                    fontFamily: "monospace",
                                    color: "#ffd700",
                                    fontWeight: "bold",
                                }}
                            >
                                CHOOSE THE BLOCKCHAIN ECOSYSTEMS, PROTOCOLS, AND WEB3 AREAS YOU'RE INTERESTED IN (SELECT AS MANY AS YOU LIKE):
                            </p>

                            <div 
                                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto p-4"
                                style={{
                                    backgroundColor: "#1a0f08",
                                    border: "2px solid #8b4513",
                                    borderRadius: "0",
                                    boxShadow: "3px 3px 0px #1a0f08",
                                }}
                            >
                                {availableTracks.map((track) => (
                                    <label
                                        key={track}
                                        className={`
                      flex items-center justify-center p-3 cursor-pointer transition-all font-bold uppercase tracking-wider
                      ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                                        style={{
                                            fontFamily: "monospace",
                                            backgroundColor: selectedTracks.includes(track) ? "#44ff44" : "#2a1810",
                                            border: "2px solid #8b4513",
                                            borderRadius: "0",
                                            boxShadow: selectedTracks.includes(track) ? "3px 3px 0px #1a0f08" : "1px 1px 0px #1a0f08",
                                            color: selectedTracks.includes(track) ? "#1a0f08" : "#d2b48c",
                                            textShadow: selectedTracks.includes(track) ? "1px 1px 0px #ffffff" : "1px 1px 0px #1a0f08",
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isSubmitting && !selectedTracks.includes(track)) {
                                                e.currentTarget.style.backgroundColor = "#654321";
                                                e.currentTarget.style.boxShadow = "2px 2px 0px #1a0f08";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isSubmitting && !selectedTracks.includes(track)) {
                                                e.currentTarget.style.backgroundColor = "#2a1810";
                                                e.currentTarget.style.boxShadow = "1px 1px 0px #1a0f08";
                                            }
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedTracks.includes(track)}
                                            onChange={() => handleTrackToggle(track)}
                                            className="sr-only"
                                            disabled={isSubmitting}
                                        />
                                        <span className="font-bold">{track}</span>
                                        {selectedTracks.includes(track) && (
                                            <span className="ml-2" style={{ color: "#1a0f08" }}>✓</span>
                                        )}
                                    </label>
                                ))}
                            </div>

                            {selectedTracks.length > 0 && (
                                <div className="mt-4 p-3"
                                    style={{
                                        backgroundColor: "#1a0f08",
                                        border: "2px solid #44ff44",
                                        borderRadius: "0",
                                        boxShadow: "3px 3px 0px #1a0f08",
                                    }}
                                >
                                    <p 
                                        className="text-sm uppercase tracking-wider text-center font-bold"
                                        style={{
                                            fontFamily: "monospace",
                                            color: "#44ff44",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        SELECTED: {selectedTracks.join(', ')}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Error Display */}
                        {error && (
                            <div 
                                className="px-4 py-3"
                                style={{
                                    backgroundColor: "#1a0f08",
                                    border: "2px solid #ff6b6b",
                                    borderRadius: "0",
                                    boxShadow: "3px 3px 0px #1a0f08",
                                }}
                            >
                                <p 
                                    className="text-center font-bold uppercase tracking-wider"
                                    style={{
                                        fontFamily: "monospace",
                                        color: "#ff6b6b",
                                        fontWeight: "bold",
                                    }}
                                >
                                    ⚠️ {error}
                                </p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting || !username.trim() || selectedTracks.length === 0}
                            className="w-full py-4 px-6 font-bold text-lg uppercase tracking-wider transition-all"
                            style={{
                                fontFamily: "monospace",
                                border: "2px solid #8b4513",
                                borderRadius: "0",
                                textShadow: "2px 2px 0px #1a0f08",
                                backgroundColor: isSubmitting || !username.trim() || selectedTracks.length === 0
                                    ? "#654321"
                                    : "#44ff44",
                                color: "#ffffff",
                                cursor: isSubmitting || !username.trim() || selectedTracks.length === 0
                                    ? "not-allowed"
                                    : "pointer",
                                boxShadow: "3px 3px 0px #1a0f08",
                            }}
                            onMouseEnter={(e) => {
                                if (!isSubmitting && username.trim() && selectedTracks.length > 0) {
                                    e.currentTarget.style.boxShadow = "6px 6px 0px #1a0f08";
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isSubmitting && username.trim() && selectedTracks.length > 0) {
                                    e.currentTarget.style.boxShadow = "3px 3px 0px #1a0f08";
                                    e.currentTarget.style.transform = "translateY(0px)";
                                }
                            }}
                        >
                            {isSubmitting ? '⚙️ SETTING UP YOUR PROFILE...' : 'COMPLETE SETUP & ENTER GAME'}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div 
                    className="mt-8 text-center"
                    style={{
                        backgroundColor: "#2a1810",
                        border: "3px solid #8b4513",
                        borderRadius: "0",
                        boxShadow: "6px 6px 0px #1a0f08, inset 2px 2px 0px #d2b48c, inset -2px -2px 0px #654321",
                        padding: "20px",
                        imageRendering: "pixelated",
                        textShadow: "2px 2px 0px #1a0f08",
                        position: "relative",
                    }}
                >
                    {/* Medieval decorative border pattern */}
                    <div
                        style={{
                            position: "absolute",
                            top: "2px",
                            left: "2px",
                            right: "2px",
                            height: "2px",
                            background: "linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)",
                            imageRendering: "pixelated",
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            bottom: "2px",
                            left: "2px",
                            right: "2px",
                            height: "2px",
                            background: "linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)",
                            imageRendering: "pixelated",
                        }}
                    />
                    <p 
                        className="text-sm uppercase tracking-wider"
                        style={{
                            fontFamily: "monospace",
                            color: "#ffd700",
                            fontWeight: "bold",
                        }}
                    >
                        YOU CAN UPDATE YOUR PREFERENCES LATER IN YOUR PROFILE SETTINGS
                    </p>
                </div>
            </div>
        </div>
    );
};

export default OnboardingPage;