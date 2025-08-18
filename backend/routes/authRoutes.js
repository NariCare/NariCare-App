const express = require('express');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { 
  validateRegister, 
  validateLogin, 
  validateOTP 
} = require('../middleware/validation');

const router = express.Router();

// Public routes
router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/verify-otp', validateOTP, authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);
router.post('/refresh-token', authController.refreshToken);
router.post('/request-password-reset', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.use(protect); // All routes below require authentication

router.get('/profile', authController.getProfile);
router.put('/profile', authController.updateProfile);
router.post('/logout', authController.logout);

// 2FA routes
router.post('/2fa/enable', authController.enableTwoFactor);
router.post('/2fa/disable', authController.disableTwoFactor);

module.exports = router;