const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

// User validation rules
const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name is required and must be less than 100 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name is required and must be less than 100 characters'),
  body('phoneNumber')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('whatsappNumber')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid WhatsApp number'),
  body('motherType')
    .optional()
    .isIn(['pregnant', 'new_mom'])
    .withMessage('Mother type must be either "pregnant" or "new_mom"'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const validateOTP = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit number'),
  handleValidationErrors
];

// Baby validation rules
const validateBaby = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Baby name is required and must be less than 100 characters'),
  body('dateOfBirth')
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),
  body('gender')
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  body('birthWeight')
    .isFloat({ min: 0.5, max: 10 })
    .withMessage('Birth weight must be between 0.5 and 10 kg'),
  body('birthHeight')
    .isFloat({ min: 20, max: 70 })
    .withMessage('Birth height must be between 20 and 70 cm'),
  handleValidationErrors
];

// Growth record validation rules
const validateGrowthRecord = [
  body('babyId')
    .isUUID()
    .withMessage('Baby ID must be a valid UUID'),
  body('feedTypes')
    .isArray({ min: 1 })
    .withMessage('At least one feed type must be selected'),
  body('feedTypes.*')
    .isIn(['direct', 'expressed', 'formula'])
    .withMessage('Feed type must be direct, expressed, or formula'),
  body('directFeedDetails.startTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  body('directFeedDetails.breastSide')
    .optional()
    .isIn(['left', 'right', 'both'])
    .withMessage('Breast side must be left, right, or both'),
  body('directFeedDetails.duration')
    .optional()
    .isInt({ min: 1, max: 120 })
    .withMessage('Duration must be between 1 and 120 minutes'),
  body('directFeedDetails.painLevel')
    .optional()
    .isInt({ min: 0, max: 4 })
    .withMessage('Pain level must be between 0 and 4'),
  body('expressedMilkDetails.quantity')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('Expressed milk quantity must be between 1 and 500 ml'),
  body('formulaDetails.quantity')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('Formula quantity must be between 1 and 500 ml'),
  handleValidationErrors
];

// Weight record validation rules
const validateWeightRecord = [
  body('babyId')
    .isUUID()
    .withMessage('Baby ID must be a valid UUID'),
  body('weight')
    .isFloat({ min: 0.5, max: 50 })
    .withMessage('Weight must be between 0.5 and 50 kg'),
  body('height')
    .optional()
    .isFloat({ min: 20, max: 150 })
    .withMessage('Height must be between 20 and 150 cm'),
  body('recordDate')
    .optional()
    .isISO8601()
    .withMessage('Record date must be a valid date'),
  handleValidationErrors
];

// Emotion check-in validation rules
const validateEmotionCheckin = [
  body('selectedStruggles')
    .optional()
    .isArray()
    .withMessage('Selected struggles must be an array'),
  body('selectedPositiveMoments')
    .optional()
    .isArray()
    .withMessage('Selected positive moments must be an array'),
  body('selectedConcerningThoughts')
    .optional()
    .isArray()
    .withMessage('Selected concerning thoughts must be an array'),
  body('gratefulFor')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Grateful for text must be less than 1000 characters'),
  body('proudOfToday')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Proud of today text must be less than 1000 characters'),
  body('tomorrowGoal')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Tomorrow goal text must be less than 1000 characters'),
  handleValidationErrors
];

// Consultation validation rules
const validateConsultation = [
  body('expertId')
    .isUUID()
    .withMessage('Expert ID must be a valid UUID'),
  body('scheduledAt')
    .isISO8601()
    .withMessage('Scheduled time must be a valid date'),
  body('topic')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Topic is required and must be less than 100 characters'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters'),
  handleValidationErrors
];

// Generic UUID parameter validation
const validateUUIDParam = (paramName = 'id') => [
  param(paramName)
    .isUUID()
    .withMessage(`${paramName} must be a valid UUID`),
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isAlpha()
    .withMessage('Sort by must contain only letters'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validateOTP,
  validateBaby,
  validateGrowthRecord,
  validateWeightRecord,
  validateEmotionCheckin,
  validateConsultation,
  validateUUIDParam,
  validatePagination
};