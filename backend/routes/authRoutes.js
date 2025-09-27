const express = require('express');
const {
  signup,
  signin,
  logout,
  getProfile,
  updateProfile,
  updatePassword,
  verifyAuth
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');
const {
  signupValidation,
  signinValidation,
  updatePasswordValidation,
  handleValidationErrors
} = require('../middleware/validation');

const router = express.Router();

// Public routes
router.post('/signup', signupValidation, handleValidationErrors, signup);
router.post('/signin', signinValidation, handleValidationErrors, signin);
router.post('/logout', logout);

// Protected routes (require authentication)
router.use(protect); // All routes after this middleware are protected

router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.patch('/password', updatePasswordValidation, handleValidationErrors, updatePassword);
router.get('/verify', verifyAuth);

module.exports = router;