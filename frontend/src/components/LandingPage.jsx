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
            Enter a world where gaming meets blockchain technology. Experience multiplayer adventures, 
            collect digital pets, host business events, and build communities in the ultimate Web3 universe.
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
            Explore the CryptoVerse
          </h2>
          <p className="text-xl mb-12 normal-text font-light leading-relaxed">
            Discover a comprehensive Web3 platform featuring multiplayer gaming, 
            business tools, and digital collectibles in one unified ecosystem.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-black/60 p-8 rounded-xl border-2 border-white/40 backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-4 pixel-text">
              Multiplayer Gaming
              </h3>
              <p className="normal-text text-base leading-relaxed">
                Experience real-time multiplayer adventures with verified players using Self Protocol authentication. 
                Explore different areas like Cinema, Library, and Townhall.
              </p>
            </div>
            <div className="bg-black/60 p-8 rounded-xl border-2 border-white/40 backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-4 pixel-text">
              Business Tools
              </h3>
              <p className="normal-text text-base leading-relaxed">
                Host video premieres, manage reputation systems, and create engaging business events 
                with blockchain-based community building tools.
              </p>
            </div>
            <div className="bg-black/60 p-8 rounded-xl border-2 border-white/40 backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-4 pixel-text">
                Pet NFT Collection
              </h3>
              <p className="normal-text text-base leading-relaxed">
                Collect and trade digital companion pets with different rarity tiers. 
                Store metadata on Walrus Network and purchase with CVRS tokens.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Business Features Section */}
      <section className="min-h-screen w-full max-w-full bg-black flex items-center justify-center overflow-hidden py-20">
        <div className="text-center text-white max-w-6xl px-4 sm:px-8 py-16 w-full">
          <h2 className="text-4xl font-bold mb-8 pixel-text">
            Built for Modern Businesses
          </h2>
          <p className="text-xl mb-12 normal-text font-light leading-relaxed">
            Transform your business events into immersive Web3 experiences with our comprehensive suite of tools.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 p-8 rounded-xl border-2 border-blue-400/40 backdrop-blur-sm">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-4 pixel-text">
                Video Premieres
              </h3>
              <p className="normal-text text-base leading-relaxed">
                Host exclusive video premieres with interactive features. Engage your audience in real-time 
                during product launches and announcements with Walrus Network storage.
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 p-8 rounded-xl border-2 border-green-400/40 backdrop-blur-sm">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-4 pixel-text">
                Reputation System
              </h3>
              <p className="normal-text text-base leading-relaxed">
                Build trust and credibility with blockchain-based reputation management. 
                Reward engagement and foster community growth with transparent scoring.
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 p-8 rounded-xl border-2 border-purple-400/40 backdrop-blur-sm">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-4 pixel-text">
                Community Building
              </h3>
              <p className="normal-text text-base leading-relaxed">
                Create virtual spaces where your customers and stakeholders can connect, 
                collaborate, and build lasting relationships in the metaverse.
              </p>
            </div>
          </div>
          <div className="mt-12">
            <button
              className="arcade-button-secondary pixel-text text-lg px-8 py-4"
              onClick={() => navigate("/business")}
            >
              EXPLORE BUSINESS TOOLS
            </button>
          </div>
        </div>
      </section>

      {/* Pet NFT Collection Section */}
      <section className="min-h-screen w-full max-w-full bg-gradient-to-br from-purple-900/50 to-blue-900/50 flex items-center justify-center overflow-hidden py-20">
        <div className="text-center text-white max-w-6xl px-4 sm:px-8 py-16 w-full">
          <h2 className="text-4xl font-bold mb-8 pixel-text">
            Collect Digital Companions
          </h2>
          <p className="text-xl mb-12 normal-text font-light leading-relaxed">
            Discover and collect unique digital pets with different rarity tiers. 
            Each pet is stored on Walrus Network and can be purchased with CVRS tokens.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-gradient-to-br from-gray-600/20 to-gray-700/20 p-6 rounded-xl border-2 border-gray-400/40 backdrop-blur-sm">
              <div className="w-12 h-12 bg-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🐾</span>
              </div>
              <h3 className="text-lg font-semibold mb-3 pixel-text text-gray-300">
                COMMON
              </h3>
              <p className="normal-text text-sm leading-relaxed text-gray-300">
                Basic digital companions perfect for beginners. Affordable and widely available.
              </p>
              <div className="mt-4 text-yellow-400 font-bold">
                100 CVRS
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 p-6 rounded-xl border-2 border-blue-400/40 backdrop-blur-sm">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🌟</span>
              </div>
              <h3 className="text-lg font-semibold mb-3 pixel-text text-blue-300">
                RARE
              </h3>
              <p className="normal-text text-sm leading-relaxed text-blue-200">
                Special pets with unique characteristics. More valuable and harder to find.
              </p>
              <div className="mt-4 text-yellow-400 font-bold">
                250 CVRS
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 p-6 rounded-xl border-2 border-purple-400/40 backdrop-blur-sm">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💎</span>
              </div>
              <h3 className="text-lg font-semibold mb-3 pixel-text text-purple-300">
                EPIC
              </h3>
              <p className="normal-text text-sm leading-relaxed text-purple-200">
                Exceptional pets with extraordinary features. Highly sought after by collectors.
              </p>
              <div className="mt-4 text-yellow-400 font-bold">
                500 CVRS
              </div>
            </div>
            <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-700/20 p-6 rounded-xl border-2 border-yellow-400/40 backdrop-blur-sm">
              <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👑</span>
              </div>
              <h3 className="text-lg font-semibold mb-3 pixel-text text-yellow-300">
                LEGENDARY
              </h3>
              <p className="normal-text text-sm leading-relaxed text-yellow-200">
                The ultimate digital companions. Extremely rare and incredibly powerful.
              </p>
              <div className="mt-4 text-yellow-400 font-bold">
                1000 CVRS
              </div>
            </div>
          </div>
          <div className="mt-12">
            <button
              className="arcade-button pixel-text text-lg px-8 py-4"
              onClick={() => navigate("/pets")}
            >
              EXPLORE PET SHOP
            </button>
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
            Ready to Enter CryptoVerse?
          </h2>
          <p className="text-xl md:text-2xl mb-12 normal-text font-light leading-relaxed">
            Join the future of Web3 gaming and business. Experience verified multiplayer adventures, 
            collect digital pets, and build communities in the ultimate blockchain universe.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <button
              className="arcade-button pixel-text text-lg px-8 py-4"
              onClick={() => handleNavigateGame()}
            >
              START GAMING
            </button>
            <button
              className="arcade-button-secondary pixel-text text-lg px-8 py-4"
              onClick={() => navigate("/pets")}
            >
              EXPLORE PETS
            </button>
          </div>
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

        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
