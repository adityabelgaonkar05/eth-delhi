                                                                                                                                                                                import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/SelfAuthContext';

const SelfAuthentication = () => {
    const [selfApp, setSelfApp] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [SelfComponents, setSelfComponents] = useState(null);
    const [isVerificationPending, setIsVerificationPending] = useState(false);
    const { handleSelfVerificationSuccess, handleSelfVerificationError, handleVerificationComplete, error: authError } = useAuth();
    const navigate = useNavigate();

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

                // Generate a session ID for this verification attempt
                const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                // Generate a proper Ethereum address format (required by Self Protocol)
                const randomHex = Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
                const userId = `0x${randomHex}`;

                console.log('Initializing Self app with endpoint:', endpoint);
                console.log('Using sessionId:', sessionId);
                console.log('Using userId:', userId);

                // Store session ID for polling
                localStorage.setItem('self_session_id', sessionId);

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
                        game: 'cryptoverse',
                        sessionId: sessionId
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
            console.log('Self verification successful! Redirecting to check-auth...');

            // Clean up session storage
            const sessionId = localStorage.getItem('self_session_id');
            if (sessionId) {
                localStorage.removeItem('self_session_id');
            }

            // Clear pending state
            setIsVerificationPending(false);

            // Always redirect to check-auth endpoint
            navigate('/check-auth');

        } catch (error) {
            console.error('Post-verification error:', error);
            // Even if there's an error, still redirect to check-auth
            navigate('/check-auth');
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
            <div 
                className="flex flex-col items-center justify-center min-h-screen py-8 px-6"
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
                        className="text-xl font-bold uppercase tracking-wider"
                        style={{
                            fontFamily: "monospace",
                            color: "#d2b48c",
                            fontWeight: "bold",
                        }}
                    >
                        ⚙️ LOADING SELF AUTHENTICATION...
                    </p>
                    {!SelfComponents && (
                        <p 
                            className="mt-2 uppercase tracking-wider"
                            style={{
                                fontFamily: "monospace",
                                color: "#ffd700",
                                fontWeight: "bold",
                            }}
                        >
                            LOADING SELF PROTOCOL COMPONENTS...
                        </p>
                    )}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div 
                className="flex flex-col items-center justify-center min-h-screen py-8 px-6"
                style={{
                    fontFamily: "monospace",
                    backgroundImage: "url(/src/assets/bg-sections.png)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                }}
            >
                <div
                    style={{
                        backgroundColor: "#2a1810",
                        border: "3px solid #ff6b6b",
                        borderRadius: "0",
                        boxShadow: "6px 6px 0px #1a0f08, inset 2px 2px 0px #ff6b6b, inset -2px -2px 0px #8b4513",
                        padding: "30px",
                        imageRendering: "pixelated",
                        textShadow: "2px 2px 0px #1a0f08",
                        textAlign: "center",
                        position: "relative",
                        maxWidth: "600px",
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
                            background: "linear-gradient(90deg, #ff6b6b 0%, #ffd700 50%, #ff6b6b 100%)",
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
                            background: "linear-gradient(90deg, #ff6b6b 0%, #ffd700 50%, #ff6b6b 100%)",
                            imageRendering: "pixelated",
                        }}
                    />
                    <h2
                        className="text-2xl font-bold mb-4 uppercase tracking-wider"
                        style={{
                            fontFamily: "monospace",
                            color: "#ff6b6b",
                            fontWeight: "bold",
                        }}
                    >
                        🚨 ERROR
                    </h2>
                    <p 
                        className="mb-6 uppercase tracking-wider"
                        style={{
                            fontFamily: "monospace",
                            color: "#d2b48c",
                            fontWeight: "bold",
                        }}
                    >
                        {error}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="font-bold py-3 px-6 uppercase tracking-wider transition-all"
                        style={{
                            fontFamily: "monospace",
                            border: "2px solid #8b4513",
                            borderRadius: "0",
                            textShadow: "2px 2px 0px #1a0f08",
                            backgroundColor: "#44ff44",
                            color: "#1a0f08",
                            cursor: "pointer",
                            boxShadow: "3px 3px 0px #1a0f08",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = "6px 6px 0px #1a0f08";
                            e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = "3px 3px 0px #1a0f08";
                            e.currentTarget.style.transform = "translateY(0px)";
                        }}
                    >
                        🔄 RETRY
                    </button>
                </div>
            </div>
        );
    }

    if (!SelfComponents) {
        return (
            <div 
                className="flex flex-col items-center justify-center min-h-screen py-8 px-6"
                style={{
                    fontFamily: "monospace",
                    backgroundImage: "url(/src/assets/bg-sections.png)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                }}
            >
                <div
                    style={{
                        backgroundColor: "#2a1810",
                        border: "3px solid #ffd700",
                        borderRadius: "0",
                        boxShadow: "6px 6px 0px #1a0f08, inset 2px 2px 0px #ffd700, inset -2px -2px 0px #8b4513",
                        padding: "30px",
                        imageRendering: "pixelated",
                        textShadow: "2px 2px 0px #1a0f08",
                        textAlign: "center",
                        position: "relative",
                        maxWidth: "600px",
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
                            background: "linear-gradient(90deg, #ffd700 0%, #d2b48c 50%, #ffd700 100%)",
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
                            background: "linear-gradient(90deg, #ffd700 0%, #d2b48c 50%, #ffd700 100%)",
                            imageRendering: "pixelated",
                        }}
                    />
                    <h2
                        className="text-2xl font-bold mb-4 uppercase tracking-wider"
                        style={{
                            fontFamily: "monospace",
                            color: "#ffd700",
                            fontWeight: "bold",
                        }}
                    >
                        ⚠️ COMPONENT LOADING FAILED
                    </h2>
                    <p 
                        className="uppercase tracking-wider"
                        style={{
                            fontFamily: "monospace",
                            color: "#d2b48c",
                            fontWeight: "bold",
                        }}
                    >
                        FAILED TO LOAD SELF PROTOCOL COMPONENTS. PLEASE REFRESH THE PAGE.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div 
            className="flex flex-col items-center justify-center min-h-screen py-8 px-6"
            style={{
                fontFamily: "monospace",
                backgroundImage: "url(/src/assets/bg-sections.png)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
            }}
        >
            <div 
                className="max-w-2xl w-full"
                style={{
                    backgroundColor: "#2a1810",
                    border: "3px solid #8b4513",
                    borderRadius: "0",
                    boxShadow: "6px 6px 0px #1a0f08, inset 2px 2px 0px #d2b48c, inset -2px -2px 0px #654321",
                    padding: "30px",
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

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-4 mb-4">
                        
                        <h2 
                            className="text-3xl font-bold uppercase tracking-wider"
                            style={{
                                fontFamily: "monospace",
                                color: "#d2b48c",
                                fontWeight: "bold",
                            }}
                        >
                            VERIFY YOUR IDENTITY
                        </h2>
                    
                    </div>
                    <p 
                        className="text-lg uppercase tracking-wider"
                        style={{
                            fontFamily: "monospace",
                            color: "#ffd700",
                            fontWeight: "bold",
                        }}
                    >
                        SCAN THE QR CODE WITH THE SELF APP TO VERIFY YOUR IDENTITY AND ACCESS CRYPTOVERSE GAME
                    </p>
                </div>

                {/* QR Code or Loading State */}
                <div className="text-center mb-8">
                    {isVerificationPending ? (
                        <div className="flex flex-col items-center justify-center">
                            <div 
                                className="animate-spin rounded-full h-16 w-16 border-b-2 mb-4"
                                style={{ borderColor: "#44ff44" }}
                            ></div>
                            <div
                                style={{
                                    backgroundColor: "#1a0f08",
                                    border: "2px solid #44ff44",
                                    borderRadius: "0",
                                    boxShadow: "3px 3px 0px #1a0f08",
                                    padding: "20px",
                                }}
                            >
                                <p 
                                    className="text-xl font-bold uppercase tracking-wider"
                                    style={{
                                        fontFamily: "monospace",
                                        color: "#44ff44",
                                        fontWeight: "bold",
                                    }}
                                >
                                    ⚙️ PROCESSING VERIFICATION...
                                </p>
                                <p 
                                    className="mt-2 uppercase tracking-wider"
                                    style={{
                                        fontFamily: "monospace",
                                        color: "#d2b48c",
                                        fontWeight: "bold",
                                    }}
                                >
                                    PLEASE WAIT WHILE WE VERIFY YOUR IDENTITY
                                </p>
                            </div>
                        </div>
                    ) : selfApp && SelfComponents.SelfQRcodeWrapper ? (
                        <div className="flex justify-center">
                            <div
                                style={{
                                    backgroundColor: "white",
                                    border: "2px solid #8b4513",
                                    borderRadius: "0",
                                    boxShadow: "3px 3px 0px #1a0f08",
                                    padding: "20px",
                                    display: "inline-block",
                                }}
                            >
                                <SelfComponents.SelfQRcodeWrapper
                                    selfApp={selfApp}
                                    onSuccess={handleSuccessfulVerification}
                                    onError={handleVerificationError}
                                    size={280}
                                    darkMode={false}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-center">
                            <div 
                                className="animate-pulse"
                                style={{
                                    backgroundColor: "#654321",
                                    border: "2px solid #8b4513",
                                    borderRadius: "0",
                                    height: "280px",
                                    width: "280px",
                                }}
                            ></div>
                        </div>
                    )}
                </div>

                {/* Requirements Section */}
                <div 
                    className="mb-6"
                    style={{
                        backgroundColor: "#1a0f08",
                        border: "2px solid #8b4513",
                        borderRadius: "0",
                        boxShadow: "3px 3px 0px #1a0f08",
                        padding: "20px",
                    }}
                >
                    <h3 
                        className="text-lg font-bold mb-4 uppercase tracking-wider text-center"
                        style={{
                            fontFamily: "monospace",
                            color: "#d2b48c",
                            fontWeight: "bold",
                        }}
                    >
                        ⚔️ REQUIREMENTS
                    </h3>
                    <ul className="space-y-2">
                        <li 
                            className="uppercase tracking-wider"
                            style={{
                                fontFamily: "monospace",
                                color: "#ffd700",
                                fontWeight: "bold",
                            }}
                        >
                            • MUST BE 16 YEARS OR OLDER
                        </li>
                        <li 
                            className="uppercase tracking-wider"
                            style={{
                                fontFamily: "monospace",
                                color: "#ffd700",
                                fontWeight: "bold",
                            }}
                        >
                            • VALID GOVERNMENT-ISSUED ID
                        </li>
                        <li 
                            className="uppercase tracking-wider"
                            style={{
                                fontFamily: "monospace",
                                color: "#ffd700",
                                fontWeight: "bold",
                            }}
                        >
                            • GOOD LIGHTING FOR DOCUMENT SCANNING
                        </li>
                    </ul>
                </div>

                {/* Help Section */}
                <div 
                    className="mb-4"
                    style={{
                        backgroundColor: "#1a0f08",
                        border: "2px solid #6b6bff",
                        borderRadius: "0",
                        boxShadow: "3px 3px 0px #1a0f08",
                        padding: "15px",
                    }}
                >
                    <p 
                        className="text-sm uppercase tracking-wider text-center mb-2"
                        style={{
                            fontFamily: "monospace",
                            color: "#6b6bff",
                            fontWeight: "bold",
                        }}
                    >
                          DON'T HAVE THE SELF APP? DOWNLOAD IT FROM YOUR APP STORE.
                    </p>
                </div>

                {/* Troubleshooting Section */}
                <div
                    style={{
                        backgroundColor: "#1a0f08",
                        border: "2px solid #44ff44",
                        borderRadius: "0",
                        boxShadow: "3px 3px 0px #1a0f08",
                        padding: "15px",
                    }}
                >
                    <p 
                        className="text-sm font-bold uppercase tracking-wider text-center mb-3"
                        style={{
                            fontFamily: "monospace",
                            color: "#44ff44",
                            fontWeight: "bold",
                        }}
                    >
                        🔧 HAVING ISSUES? COMMON SOLUTIONS:
                    </p>
                    <ul className="space-y-1">
                        <li 
                            className="text-xs uppercase tracking-wider"
                            style={{
                                fontFamily: "monospace",
                                color: "#d2b48c",
                                fontWeight: "bold",
                            }}
                        >
                            • ENSURE GOOD LIGHTING WHEN SCANNING
                        </li>
                        <li 
                            className="text-xs uppercase tracking-wider"
                            style={{
                                fontFamily: "monospace",
                                color: "#d2b48c",
                                fontWeight: "bold",
                            }}
                        >
                            • TRY A DIFFERENT DOCUMENT TYPE
                        </li>
                        <li 
                            className="text-xs uppercase tracking-wider"
                            style={{
                                fontFamily: "monospace",
                                color: "#d2b48c",
                                fontWeight: "bold",
                            }}
                        >
                            • MAKE SURE DOCUMENT IS NOT EXPIRED
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default SelfAuthentication;