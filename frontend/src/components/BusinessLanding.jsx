import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BusinessOnboarding from "./BusinessOnboarding";
import BusinessLogin from "./BusinessLogin";
import { useAuth } from "../context/AuthContext";

const BusinessLanding = () => {
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const { business, logout } = useAuth();

  // Load Advercase font
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @font-face {
        font-family: 'Advercase';
        src: url('./src/assets/Advercase.otf') format('opentype');
        font-weight: normal;
        font-style: normal;
      }
    `;
    document.head.appendChild(style);

    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  const handleGetStarted = () => {
    if (business) {
      navigate("/workwithus");
    } else {
      setShowOnboarding(true);
    }
  };

  const handleLogin = () => {
    setShowLogin(true);
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleOnboardingComplete = (businessData) => {
    console.log("Business onboarding completed:", businessData);
    setShowOnboarding(false);
    navigate("/workwithus");
  };

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
  };

  const handleLoginClose = () => {
    setShowLogin(false);
  };

  const handleSwitchToSignup = () => {
    setShowLogin(false);
    setShowOnboarding(true);
  };

  const handleSwitchToLogin = () => {
    setShowOnboarding(false);
    setShowLogin(true);
  };

    return (
        <div className="min-h-screen bg-black text-white" style={{ fontFamily: "Advercase, monospace" }}>
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-sm border-b border-gray-800">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate("/")}
                                className="text-2xl font-bold"
                                style={{ color: "#00ffb6" }}
                            >
                                CryptoVerse
                            </button>
                            <span className="text-gray-400 text-sm">for businesses</span>
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center space-x-6">
                            {business ? (
                                <>
                                    <span className="text-gray-400 text-sm">
                                        Welcome, <span style={{ color: "#00ffb6" }}>{business.companyName}</span>
                                    </span>
                                    <button
                                        onClick={() => navigate("/workwithus")}
                                        className="px-6 py-2 bg-[#00ffb6] text-black hover:bg-[#00e6a6] transition-colors text-sm uppercase tracking-wider font-bold"
                                    >
                                        Dashboard
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="px-6 py-2 border border-[#00ffb6] text-[#00ffb6] hover:bg-[#00ffb6] hover:text-black transition-colors text-sm uppercase tracking-wider"
                                    >
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={handleLogin}
                                        className="text-[#00ffb6] hover:text-white transition-colors text-sm uppercase tracking-wider"
                                    >
                                        Sign In
                                    </button>
                                    <button
                                        onClick={handleGetStarted}
                                        className="px-6 py-2 bg-[#00ffb6] text-black hover:bg-[#00e6a6] transition-colors text-sm uppercase tracking-wider font-bold"
                                    >
                                        Get Started
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
                        The Future of
                        <br />
                        <span className="text-[#00ffb6]">Business Gaming</span>
                    </h1>
                    
                    <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
                        Transform your business events into immersive experiences. 
                        Host premieres, build communities, and engage audiences like never before.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <button
                            onClick={handleGetStarted}
                            className="px-12 py-4 bg-[#00ffb6] text-black hover:bg-[#00e6a6] transition-colors text-lg uppercase tracking-wider font-bold"
                        >
                            {business ? "Go to Dashboard" : "Start Building"}
                        </button>
                        
                        {!business && (
                            <button
                                onClick={handleLogin}
                                className="px-12 py-4 border border-[#00ffb6] text-[#00ffb6] hover:bg-[#00ffb6] hover:text-black transition-colors text-lg uppercase tracking-wider"
                            >
                                Sign In
                            </button>
                        )}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 px-6 border-t border-gray-800">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold text-center mb-16" style={{ color: "#00ffb6" }}>
                        Built for Modern Businesses
                    </h2>
                    
                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-6 bg-[#00ffb6]/10 flex items-center justify-center">
                                <svg className="w-8 h-8" fill="none" stroke="#00ffb6" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-4" style={{ color: "#00ffb6" }}>Video Premieres</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Host exclusive video premieres with interactive features. 
                                Engage your audience in real-time during product launches and announcements.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-6 bg-[#00ffb6]/10 flex items-center justify-center">
                                <svg className="w-8 h-8" fill="none" stroke="#00ffb6" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-4" style={{ color: "#00ffb6" }}>Community Building</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Create virtual spaces where your customers and stakeholders can connect, 
                                collaborate, and build lasting relationships.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-6 bg-[#00ffb6]/10 flex items-center justify-center">
                                <svg className="w-8 h-8" fill="none" stroke="#00ffb6" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-4" style={{ color: "#00ffb6" }}>Reputation System</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Build trust and credibility with blockchain-based reputation management. 
                                Reward engagement and foster community growth.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="py-20 px-6 border-t border-gray-800">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold text-center mb-16" style={{ color: "#00ffb6" }}>
                        Simple. Powerful. Effective.
                    </h2>
                    
                    <div className="space-y-12">
                        {/* Step 1 */}
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="flex-1">
                                <div className="flex items-center mb-4">
                                    <span className="w-8 h-8 bg-[#00ffb6] text-black flex items-center justify-center text-sm font-bold mr-4">
                                        1
                                    </span>
                                    <h3 className="text-2xl font-bold" style={{ color: "#00ffb6" }}>Create Your Event</h3>
                                </div>
                                <p className="text-gray-400 leading-relaxed">
                                    Set up video premieres, community gatherings, or business presentations 
                                    with our intuitive dashboard. Configure audience capacity, timing, and engagement features.
                                </p>
                            </div>
                            <div className="w-full md:w-1/3 h-32 bg-[#00ffb6]/5 flex items-center justify-center">
                                <span className="text-[#00ffb6] text-sm">Event Creation Interface</span>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="flex flex-col md:flex-row-reverse items-center gap-8">
                            <div className="flex-1">
                                <div className="flex items-center mb-4">
                                    <span className="w-8 h-8 bg-[#00ffb6] text-black flex items-center justify-center text-sm font-bold mr-4">
                                        2
                                    </span>
                                    <h3 className="text-2xl font-bold" style={{ color: "#00ffb6" }}>Engage Your Audience</h3>
                                </div>
                                <p className="text-gray-400 leading-relaxed">
                                    Use our interactive features to keep your audience engaged. 
                                    Real-time comments, polls, and Q&A sessions make every event memorable.
                                </p>
                            </div>
                            <div className="w-full md:w-1/3 h-32 bg-[#00ffb6]/5 flex items-center justify-center">
                                <span className="text-[#00ffb6] text-sm">Engagement Tools</span>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="flex-1">
                                <div className="flex items-center mb-4">
                                    <span className="w-8 h-8 bg-[#00ffb6] text-black flex items-center justify-center text-sm font-bold mr-4">
                                        3
                                    </span>
                                    <h3 className="text-2xl font-bold" style={{ color: "#00ffb6" }}>Build Community</h3>
                                </div>
                                <p className="text-gray-400 leading-relaxed">
                                    Foster long-term relationships with reputation systems and community spaces. 
                                    Turn one-time viewers into loyal brand advocates.
                                </p>
                            </div>
                            <div className="w-full md:w-1/3 h-32 bg-[#00ffb6]/5 flex items-center justify-center">
                                <span className="text-[#00ffb6] text-sm">Community Features</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-6 border-t border-gray-800">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-8" style={{ color: "#00ffb6" }}>
                        Ready to Transform Your Business Events?
                    </h2>
                    
                    <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
                        Join forward-thinking businesses who are already using CryptoVerse 
                        to create unforgettable experiences and build stronger communities.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <button
                            onClick={handleGetStarted}
                            className="px-12 py-4 bg-[#00ffb6] text-black hover:bg-[#00e6a6] transition-colors text-lg uppercase tracking-wider font-bold"
                        >
                            {business ? "Access Dashboard" : "Get Started Free"}
                        </button>
                        
                        <button
                            onClick={() => navigate("/")}
                            className="px-12 py-4 border border-[#00ffb6] text-[#00ffb6] hover:bg-[#00ffb6] hover:text-black transition-colors text-lg uppercase tracking-wider"
                        >
                            Explore Platform
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-gray-800 py-12 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="mb-6 md:mb-0">
                            <h3 className="text-2xl font-bold mb-2" style={{ color: "#00ffb6" }}>CryptoVerse</h3>
                            <p className="text-gray-400 text-sm">
                                The future of business engagement
                            </p>
                        </div>
                        
                        <div className="flex items-center space-x-8">
                            <button
                                onClick={() => navigate("/")}
                                className="text-[#00ffb6] hover:text-white transition-colors text-sm uppercase tracking-wider"
                            >
                                Main Platform
                            </button>
                            <span className="text-gray-600">|</span>
                            <span className="text-gray-400 text-sm">
                                © 2025 CryptoVerse. All rights reserved.
                            </span>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Business Onboarding Modal */}
            <BusinessOnboarding
                isOpen={showOnboarding}
                onClose={handleOnboardingClose}
                onComplete={handleOnboardingComplete}
                onSwitchToLogin={handleSwitchToLogin}
            />
            
            {/* Business Login Modal */}
            <BusinessLogin
                isOpen={showLogin}
                onClose={handleLoginClose}
                onSwitchToSignup={handleSwitchToSignup}
            />
        </div>
    );
};

export default BusinessLanding;
