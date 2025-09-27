import React, { useState, useEffect, memo, useCallback } from "react";
import { TextAnimate } from "./ui/text-animate";
import { useNavigate } from "react-router-dom";

const BusinessOnboarding = memo(({ isOpen, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    cin: "",
    companyType: "",
    email: "",
    password: ""
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

  const questions = [
    {
      id: "companyName",
      question: "What's your company name?",
      placeholder: "Enter your company name",
      type: "text"
    },
    {
      id: "cin",
      question: "What's your company's CIN?",
      placeholder: "Enter your Corporate Identity Number",
      type: "text"
    },
    {
      id: "companyType",
      question: "What type of company is it?",
      placeholder: "Select company type",
      type: "select",
      options: [
        "Private Limited Company",
        "Public Limited Company",
        "One Person Company (OPC)",
        "Limited Liability Partnership (LLP)",
        "Partnership Firm",
        "Sole Proprietorship",
        "Section 8 Company (Non-Profit)",
        "Startup",
        "Other"
      ]
    },
    {
      id: "email",
      question: "What's your business email?",
      placeholder: "Enter your business email",
      type: "email"
    },
    {
      id: "password",
      question: "Set a secure password",
      placeholder: "Enter your password (min. 8 characters)",
      type: "password"
    }
  ];

  const handleInputChange = useCallback((value) => {
    setFormData(prev => ({
      ...prev,
      [questions[currentStep].id]: value
    }));
  }, [currentStep]);

  const handleNext = useCallback(() => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Show completion screen
      setIsCompleted(true);
      onComplete(formData);
    }
  }, [currentStep, formData, onComplete]);

  const handleRedirectToWorkwithus = useCallback(() => {
    navigate('/workwithus');
    onClose();
  }, [navigate, onClose]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && formData[questions[currentStep].id]) {
      handleNext();
    }
  }, [formData, currentStep, handleNext]);

  const isCurrentStepComplete = useCallback(() => {
    return formData[questions[currentStep].id] && formData[questions[currentStep].id].trim() !== "";
  }, [formData, currentStep]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
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
        <div className="flex flex-col items-center justify-center space-y-12">
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
                    key="completion-message" // Static key to prevent re-animation
                  >
                    You're all set!
                  </TextAnimate>
                </div>
                <p className="text-gray-400 text-lg mb-12" style={{ fontFamily: "Advercase, monospace" }}>
                  Welcome to our business platform
                </p>
              </div>
              
              <button
                onClick={handleRedirectToWorkwithus}
                className="px-12 py-4 bg-white text-black hover:bg-gray-200 transition-colors text-lg uppercase tracking-wider"
                style={{ fontFamily: "Advercase, monospace" }}
              >
                Get Started
              </button>
            </>
          ) : (
            // Onboarding questions
            <>
              {/* Question */}
              <div className="text-center">
                <div
                  className="text-4xl text-white mb-2"
                  style={{ fontFamily: "Advercase, monospace" }}
                >
                  <TextAnimate
                    animation="slideUp"
                    by="word"
                    key={`question-${currentStep}`} // Force re-animation only when step changes
                  >
                    {questions[currentStep].question}
                  </TextAnimate>
                </div>
              </div>

              {/* Input field */}
              <div className="w-full max-w-md">
                {questions[currentStep].type === "select" ? (
                  <select
                    value={formData[questions[currentStep].id] || ""}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className="w-full px-6 py-4 bg-transparent border-b-2 border-white text-white text-xl text-center focus:outline-none focus:border-gray-300 transition-colors"
                    style={{ fontFamily: "Advercase, monospace" }}
                    onKeyPress={handleKeyPress}
                  >
                    <option value="" className="bg-black text-white">
                      {questions[currentStep].placeholder}
                    </option>
                    {questions[currentStep].options.map((option, index) => (
                      <option key={index} value={option} className="bg-black text-white">
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={questions[currentStep].type}
                    value={formData[questions[currentStep].id] || ""}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder={questions[currentStep].placeholder}
                    className="w-full px-6 py-4 bg-transparent border-b-2 border-white text-white text-xl text-center placeholder-gray-400 focus:outline-none focus:border-gray-300 transition-colors"
                    style={{ fontFamily: "Advercase, monospace" }}
                    onKeyPress={handleKeyPress}
                    autoFocus
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
              disabled={!isCurrentStepComplete()}
              className={`px-8 py-3 text-sm uppercase tracking-wider transition-colors ${
                isCurrentStepComplete()
                  ? 'bg-white text-black hover:bg-gray-200'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
              style={{ fontFamily: "Advercase, monospace" }}
            >
              {currentStep === questions.length - 1 ? 'Complete' : 'Next'}
            </button>
          </div>

          {/* Step indicator text */}
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

BusinessOnboarding.displayName = 'BusinessOnboarding';

export default BusinessOnboarding;