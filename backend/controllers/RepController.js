const express = require("express");
const User = require("../models/User");

/**
 * Comprehensive Game Data Controller
 * 
 * A sophisticated system that calculates and manages all aspects of user game data:
 * - Level & Experience: Dynamic progression system
 * - Reputation: Multi-dimensional scoring algorithm
 * - Activity Metrics: Engagement tracking and analysis
 * - Achievement System: Badge and milestone management
 * - Performance Analytics: Skill assessment and growth tracking
 * - Social Metrics: Community interaction scoring
 * - Trust & Verification: Identity and credibility scoring
 */

// Game Data Configuration
const GAME_CONFIG = {
  // Level & Experience System
  leveling: {
    baseXP: 100,
    xpGrowthRate: 1.5,
    maxLevel: 100,
    xpMultipliers: {
      dailyLogin: 1.2,
      streakBonus: 1.5,
      verifiedUser: 1.3,
      newUser: 2.0
    }
  },

  // Reputation System
  reputation: {
    maxScore: 10000,
    weights: {
      activity: 0.35,      // Activity & Engagement
      social: 0.25,        // Social & Community
      achievement: 0.20,   // Achievement & Skills
      trust: 0.15,         // Trust & Verification
      consistency: 0.05    // Consistency & Reliability
    },
    tiers: [
      { name: 'Bronze', minScore: 0, maxScore: 999, color: '#CD7F32', badge: '🥉', multiplier: 1.0 },
      { name: 'Silver', minScore: 1000, maxScore: 2499, color: '#C0C0C0', badge: '🥈', multiplier: 1.1 },
      { name: 'Gold', minScore: 2500, maxScore: 4999, color: '#FFD700', badge: '🥇', multiplier: 1.2 },
      { name: 'Platinum', minScore: 5000, maxScore: 7499, color: '#E5E4E2', badge: '💎', multiplier: 1.3 },
      { name: 'Diamond', minScore: 7500, maxScore: 9499, color: '#B9F2FF', badge: '💎', multiplier: 1.4 },
      { name: 'Legendary', minScore: 9500, maxScore: 10000, color: '#FF6B6B', badge: '👑', multiplier: 1.5 }
    ]
  },

  // Activity Metrics
  activity: {
    sessionThresholds: {
      short: 5,    // minutes
      medium: 15,
      long: 30,
      extended: 60
    },
    qualityFactors: {
      excellent: 1.5,
      good: 1.2,
      average: 1.0,
      poor: 0.8
    }
  },

  // Achievement System
  achievements: {
    categories: {
      onboarding: { weight: 1.0, maxPoints: 100 },
      activity: { weight: 1.5, maxPoints: 500 },
      social: { weight: 1.2, maxPoints: 300 },
      skill: { weight: 2.0, maxPoints: 800 },
      special: { weight: 3.0, maxPoints: 1000 }
    }
  }
};

/**
 * Calculate Level and Experience Points
 */
