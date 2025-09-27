import axios from "axios";

const API_BASE_URL = "http://localhost:3001/api";

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(
      `📡 API Request: ${config.method?.toUpperCase()} ${config.url}`
    );
    return config;
  },
  (error) => {
    console.error("❌ API Request Error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(
      `✅ API Response: ${response.config.method?.toUpperCase()} ${
        response.config.url
      } - ${response.status}`
    );
    return response;
  },
  (error) => {
    console.error(
      "❌ API Response Error:",
      error.response?.data || error.message
    );
    return Promise.reject(error);
  }
);

/**
 * Fetch platform metrics from backend
 * @returns {Promise<Object>} Platform metrics data
 */
export const fetchPlatformMetrics = async () => {
  try {
    const response = await api.get("/dashboard/metrics");
    return {
      success: true,
      data: response.data.data,
      message: response.data.message,
    };
  } catch (error) {
    console.error("Error fetching platform metrics:", error);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      data: null,
    };
  }
};

/**
 * Fetch user engagement metrics
 * @returns {Promise<Object>} Engagement metrics data
 */
export const fetchUserEngagementMetrics = async () => {
  try {
    const response = await api.get("/dashboard/engagement");
    return {
      success: true,
      data: response.data.data,
      message: response.data.message,
    };
  } catch (error) {
    console.error("Error fetching engagement metrics:", error);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      data: null,
    };
  }
};

/**
 * Fetch platform fees and revenue data
 * @returns {Promise<Object>} Fees and revenue data
 */
export const fetchPlatformFees = async () => {
  try {
    const response = await api.get("/dashboard/fees");
    return {
      success: true,
      data: response.data.data,
      message: response.data.message,
    };
  } catch (error) {
    console.error("Error fetching platform fees:", error);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      data: null,
    };
  }
};

/**
 * Fetch detailed analytics data
 * @returns {Promise<Object>} Analytics data
 */
export const fetchAnalyticsData = async () => {
  try {
    const response = await api.get("/dashboard/analytics");
    return {
      success: true,
      data: response.data.data,
      message: response.data.message,
    };
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      data: null,
    };
  }
};

/**
 * Fetch all dashboard data in parallel
 * @returns {Promise<Object>} Combined dashboard data
 */
export const fetchAllDashboardData = async () => {
  try {
    console.log("🔄 Fetching all dashboard data...");

    const [metricsResult, engagementResult, feesResult, analyticsResult] =
      await Promise.allSettled([
        fetchPlatformMetrics(),
        fetchUserEngagementMetrics(),
        fetchPlatformFees(),
        fetchAnalyticsData(),
      ]);

    const result = {
      success: true,
      data: {
        metrics:
          metricsResult.status === "fulfilled"
            ? metricsResult.value.data
            : null,
        engagement:
          engagementResult.status === "fulfilled"
            ? engagementResult.value.data
            : null,
        fees: feesResult.status === "fulfilled" ? feesResult.value.data : null,
        analytics:
          analyticsResult.status === "fulfilled"
            ? analyticsResult.value.data
            : null,
      },
      errors: {
        metrics:
          metricsResult.status === "rejected" ? metricsResult.reason : null,
        engagement:
          engagementResult.status === "rejected"
            ? engagementResult.reason
            : null,
        fees: feesResult.status === "rejected" ? feesResult.reason : null,
        analytics:
          analyticsResult.status === "rejected" ? analyticsResult.reason : null,
      },
    };

    console.log("✅ Dashboard data fetched successfully");
    return result;
  } catch (error) {
    console.error("❌ Error fetching dashboard data:", error);
    return {
      success: false,
      error: error.message,
      data: null,
    };
  }
};

/**
 * Check dashboard API health
 * @returns {Promise<Object>} Health status
 */
export const checkDashboardHealth = async () => {
  try {
    const response = await api.get("/dashboard/health");
    return {
      success: true,
      data: response.data.data,
      message: response.data.message,
    };
  } catch (error) {
    console.error("Error checking dashboard health:", error);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      data: null,
    };
  }
};

export default {
  fetchPlatformMetrics,
  fetchUserEngagementMetrics,
  fetchPlatformFees,
  fetchAnalyticsData,
  fetchAllDashboardData,
  checkDashboardHealth,
};
