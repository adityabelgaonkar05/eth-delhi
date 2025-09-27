const express = require("express");
const authRoutes = require('./authRoutes');

const indexRouter = express.Router();

// Authentication routes
indexRouter.use('/auth', authRoutes);

// Health check route
indexRouter.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running successfully',
    timestamp: new Date().toISOString()
  });
});

module.exports = indexRouter;
