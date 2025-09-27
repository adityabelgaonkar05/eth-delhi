const express = require("express");
const User = require("../models/User");

/**
 * Calculate comprehensive reputation score for a user
 */
module.exports.CalculateRep = async (req, res) => {
  try {
    const { userIdentifier } = req.params;
    const {
      minutesWatched = 0,
      durationInMinutes = 1,
      sessionQuality = "good",
      socialActions = {},
      achievements = {},
      forceRecalculate = false,
    } = req.body;

    if (!userIdentifier) {
      return res.status(400).json({
        status: "fail",
        message: "User identifier is required",
      });
    }

    console.log(`🧮 Starting reputation calculation for: ${userIdentifier}`);

    const user = await User.findOne({ userIdentifier });
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message:
          "User not found. Please complete Self Protocol verification first.",
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
      achievements,
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
      trustScore: trustScore.community,
    };

    // Calculate weighted total score
    const weightedScore =
      activityScore.total * REPUTATION_CONFIG.weights.activity +
      socialScore.total * REPUTATION_CONFIG.weights.social +
      achievementScore.total * REPUTATION_CONFIG.weights.achievement +
      trustScore.total * REPUTATION_CONFIG.weights.trust;

    // Apply bonus multipliers
    const bonusMultiplier = calculateBonusMultiplier(user);
    const finalScore = Math.min(
      Math.round(weightedScore * bonusMultiplier),
      REPUTATION_CONFIG.maxScore
    );

    // Determine tier
    const newTier = getTierFromScore(finalScore);
    const previousScore = user.gameData.reputationScore || 0;
    const previousTier = user.gameData.reputationTier || "Bronze";

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
      changeReason: `Activity update: ${
        changeAmount >= 0 ? "+" : ""
      }${changeAmount} points`,
      changeAmount,
    });

    // Keep only last 50 history entries
    if (user.gameData.reputationHistory.length > 50) {
      user.gameData.reputationHistory =
        user.gameData.reputationHistory.slice(-50);
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
          changed: tierChanged,
        },
        breakdown: {
          activity: {
            score: activityScore.total,
            weight: REPUTATION_CONFIG.weights.activity,
            weighted: Math.round(
              activityScore.total * REPUTATION_CONFIG.weights.activity
            ),
            details: activityScore,
          },
          social: {
            score: socialScore.total,
            weight: REPUTATION_CONFIG.weights.social,
            weighted: Math.round(
              socialScore.total * REPUTATION_CONFIG.weights.social
            ),
            details: socialScore,
          },
          achievement: {
            score: achievementScore.total,
            weight: REPUTATION_CONFIG.weights.achievement,
            weighted: Math.round(
              achievementScore.total * REPUTATION_CONFIG.weights.achievement
            ),
            details: achievementScore,
          },
          trust: {
            score: trustScore.total,
            weight: REPUTATION_CONFIG.weights.trust,
            weighted: Math.round(
              trustScore.total * REPUTATION_CONFIG.weights.trust
            ),
            details: trustScore,
          },
          bonusMultiplier,
          baseScore: Math.round(weightedScore),
          finalScore,
        },
        metrics: user.gameData.activityMetrics,
        nextTier: getNextTier(finalScore),
        achievements: getRecentAchievements(user),
      },
    });
  } catch (error) {
    console.error("❌ Error calculating reputation:", error);
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
