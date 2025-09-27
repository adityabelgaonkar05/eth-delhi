import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BusinessOnboarding from "./BusinessOnboarding";
import BusinessLogin from "./BusinessLogin";
import { useAuth } from "../context/AuthContext";
import bgHeroBusiness from "../assets/bg-business.gif";
import bgCtaBusiness from "../assets/bg-cta-business.png";

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
    <div
      className="bg-black text-white"
      style={{ fontFamily: "Advercase, monospace" }}
    >
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 via-black/50 to-transparent">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/")}
                className="pixel-text text-white text-xl font-bold"
              >
                CryptoVerse
              </button>
              <span className="text-gray-400 text-sm normal-text">
                for businesses
              </span>
            </div>

            {/* Navigation */}
            <div className="flex items-center space-x-4">
              {business ? (
                <>
                  <span className="text-white text-sm normal-text">
                    Welcome,{" "}
                    <span style={{ color: "#00ffb6" }}>
                      {business.companyName}
                    </span>
                  </span>
                  <button
                    onClick={() => navigate("/workwithus")}
                    className="navbar-button-primary pixel-text rounded-4xl"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={handleLogout}
                    className="navbar-button pixel-text rounded-4xl"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate("/")}
                    className="navbar-button pixel-text rounded-4xl"
                  >
                    Home
                  </button>
                  <button
                    onClick={handleLogin}
                    className="navbar-button pixel-text rounded-4xl"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={handleGetStarted}
                    className="navbar-button-primary pixel-text rounded-4xl"
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
      <section
        className="px-6 bg-cover bg-center bg-no-repeat flex items-center justify-center"
        style={{
          backgroundImage: `url(${bgHeroBusiness})`,
          height: "100vh",
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
            The Future of
            <br />
            <span className="text-[#00ffb6]">Business Gaming</span>
          </h1>

          <p className="text-xl md:text-2xl text-white mb-12 max-w-3xl mx-auto leading-relaxed">
            Transform your business events into immersive experiences. Host
            premieres, build communities, and engage audiences like never
            before.
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
      <section className="py-20 px-6 bg-black">
        <div className="max-w-6xl mx-auto">
          <h2
            className="text-3xl md:text-4xl font-bold text-center mb-16"
            style={{ color: "#ffffff" }}
          >
            Built for Modern Businesses
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-blue-400 p-8 rounded-3xl relative min-h-[300px] flex flex-col">
              <div className="absolute top-6 right-6">
                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-black mb-4 uppercase tracking-wide leading-tight">
                Video Premieres
              </h3>
              <div className="mt-auto">
                <p className="text-black text-base leading-relaxed">
                  Host exclusive video premieres with interactive features.
                  Engage your audience in real-time during product launches and
                  announcements.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-green-400 p-8 rounded-3xl relative min-h-[300px] flex flex-col">
              <div className="absolute top-6 right-6">
                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-black mb-4 uppercase tracking-wide leading-tight">
                Community Building
              </h3>
              <div className="mt-auto">
                <p className="text-black text-base leading-relaxed">
                  Create virtual spaces where your customers and stakeholders
                  can connect, collaborate, and build lasting relationships.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-purple-400 p-8 rounded-3xl relative min-h-[300px] flex flex-col">
              <div className="absolute top-6 right-6">
                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-black mb-4 uppercase tracking-wide leading-tight">
                Reputation System
              </h3>
              <div className="mt-auto">
                <p className="text-black text-base leading-relaxed">
                  Build trust and credibility with blockchain-based reputation
                  management. Reward engagement and foster community growth.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-3xl md:text-4xl font-bold text-center mb-16"
            style={{ color: "#00ffb6" }}
          >
            Simple. Powerful. Effective.
          </h2>

          <div className="space-y-20">
            {/* Step 1 */}
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1 md:pr-8">
                <div className="flex items-center mb-6">
                  <span className="w-12 h-12 bg-[#00ffb6] text-black flex items-center justify-center text-lg font-bold mr-6 rounded-full">
                    1
                  </span>
                  <h3
                    className="text-3xl md:text-4xl font-bold"
                    style={{ color: "#00ffb6" }}
                  >
                    Create Your Event
                  </h3>
                </div>
                <p className="text-gray-300 leading-relaxed text-lg mb-6">
                  Set up video premieres, community gatherings, or business
                  presentations with our intuitive dashboard. Configure audience
                  capacity, timing, and engagement features.
                </p>
                <ul className="space-y-3 text-gray-400">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-[#00ffb6] rounded-full mr-3"></span>
                    Intuitive dashboard setup
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-[#00ffb6] rounded-full mr-3"></span>
                    Customizable event parameters
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-[#00ffb6] rounded-full mr-3"></span>
                    Real-time configuration
                  </li>
                </ul>
              </div>
              <div className="w-full md:w-1/2 h-64 bg-gradient-to-br from-[#00ffb6]/10 to-[#00ffb6]/5 rounded-2xl flex items-center justify-center border border-[#00ffb6]/20">
                <span className="text-[#00ffb6] text-lg font-semibold">
                  Event Creation Interface
                </span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-12">
              <div className="flex-1 md:pl-8">
                <div className="flex items-center mb-6">
                  <span className="w-12 h-12 bg-[#00ffb6] text-black flex items-center justify-center text-lg font-bold mr-6 rounded-full">
                    2
                  </span>
                  <h3
                    className="text-3xl md:text-4xl font-bold"
                    style={{ color: "#00ffb6" }}
                  >
                    Engage Your Audience
                  </h3>
                </div>
                <p className="text-gray-300 leading-relaxed text-lg mb-6">
                  Use our interactive features to keep your audience engaged.
                  Real-time comments, polls, and Q&A sessions make every event
                  memorable.
                </p>
                <ul className="space-y-3 text-gray-400">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-[#00ffb6] rounded-full mr-3"></span>
                    Real-time interaction tools
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-[#00ffb6] rounded-full mr-3"></span>
                    Live polls and Q&A
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-[#00ffb6] rounded-full mr-3"></span>
                    Audience analytics
                  </li>
                </ul>
              </div>
              <div className="w-full md:w-1/2 h-64 bg-gradient-to-br from-[#00ffb6]/10 to-[#00ffb6]/5 rounded-2xl flex items-center justify-center border border-[#00ffb6]/20">
                <span className="text-[#00ffb6] text-lg font-semibold">
                  Engagement Tools
                </span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1 md:pr-8">
                <div className="flex items-center mb-6">
                  <span className="w-12 h-12 bg-[#00ffb6] text-black flex items-center justify-center text-lg font-bold mr-6 rounded-full">
                    3
                  </span>
                  <h3
                    className="text-3xl md:text-4xl font-bold"
                    style={{ color: "#00ffb6" }}
                  >
                    Build Community
                  </h3>
                </div>
                <p className="text-gray-300 leading-relaxed text-lg mb-6">
                  Foster long-term relationships with reputation systems and
                  community spaces. Turn one-time viewers into loyal brand
                  advocates.
                </p>
                <ul className="space-y-3 text-gray-400">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-[#00ffb6] rounded-full mr-3"></span>
                    Blockchain reputation system
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-[#00ffb6] rounded-full mr-3"></span>
                    Community spaces
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-[#00ffb6] rounded-full mr-3"></span>
                    Long-term engagement
                  </li>
                </ul>
              </div>
              <div className="w-full md:w-1/2 h-64 bg-gradient-to-br from-[#00ffb6]/10 to-[#00ffb6]/5 rounded-2xl flex items-center justify-center border border-[#00ffb6]/20">
                <span className="text-[#00ffb6] text-lg font-semibold">
                  Community Features
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="py-20 px-8 bg-cover bg-center bg-no-repeat rounded-3xl mx-6 my-12 relative overflow-hidden"
        style={{
          backgroundImage: `url(${bgCtaBusiness})`,
          backgroundColor: "#4ade80",
        }}
      >
        {/* Corner decorations */}
        <div className="absolute top-4 left-4">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="text-black"
          >
            <path
              d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <div className="absolute top-4 right-4">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="text-black"
          >
            <path
              d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <div className="absolute bottom-4 left-4">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="text-black"
          >
            <path
              d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <div className="absolute bottom-4 right-4">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="text-black"
          >
            <path
              d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
              fill="currentColor"
            />
          </svg>
        </div>

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between">
            {/* Left content */}
            <div className="flex-1 text-left mb-8 lg:mb-0 lg:pr-12">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#00ffb6] mb-6 leading-tight uppercase">
                START BUILDING
              </h2>

              <p className="text-lg md:text-xl text-white leading-relaxed mb-8 max-w-lg">
                Review and select any combination of verified independent key
                server providers. Providers set their own pricing and rate
                limits.
              </p>

              <button
                onClick={handleGetStarted}
                className="inline-flex items-center text-white text-lg font-bold hover:underline transition-all duration-200"
              >
                <span className="mr-2">●</span>
                GO TO PROVIDER LIST
                <span className="ml-2">)</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <h3
                className="text-2xl font-bold mb-2"
                style={{ color: "#00ffb6" }}
              >
                CryptoVerse
              </h3>
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
