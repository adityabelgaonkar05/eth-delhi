import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import bgHero from "../assets/bg-gif.gif";
import bgMiddle from "../assets/bg-middle.png";
import bgEnd from "../assets/bg-end.png";
import bgFooter from "../assets/bg-footer.png";
import logoCryptoverse from "../assets/logo-cryptoverse.png";
import { useWallet } from "../context/WalletContext";

const LandingPage = () => {
  const navigate = useNavigate();
  const { fetchWallet } = useWallet();

  const handleGameClick = () => {
    navigate("/game");
  };

  const handleNavigateGame = async () => {
    console.log("Connecting to wallet...");
    await fetchWallet();
    console.log("Wallet connected...");
    navigate("/game");
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 via-black/50 to-transparent w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 w-full">
          <div className="flex items-center justify-between w-full">
            {/* Logo/Brand Name */}
            <div className="flex items-center">
              <img
                src={logoCryptoverse}
                alt="Cryptoverse"
                className="h-8 w-auto"
                onClick={() => navigate("/")}
                style={{ cursor: "pointer" }}
              />
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center space-x-2 sm:space-x-4 flex-wrap">
              <button
                className="navbar-button pixel-text rounded-4xl"
                onClick={() => navigate("/business")}
              >
                For Businesses
              </button>
              <button
                className="navbar-button pixel-text rounded-4xl"
                onClick={() => navigate("/pets")}
              >
                Pet Shop
              </button>
              <button
                className="navbar-button pixel-text rounded-4xl"
                onClick={handleGameClick}
              >
                Play Game
              </button>
              <button
                className="navbar-button-primary pixel-text rounded-4xl"
                onClick={() => navigate("/auth")}
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        className="min-h-screen w-full max-w-full bg-cover bg-center bg-no-repeat flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `url(${bgHero})`,
        }}
      >
        <div className="text-center text-white py-16 max-w-4xl mx-auto px-4 sm:px-8 w-full">
          <img
            src={logoCryptoverse}
            alt="CRYPTOVERSE"
            className="mx-auto mb-8 max-w-full h-auto w-auto max-h-32 md:max-h-40"
          />
          <p className="text-xl md:text-2xl mb-12 normal-text font-light leading-relaxed">
            Enter a world where gaming meets blockchain technology. Build,
            explore, and create in the ultimate virtual universe.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <button
              className="arcade-button pixel-text text-lg px-8 py-4"
              onClick={() => handleNavigateGame()}
            >
              ENTER WORLD
            </button>
            <button
              className="arcade-button-secondary pixel-text text-lg px-8 py-4"
              onClick={() => navigate("/business")}
            >
              FOR BUSINESSES
            </button>
          </div>
        </div>
      </section>

      {/* Middle Section */}
      <section
        className="min-h-screen w-full max-w-full bg-cover bg-center bg-no-repeat flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `url(${bgMiddle})`,
        }}
      >
        <div className="text-center text-white max-w-6xl px-4 sm:px-8 py-16 w-full">
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
        className="min-h-screen w-full max-w-full bg-cover bg-center bg-no-repeat flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `url(${bgEnd})`,
        }}
      >
        <div className="text-center text-white max-w-4xl px-4 sm:px-8 py-16 w-full">
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
        className="w-full max-w-full bg-cover bg-blue-900 bg-center bg-no-repeat py-12 relative overflow-hidden"
        style={{
          backgroundImage: `url(${bgFooter})`,
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-8 text-white py-8 relative z-10 w-full">
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
    </div>
  );
};

export default LandingPage;
