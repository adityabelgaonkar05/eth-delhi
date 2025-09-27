const express = require("express");
const User = require("../models/User");

/**
 * Enhanced Reputation System
 * 
 * A comprehensive reputation calculation system that evaluates users across multiple dimensions:
 * - Activity & Engagement (40%): Watch time, consistency, session quality
 * - Social & Community (30%): Collaboration, helpfulness, interactions  
 * - Achievement & Skills (20%): Badges, completions, milestones
 * - Trust & Verification (10%): Self Protocol verification, trust signals
 */

// Reputation configuration
const REPUTATION_CONFIG = {
  maxScore: 10000,
  weights: {
    activity: 0.40,     // Activity & Engagement
    social: 0.30,       // Social & Community
    achievement: 0.20,  // Achievement & Skills
    trust: 0.10         // Trust & Verification
  },
  tiers: [
    { name: 'Bronze', minScore: 0, maxScore: 999, color: '#CD7F32', badge: '🥉' },
    { name: 'Silver', minScore: 1000, maxScore: 2499, color: '#C0C0C0', badge: '🥈' },
    { name: 'Gold', minScore: 2500, maxScore: 4999, color: '#FFD700', badge: '🥇' },
    { name: 'Platinum', minScore: 5000, maxScore: 7499, color: '#E5E4E2', badge: '💎' },
    { name: 'Diamond', minScore: 7500, maxScore: 9499, color: '#B9F2FF', badge: '💎' },
    { name: 'Legendary', minScore: 9500, maxScore: 10000, color: '#FF6B6B', badge: '👑' }
  ],
  bonusMultipliers: {
    newUser: 1.5,        // First 30 days
    verified: 1.2,       // Self Protocol verified
    consistent: 1.3,     // 7+ day streak
    veteran: 1.1         // 90+ days active
};

/**
 * Calculate comprehensive reputation score for a user
 */
module.exports.CalculateRep = async (req, res) => {
  try {
    const { userIdentifier } = req.params;
    const { 
      minutesWatched = 0, 
      durationInMinutes = 1, 
      sessionQuality = 'good',
      socialActions = {},
      achievements = {},
      forceRecalculate = false 
    } = req.body;

    if (!userIdentifier) {
      return res.status(400).json({
        status: "fail",
        message: "User identifier is required"
      });
    }

    console.log(`🧮 Starting reputation calculation for: ${userIdentifier}`);

    const user = await User.findOne({ userIdentifier });
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found. Please complete Self Protocol verification first."
      });
    }

    // Initialize reputation data if not exists
    if (!user.gameData.reputationFactors) {
      user.gameData.reputationFactors = {};
    }
    if (!user.gameData.activityMetrics) {
      user.gameData.activityMetrics = {};
    }

    // Update activity metrics
    await updateActivityMetrics(user, {
      minutesWatched,
      durationInMinutes,
      sessionQuality,
      socialActions,
      achievements
    });

    // Calculate individual factor scores
    const activityScore = calculateActivityScore(user);
    const socialScore = calculateSocialScore(user);
    const achievementScore = calculateAchievementScore(user);
    const trustScore = calculateTrustScore(user);

    // Update factor scores
    user.gameData.reputationFactors = {
      ...user.gameData.reputationFactors,
      activityScore: activityScore.total,
      watchTimeScore: activityScore.watchTime,
      consistencyScore: activityScore.consistency,
      socialScore: socialScore.total,
      collaborationScore: socialScore.collaboration,
      helpfulnessScore: socialScore.helpfulness,
      achievementScore: achievementScore.total,
      skillScore: achievementScore.skills,
      completionScore: achievementScore.completion,
      verificationScore: trustScore.verification,
      trustScore: trustScore.community
    };

    // Calculate weighted total score
    const weightedScore = (
      activityScore.total * REPUTATION_CONFIG.weights.activity +
      socialScore.total * REPUTATION_CONFIG.weights.social +
      achievementScore.total * REPUTATION_CONFIG.weights.achievement +
      trustScore.total * REPUTATION_CONFIG.weights.trust
    );

    // Apply bonus multipliers
    const bonusMultiplier = calculateBonusMultiplier(user);
    const finalScore = Math.min(
      Math.round(weightedScore * bonusMultiplier),
      REPUTATION_CONFIG.maxScore
    );

    // Determine tier
    const newTier = getTierFromScore(finalScore);
    const previousScore = user.gameData.reputationScore || 0;
    const previousTier = user.gameData.reputationTier || 'Bronze';

    // Update user reputation
    user.gameData.reputationScore = finalScore;
    user.gameData.reputationTier = newTier.name;
    user.gameData.lastReputationUpdate = new Date();

    // Add to reputation history
    if (!user.gameData.reputationHistory) {
      user.gameData.reputationHistory = [];
    }

    const changeAmount = finalScore - previousScore;
    const tierChanged = newTier.name !== previousTier;

    user.gameData.reputationHistory.push({
      date: new Date(),
      score: finalScore,
      tier: newTier.name,
      changeReason: `Activity update: ${changeAmount >= 0 ? '+' : ''}${changeAmount} points`,
      changeAmount
    });

    // Keep only last 50 history entries
    if (user.gameData.reputationHistory.length > 50) {
      user.gameData.reputationHistory = user.gameData.reputationHistory.slice(-50);
    }

    await user.save();

    console.log(`✅ Reputation calculated: ${finalScore} (${newTier.name})`);

    return res.status(200).json({
      status: "success",
      message: "Reputation calculated successfully",
      data: {
        userIdentifier: user.userIdentifier,
        username: user.username,
        reputationScore: finalScore,
        previousScore,
        scoreChange: changeAmount,
        tier: {
          current: newTier,
          previous: previousTier,
          changed: tierChanged
        },
        breakdown: {
          activity: {
            score: activityScore.total,
            weight: REPUTATION_CONFIG.weights.activity,
            weighted: Math.round(activityScore.total * REPUTATION_CONFIG.weights.activity),
            details: activityScore
          },
          social: {
            score: socialScore.total,
            weight: REPUTATION_CONFIG.weights.social,
            weighted: Math.round(socialScore.total * REPUTATION_CONFIG.weights.social),
            details: socialScore
          },
          achievement: {
            score: achievementScore.total,
            weight: REPUTATION_CONFIG.weights.achievement,
            weighted: Math.round(achievementScore.total * REPUTATION_CONFIG.weights.achievement),
            details: achievementScore
          },
          trust: {
            score: trustScore.total,
            weight: REPUTATION_CONFIG.weights.trust,
            weighted: Math.round(trustScore.total * REPUTATION_CONFIG.weights.trust),
            details: trustScore
          },
          bonusMultiplier,
          baseScore: Math.round(weightedScore),
          finalScore
        },
        metrics: user.gameData.activityMetrics,
        nextTier: getNextTier(finalScore),
        achievements: getRecentAchievements(user)
      }
    });

  } catch (error) {
    console.error("❌ Error calculating reputation:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to calculate reputation score",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error"
    });
  }
};
module.exports.CalculateRep = async (req, res) => {
  const { minutesWatched, durationInMinutes } = req.body;

  try {
    // Get userIdentifier from Self Protocol authentication
    const { userIdentifier } = req.params;

    if (!userIdentifier) {
      return res.status(400).json({
        status: "fail",
        message: "User identifier is required",
      });
    }

    console.log("Calculating reputation for userIdentifier:", userIdentifier);

    // Find user by Self Protocol userIdentifier (SHA256 hash of DID)
    const user = await User.findOne({ userIdentifier });

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message:
          "User not found. Please complete Self Protocol verification first.",
      });
    }

    // Calculate reputation score based on various factors
    let reputationScore = (minutesWatched / durationInMinutes) * 20;
    // 1. Self Protocol Verification Bonus (Base score)
    if (user.isVerified) {
      reputationFactors.selfVerification = 50; // Base verification score
      console.log("✅ Self Protocol verified user");
    }

    // 4. Time-based scoring (longer verified = higher reputation)
    if (user.verificationDate) {
      const daysSinceVerification = Math.floor(
        (new Date() - new Date(user.verificationDate)) / (1000 * 60 * 60 * 24)
      );

      // Longer verification period = higher score
      if (daysSinceVerification >= 365) {
        reputationFactors.timeBased = 15; // 1+ year
      } else if (daysSinceVerification >= 180) {
        reputationFactors.timeBased = 10; // 6+ months
      } else if (daysSinceVerification >= 30) {
        reputationFactors.timeBased = 5; // 1+ month
      }

      console.log(
        `⏰ Time-based score: ${reputationFactors.timeBased} (${daysSinceVerification} days since verification)`
      );
    }

    // 5. Bonus factors
    if (user.tracks && user.tracks.length > 0) {
      reputationFactors.bonus += user.tracks.length * 2; // 2 points per track
      console.log(
        `🎯 Track bonus: ${user.tracks.length * 2} (${
          user.tracks.length
        } tracks)`
      );
    }

    if (user.username && user.username !== "Anonymous") {
      reputationFactors.bonus += 5; // Username set
      console.log("👤 Username bonus: 5");
    }

    // Calculate total reputation score
    reputationScore = Object.values(reputationFactors).reduce(
      (sum, score) => sum + score,
      0
    );

    // Determine reputation tier
    let reputationTier = "Bronze";
    let tierColor = "#CD7F32";

    if (reputationScore >= 100) {
      reputationTier = "Diamond";
      tierColor = "#B9F2FF";
    } else if (reputationScore >= 80) {
      reputationTier = "Platinum";
      tierColor = "#E5E4E2";
    } else if (reputationScore >= 60) {
      reputationTier = "Gold";
      tierColor = "#FFD700";
    } else if (reputationScore >= 40) {
      reputationTier = "Silver";
      tierColor = "#C0C0C0";
    }

    console.log(
      `🏆 Final reputation: ${reputationScore} (${reputationTier} tier)`
    );

    // Update user's reputation data
    user.gameData = user.gameData || {};
    user.gameData.reputationScore = reputationScore;
    user.gameData.reputationTier = reputationTier;
    user.gameData.reputationFactors = reputationFactors;
    user.gameData.lastReputationUpdate = new Date();

    await user.save();

    // Return comprehensive reputation data
    return res.status(200).json({
      status: "success",
      message: "Reputation calculated successfully",
      data: {
        userIdentifier: user.userIdentifier,
        username: user.username,
        reputationScore,
        reputationTier,
        tierColor,
        reputationFactors,
        breakdown: {
          selfVerification: {
            score: reputationFactors.selfVerification,
            description: "Self Protocol identity verification",
            verified: user.isVerified,
          },
          onboarding: {
            score: reputationFactors.onboarding,
            description: "Profile completion and onboarding",
            completed: user.onboardingCompleted,
          },
          activity: {
            score: reputationFactors.activity,
            description: "Recent platform activity",
            lastActive: user.gameData?.lastActive,
          },
          timeBased: {
            score: reputationFactors.timeBased,
            description: "Account age and verification duration",
            verifiedSince: user.verificationDate,
          },
          bonus: {
            score: reputationFactors.bonus,
            description: "Additional factors (tracks, username, etc.)",
            tracks: user.tracks?.length || 0,
            hasUsername: !!(user.username && user.username !== "Anonymous"),
          },
        },
        userData: {
          name: user.name,
          nationality: user.nationality,
          gender: user.gender,
          tracks: user.tracks,
          isVerified: user.isVerified,
          verificationDate: user.verificationDate,
          onboardingCompleted: user.onboardingCompleted,
        },
        calculatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error calculating reputation:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to calculate reputation score",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};
