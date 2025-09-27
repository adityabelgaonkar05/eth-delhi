import { useEffect, useState } from 'react';
import { SelfAppBuilder } from '@selfxyz/qrcode';

// Import the components separately to avoid import issues
let SelfQRcodeWrapper;
let countries;

try {
    const selfModule = await import('@selfxyz/qrcode');
    SelfQRcodeWrapper = selfModule.SelfQRcodeWrapper;
    countries = selfModule.countries;
} catch (error) {
    console.error('Failed to import Self modules:', error);
}

const SelfAuthentication = ({ onAuthSuccess, onAuthError, userIdentifier }) => {
    const [selfApp, setSelfApp] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tunnelUrl, setTunnelUrl] = useState('');
    const [showTunnelSetup, setShowTunnelSetup] = useState(false);

    useEffect(() => {
        const initializeSelfApp = async () => {
            try {
                // Check if user is already verified
                if (userIdentifier) {
                    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
                    const response = await fetch(`${apiUrl}/api/auth/status/${userIdentifier}`);
                    const statusData = await response.json();

                    if (statusData.isVerified) {
                        onAuthSuccess(statusData.userData);
                        return;
                    }
                }

                // Check if we have a tunnel URL configured
                const configuredEndpoint = import.meta.env.VITE_SELF_ENDPOINT;
                if (!configuredEndpoint || configuredEndpoint.includes('localhost')) {
                    setShowTunnelSetup(true);
                    setIsLoading(false);
                    return;
                }

                // Generate a user identifier if not provided
                const userId = userIdentifier || `0x${Math.random().toString(16).substr(2, 40)}`;

                const app = new SelfAppBuilder({
                    version: 2,
                    appName: 'CryptoVerse Game',
                    scope: import.meta.env.VITE_SELF_SCOPE || 'cryptoverse-game',
                    endpoint: configuredEndpoint,
                    logoBase64: 'https://i.postimg.cc/mrmVf9hm/self.png',
                    userId,
                    endpointType: 'staging_celo', // Use staging for development
                    userIdType: 'hex',
                    userDefinedData: JSON.stringify({
                        action: 'game_access',
                        timestamp: Date.now(),
                        game: 'cryptoverse'
                    }),
                    disclosures: {
                        // Verification requirements
                        minimumAge: 16,
                        excludedCountries: [countries.NORTH_KOREA, countries.IRAN, countries.SYRIA],

                        // Data to disclose
                        nationality: true,
                        gender: true,
                        name: true,
                    },
                }).build();

                setSelfApp(app);
                setIsLoading(false);
            } catch (err) {
                console.error('Failed to initialize Self app:', err);
                if (err.message.includes('localhost endpoints are not allowed')) {
                    setShowTunnelSetup(true);
                } else {
                    setError('Failed to initialize authentication: ' + err.message);
                }
                setIsLoading(false);
            }
        };

        initializeSelfApp();
    }, [userIdentifier, onAuthSuccess]);

    const handleTunnelSubmit = async (e) => {
        e.preventDefault();
        if (!tunnelUrl) return;

        try {
            setIsLoading(true);

            // Validate the tunnel URL
            const response = await fetch(`${tunnelUrl}/api/auth/health`);
            if (!response.ok) {
                throw new Error('Cannot reach the backend through this URL');
            }

            // Update environment and reinitialize
            window.localStorage.setItem('VITE_SELF_ENDPOINT', `${tunnelUrl}/api/auth/verify`);
            window.location.reload(); // Reload to use new endpoint

        } catch (err) {
            setError(`Invalid tunnel URL: ${err.message}`);
            setIsLoading(false);
        }
    };

    const handleSuccessfulVerification = async () => {
        try {
            console.log('Self verification successful!');

            setTimeout(async () => {
                if (userIdentifier || selfApp?.userId) {
                    const userId = userIdentifier || selfApp.userId;
                    const endpoint = import.meta.env.VITE_SELF_ENDPOINT || window.localStorage.getItem('VITE_SELF_ENDPOINT');
                    const baseUrl = endpoint.replace('/api/auth/verify', '');
                    const response = await fetch(`${baseUrl}/api/auth/status/${userId}`);
                    const statusData = await response.json();

                    if (statusData.isVerified) {
                        onAuthSuccess(statusData.userData);
                    } else {
                        onAuthError('Verification completed but user not found in database');
                    }
                }
            }, 2000);

        } catch (error) {
            console.error('Post-verification error:', error);
            onAuthError('Verification completed but failed to fetch user data');
        }
    };

    const handleVerificationError = (error) => {
        console.error('Self verification failed:', error);
        onAuthError(`Verification failed: ${error.reason || 'Unknown error'}`);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-lg">Initializing Self Authentication...</p>
            </div>
        );
    }

    if (showTunnelSetup) {
        return (
            <div className="flex flex-col items-center justify-center p-8">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full">
                    <h2 className="text-2xl font-bold text-center mb-6">Setup Required</h2>
                    <div className="space-y-4 text-sm">
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                            <p className="font-semibold mb-2">🔧 Tunnel Setup Required</p>
                            <p>Self Protocol requires a public HTTPS endpoint. Your backend is running on localhost which isn't accessible.</p>
                        </div>

                        <div className="space-y-3">
                            <p className="font-semibold">Quick Setup Options:</p>

                            <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                <p className="font-medium">Option 1: Localtunnel (Recommended)</p>
                                <ol className="text-xs mt-2 space-y-1 ml-4 list-decimal">
                                    <li>Open a new terminal in the backend folder</li>
                                    <li>Run: <code className="bg-gray-100 px-1 rounded">npm install localtunnel</code></li>
                                    <li>Run: <code className="bg-gray-100 px-1 rounded">npm run tunnel:lt</code></li>
                                    <li>Copy the HTTPS URL and paste it below</li>
                                </ol>
                            </div>

                            <div className="bg-green-50 border border-green-200 rounded p-3">
                                <p className="font-medium">Option 2: Ngrok</p>
                                <ol className="text-xs mt-2 space-y-1 ml-4 list-decimal">
                                    <li>Install ngrok from <a href="https://ngrok.com" className="text-blue-600">ngrok.com</a></li>
                                    <li>Run: <code className="bg-gray-100 px-1 rounded">ngrok http 3001</code></li>
                                    <li>Copy the HTTPS URL and paste it below</li>
                                </ol>
                            </div>
                        </div>

                        <form onSubmit={handleTunnelSubmit} className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Enter your tunnel URL:
                                </label>
                                <input
                                    type="url"
                                    value={tunnelUrl}
                                    onChange={(e) => setTunnelUrl(e.target.value)}
                                    placeholder="https://your-tunnel-url.ngrok.io"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
                            >
                                Continue with this URL
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-8">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 max-w-md">
                    {error}
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center p-8">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
                <h2 className="text-2xl font-bold text-center mb-6">Verify Your Identity</h2>
                <p className="text-gray-600 text-center mb-6">
                    Scan the QR code with the Self app to verify your identity and access CryptoVerse Game.
                </p>

                {selfApp ? (
                    <div className="flex justify-center">
                        <SelfQRcodeWrapper
                            selfApp={selfApp}
                            onSuccess={handleSuccessfulVerification}
                            onError={handleVerificationError}
                            size={280}
                            darkMode={false}
                        />
                    </div>
                ) : (
                    <div className="flex justify-center">
                        <div className="animate-pulse bg-gray-200 h-70 w-70 rounded"></div>
                    </div>
                )}

                <div className="mt-6 text-sm text-gray-500 text-center">
                    <p>Requirements:</p>
                    <ul className="mt-2 space-y-1">
                        <li>• Must be 18 years or older</li>
                        <li>• Valid government-issued ID</li>
                        <li>• Not from restricted countries</li>
                    </ul>
                </div>

                <div className="mt-4 text-xs text-gray-400 text-center">
                    Don't have the Self app? Download it from your app store.
                </div>
            </div>
        </div>
    );
};

export default SelfAuthentication;