function calculateLevelAndXP(user, activityData) {
  const { minutesWatched = 0, sessionQuality = 'average', isStreak = false, isNewUser = false } = activityData;
  
  // Base XP calculation
  let baseXP = Math.floor(minutesWatched * 2); // 2 XP per minute
  
  // Quality multiplier
  const qualityMultiplier = GAME_CONFIG.activity.qualityFactors[sessionQuality] || 1.0;
  baseXP = Math.floor(baseXP * qualityMultiplier);
  
  // Apply bonuses
  let totalMultiplier = 1.0;
  
  if (isNewUser) {
    totalMultiplier *= GAME_CONFIG.leveling.xpMultipliers.newUser;
  }
  
  if (isStreak) {
    totalMultiplier *= GAME_CONFIG.leveling.xpMultipliers.streakBonus;
  }
  
  if (user.isVerified) {
    totalMultiplier *= GAME_CONFIG.leveling.xpMultipliers.verifiedUser;
  }
  
  // Daily login bonus
  const lastActive = user.gameData?.lastActive;
  const now = new Date();
  const daysSinceLastActive = lastActive ? Math.floor((now - lastActive) / (1000 * 60 * 60 * 24)) : 1;
  
  if (daysSinceLastActive === 1) {
    totalMultiplier *= GAME_CONFIG.leveling.xpMultipliers.dailyLogin;
  }
  
  const earnedXP = Math.floor(baseXP * totalMultiplier);
  const newTotalXP = (user.gameData?.experience || 0) + earnedXP;
  
  // Calculate new level
  let newLevel = user.gameData?.level || 1;
  const { baseXP: levelBaseXP, xpGrowthRate } = GAME_CONFIG.leveling;
  
  while (newLevel < GAME_CONFIG.leveling.maxLevel) {
    const xpNeededForNextLevel = Math.floor(levelBaseXP * Math.pow(xpGrowthRate, newLevel - 1));
    if (newTotalXP >= xpNeededForNextLevel) {
      newLevel++;
    } else {
      break;
    }
  }
  
  return {
    level: Math.min(newLevel, GAME_CONFIG.leveling.maxLevel),
    experience: newTotalXP,
    earnedXP,
    xpToNextLevel: newLevel < GAME_CONFIG.leveling.maxLevel ? 
      Math.floor(levelBaseXP * Math.pow(xpGrowthRate, newLevel - 1)) - newTotalXP : 0,
    levelProgress: newLevel < GAME_CONFIG.leveling.maxLevel ? 
      ((newTotalXP - Math.floor(levelBaseXP * Math.pow(xpGrowthRate, newLevel - 2))) / 
       (Math.floor(levelBaseXP * Math.pow(xpGrowthRate, newLevel - 1)) - Math.floor(levelBaseXP * Math.pow(xpGrowthRate, newLevel - 2)))) * 100 : 100
  };
}

/**
 * Calculate Activity Score
 */
function calculateActivityScore(user, activityData) {
  const { minutesWatched = 0, sessionQuality = 'average', durationInMinutes = 1 } = activityData;
  
  // Watch time efficiency
  const watchEfficiency = Math.min(minutesWatched / Math.max(durationInMinutes, 1), 1.0);
  const watchTimeScore = Math.floor(watchEfficiency * 100);
  
  // Session quality score
  const qualityScore = GAME_CONFIG.activity.qualityFactors[sessionQuality] * 50;
  
  // Consistency score (based on regular activity)
  const lastActive = user.gameData?.lastActive;
  const now = new Date();
  const daysSinceLastActive = lastActive ? Math.floor((now - lastActive) / (1000 * 60 * 60 * 24)) : 0;
  
  let consistencyScore = 0;
  if (daysSinceLastActive <= 1) {
    consistencyScore = 100; // Active today
  } else if (daysSinceLastActive <= 3) {
    consistencyScore = 80; // Active within 3 days
  } else if (daysSinceLastActive <= 7) {
    consistencyScore = 60; // Active within a week
  } else if (daysSinceLastActive <= 30) {
    consistencyScore = 40; // Active within a month
  } else {
    consistencyScore = 20; // Inactive
  }
  
  // Engagement depth score
  const engagementScore = Math.floor((minutesWatched / 60) * 100); // Max 100 for 1 hour
  
  return {
    total: Math.floor((watchTimeScore + qualityScore + consistencyScore + engagementScore) / 4),
    watchTime: watchTimeScore,
    quality: Math.floor(qualityScore),
    consistency: consistencyScore,
    engagement: Math.floor(Math.min(engagementScore, 100))
  };
}

/**
 * Calculate Social Score
 */
function calculateSocialScore(user, socialData = {}) {
  const { socialActions = {}, collaborations = 0, helpfulness = 0 } = socialData;
  
  // Collaboration score
  const collaborationScore = Math.min(collaborations * 10, 100);
  
  // Helpfulness score
  const helpfulnessScore = Math.min(helpfulness * 5, 100);
  
  // Community engagement
  let communityScore = 0;
  if (user.username && user.username !== 'Anonymous') {
    communityScore += 30;
  }
  if (user.tracks && user.tracks.length > 0) {
    communityScore += Math.min(user.tracks.length * 10, 40);
  }
  if (user.onboardingCompleted) {
    communityScore += 30;
  }
  
  return {
    total: Math.floor((collaborationScore + helpfulnessScore + communityScore) / 3),
    collaboration: collaborationScore,
    helpfulness: helpfulnessScore,
    community: Math.min(communityScore, 100)
  };
}

