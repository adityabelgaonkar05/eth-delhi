import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  registerOrganizer
} from "../utils/contractHelpers";

const BusinessLandingPage = () => {
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Single-question onboarding flow
  const onboardingQuestions = [
    {
      id: 1,
      question: "What's your company name?",
      placeholder: "Enter your company name...",
      type: "text",
      key: "businessName",
      required: true
    },
    {
      id: 2,
      question: "What industry are you in?",
      type: "select",
      key: "industry",
      options: [
        { value: "defi", label: "DeFi & Finance" },
        { value: "gaming", label: "Gaming & Entertainment" },
        { value: "nft", label: "NFTs & Digital Art" },
        { value: "infrastructure", label: "Blockchain Infrastructure" },
        { value: "education", label: "Education & Training" },
        { value: "consulting", label: "Consulting & Services" },
        { value: "other", label: "Other" }
      ],
      required: true
    },
    {
      id: 3,
      question: "What's your contact email?",
      placeholder: "your@email.com",
      type: "email",
      key: "contactEmail",
      required: true
    },
    {
      id: 4,
      question: "Tell us about your company",
      placeholder: "What does your company do? What makes you unique?",
      type: "textarea",
      key: "description",
      required: true
    },
    {
      id: 5,
      question: "Do you have a website?",
      placeholder: "https://yourcompany.com (optional)",
      type: "url",
      key: "website",
      required: false
    },
    {
      id: 6,
      question: "How big is your team?",
      type: "select",
      key: "teamSize",
      options: [
        { value: "1-5", label: "1-5 employees" },
        { value: "6-20", label: "6-20 employees" },
        { value: "21-50", label: "21-50 employees" },
        { value: "51-200", label: "51-200 employees" },
        { value: "200+", label: "200+ employees" }
      ],
      required: false
    },
    {
      id: 7,
      question: "Would you like business verification?",
      subtitle: "Get a verified badge and unlock premium features",
      type: "boolean",
      key: "requestVerification",
      required: false
    }
  ];

  const currentQuestion = onboardingQuestions[onboardingStep - 1];
  const totalSteps = onboardingQuestions.length;

  const handleInputChange = (value) => {
    setOnboardingData(prev => ({
      ...prev,
      [currentQuestion.key]: value
    }));
  };

  const handleNext = () => {
    if (currentQuestion.required && !onboardingData[currentQuestion.key]) {
      return;
    }
    
    if (onboardingStep < totalSteps) {
      setOnboardingStep(onboardingStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const result = await registerOrganizer({
        businessName: onboardingData.businessName,
        description: onboardingData.description,
        website: onboardingData.website || "",
        contactEmail: onboardingData.contactEmail,
        requestVerification: onboardingData.requestVerification || false,
        paymentAmount: onboardingData.requestVerification ? "0.05" : "0"
      });
      
      if (result.success) {
        alert(`Registration successful! Welcome to CryptoVerse! Transaction: ${result.txHash}`);
        setShowOnboarding(false);
        setOnboardingStep(1);
        setOnboardingData({});
        // Redirect to business dashboard
        navigate('/dashboard');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcuts for onboarding
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!showOnboarding) return;
      
      if (e.key === 'Escape') {
        setShowOnboarding(false);
        setOnboardingStep(1);
        setOnboardingData({});
      }
      
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const current = onboardingQuestions[onboardingStep - 1];
        if (!current.required || onboardingData[current.key]) {
          handleNext();
        }
      }
      
      if (e.key === 'ArrowLeft' && onboardingStep > 1) {
        setOnboardingStep(onboardingStep - 1);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [showOnboarding, onboardingStep, onboardingData]);

  // Onboarding Modal Component
  const renderOnboarding = () => (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, white 2px, transparent 0), 
                           radial-gradient(circle at 75px 75px, white 2px, transparent 0)`,
          backgroundSize: '100px 100px'
        }}></div>
      </div>
      
      {/* Main Content */}
      <div className="relative w-full max-w-4xl mx-auto px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 
            className="text-6xl md:text-8xl font-bold text-white mb-4 uppercase tracking-wider"
            style={{ fontFamily: "Advercase, monospace" }}
          >
            CRYPTOVERSE
          </h1>
          <div className="flex items-center justify-center space-x-4">
            <div className="h-px bg-white/30 flex-1"></div>
            <p 
              className="text-xl text-white/80 uppercase tracking-widest"
              style={{ fontFamily: "Advercase, monospace" }}
            >
              Step {onboardingStep} of {totalSteps}
            </p>
            <div className="h-px bg-white/30 flex-1"></div>
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center space-x-4 mb-16">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all duration-500 ${
                i < onboardingStep 
                  ? 'bg-white' 
                  : i === onboardingStep - 1 
                    ? 'bg-white/60 ring-2 ring-white/40' 
                    : 'bg-white/20'
              }`}
            ></div>
          ))}
        </div>

        {/* Question Section */}
        <div className="text-center mb-16">
          <h2 
            className="text-4xl md:text-6xl font-bold text-white mb-6 uppercase tracking-wide leading-tight"
            style={{ fontFamily: "Advercase, monospace" }}
          >
            {currentQuestion.question}
          </h2>
          {currentQuestion.subtitle && (
            <p 
              className="text-xl text-white/70 mb-8 uppercase tracking-wider"
              style={{ fontFamily: "Advercase, monospace" }}
            >
              {currentQuestion.subtitle}
            </p>
          )}

          {/* Input Section */}
          <div className="max-w-2xl mx-auto">
            {/* Text Input */}
            {(currentQuestion.type === "text" || currentQuestion.type === "email" || currentQuestion.type === "url") && (
              <div className="relative">
                <input
                  type={currentQuestion.type}
                  placeholder={currentQuestion.placeholder}
                  value={onboardingData[currentQuestion.key] || ""}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="w-full p-6 text-2xl bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl text-white placeholder-white/50 focus:border-white focus:outline-none transition-all duration-300"
                  style={{ fontFamily: "Advercase, monospace" }}
                  autoFocus
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/5 to-transparent pointer-events-none"></div>
              </div>
            )}

            {/* Textarea */}
            {currentQuestion.type === "textarea" && (
              <div className="relative">
                <textarea
                  placeholder={currentQuestion.placeholder}
                  value={onboardingData[currentQuestion.key] || ""}
                  onChange={(e) => handleInputChange(e.target.value)}
                  rows={4}
                  className="w-full p-6 text-2xl bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl text-white placeholder-white/50 focus:border-white focus:outline-none transition-all duration-300 resize-none"
                  style={{ fontFamily: "Advercase, monospace" }}
                  autoFocus
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/5 to-transparent pointer-events-none"></div>
              </div>
            )}

            {/* Select Options */}
            {currentQuestion.type === "select" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleInputChange(option.value)}
                    className={`p-6 text-left text-xl border-2 rounded-2xl transition-all duration-300 transform hover:scale-105 ${
                      onboardingData[currentQuestion.key] === option.value
                        ? "bg-white text-black border-white shadow-lg shadow-white/20"
                        : "bg-white/10 text-white border-white/20 hover:border-white/40 hover:bg-white/20"
                    }`}
                    style={{ fontFamily: "Advercase, monospace" }}
                  >
                    <div className="uppercase tracking-wide font-bold">
                      {option.label}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Boolean Options */}
            {currentQuestion.type === "boolean" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                  onClick={() => handleInputChange(true)}
                  className={`p-8 text-center border-2 rounded-2xl transition-all duration-300 transform hover:scale-105 ${
                    onboardingData[currentQuestion.key] === true
                      ? "bg-green-400 text-black border-green-400 shadow-lg shadow-green-400/20"
                      : "bg-white/10 text-white border-white/20 hover:border-green-400/40 hover:bg-green-400/10"
                  }`}
                  style={{ fontFamily: "Advercase, monospace" }}
                >
                  <div className="text-4xl mb-4">✅</div>
                  <div className="text-2xl font-bold uppercase tracking-wide mb-2">
                    Yes, Verify Me
                  </div>
                  <div className="text-sm opacity-80 uppercase tracking-wider">
                    Premium Features + Badge
                  </div>
                </button>
                
                <button
                  onClick={() => handleInputChange(false)}
                  className={`p-8 text-center border-2 rounded-2xl transition-all duration-300 transform hover:scale-105 ${
                    onboardingData[currentQuestion.key] === false
                      ? "bg-white text-black border-white shadow-lg shadow-white/20"
                      : "bg-white/10 text-white border-white/20 hover:border-white/40 hover:bg-white/20"
                  }`}
                  style={{ fontFamily: "Advercase, monospace" }}
                >
                  <div className="text-4xl mb-4">⏭️</div>
                  <div className="text-2xl font-bold uppercase tracking-wide mb-2">
                    Skip for Now
                  </div>
                  <div className="text-sm opacity-80 uppercase tracking-wider">
                    Can Request Later
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setOnboardingStep(Math.max(1, onboardingStep - 1))}
            disabled={onboardingStep === 1}
            className={`px-8 py-4 border-2 rounded-2xl font-bold uppercase tracking-wider transition-all duration-300 ${
              onboardingStep === 1
                ? "bg-white/10 text-white/30 border-white/20 cursor-not-allowed"
                : "bg-white/10 text-white border-white/30 hover:border-white hover:bg-white/20 transform hover:scale-105"
            }`}
            style={{ fontFamily: "Advercase, monospace" }}
          >
            ← Back
          </button>

          {/* Close Button */}
          <button
            onClick={() => {
              setShowOnboarding(false);
              setOnboardingStep(1);
              setOnboardingData({});
            }}
            className="px-6 py-4 text-white/60 hover:text-white transition-colors duration-300"
            style={{ fontFamily: "Advercase, monospace" }}
          >
            <div className="text-2xl">✕</div>
          </button>

          <button
            onClick={handleNext}
            disabled={
              (currentQuestion.required && !onboardingData[currentQuestion.key]) ||
              isSubmitting
            }
            className="px-8 py-4 bg-white text-black border-2 border-white rounded-2xl font-bold uppercase tracking-wider transition-all duration-300 disabled:bg-white/30 disabled:text-white/50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-white/20 transform hover:scale-105"
            style={{ fontFamily: "Advercase, monospace" }}
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                <span>Registering...</span>
              </div>
            ) : onboardingStep === totalSteps ? (
              "Complete Registration"
            ) : (
              "Next →"
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Onboarding Modal */}
      {showOnboarding && renderOnboarding()}

      {/* Business Landing Page */}
      <div className="min-h-screen bg-black text-white">
        
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div 
                className="text-2xl font-bold uppercase tracking-wider cursor-pointer"
                style={{ fontFamily: "Advercase, monospace" }}
                onClick={() => navigate('/')}
              >
                CryptoVerse
              </div>
              <button
                onClick={() => setShowOnboarding(true)}
                className="px-6 py-2 bg-white text-black font-bold uppercase tracking-wider rounded-xl hover:bg-gray-200 transition-colors duration-300"
                style={{ fontFamily: "Advercase, monospace" }}
              >
                Sign Up
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <h1 
              className="text-5xl md:text-7xl lg:text-8xl font-bold uppercase tracking-wider mb-8 bg-gradient-to-r from-white via-gray-300 to-white bg-clip-text text-transparent"
              style={{ fontFamily: "Advercase, monospace" }}
            >
              The Ultimate Web3<br />Business Platform
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
              Launch video premieres, engage verified crypto audiences, and distribute token airdrops with enterprise-grade tools built for the decentralized future.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowOnboarding(true)}
                className="px-12 py-4 bg-white text-black text-xl font-bold uppercase tracking-wider rounded-2xl hover:bg-gray-200 transition-all duration-300 transform hover:scale-105"
                style={{ fontFamily: "Advercase, monospace" }}
              >
                Sign Up →
              </button>
              <button
                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                className="px-12 py-4 border-2 border-white text-white text-xl font-bold uppercase tracking-wider rounded-2xl hover:bg-white/10 transition-all duration-300"
                style={{ fontFamily: "Advercase, monospace" }}
              >
                Learn More
              </button>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/5 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div 
                  className="text-4xl md:text-5xl font-bold mb-2"
                  style={{ fontFamily: "Advercase, monospace" }}
                >
                  500K+
                </div>
                <div className="text-gray-300 uppercase tracking-wider">Verified Users</div>
              </div>
              <div>
                <div 
                  className="text-4xl md:text-5xl font-bold mb-2"
                  style={{ fontFamily: "Advercase, monospace" }}
                >
                  $50M+
                </div>
                <div className="text-gray-300 uppercase tracking-wider">Tokens Distributed</div>
              </div>
              <div>
                <div 
                  className="text-4xl md:text-5xl font-bold mb-2"
                  style={{ fontFamily: "Advercase, monospace" }}
                >
                  2,500+
                </div>
                <div className="text-gray-300 uppercase tracking-wider">Events Hosted</div>
              </div>
              <div>
                <div 
                  className="text-4xl md:text-5xl font-bold mb-2"
                  style={{ fontFamily: "Advercase, monospace" }}
                >
                  95%
                </div>
                <div className="text-gray-300 uppercase tracking-wider">Satisfaction Rate</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 
                className="text-4xl md:text-6xl font-bold uppercase tracking-wider mb-6"
                style={{ fontFamily: "Advercase, monospace" }}
              >
                Platform Features
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Everything you need to host professional Web3 events and engage your community
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1: Video Premieres */}
              <div className="p-8 border border-white/20 rounded-2xl hover:border-white/40 transition-all duration-300 hover:transform hover:scale-105">
                <div className="text-4xl mb-4">🎬</div>
                <h3 
                  className="text-2xl font-bold uppercase tracking-wider mb-4"
                  style={{ fontFamily: "Advercase, monospace" }}
                >
                  Video Premieres
                </h3>
                <p className="text-gray-300 mb-4">
                  Host professional video premieres with decentralized storage on Walrus Network. Schedule events, manage capacity, and create anticipation.
                </p>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li>• Decentralized video hosting</li>
                  <li>• Capacity management</li>
                  <li>• Scheduling & timezone support</li>
                  <li>• Real-time engagement tracking</li>
                </ul>
              </div>

              {/* Feature 2: Verified Audiences */}
              <div className="p-8 border border-white/20 rounded-2xl hover:border-white/40 transition-all duration-300 hover:transform hover:scale-105">
                <div className="text-4xl mb-4">👥</div>
                <h3 
                  className="text-2xl font-bold uppercase tracking-wider mb-4"
                  style={{ fontFamily: "Advercase, monospace" }}
                >
                  Verified Audiences
                </h3>
                <p className="text-gray-300 mb-4">
                  Reach authentic, human-verified crypto audiences through Self Protocol integration. No bots, no fake accounts.
                </p>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li>• Self Protocol verification</li>
                  <li>• Reputation-based filtering</li>
                  <li>• Skill-based targeting</li>
                  <li>• Developer community access</li>
                </ul>
              </div>

              {/* Feature 3: Token Airdrops */}
              <div className="p-8 border border-white/20 rounded-2xl hover:border-white/40 transition-all duration-300 hover:transform hover:scale-105">
                <div className="text-4xl mb-4">🪂</div>
                <h3 
                  className="text-2xl font-bold uppercase tracking-wider mb-4"
                  style={{ fontFamily: "Advercase, monospace" }}
                >
                  Token Airdrops
                </h3>
                <p className="text-gray-300 mb-4">
                  Distribute tokens based on reputation scores with secure escrow. Configure caps, preview splits, and ensure fair distribution.
                </p>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li>• Reputation-based distribution</li>
                  <li>• Secure escrow system</li>
                  <li>• Configurable caps</li>
                  <li>• Refund guarantees</li>
                </ul>
              </div>

              {/* Feature 4: NFT Badges */}
              <div className="p-8 border border-white/20 rounded-2xl hover:border-white/40 transition-all duration-300 hover:transform hover:scale-105">
                <div className="text-4xl mb-4">🎖️</div>
                <h3 
                  className="text-2xl font-bold uppercase tracking-wider mb-4"
                  style={{ fontFamily: "Advercase, monospace" }}
                >
                  NFT Badges
                </h3>
                <p className="text-gray-300 mb-4">
                  Create custom attendance badges and digital collectibles. Boost engagement and provide lasting value to participants.
                </p>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li>• Custom badge templates</li>
                  <li>• Batch minting capabilities</li>
                  <li>• Attendance verification</li>
                  <li>• Collectible value creation</li>
                </ul>
              </div>

              {/* Feature 5: Educational Blogs */}
              <div className="p-8 border border-white/20 rounded-2xl hover:border-white/40 transition-all duration-300 hover:transform hover:scale-105">
                <div className="text-4xl mb-4">📚</div>
                <h3 
                  className="text-2xl font-bold uppercase tracking-wider mb-4"
                  style={{ fontFamily: "Advercase, monospace" }}
                >
                  Educational Blogs
                </h3>
                <p className="text-gray-300 mb-4">
                  Publish sponsored educational content to raise project awareness. Track engagement, quiz completions, and educational impact.
                </p>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li>• Sponsored content publishing</li>
                  <li>• Interactive quizzes</li>
                  <li>• Engagement analytics</li>
                  <li>• Content categorization</li>
                </ul>
              </div>

              {/* Feature 6: Analytics Dashboard */}
              <div className="p-8 border border-white/20 rounded-2xl hover:border-white/40 transition-all duration-300 hover:transform hover:scale-105">
                <div className="text-4xl mb-4">📊</div>
                <h3 
                  className="text-2xl font-bold uppercase tracking-wider mb-4"
                  style={{ fontFamily: "Advercase, monospace" }}
                >
                  Analytics Dashboard
                </h3>
                <p className="text-gray-300 mb-4">
                  Get real-time insights and post-event analytics. Track ROI, engagement metrics, and audience behavior.
                </p>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li>• Real-time event metrics</li>
                  <li>• ROI calculations</li>
                  <li>• Audience demographics</li>
                  <li>• Performance insights</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/5 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 
                className="text-4xl md:text-6xl font-bold uppercase tracking-wider mb-6"
                style={{ fontFamily: "Advercase, monospace" }}
              >
                How It Works
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Get started in minutes with our streamlined onboarding process
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">1</div>
                <h3 
                  className="text-2xl font-bold uppercase tracking-wider mb-4"
                  style={{ fontFamily: "Advercase, monospace" }}
                >
                  Sign Up
                </h3>
                <p className="text-gray-300">
                  Complete our simple onboarding process and get verified as a business partner.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">2</div>
                <h3 
                  className="text-2xl font-bold uppercase tracking-wider mb-4"
                  style={{ fontFamily: "Advercase, monospace" }}
                >
                  Create Events
                </h3>
                <p className="text-gray-300">
                  Use our intuitive dashboard to create video premieres, configure airdrops, and design NFT badges.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">3</div>
                <h3 
                  className="text-2xl font-bold uppercase tracking-wider mb-4"
                  style={{ fontFamily: "Advercase, monospace" }}
                >
                  Engage & Analyze
                </h3>
                <p className="text-gray-300">
                  Host your events, engage with verified audiences, and analyze performance with detailed metrics.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 
                className="text-4xl md:text-6xl font-bold uppercase tracking-wider mb-6"
                style={{ fontFamily: "Advercase, monospace" }}
              >
                Trusted by Leaders
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Join hundreds of Web3 companies already building on CryptoVerse
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Testimonial 1 */}
              <div className="p-8 border border-white/20 rounded-2xl">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    A
                  </div>
                  <div className="ml-4">
                    <div className="font-bold">Alex Chen</div>
                    <div className="text-gray-400 text-sm">CEO, DeFi Protocol</div>
                  </div>
                </div>
                <p className="text-gray-300 italic">
                  "CryptoVerse helped us reach 50K+ verified users for our token launch. The reputation-based airdrop system is game-changing."
                </p>
              </div>

              {/* Testimonial 2 */}
              <div className="p-8 border border-white/20 rounded-2xl">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold">
                    S
                  </div>
                  <div className="ml-4">
                    <div className="font-bold">Sarah Johnson</div>
                    <div className="text-gray-400 text-sm">Marketing Director, NFT Marketplace</div>
                  </div>
                </div>
                <p className="text-gray-300 italic">
                  "The analytics dashboard gives us insights we never had before. ROI tracking and engagement metrics are incredibly detailed."
                </p>
              </div>

              {/* Testimonial 3 */}
              <div className="p-8 border border-white/20 rounded-2xl">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold">
                    M
                  </div>
                  <div className="ml-4">
                    <div className="font-bold">Michael Rodriguez</div>
                    <div className="text-gray-400 text-sm">Founder, Gaming DAO</div>
                  </div>
                </div>
                <p className="text-gray-300 italic">
                  "The NFT badge system increased our event attendance by 300%. Community members love collecting our exclusive badges."
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/5 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 
                className="text-4xl md:text-6xl font-bold uppercase tracking-wider mb-6"
                style={{ fontFamily: "Advercase, monospace" }}
              >
                FAQ
              </h2>
              <p className="text-xl text-gray-300">
                Common questions about joining CryptoVerse
              </p>
            </div>

            <div className="space-y-8">
              <div className="border border-white/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-3">How much does it cost to get started?</h3>
                <p className="text-gray-300">
                  Basic registration is free. Business verification costs 0.05 ETH and unlocks premium features including priority support, advanced analytics, and higher airdrop caps.
                </p>
              </div>

              <div className="border border-white/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-3">What blockchain networks do you support?</h3>
                <p className="text-gray-300">
                  We currently support Ethereum mainnet and major L2 solutions. We're expanding to support more networks based on community demand.
                </p>
              </div>

              <div className="border border-white/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-3">How does the reputation system work?</h3>
                <p className="text-gray-300">
                  Our reputation system uses Self Protocol for human verification and tracks user engagement, event attendance, and community contributions to create fair, transparent reputation scores.
                </p>
              </div>

              <div className="border border-white/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-3">Can I customize my event branding?</h3>
                <p className="text-gray-300">
                  Yes! Verified businesses get extensive customization options including custom event pages, branded NFT badges, and personalized analytics dashboards.
                </p>
              </div>

              <div className="border border-white/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-3">What kind of support do you provide?</h3>
                <p className="text-gray-300">
                  All users get access to our documentation and community support. Verified businesses receive priority support, dedicated account management, and technical integration assistance.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 
              className="text-4xl md:text-6xl font-bold uppercase tracking-wider mb-6"
              style={{ fontFamily: "Advercase, monospace" }}
            >
              Ready to Build?
            </h2>
            <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
              Join the next generation of Web3 businesses using CryptoVerse to engage authentic audiences and drive real results.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowOnboarding(true)}
                className="px-12 py-4 bg-white text-black text-xl font-bold uppercase tracking-wider rounded-2xl hover:bg-gray-200 transition-all duration-300 transform hover:scale-105"
                style={{ fontFamily: "Advercase, monospace" }}
              >
                Sign Up →
              </button>
              <button
                onClick={() => window.open('mailto:hello@cryptoverse.com', '_blank')}
                className="px-12 py-4 border-2 border-white text-white text-xl font-bold uppercase tracking-wider rounded-2xl hover:bg-white/10 transition-all duration-300"
                style={{ fontFamily: "Advercase, monospace" }}
              >
                Contact Sales
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-white/20">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <div 
                  className="text-2xl font-bold uppercase tracking-wider mb-4"
                  style={{ fontFamily: "Advercase, monospace" }}
                >
                  CryptoVerse
                </div>
                <p className="text-gray-400">
                  The ultimate Web3 event and community management platform.
                </p>
              </div>
              
              <div>
                <h4 className="font-bold mb-4 uppercase tracking-wider">Platform</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Analytics</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">API Docs</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-bold mb-4 uppercase tracking-wider">Resources</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Tutorials</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Case Studies</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-bold mb-4 uppercase tracking-wider">Company</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-white/20 mt-12 pt-8 text-center text-gray-400">
              <p>&copy; 2024 CryptoVerse. All rights reserved. Built for the decentralized future.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default BusinessLandingPage;
