import { useEffect, useState } from 'react';
import { countries, SelfQRcodeWrapper } from '@selfxyz/qrcode';
import { SelfAppBuilder } from '@selfxyz/qrcode';
import NgrokSetup from './NgrokSetup';

const SelfAuthentication = ({ onAuthSuccess, onAuthError, userIdentifier }) => {
    const [selfApp, setSelfApp] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [ngrokUrl, setNgrokUrl] = useState(null);
    const [needsSetup, setNeedsSetup] = useState(false);

    useEffect(() => {
        const initializeSelfApp = async () => {
            try {
                // Check if we have a stored ngrok URL
                const storedNgrokUrl = localStorage.getItem('cryptoverse_ngrok_url');

                if (!storedNgrokUrl) {
                    setNeedsSetup(true);
                    setIsLoading(false);
                    return;
                }

                setNgrokUrl(storedNgrokUrl);

                // Check if user is already verified
                if (userIdentifier) {
                    const response = await fetch(`${storedNgrokUrl}/api/auth/status/${userIdentifier}`);
                    const statusData = await response.json();

                    if (statusData.isVerified) {
                        onAuthSuccess(statusData.userData);
                        return;
                    }
                }

                // Generate a user identifier if not provided
                const userId = userIdentifier || `0x${Math.random().toString(16).substr(2, 40)}`;

                const endpoint = `${storedNgrokUrl}/api/auth/verify`;

                const app = new SelfAppBuilder({
                    version: 2,
                    appName: 'CryptoVerse Game',
                    scope: import.meta.env.VITE_SELF_SCOPE || 'cryptoverse-game',
                    endpoint: endpoint,
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
                setError('Failed to initialize authentication');
                setIsLoading(false);
            }
        };

        initializeSelfApp();
    }, [userIdentifier, onAuthSuccess, ngrokUrl]);

    const handleSuccessfulVerification = async () => {
        try {
            console.log('Self verification successful!');

            // The backend verification endpoint will be called automatically by Self
            // We just need to check the user status after a short delay
            setTimeout(async () => {
                if (userIdentifier || selfApp?.userId) {
                    const userId = userIdentifier || selfApp.userId;
                    const response = await fetch(`${ngrokUrl}/api/auth/status/${userId}`);
                    const statusData = await response.json();

                    if (statusData.isVerified) {
                        onAuthSuccess(statusData.userData);
                    } else {
                        onAuthError('Verification completed but user not found in database');
                    }
                }
            }, 2000); // Give the backend time to process

        } catch (error) {
            console.error('Post-verification error:', error);
            onAuthError('Verification completed but failed to fetch user data');
        }
    };

    const handleVerificationError = (error) => {
        console.error('Self verification failed:', error);
        onAuthError(`Verification failed: ${error.reason || 'Unknown error'}`);
    };

    const handleNgrokUrlSet = (url) => {
        setNgrokUrl(url);
        setNeedsSetup(false);
        setIsLoading(true);
        // Reinitialize the Self app with the new URL
        window.location.reload();
    };

    if (needsSetup) {
        return <NgrokSetup onUrlSet={handleNgrokUrlSet} />;
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-lg">Initializing Self Authentication...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-8">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
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