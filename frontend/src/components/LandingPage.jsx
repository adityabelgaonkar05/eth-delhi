import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import bgHero from "../assets/bg-hero.png";
import bgMiddle from "../assets/bg-middle.png";
import bgEnd from "../assets/bg-end.png";
import bgFooter from "../assets/bg-footer.png";
import { useWallet } from "../context/WalletContext";
import { useToken } from "../context/TokenContract";
import BusinessOnboarding from "./BusinessOnboarding";

const LandingPage = () => {
  const { fetchWallet, account } = useWallet();
  const { fetchBalance } = useToken();
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleWorkWithUs = () => {
    setShowOnboarding(true);
  };

  const handleOnboardingComplete = (formData) => {
    console.log("Business onboarding completed:", formData);
    // Here you can save the data, send to API, etc.
    setShowOnboarding(false);
    // Navigate to the work with us page or show success message
    navigate("/workwithus");
  };

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
  };

  async function handleNavigateGame() {
    console.log("Fetching wallet!");
    await fetchWallet();
    await fetchBalance();
    console.log("wallet fetched: ", account);
    navigate("/game");
  }

  return (
    <div className="w-full">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 via-black/70, via-black/50 to-transparent">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo/Brand Name */}
            <div className="pixel-text text-white text-xl font-bold">
              GameVerse
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center space-x-4">
              <button
                className="navbar-button pixel-text rounded-4xl"
                onClick={() => navigate("/game")}
              >
                Sign Up
              </button>
              <button
                className="navbar-button-primary pixel-text rounded-4xl"
                onClick={handleWorkWithUs}
              >
                Work With Us
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        className="min-h-screen w-full bg-cover bg-center bg-no-repeat flex items-center justify-center"
        style={{
          backgroundImage: `url(${bgHero})`,
        }}
      >
        <div className="text-center text-white py-16">
          <h1 className="text-6xl md:text-8xl font-bold mb-8 pixel-text">
            Welcome
          </h1>
          <p className="text-2xl md:text-3xl mb-12 normal-text font-light">
            Your adventure begins here
          </p>
          <button
            className="arcade-button pixel-text"
            onClick={() => handleNavigateGame()}
          >
            LET'S PLAY!
          </button>
        </div>
      </section>

      {/* Middle Section */}
      <section
        className="min-h-screen w-full bg-cover bg-center bg-no-repeat flex items-center justify-center"
        style={{
          backgroundImage: `url(${bgMiddle})`,
        }}
      >
        <div className="text-center text-white max-w-6xl px-8 py-16">
          <h2 className="text-4xl font-bold mb-8 pixel-text">
            Explore the World
          </h2>
          <p className="text-xl mb-12 normal-text font-light leading-relaxed">
            Discover amazing features and embark on incredible journeys through
            our immersive experience.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-black/60 p-8 rounded-xl border-2 border-white/40 backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-4 pixel-text">
                Feature 1
              </h3>
              <p className="normal-text text-base leading-relaxed">
                Amazing gameplay experience
              </p>
            </div>
            <div className="bg-black/60 p-8 rounded-xl border-2 border-white/40 backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-4 pixel-text">
                Feature 2
              </h3>
              <p className="normal-text text-base leading-relaxed">
                Stunning visuals and graphics
              </p>
            </div>
            <div className="bg-black/60 p-8 rounded-xl border-2 border-white/40 backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-4 pixel-text">
                Feature 3
              </h3>
              <p className="normal-text text-base leading-relaxed">
                Engaging storyline
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* End Section */}
      <section
        className="min-h-screen w-full bg-cover bg-center bg-no-repeat flex items-center justify-center"
        style={{
          backgroundImage: `url(${bgEnd})`,
        }}
      >
        <div className="text-center text-white max-w-4xl px-8 py-16">
          <h2 className="text-5xl md:text-6xl font-bold mb-8 pixel-text">
            Ready to Begin?
          </h2>
          <p className="text-xl md:text-2xl mb-12 normal-text font-light leading-relaxed">
            Join thousands of players in this epic adventure. Your journey
            awaits!
          </p>
          <button
            className="arcade-button pixel-text"
            onClick={() => navigate("/game")}
          >
            START PLAYING
          </button>
        </div>
      </section>

      {/* Footer Section */}
      <footer
        className="w-full bg-cover bg-blue-900 bg-center bg-no-repeat py-12 relative"
        style={{
          backgroundImage: `url(${bgFooter})`,
        }}
      >
        <div className="max-w-6xl mx-auto px-8 text-white py-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div>
              <h4 className="text-lg font-semibold mb-6 pixel-text">Game</h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#"
                    className="hover:text-blue-300 normal-text transition-colors"
                  >
                    Play Now
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-blue-300 normal-text transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-blue-300 normal-text transition-colors"
                  >
                    Screenshots
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-6 pixel-text">
                Community
              </h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#"
                    className="hover:text-blue-300 normal-text transition-colors"
                  >
                    Discord
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-blue-300 normal-text transition-colors"
                  >
                    Forum
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-blue-300 normal-text transition-colors"
                  >
                    Events
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-6 pixel-text">Support</h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#"
                    className="hover:text-blue-300 normal-text transition-colors"
                  >
                    Help Center
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-blue-300 normal-text transition-colors"
                  >
                    Contact Us
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-blue-300 normal-text transition-colors"
                  >
                    Bug Reports
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-6 pixel-text">
                Follow Us
              </h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#"
                    className="hover:text-blue-300 normal-text transition-colors"
                  >
                    Twitter
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-blue-300 normal-text transition-colors"
                  >
                    YouTube
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-blue-300 normal-text transition-colors"
                  >
                    Twitch
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/20 mt-12 pt-8 text-center">
            <p className="normal-text">
              &copy; 2025 Your Game. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
      
      {/* Business Onboarding Modal */}
      <BusinessOnboarding
        isOpen={showOnboarding}
        onClose={handleOnboardingClose}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
};

export default LandingPage;