/**
 * Calculate Achievement Score
 */
function calculateAchievementScore(user, achievementData = {}) {
  const { newAchievements = [], skillProgress = 0 } = achievementData;
  
  // Existing achievements
  const existingAchievements = user.gameData?.achievements || [];
  const achievementScore = Math.min(existingAchievements.length * 20, 200);
  
  // New achievements bonus
  const newAchievementScore = newAchievements.length * 50;
  
  // Skill progression
  const skillScore = Math.min(skillProgress, 100);
  
  // Badge system
  const badgeScore = (user.badges || []).length * 25;
  
  return {
    total: Math.floor((achievementScore + newAchievementScore + skillScore + badgeScore) / 4),
    existing: achievementScore,
    new: newAchievementScore,
    skills: skillScore,
    badges: Math.min(badgeScore, 200)
  };
}

/**
 * Calculate Trust Score
 */
function calculateTrustScore(user) {
  let verificationScore = 0;
  let credibilityScore = 0;
  
  // Self Protocol verification
  if (user.isVerified) {
    verificationScore = 100;
    
    // Time-based credibility
    if (user.verificationDate) {
      const daysSinceVerification = Math.floor((new Date() - new Date(user.verificationDate)) / (1000 * 60 * 60 * 24));
      if (daysSinceVerification >= 365) {
        credibilityScore = 100; // 1+ year
      } else if (daysSinceVerification >= 180) {
        credibilityScore = 80; // 6+ months
      } else if (daysSinceVerification >= 30) {
        credibilityScore = 60; // 1+ month
      } else {
        credibilityScore = 40; // Recent
      }
    }
  }
  
  // Profile completeness
  let profileScore = 0;
  if (user.name && user.name !== 'Anonymous') profileScore += 20;
  if (user.nationality) profileScore += 15;
  if (user.gender) profileScore += 10;
  if (user.userDefinedData) profileScore += 25;
  if (user.onboardingCompleted) profileScore += 30;
  
  return {
    total: Math.floor((verificationScore + credibilityScore + profileScore) / 3),
    verification: verificationScore,
    credibility: credibilityScore,
    profile: Math.min(profileScore, 100)
  };
}

/**
 * Calculate Consistency Score
 */
function calculateConsistencyScore(user) {
  const lastActive = user.gameData?.lastActive;
  const createdAt = user.createdAt;
  const now = new Date();
  
  // Account age consistency
  const accountAge = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
  const daysSinceLastActive = lastActive ? Math.floor((now - lastActive) / (1000 * 60 * 60 * 24)) : accountAge;
  
  let consistencyScore = 0;
  
  // Recent activity consistency
  if (daysSinceLastActive <= 1) {
    consistencyScore = 100;
  } else if (daysSinceLastActive <= 3) {
    consistencyScore = 80;
  } else if (daysSinceLastActive <= 7) {
    consistencyScore = 60;
  } else if (daysSinceLastActive <= 30) {
    consistencyScore = 40;
  } else {
    consistencyScore = 20;
  }
  
  // Account maturity bonus
  if (accountAge >= 365) {
    consistencyScore += 20; // 1+ year old account
  } else if (accountAge >= 180) {
    consistencyScore += 15; // 6+ months
  } else if (accountAge >= 30) {
    consistencyScore += 10; // 1+ month
  }
  
  return Math.min(consistencyScore, 100);
}

/**
 * Calculate comprehensive reputation score
 */
