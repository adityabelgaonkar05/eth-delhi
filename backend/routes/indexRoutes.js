const express = require("express");
const authRoutes = require("./authRoutes");
// const walrusRoutes = require("./walrusRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const repRoutes = require("./repRoutes");

const indexRouter = express.Router();

// Authentication routes
indexRouter.use("/auth", authRoutes);

// Walrus storage routes (primary for hackathon)
// indexRouter.use("/walrus", walrusRoutes);

// Dashboard routes
indexRouter.use("/dashboard", dashboardRoutes);

//reputation system related routes
indexRouter.use("/rep", repRoutes);

// Health check route
indexRouter.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "API is running successfully",
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: "/api/auth/*",
      walrus: "/api/walrus/*",
      dashboard: "/api/dashboard/*",
      health: "/api/health",
    },
  });
});

module.exports = indexRouter;
