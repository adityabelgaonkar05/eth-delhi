import React, { useState, useEffect } from 'react';

const NgrokSetup = ({ onUrlSet }) => {
    const [ngrokUrl, setNgrokUrl] = useState('');
    const [isValidUrl, setIsValidUrl] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Check if URL is valid tunnel URL (ngrok or localtunnel)
        const isValid = ngrokUrl &&
            (ngrokUrl.includes('ngrok.io') ||
                ngrokUrl.includes('ngrok-free.app') ||
                ngrokUrl.includes('loca.lt')) &&
            ngrokUrl.startsWith('https://');
        setIsValidUrl(isValid);
    }, [ngrokUrl]);

    const handleUrlSubmit = async () => {
        if (!isValidUrl) return;

        setIsLoading(true);
        try {
            // Clean up the URL
            let cleanUrl = ngrokUrl.trim();
            if (cleanUrl.endsWith('/')) {
                cleanUrl = cleanUrl.slice(0, -1);
            }

            // Test the URL by making a health check
            const healthUrl = `${cleanUrl}/health`;
            const response = await fetch(healthUrl, {
                method: 'GET',
                mode: 'cors'
            });

            if (response.ok) {
                const healthData = await response.json();
                console.log('Health check passed:', healthData);

                // Store the URL in localStorage
                localStorage.setItem('cryptoverse_ngrok_url', cleanUrl);
                onUrlSet(cleanUrl);
            } else if (response.status === 511) {
                alert('Please visit the tunnel URL in your browser first to bypass the warning page, then try again.');
            } else {
                alert(`Could not connect to the backend (Status: ${response.status}). Please check if your server is running and the tunnel is active.`);
            }
        } catch (error) {
            console.error('Connection error:', error);
            if (error.message.includes('Failed to fetch')) {
                alert('Cannot reach the server. Please ensure:\n1. Your backend is running on port 3001\n2. Your tunnel is active\n3. If using localtunnel, visit the URL in your browser first');
            } else {
                alert('Error connecting to backend: ' + error.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Check if we already have a stored URL
    useEffect(() => {
        const storedUrl = localStorage.getItem('cryptoverse_ngrok_url');
        if (storedUrl) {
            setNgrokUrl(storedUrl);
        }
    }, []);

    return (
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
            <h2 className="text-2xl font-bold text-center mb-6">Setup Required</h2>

            <div className="mb-6">
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                                Self Protocol requires a public HTTPS endpoint. You need to set up ngrok to tunnel your local backend.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Step 1: Start your backend server</h3>
                        <div className="bg-gray-100 p-3 rounded font-mono text-sm">
                            cd backend<br />
                            npm start
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold mb-2">Step 2: Create a tunnel (choose one option)</h3>

                        <div className="space-y-3">
                            <div>
                                <h4 className="font-medium text-blue-600">Option A: Localtunnel (Easier)</h4>
                                <div className="bg-gray-100 p-3 rounded font-mono text-sm">
                                    npx localtunnel --port 3001
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                    Creates URL like: https://your-tunnel.loca.lt
                                </p>
                            </div>

                            <div>
                                <h4 className="font-medium text-green-600">Option B: Ngrok (More Reliable)</h4>
                                <div className="bg-gray-100 p-3 rounded font-mono text-sm">
                                    ngrok http 3001
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                    Creates URL like: https://abc123.ngrok.io
                                </p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold mb-2">Step 3: Enter your tunnel URL below</h3>
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={ngrokUrl}
                                onChange={(e) => setNgrokUrl(e.target.value)}
                                placeholder="https://your-tunnel.loca.lt or https://abc123.ngrok.io"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={handleUrlSubmit}
                                disabled={!isValidUrl || isLoading}
                                className={`px-4 py-2 rounded-md font-medium ${isValidUrl && !isLoading
                                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                {isLoading ? 'Testing...' : 'Connect'}
                            </button>
                        </div>
                        {ngrokUrl && !isValidUrl && (
                            <p className="text-red-500 text-sm mt-1">
                                Please enter a valid tunnel HTTPS URL (ngrok or localtunnel)
                            </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                            ⚠️ If using localtunnel, visit the URL in your browser first to bypass the warning page
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-blue-700">
                            <strong>Don't have ngrok?</strong> Install it with: <code>npm install -g ngrok</code>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NgrokSetup;