function calculateReputationScore(user, activityData, socialData, achievementData) {
  const activityScore = calculateActivityScore(user, activityData);
  const socialScore = calculateSocialScore(user, socialData);
  const achievementScore = calculateAchievementScore(user, achievementData);
  const trustScore = calculateTrustScore(user);
  const consistencyScore = calculateConsistencyScore(user);
  
  // Weighted calculation
  const weightedScore = (
    activityScore.total * GAME_CONFIG.reputation.weights.activity +
    socialScore.total * GAME_CONFIG.reputation.weights.social +
    achievementScore.total * GAME_CONFIG.reputation.weights.achievement +
    trustScore.total * GAME_CONFIG.reputation.weights.trust +
    consistencyScore * GAME_CONFIG.reputation.weights.consistency
  );
  
  // Apply tier multiplier
  const currentTier = getTierFromScore(user.gameData?.reputationScore || 0);
  const tierMultiplier = currentTier.multiplier || 1.0;
  
  const finalScore = Math.min(
    Math.round(weightedScore * tierMultiplier),
    GAME_CONFIG.reputation.maxScore
  );
  
  return {
    total: finalScore,
    breakdown: {
      activity: activityScore,
      social: socialScore,
      achievement: achievementScore,
      trust: trustScore,
      consistency: consistencyScore
    },
    weighted: Math.round(weightedScore),
    tierMultiplier
  };
}

/**
 * Get tier information from score
 */
function getTierFromScore(score) {
  return GAME_CONFIG.reputation.tiers.find(tier => 
    score >= tier.minScore && score <= tier.maxScore
  ) || GAME_CONFIG.reputation.tiers[0];
}

/**
 * Get next tier information
 */
function getNextTier(currentScore) {
  const currentTier = getTierFromScore(currentScore);
  const currentIndex = GAME_CONFIG.reputation.tiers.findIndex(tier => tier.name === currentTier.name);
  
  if (currentIndex < GAME_CONFIG.reputation.tiers.length - 1) {
    return {
      ...GAME_CONFIG.reputation.tiers[currentIndex + 1],
      pointsNeeded: GAME_CONFIG.reputation.tiers[currentIndex + 1].minScore - currentScore
    };
  }
  
  return null; // Already at max tier
}

/**
 * Main Game Data Calculation Function
 */
