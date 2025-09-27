import React, { useState } from "react";
import TokenLeaderboard from "./TokenLeaderboard";
import ReputationLeaderboard from "./ReputationLeaderboard";

const LeaderboardsPage = () => {
  const [activeTab, setActiveTab] = useState("tokens");

  return (
    <div
      className="min-h-screen py-8 px-6"
      style={{
        fontFamily: "monospace",
        backgroundImage: "url(/src/assets/bg-sections.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Page Header */}
        <div className="text-center">
          <div
            style={{
              backgroundColor: "#2a1810",
              border: "3px solid #8b4513",
              borderRadius: "0",
              boxShadow:
                "6px 6px 0px #1a0f08, inset 2px 2px 0px #d2b48c, inset -2px -2px 0px #654321",
              padding: "25px",
              imageRendering: "pixelated",
              textShadow: "2px 2px 0px #1a0f08",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
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
                background:
                  "linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)",
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
                background:
                  "linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)",
                imageRendering: "pixelated",
              }}
            />

            <div className="flex items-center justify-center gap-4 mb-3">
              <span style={{ color: "#d2b48c", fontSize: "2rem" }}>⚔️</span>
              <h1
                className="text-4xl font-bold uppercase tracking-wider"
                style={{
                  fontFamily: "monospace",
                  textShadow: "3px 3px 0px #1a0f08",
                  color: "#d2b48c",
                  fontWeight: "bold",
                }}
              >
                LEADERBOARDS
              </h1>
              <span style={{ color: "#d2b48c", fontSize: "2rem" }}>⚔️</span>
            </div>
            <p
              className="uppercase tracking-wider text-lg"
              style={{
                fontFamily: "monospace",
                color: "#ffd700",
                fontWeight: "bold",
              }}
            >
              COMPETE & CLIMB THE RANKINGS
            </p>
          </div>

          {/* Tab Navigation */}
          <div
            style={{
              backgroundColor: "#2a1810",
              border: "3px solid #8b4513",
              borderRadius: "0",
              boxShadow:
                "6px 6px 0px #1a0f08, inset 2px 2px 0px #d2b48c, inset -2px -2px 0px #654321",
              padding: "15px",
              imageRendering: "pixelated",
              textShadow: "2px 2px 0px #1a0f08",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
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
                background:
                  "linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)",
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
                background:
                  "linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)",
                imageRendering: "pixelated",
              }}
            />

            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("tokens")}
                className={`px-6 py-3 font-bold uppercase transition-all duration-200 ${
                  activeTab === "tokens"
                    ? "text-white"
                    : "text-yellow-400 hover:text-white"
                }`}
                style={{
                  fontFamily: "monospace",
                  borderStyle: "solid",
                  border: "2px solid #8b4513",
                  backgroundColor:
                    activeTab === "tokens" ? "#44ff44" : "transparent",
                  borderRadius: "0",
                  textShadow: "2px 2px 0px #1a0f08",
                }}
              >
                💰 TOKENS
              </button>
              <button
                onClick={() => setActiveTab("reputation")}
                className={`px-6 py-3 font-bold uppercase transition-all duration-200 ${
                  activeTab === "reputation"
                    ? "text-white"
                    : "text-yellow-400 hover:text-white"
                }`}
                style={{
                  fontFamily: "monospace",
                  borderStyle: "solid",
                  border: "2px solid #8b4513",
                  backgroundColor:
                    activeTab === "reputation" ? "#ff6b6b" : "transparent",
                  borderRadius: "0",
                  textShadow: "2px 2px 0px #1a0f08",
                }}
              >
                🏆 REPUTATION
              </button>
            </div>
          </div>
        </div>

        {/* Leaderboard Content */}
        <div
          style={{
            backgroundColor: "#2a1810",
            border: "3px solid #8b4513",
            borderRadius: "0",
            boxShadow:
              "6px 6px 0px #1a0f08, inset 2px 2px 0px #d2b48c, inset -2px -2px 0px #654321",
            padding: "25px",
            imageRendering: "pixelated",
            textShadow: "2px 2px 0px #1a0f08",
            position: "relative",
          }}
        >
          <div className="mb-4">
            <h2
              className="text-2xl font-bold uppercase tracking-wider text-center"
              style={{
                fontFamily: "monospace",
                textShadow: "2px 2px 0px #1a0f08",
                color: "#d2b48c",
                fontWeight: "bold",
              }}
            >
              {activeTab === "tokens"
                ? "💰 TOP TOKEN HOLDERS"
                : "🏆 REPUTATION CHAMPIONS"}
            </h2>
          </div>
          <div
            style={{
              backgroundColor: "#1a0f08",
              border: "2px solid #654321",
              borderRadius: "0",
              padding: "15px",
              margin: "10px 0",
            }}
          >
            {activeTab === "tokens" && <TokenLeaderboard />}
            {activeTab === "reputation" && <ReputationLeaderboard />}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* How Rankings Work */}
          <div
            style={{
              backgroundColor: "#2a1810",
              border: "3px solid #8b4513",
              borderRadius: "0",
              boxShadow:
                "6px 6px 0px #1a0f08, inset 2px 2px 0px #d2b48c, inset -2px -2px 0px #654321",
              padding: "20px",
              imageRendering: "pixelated",
              textShadow: "2px 2px 0px #1a0f08",
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
                background:
                  "linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)",
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
                background:
                  "linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)",
                imageRendering: "pixelated",
              }}
            />

            <h3
              className="text-xl font-bold mb-4 uppercase tracking-wider text-center"
              style={{
                fontFamily: "monospace",
                textShadow: "2px 2px 0px #1a0f08",
                color: "#d2b48c",
                fontWeight: "bold",
              }}
            >
              📊 HOW RANKINGS WORK
            </h3>
            <div className="space-y-4">
              <div
                style={{
                  backgroundColor: "#1a0f08",
                  border: "2px solid #44ff44",
                  borderRadius: "0",
                  padding: "15px",
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">💰</span>
                  <h4
                    className="font-bold uppercase tracking-wider"
                    style={{
                      fontFamily: "monospace",
                      color: "#44ff44",
                      fontWeight: "bold",
                    }}
                  >
                    TOKEN BALANCE
                  </h4>
                </div>
                <ul
                  className="space-y-1 text-sm uppercase tracking-wide"
                  style={{
                    fontFamily: "monospace",
                    color: "#ffd700",
                    fontWeight: "bold",
                  }}
                >
                  <li>• RANKED BY TOTAL CVRS HOLDINGS</li>
                  <li>• AUTO-UPDATED ON BALANCE CHANGE</li>
                  <li>• EARN THROUGH PLATFORM ACTIVITIES</li>
                  <li>• PURCHASE PETS & JOIN EVENTS</li>
                </ul>
              </div>
              <div
                style={{
                  backgroundColor: "#1a0f08",
                  border: "2px solid #ff6b6b",
                  borderRadius: "0",
                  padding: "15px",
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🏆</span>
                  <h4
                    className="font-bold uppercase tracking-wider"
                    style={{
                      fontFamily: "monospace",
                      color: "#ff6b6b",
                      fontWeight: "bold",
                    }}
                  >
                    REPUTATION
                  </h4>
                </div>
                <ul
                  className="space-y-1 text-sm uppercase tracking-wide"
                  style={{
                    fontFamily: "monospace",
                    color: "#ffd700",
                    fontWeight: "bold",
                  }}
                >
                  <li>• ACTIVITY & COMMUNITY ENGAGEMENT</li>
                  <li>• EARN POINTS THROUGH ACTIVITIES</li>
                  <li>• COMPLETE QUIZZES & ATTEND EVENTS</li>
                  <li>• BUILD REPUTATION FOR BENEFITS</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div
            style={{
              backgroundColor: "#2a1810",
              border: "3px solid #8b4513",
              borderRadius: "0",
              boxShadow:
                "6px 6px 0px #1a0f08, inset 2px 2px 0px #d2b48c, inset -2px -2px 0px #654321",
              padding: "20px",
              imageRendering: "pixelated",
              textShadow: "2px 2px 0px #1a0f08",
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
                background:
                  "linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)",
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
                background:
                  "linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)",
                imageRendering: "pixelated",
              }}
            />

            <h3
              className="text-xl font-bold mb-4 uppercase tracking-wider text-center"
              style={{
                fontFamily: "monospace",
                textShadow: "2px 2px 0px #1a0f08",
                color: "#d2b48c",
                fontWeight: "bold",
              }}
            >
              🚀 IMPROVE YOUR RANKINGS
            </h3>
            <div className="space-y-3">
              <div
                style={{
                  backgroundColor: "#1a0f08",
                  border: "2px solid #654321",
                  borderRadius: "0",
                  padding: "15px",
                }}
              >
                <p
                  className="mb-4 uppercase tracking-wider text-center"
                  style={{
                    fontFamily: "monospace",
                    color: "#ffd700",
                    fontWeight: "bold",
                  }}
                >
                  CLIMB THE LEADERBOARD
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => (window.location.href = "/game")}
                    className="px-3 py-2 text-white font-bold uppercase transition-all duration-200 text-xs"
                    style={{
                      fontFamily: "monospace",
                      borderStyle: "solid",
                      border: "2px solid #8b4513",
                      backgroundColor: "#44ff44",
                      borderRadius: "0",
                      textShadow: "2px 2px 0px #1a0f08",
                    }}
                  >
                    🎮 PLAY
                  </button>
                  <button
                    onClick={() => (window.location.href = "/pets")}
                    className="px-3 py-2 text-white font-bold uppercase transition-all duration-200 text-xs"
                    style={{
                      fontFamily: "monospace",
                      borderStyle: "solid",
                      border: "2px solid #8b4513",
                      backgroundColor: "#ff6b6b",
                      borderRadius: "0",
                      textShadow: "2px 2px 0px #1a0f08",
                    }}
                  >
                    🐾 PETS
                  </button>
                  <button
                    onClick={() => (window.location.href = "/library")}
                    className="px-3 py-2 text-white font-bold uppercase transition-all duration-200 text-xs"
                    style={{
                      fontFamily: "monospace",
                      borderStyle: "solid",
                      border: "2px solid #8b4513",
                      backgroundColor: "#6b6bff",
                      borderRadius: "0",
                      textShadow: "2px 2px 0px #1a0f08",
                    }}
                  >
                    📚 LIBRARY
                  </button>
                  <button
                    onClick={() => (window.location.href = "/townhall")}
                    className="px-3 py-2 text-white font-bold uppercase transition-all duration-200 text-xs"
                    style={{
                      fontFamily: "monospace",
                      borderStyle: "solid",
                      border: "2px solid #8b4513",
                      backgroundColor: "#ffa500",
                      borderRadius: "0",
                      textShadow: "2px 2px 0px #1a0f08",
                    }}
                  >
                    🏛️ TOWN
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardsPage;
