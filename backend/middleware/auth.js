const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const Business = require('../models/Business');
const { verifyToken } = require('../utils/jwtUtils');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  try {
    // 1) Getting token and check if it's there
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in! Please log in to get access.'
      });
    }

    // 2) Verification token
    const decoded = await verifyToken(token);

    // 3) Check if business still exists
    const currentBusiness = await Business.findById(decoded.id);
    if (!currentBusiness) {
      return res.status(401).json({
        status: 'fail',
        message: 'The business belonging to this token does no longer exist.'
      });
    }

    // 4) Check if business changed password after the token was issued
    if (currentBusiness.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        status: 'fail',
        message: 'Business recently changed password! Please log in again.'
      });
    }

    // Grant access to protected route
    req.business = currentBusiness;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid token. Please log in again!'
    });
  }
};

// Optional authentication - don't require login but get user if logged in
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (token) {
      try {
        const decoded = await verifyToken(token);
        const currentBusiness = await Business.findById(decoded.id);
        
        if (currentBusiness && !currentBusiness.changedPasswordAfter(decoded.iat)) {
          req.business = currentBusiness;
        }
      } catch (error) {
        // If token is invalid, just continue without setting req.business
      }
    }
    
    next();
  } catch (error) {
    next();
  }
};

// Restrict to certain roles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.business.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

module.exports = {
  protect,
  optionalAuth,
  restrictTo
};