module.exports.CalculateRep = async (req, res) => {
  try {
    const { userIdentifier } = req.params;
    const { 
      minutesWatched = 0, 
      durationInMinutes = 1, 
      sessionQuality = 'average',
      socialActions = {},
      collaborations = 0,
      helpfulness = 0,
      newAchievements = [],
      skillProgress = 0,
      isStreak = false,
      isNewUser = false,
      forceRecalculate = false 
    } = req.body;

    if (!userIdentifier) {
      return res.status(400).json({
        status: "fail",
        message: "User identifier is required"
      });
    }

    console.log(`🎮 Starting comprehensive game data calculation for: ${userIdentifier}`);

    const user = await User.findOne({ userIdentifier });
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found. Please complete Self Protocol verification first."
      });
    }

    // Initialize gameData if not exists
    if (!user.gameData) {
      user.gameData = {
        level: 1,
        experience: 0,
        achievements: [],
        lastActive: new Date()
      };
    }

    // Prepare activity data
    const activityData = {
      minutesWatched,
      durationInMinutes,
      sessionQuality,
      isStreak,
      isNewUser
    };

    const socialData = {
      socialActions,
      collaborations,
      helpfulness
    };

    const achievementData = {
      newAchievements,
      skillProgress
    };

    // Calculate all game data components
    const levelData = calculateLevelAndXP(user, activityData);
    const reputationData = calculateReputationScore(user, activityData, socialData, achievementData);
    
    // Update user game data
    user.gameData.level = levelData.level;
    user.gameData.experience = levelData.experience;
    user.gameData.reputationScore = reputationData.total;
    user.gameData.reputationTier = getTierFromScore(reputationData.total).name;
    user.gameData.lastActive = new Date();
    
    // Update achievements
    if (newAchievements.length > 0) {
      user.gameData.achievements = [...(user.gameData.achievements || []), ...newAchievements];
    }
    
    // Store detailed breakdowns
    user.gameData.activityMetrics = reputationData.breakdown.activity;
    user.gameData.socialMetrics = reputationData.breakdown.social;
    user.gameData.achievementMetrics = reputationData.breakdown.achievement;
    user.gameData.trustMetrics = reputationData.breakdown.trust;
    user.gameData.consistencyScore = reputationData.breakdown.consistency;
    
    // Add to reputation history
    if (!user.gameData.reputationHistory) {
      user.gameData.reputationHistory = [];
    }

    const previousScore = user.gameData.reputationScore || 0;
    const scoreChange = reputationData.total - previousScore;

    user.gameData.reputationHistory.push({
      date: new Date(),
      score: reputationData.total,
      tier: getTierFromScore(reputationData.total).name,
      changeReason: `Activity update: ${scoreChange >= 0 ? '+' : ''}${scoreChange} points`,
      changeAmount: scoreChange,
      breakdown: reputationData.breakdown
    });

    // Keep only last 100 history entries
    if (user.gameData.reputationHistory.length > 100) {
      user.gameData.reputationHistory = user.gameData.reputationHistory.slice(-100);
    }

    await user.save();

    console.log(`✅ Game data calculated successfully for ${userIdentifier}`);

    return res.status(200).json({
      status: "success",
      message: "Game data calculated successfully",
      data: {
        userIdentifier: user.userIdentifier,
        username: user.username,
        
        // Level & Experience
        level: {
          current: levelData.level,
          experience: levelData.experience,
          earnedXP: levelData.earnedXP,
          xpToNextLevel: levelData.xpToNextLevel,
          levelProgress: levelData.levelProgress
        },
        
        // Reputation
        reputation: {
          score: reputationData.total,
          previousScore,
          scoreChange,
          tier: {
            current: getTierFromScore(reputationData.total),
            previous: getTierFromScore(previousScore),
            changed: getTierFromScore(reputationData.total).name !== getTierFromScore(previousScore).name
          },
          nextTier: getNextTier(reputationData.total),
          breakdown: reputationData.breakdown,
          weighted: reputationData.weighted,
          tierMultiplier: reputationData.tierMultiplier
        },
        
        // Activity Metrics
        activity: {
          sessionDuration: minutesWatched,
          sessionQuality,
          efficiency: Math.round((minutesWatched / Math.max(durationInMinutes, 1)) * 100),
          lastActive: user.gameData.lastActive
        },
        
        // Achievements
        achievements: {
          total: user.gameData.achievements.length,
          new: newAchievements,
          recent: user.gameData.achievements.slice(-5)
        },
        
        // User Status
        status: {
          isVerified: user.isVerified,
          onboardingCompleted: user.onboardingCompleted,
          accountAge: Math.floor((new Date() - user.createdAt) / (1000 * 60 * 60 * 24)),
          tracks: user.tracks
        },
        
        calculatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("❌ Error calculating game data:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to calculate game data",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error"
    });
  }
};

/**
 * Get User Game Data (Read-only endpoint)
 */
module.exports.GetGameData = async (req, res) => {
  try {
    const { userIdentifier } = req.params;

    if (!userIdentifier) {
      return res.status(400).json({
        status: "fail",
        message: "User identifier is required"
      });
    }

    const user = await User.findOne({ userIdentifier });
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found"
      });
    }

    return res.status(200).json({
      status: "success",
      data: {
        userIdentifier: user.userIdentifier,
        username: user.username,
        gameData: user.gameData,
        reputation: user.gameData?.reputationScore || 0,
        tier: getTierFromScore(user.gameData?.reputationScore || 0),
        badges: user.badges || [],
        nfts: user.nfts || [],
        isVerified: user.isVerified,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error("❌ Error fetching game data:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch game data",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error"
    });
  }
};

/**
 * Reset User Game Data (Admin function)
 */
module.exports.ResetGameData = async (req, res) => {
  try {
    const { userIdentifier } = req.params;
    const { confirmReset } = req.body;

    if (!userIdentifier) {
      return res.status(400).json({
        status: "fail",
        message: "User identifier is required"
      });
    }

    if (!confirmReset) {
      return res.status(400).json({
        status: "fail",
        message: "Reset confirmation required"
      });
    }

    const user = await User.findOne({ userIdentifier });
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found"
      });
    }

    // Reset game data to defaults
    user.gameData = {
      level: 1,
      experience: 0,
      achievements: [],
      lastActive: new Date()
    };

    await user.save();

    return res.status(200).json({
      status: "success",
      message: "Game data reset successfully"
    });

  } catch (error) {
    console.error("❌ Error resetting game data:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to reset game data",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error"
    });
  }
};