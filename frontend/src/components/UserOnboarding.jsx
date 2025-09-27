import React, { useState, useEffect, memo, useCallback } from "react";
import { TextAnimate } from "./ui/text-animate";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/SelfAuthContext";

const UserOnboarding = memo(({ isOpen, onClose, onComplete, userToken, userData }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    tracks: []
  });
  const navigate = useNavigate();

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

  // Store the token when component opens
  useEffect(() => {
    if (userToken && isOpen) {
      localStorage.setItem('authToken', userToken);
      console.log('User token stored:', userToken);
    }
  }, [userToken, isOpen]);

  const availableTracks = [
    'Ethereum',
    'Solana', 
    'Polygon',
    'Self',
    'Flowchain',
    'Bitcoin',
    'Cardano',
    'Avalanche',
    'Other'
  ];

  const questions = [
    {
      id: "username",
      question: "What should we call you?",
      placeholder: "Enter your username",
      type: "text",
      description: "Choose a unique username for the game (3-20 characters)"
    },
    {
      id: "tracks",
      question: "Which blockchains interest you?",
      placeholder: "Select your blockchain interests",
      type: "multiselect",
      description: "Choose the ecosystems you want to explore",
      options: availableTracks
    }
  ];

  const handleInputChange = useCallback((value) => {
    const currentQuestion = questions[currentStep];
    
    if (currentQuestion.type === 'multiselect') {
      // Handle track selection
      setFormData(prev => {
        const currentTracks = prev.tracks || [];
        if (currentTracks.includes(value)) {
          return {
            ...prev,
            tracks: currentTracks.filter(t => t !== value)
          };
        } else {
          return {
            ...prev,
            tracks: [...currentTracks, value]
          };
        }
      });
    } else {
      // Handle regular input
      setFormData(prev => ({
        ...prev,
        [currentQuestion.id]: value
      }));
    }
  }, [currentStep]);

  const handleNext = useCallback(async () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Submit onboarding data
      setIsSubmitting(true);
      
      try {
        console.log('Completing onboarding with data:', formData);
        console.log('User DID:', userData?.did);

        const response = await fetch('http://localhost:3001/api/auth/onboarding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            did: userData?.did,
            username: formData.username,
            tracks: formData.tracks
          }),
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
          console.log('Onboarding completed successfully');
          setIsCompleted(true);
          
          // Update the stored user data
          localStorage.setItem('userData', JSON.stringify(result.userData));
          
          // Call completion callback
          if (onComplete) {
            onComplete(result.userData);
          }
        } else {
          throw new Error(result.message || 'Onboarding failed');
        }
      } catch (error) {
        console.error('Onboarding error:', error);
        alert(`Onboarding failed: ${error.message}`);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [currentStep, formData, userData, onComplete]);

  const handleRedirectToGame = useCallback(() => {
    navigate('/game');
    onClose();
  }, [navigate, onClose]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && isCurrentStepComplete()) {
      handleNext();
    }
  }, [handleNext]);

  const isCurrentStepComplete = useCallback(() => {
    const currentQuestion = questions[currentStep];
    
    if (currentQuestion.type === 'multiselect') {
      return formData.tracks && formData.tracks.length > 0;
    }
    
    const value = formData[currentQuestion.id];
    return value && value.trim() !== "" && value.trim().length >= 3;
  }, [formData, currentStep]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center">
      <div className="w-full h-full flex flex-col items-center justify-center relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-white hover:text-gray-300 transition-colors"
          style={{ fontFamily: "Advercase, monospace" }}
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Progress indicator - only show during onboarding, not completion */}
        {!isCompleted && (
          <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-2">
              {questions.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index <= currentStep ? 'bg-white' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex flex-col items-center justify-center space-y-12 max-w-2xl mx-auto px-8">
          {isCompleted ? (
            // Completion screen
            <>
              <div className="text-center">
                <div
                  className="text-5xl text-white mb-8"
                  style={{ fontFamily: "Advercase, monospace" }}
                >
                  <TextAnimate
                    animation="slideUp"
                    by="word"
                    key="completion-message"
                  >
                    Welcome to CryptoVerse!
                  </TextAnimate>
                </div>
                <p className="text-gray-400 text-lg mb-4" style={{ fontFamily: "Advercase, monospace" }}>
                  Your profile is all set up
                </p>
                <div className="text-[#00ffb6] text-sm space-y-1" style={{ fontFamily: "Advercase, monospace" }}>
                  <p>Username: {formData.username}</p>
                  <p>Interests: {formData.tracks.join(', ')}</p>
                  {userData && (
                    <p>Verified as: {userData.name} ({userData.nationality})</p>
                  )}
                </div>
              </div>
              
              <button
                onClick={handleRedirectToGame}
                className="px-12 py-4 bg-[#00ffb6] text-black hover:bg-[#00e6a6] transition-colors text-lg uppercase tracking-wider font-bold"
                style={{ fontFamily: "Advercase, monospace" }}
              >
                Enter Game
              </button>
            </>
          ) : (
            // Onboarding questions
            <>
              {/* Question */}
              <div className="text-center">
                <div
                  className="text-4xl text-white mb-4"
                  style={{ fontFamily: "Advercase, monospace" }}
                >
                  <TextAnimate
                    animation="slideUp"
                    by="word"
                    key={`question-${currentStep}`}
                  >
                    {questions[currentStep].question}
                  </TextAnimate>
                </div>
                <p className="text-gray-400 text-sm" style={{ fontFamily: "Advercase, monospace" }}>
                  {questions[currentStep].description}
                </p>
              </div>

              {/* User info display */}
              {userData && currentStep === 0 && (
                <div className="text-center text-[#00ffb6] text-sm mb-4" style={{ fontFamily: "Advercase, monospace" }}>
                  <p>✓ Verified as: {userData.name}</p>
                  <p>✓ Nationality: {userData.nationality}</p>
                  <p>✓ Identity confirmed via Self Protocol</p>
                </div>
              )}

              {/* Input field */}
              <div className="w-full max-w-md">
                {questions[currentStep].type === "multiselect" ? (
                  // Multi-select for tracks
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {questions[currentStep].options.map((option) => (
                        <button
                          key={option}
                          onClick={() => handleInputChange(option)}
                          className={`p-3 text-sm border-2 transition-all ${
                            formData.tracks && formData.tracks.includes(option)
                              ? 'border-[#00ffb6] bg-[#00ffb6]/10 text-[#00ffb6]'
                              : 'border-gray-600 text-gray-300 hover:border-gray-400'
                          }`}
                          style={{ fontFamily: "Advercase, monospace" }}
                        >
                          {option}
                          {formData.tracks && formData.tracks.includes(option) && (
                            <span className="ml-1">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                    {formData.tracks && formData.tracks.length > 0 && (
                      <p className="text-[#00ffb6] text-xs text-center" style={{ fontFamily: "Advercase, monospace" }}>
                        Selected: {formData.tracks.join(', ')}
                      </p>
                    )}
                  </div>
                ) : (
                  // Regular text input
                  <input
                    type={questions[currentStep].type}
                    value={formData[questions[currentStep].id] || ""}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder={questions[currentStep].placeholder}
                    className="w-full px-6 py-4 bg-transparent border-b-2 border-white text-white text-xl text-center placeholder-gray-400 focus:outline-none focus:border-[#00ffb6] transition-colors"
                    style={{ fontFamily: "Advercase, monospace" }}
                    onKeyPress={handleKeyPress}
                    autoFocus
                    maxLength={questions[currentStep].id === 'username' ? 20 : undefined}
                  />
                )}
              </div>

              {/* Navigation buttons */}
              <div className="flex space-x-6">
                {currentStep > 0 && (
                  <button
                    onClick={handleBack}
                    className="px-8 py-3 text-white border border-white hover:bg-white hover:text-black transition-colors text-sm uppercase tracking-wider"
                    style={{ fontFamily: "Advercase, monospace" }}
                  >
                    Back
                  </button>
                )}
                
                <button
                  onClick={handleNext}
                  disabled={!isCurrentStepComplete() || isSubmitting}
                  className={`px-8 py-3 text-sm uppercase tracking-wider transition-colors ${
                    isCurrentStepComplete() && !isSubmitting
                      ? 'bg-[#00ffb6] text-black hover:bg-[#00e6a6]'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                  style={{ fontFamily: "Advercase, monospace" }}
                >
                  {isSubmitting ? 'Setting up...' : (currentStep === questions.length - 1 ? 'Complete Setup' : 'Next')}
                </button>
              </div>

              {/* Step indicator */}
              <div 
                className="text-gray-400 text-sm"
                style={{ fontFamily: "Advercase, monospace" }}
              >
                {currentStep + 1} of {questions.length}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

UserOnboarding.displayName = 'UserOnboarding';

export default UserOnboarding;