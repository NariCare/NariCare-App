const authService = require('../services/authService');
const logger = require('../utils/logger');

class AuthController {
  // Register new user
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Login user
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      
      if (result.requiresTwoFactor) {
        res.status(202).json({
          success: true,
          requiresTwoFactor: true,
          message: result.message,
          data: {
            userId: result.userId,
            email: result.email
          }
        });
      } else {
        res.status(200).json({
          success: true,
          message: 'Login successful',
          data: result
        });
      }
    } catch (error) {
      next(error);
    }
  }

  // Enable 2FA
  async enableTwoFactor(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await authService.enableTwoFactor(userId);
      
      res.status(200).json({
        success: true,
        message: result.message,
        data: { email: result.email }
      });
    } catch (error) {
      next(error);
    }
  }

  // Verify OTP
  async verifyOTP(req, res, next) {
    try {
      const { email, otp, action = 'login' } = req.body;
      const result = await authService.verifyOTP(email, otp, action);
      
      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          user: result.user,
          token: result.token,
          refreshToken: result.refreshToken
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Disable 2FA
  async disableTwoFactor(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await authService.disableTwoFactor(userId);
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Resend OTP
  async resendOTP(req, res, next) {
    try {
      const { email } = req.body;
      const result = await authService.resendOTP(email);
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Refresh token
  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token is required'
        });
      }

      const result = await authService.refreshToken(refreshToken);
      
      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get current user profile
  async getProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const profile = await authService.getUserProfile(userId);
      
      res.status(200).json({
        success: true,
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }

  // Update user profile
  async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await authService.updateUserProfile(userId, req.body);
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Request password reset
  async requestPasswordReset(req, res, next) {
    try {
      const { email } = req.body;
      const result = await authService.generatePasswordResetToken(email);
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Reset password
  async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body;
      const result = await authService.resetPassword(token, password);
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Logout (client-side token removal, but we can log it)
  async logout(req, res, next) {
    try {
      const userId = req.user.id;
      
      logger.info('User logged out', { userId });
      
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();