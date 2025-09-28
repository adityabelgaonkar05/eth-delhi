const { body, validationResult } = require('express-validator');

// Validation rules
const signupValidation = [
  body('companyName')
    .notEmpty()
    .withMessage('Company name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters')
    .trim(),

  body('cin')
    .notEmpty()
    .withMessage('CIN is required')
    .isLength({ min: 5, max: 30 })
    .withMessage('CIN must be between 5 and 30 characters')
    .trim(),

  body('companyType')
    .notEmpty()
    .withMessage('Company type is required')
    .isIn([
      'Private Limited Company',
      'Public Limited Company',
      'One Person Company (OPC)',
      'Limited Liability Partnership (LLP)',
      'Partnership Firm',
      'Sole Proprietorship',
      'Section 8 Company (Non-Profit)',
      'Startup',
      'Other'
    ])
    .withMessage('Please select a valid company type'),

  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

const signinValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const passwordResetValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
];

const updatePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
];

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    console.log('Validation errors:', errorMessages);
    
    return res.status(400).json({
      status: 'fail',
      message: 'Validation failed',
      errors: errorMessages
    });
  }
  next();
};

module.exports = {
  signupValidation,
  signinValidation,
  passwordResetValidation,
  updatePasswordValidation,
  handleValidationErrors
};