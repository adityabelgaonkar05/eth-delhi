import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CheckAuth = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const verifyAndStoreToken = async () => {
            try {
                // Step 1: Get the token from verifytoken endpoint
                const tokenResponse = await fetch('http://localhost:3001/verifytoken', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                console.log('Token response:', tokenResponse);

                if (!tokenResponse.ok) {
                    console.error('Failed to get token:', tokenResponse.statusText);
                    // navigate('/auth');
                    return;
                }

                const tokenData = await tokenResponse.json();
                const userToken = tokenData.token;

                // Store the token in localStorage
                localStorage.setItem('token', userToken);
                console.log('Token stored:', userToken);

                // Step 2: Look up user in MongoDB using the token
                const userResponse = await fetch(`http://localhost:3001/api/auth/user/${userToken}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                console.log('User lookup response:', userResponse);

                if (!userResponse.ok) {
                    console.error('Failed to find user:', userResponse.statusText);
                    navigate('/auth');
                    return;
                }

                const userData = await userResponse.json();
                console.log('User data:', userData);

                if (userData.status !== 'success' || !userData.userData) {
                    console.error('Invalid user data response');
                    navigate('/auth');
                    return;
                }

                const user = userData.userData;

                // Step 3: Check if user has completed onboarding (has username)
                if (!user.username || user.username.trim() === '') {
                    console.log('User needs onboarding, redirecting...');
                    navigate('/onboarding');
                } else {
                    console.log('User onboarding complete, redirecting to game...');
                    navigate('/game');
                }

            } catch (error) {
                console.error('Error during auth check:', error);
                // Redirect to auth page if there's an error
                navigate('/auth');
            }
        };

        verifyAndStoreToken();
    }, [navigate]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
            <div className="text-center">
                {/* Big loader in the middle */}
                <div className="relative">
                    <div className="w-24 h-24 border-4 border-blue-200 border-t-white rounded-full animate-spin mx-auto mb-8"></div>
                    <div className="absolute inset-0 w-24 h-24 border-4 border-transparent border-t-purple-400 rounded-full animate-spin mx-auto" style={{ animationDuration: '0.75s' }}></div>
                </div>

                <h2 className="text-2xl font-bold text-white mb-4">
                    Verifying Authentication...
                </h2>

                <p className="text-blue-200 text-lg">
                    Please wait while we authenticate your session
                </p>

                {/* Additional visual elements for better UX */}
                <div className="mt-8 flex justify-center space-x-2">
                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
            </div>
        </div>
    );
};

export default CheckAuth;