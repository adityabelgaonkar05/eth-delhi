const crypto = require('crypto');
const Business = require('../models/Business');
const { createSendToken } = require('../utils/jwtUtils');

// Sign up
const signup = async (req, res) => {
  try {
    const { companyName, cin, companyType, email, password } = req.body;

    // Check if business already exists
    const existingBusiness = await Business.findOne({
      $or: [{ email }, { cin }]
    });

    if (existingBusiness) {
      const field = existingBusiness.email === email ? 'email' : 'CIN';
      return res.status(400).json({
        status: 'fail',
        message: `Business with this ${field} already exists`
      });
    }

    // Create new business
    const newBusiness = await Business.create({
      companyName,
      cin: cin.toUpperCase(), // Ensure CIN is uppercase
      companyType,
      email: email.toLowerCase(),
      password
    });

    // Update last login
    await newBusiness.updateLastLogin();

    // Send token
    createSendToken(newBusiness, 201, res, 'Business registered successfully');

  } catch (error) {
    console.error('Signup error:', error);

    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid input data',
        errors
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        status: 'fail',
        message: `Business with this ${field} already exists`
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Something went wrong during registration'
    });
  }
};

// Sign in
const signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if business exists && password is correct
    const business = await Business.findOne({ email: email.toLowerCase() }).select('+password');

    if (!business || !(await business.correctPassword(password, business.password))) {
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect email or password'
      });
    }

    // Update last login
    await business.updateLastLogin();

    // Send token
    createSendToken(business, 200, res, 'Logged in successfully');

  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong during login'
    });
  }
};

// Logout
const logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  
  res.status(200).json({ 
    status: 'success',
    message: 'Logged out successfully'
  });
};

// Get current business profile
const getProfile = async (req, res) => {
  try {
    const business = await Business.findById(req.business.id);
    
    res.status(200).json({
      status: 'success',
      data: {
        business
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching profile'
    });
  }
};

// Update business profile
const updateProfile = async (req, res) => {
  try {
    // Create error if business POSTs password data
    if (req.body.password || req.body.passwordConfirm) {
      return res.status(400).json({
        status: 'fail',
        message: 'This route is not for password updates. Please use /updatePassword'
      });
    }

    // Filtered out unwanted fields names that are not allowed to be updated
    const allowedFields = ['companyName', 'companyType', 'email'];
    const filteredBody = {};
    
    Object.keys(req.body).forEach(el => {
      if (allowedFields.includes(el)) {
        filteredBody[el] = req.body[el];
      }
    });

    // Update business document
    const updatedBusiness = await Business.findByIdAndUpdate(
      req.business.id, 
      filteredBody, 
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        business: updatedBusiness
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid input data',
        errors
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Error updating profile'
    });
  }
};

// Update password
const updatePassword = async (req, res) => {
  try {
    // Get business from collection
    const business = await Business.findById(req.business.id).select('+password');

    // Check if current password is correct
    if (!(await business.correctPassword(req.body.currentPassword, business.password))) {
      return res.status(401).json({
        status: 'fail',
        message: 'Your current password is incorrect'
      });
    }

    // Update password
    business.password = req.body.newPassword;
    business.passwordChangedAt = new Date();
    await business.save();

    // Log business in, send JWT
    createSendToken(business, 200, res, 'Password updated successfully');
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating password'
    });
  }
};

// Verify token (for protected routes)
const verifyAuth = async (req, res) => {
  try {
    res.status(200).json({
      status: 'success',
      message: 'Token is valid',
      data: {
        business: req.business
      }
    });
  } catch (error) {
    console.error('Verify auth error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error verifying authentication'
    });
  }
};

module.exports = {
  signup,
  signin,
  logout,
  getProfile,
  updateProfile,
  updatePassword,
  verifyAuth
};