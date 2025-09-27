const express = require("express");
const router = express.Router();
const {
  getPlatformMetrics,
  getUserEngagementMetrics,
  getPlatformFees,
  getAnalyticsData,
} = require("../controllers/dashboardController");

/**
 * @route   GET /api/dashboard/metrics
 * @desc    Get comprehensive platform metrics from on-chain and off-chain sources
 * @access  Public
 */
router.get("/metrics", getPlatformMetrics);

/**
 * @route   GET /api/dashboard/engagement
 * @desc    Get user engagement metrics and statistics
 * @access  Public
 */
router.get("/engagement", getUserEngagementMetrics);

/**
 * @route   GET /api/dashboard/fees
 * @desc    Get platform fees and revenue breakdown
 * @access  Public
 */
router.get("/fees", getPlatformFees);

/**
 * @route   GET /api/dashboard/analytics
 * @desc    Get detailed analytics data including trends and breakdowns
 * @access  Public
 */
router.get("/analytics", getAnalyticsData);

/**
 * @route   GET /api/dashboard/health
 * @desc    Get dashboard health status
 * @access  Public
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    },
    message: "Dashboard API is healthy",
  });
});

module.exports = router;
