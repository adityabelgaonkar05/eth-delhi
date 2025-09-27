import { useEffect, useState } from 'react';
import { useAuth } from '../context/SelfAuthContext';

const SelfAuthentication = () => {
    const [selfApp, setSelfApp] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [SelfComponents, setSelfComponents] = useState(null);
    const { handleSelfVerificationSuccess, handleSelfVerificationError, error: authError } = useAuth();

    // Dynamically import Self components to avoid import issues
    useEffect(() => {
        const loadSelfComponents = async () => {
            try {
                const selfModule = await import('@selfxyz/qrcode');
                setSelfComponents({
                    SelfQRcodeWrapper: selfModule.SelfQRcodeWrapper,
                    SelfAppBuilder: selfModule.SelfAppBuilder,
                    countries: selfModule.countries
                });
            } catch (err) {
                console.error('Failed to load Self components:', err);
                setError('Failed to load Self Protocol components. Please refresh the page.');
                setIsLoading(false);
            }
        };

        loadSelfComponents();
    }, []);

    useEffect(() => {
        if (!SelfComponents) return;

        const initializeSelfApp = async () => {
            try {
                // Skip the pre-check since we want to always show the QR code for fresh verification

                // Get endpoint URL
                const storedNgrokUrl = localStorage.getItem('cryptoverse_ngrok_url');
                const configuredEndpoint = import.meta.env.VITE_SELF_ENDPOINT;

                let endpoint;
                if (storedNgrokUrl) {
                    endpoint = `${storedNgrokUrl}/api/auth/verify`;
                } else if (configuredEndpoint && !configuredEndpoint.includes('localhost')) {
                    endpoint = configuredEndpoint;
                } else {
                    setError('Please set up a tunnel URL first. Your backend needs to be accessible from the internet.');
                    setIsLoading(false);
                    return;
                }

                // Generate a proper Ethereum address format
                const randomHex = Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
                const userId = `0x${randomHex}`;

                console.log('Initializing Self app with endpoint:', endpoint);
                console.log('Using userId:', userId);
                console.log('UserId length:', userId.length);
                console.log('UserId format valid:', userId.startsWith('0x') && userId.length === 42);

                const app = new SelfComponents.SelfAppBuilder({
                    version: 2,
                    appName: 'CryptoVerse Game',
                    scope: import.meta.env.VITE_SELF_SCOPE || 'cryptoverse-game',
                    endpoint: endpoint,
                    logoBase64: 'https://i.postimg.cc/mrmVf9hm/self.png',
                    userId,
                    endpointType: 'https', // Use staging for development
                    userIdType: 'hex',
                    userDefinedData: JSON.stringify({
                        action: 'game_access',
                        timestamp: Date.now(),
                        game: 'cryptoverse'
                    }),
                    disclosures: {
                        // Verification requirements - be more lenient for testing
                        minimumAge: 16,
                        excludedCountries: [], // Start with no excluded countries for testing

                        // Data to disclose
                        nationality: true,
                        gender: true,
                        name: false, // Make name optional to avoid issues
                    },
                }).build();

                setSelfApp(app);
                setIsLoading(false);
            } catch (err) {
                console.error('Failed to initialize Self app:', err);
                setError('Failed to initialize authentication: ' + err.message);
                setIsLoading(false);
            }
        };

        initializeSelfApp();
    }, [SelfComponents]);

    const handleSuccessfulVerification = async () => {
        try {
            console.log('Self verification successful!');

            if (selfApp?.userId) {
                handleSelfVerificationSuccess(selfApp.userId);
            } else {
                handleSelfVerificationError('Verification succeeded but user ID not available');
            }
        } catch (error) {
            console.error('Post-verification error:', error);
            handleSelfVerificationError('Verification completed but failed to process');
        }
    };

    const handleVerificationError = (error) => {
        console.error('Self verification failed:', error);

        let errorMessage = 'Verification failed';

        if (error.status === 'proof_generation_failed') {
            if (error.reason && error.reason.includes('Invalid address')) {
                errorMessage = 'Address format error. Please refresh the page and try again.';
            } else {
                errorMessage = 'Proof generation failed. This can happen due to:\n' +
                    '• Document not supported in staging mode\n' +
                    '• Poor lighting or camera quality\n' +
                    '• Document not properly aligned\n' +
                    '• Invalid user address format\n' +
                    '\nPlease refresh the page and try again with better lighting.';
            }
        } else if (error.error_code === 'UNKNOWN_ERROR' && error.reason && error.reason.includes('Invalid address')) {
            errorMessage = 'User address format error detected. Please refresh the page to generate a new address.';
        } else if (error.reason) {
            errorMessage = `Verification failed: ${error.reason}`;
        }

        onAuthError(errorMessage);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-lg">Loading Self Authentication...</p>
                {!SelfComponents && (
                    <p className="text-sm text-gray-600 mt-2">Loading Self Protocol components...</p>
                )}
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

    if (!SelfComponents) {
        return (
            <div className="flex flex-col items-center justify-center p-8">
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
                    Failed to load Self Protocol components. Please refresh the page.
                </div>
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

                {selfApp && SelfComponents.SelfQRcodeWrapper ? (
                    <div className="flex justify-center">
                        <SelfComponents.SelfQRcodeWrapper
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
                        <li>• Good lighting for document scanning</li>
                    </ul>
                </div>

                <div className="mt-4 text-xs text-gray-400 text-center">
                    Don't have the Self app? Download it from your app store.
                </div>

                <div className="mt-4 text-xs text-blue-600 text-center">
                    <p>Having issues? Common solutions:</p>
                    <ul className="mt-1 space-y-1">
                        <li>• Ensure good lighting when scanning</li>
                        <li>• Try a different document type</li>
                        <li>• Make sure document is not expired</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default SelfAuthentication;