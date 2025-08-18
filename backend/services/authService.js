const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const { v4: uuidv4 } = require('uuid');
const { executeQuery, executeTransaction } = require('../config/database');
const sendGridService = require('./sendgridService');
const logger = require('../utils/logger');

class AuthService {
  // Generate JWT token
  generateToken(userId) {
    return jwt.sign(
      { id: userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
  }

  // Generate refresh token
  generateRefreshToken(userId) {
    return jwt.sign(
      { id: userId, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
  }

  // Generate OTP for 2FA
  generateOTP() {
    const otpLength = parseInt(process.env.OTP_LENGTH) || 6;
    return Math.floor(Math.random() * Math.pow(10, otpLength))
      .toString()
      .padStart(otpLength, '0');
  }

  // Hash password
  async hashPassword(password) {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    return await bcrypt.hash(password, rounds);
  }

  // Compare password
  async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Register new user
  async register(userData) {
    const {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      whatsappNumber,
      motherType,
      dueDate
    } = userData;

    try {
      // Check if user already exists
      const existingUser = await executeQuery(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUser.length > 0) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);
      const userId = uuidv4();

      // Create user and default tier in transaction
      const queries = [
        {
          query: `INSERT INTO users 
                  (id, email, password_hash, first_name, last_name, phone_number, 
                   whatsapp_number, mother_type, due_date, is_onboarding_completed, 
                   two_factor_enabled, created_at) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          params: [userId, email, hashedPassword, firstName, lastName, 
                  phoneNumber, whatsappNumber, motherType, dueDate, false, false]
        },
        {
          query: `INSERT INTO user_tiers 
                  (id, user_id, tier_type, start_date, consultations_remaining, is_active) 
                  VALUES (?, ?, ?, CURDATE(), ?, ?)`,
          params: [uuidv4(), userId, 'basic', 0, true]
        }
      ];

      await executeTransaction(queries);

      // Send welcome email (non-blocking)
      try {
        await sendGridService.sendWelcomeEmail(email, firstName);
      } catch (emailError) {
        logger.warn('Welcome email failed to send:', emailError.message);
        // Don't fail registration if email fails
      }

      logger.info('User registered successfully', { userId, email });

      return {
        userId,
        email,
        firstName,
        lastName,
        token: this.generateToken(userId),
        refreshToken: this.generateRefreshToken(userId)
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  // Login user
  async login(email, password) {
    try {
      // Get user from database
      const users = await executeQuery(
        `SELECT id, email, password_hash, first_name, last_name, role, 
                is_onboarding_completed, two_factor_enabled, two_factor_otp_attempts 
         FROM users WHERE email = ?`,
        [email]
      );

      if (users.length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = users[0];

      // Check if account is locked due to too many 2FA attempts
      if (user.two_factor_otp_attempts >= (parseInt(process.env.MAX_OTP_ATTEMPTS) || 3)) {
        throw new Error('Account temporarily locked due to too many failed attempts. Please try again later.');
      }

      // Compare password
      const isPasswordValid = await this.comparePassword(password, user.password_hash);
      
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // If 2FA is enabled, send OTP and return partial response
      if (user.two_factor_enabled) {
        const otp = this.generateOTP();
        const expiryTime = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) || 10) * 60 * 1000);

        // Store OTP in database
        await executeQuery(
          'UPDATE users SET two_factor_otp = ?, two_factor_otp_expiry = ? WHERE id = ?',
          [otp, expiryTime, user.id]
        );

        // Send OTP email
        await sendGridService.sendOTPEmail(email, otp, user.first_name);

        logger.info('2FA OTP sent for login', { userId: user.id, email });

        return {
          requiresTwoFactor: true,
          userId: user.id,
          email: user.email,
          message: 'Please check your email for the verification code'
        };
      }

      // Generate tokens for normal login
      const token = this.generateToken(user.id);
      const refreshToken = this.generateRefreshToken(user.id);

      logger.info('User logged in successfully', { userId: user.id, email });

      return {
        requiresTwoFactor: false,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          isOnboardingCompleted: user.is_onboarding_completed,
          twoFactorEnabled: user.two_factor_enabled
        },
        token,
        refreshToken
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  // Enable 2FA for user
  async enableTwoFactor(userId) {
    try {
      // Get user details
      const users = await executeQuery(
        'SELECT email, first_name, two_factor_enabled FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        throw new Error('User not found');
      }

      const user = users[0];

      if (user.two_factor_enabled) {
        throw new Error('Two-factor authentication is already enabled');
      }

      // Generate OTP for verification
      const otp = this.generateOTP();
      const expiryTime = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) || 10) * 60 * 1000);

      // Store OTP temporarily
      await executeQuery(
        'UPDATE users SET two_factor_otp = ?, two_factor_otp_expiry = ? WHERE id = ?',
        [otp, expiryTime, userId]
      );

      // Send OTP email
      await sendGridService.sendOTPEmail(user.email, otp, user.first_name);

      logger.info('2FA enable OTP sent', { userId, email: user.email });

      return {
        message: 'Verification code sent to your email. Please verify to enable 2FA.',
        email: user.email
      };
    } catch (error) {
      logger.error('Enable 2FA error:', error);
      throw error;
    }
  }

  // Verify OTP and complete 2FA setup or login
  async verifyOTP(email, otp, action = 'login') {
    try {
      // Get user with OTP details
      const users = await executeQuery(
        `SELECT id, first_name, last_name, role, is_onboarding_completed, 
                two_factor_enabled, two_factor_otp, two_factor_otp_expiry, 
                two_factor_otp_attempts 
         FROM users WHERE email = ?`,
        [email]
      );

      if (users.length === 0) {
        throw new Error('User not found');
      }

      const user = users[0];

      // Check if account is locked
      if (user.two_factor_otp_attempts >= (parseInt(process.env.MAX_OTP_ATTEMPTS) || 3)) {
        throw new Error('Account locked due to too many failed attempts. Please try again later.');
      }

      // Check if OTP exists and hasn't expired
      if (!user.two_factor_otp || !user.two_factor_otp_expiry) {
        throw new Error('No verification code found. Please request a new one.');
      }

      if (new Date() > new Date(user.two_factor_otp_expiry)) {
        throw new Error('Verification code has expired. Please request a new one.');
      }

      // Verify OTP
      if (user.two_factor_otp !== otp) {
        // Increment failed attempts
        await executeQuery(
          'UPDATE users SET two_factor_otp_attempts = two_factor_otp_attempts + 1 WHERE id = ?',
          [user.id]
        );

        throw new Error('Invalid verification code');
      }

      // OTP is valid - clear OTP data and reset attempts
      const updateQueries = [
        {
          query: `UPDATE users SET 
                  two_factor_otp = NULL, 
                  two_factor_otp_expiry = NULL, 
                  two_factor_otp_attempts = 0,
                  two_factor_verified_at = NOW()
                  WHERE id = ?`,
          params: [user.id]
        }
      ];

      // If this is for enabling 2FA, also enable it
      if (action === 'enable') {
        updateQueries.push({
          query: 'UPDATE users SET two_factor_enabled = TRUE WHERE id = ?',
          params: [user.id]
        });
      }

      await executeTransaction(updateQueries);

      // Generate tokens
      const token = this.generateToken(user.id);
      const refreshToken = this.generateRefreshToken(user.id);

      logger.info('OTP verified successfully', { 
        userId: user.id, 
        email, 
        action 
      });

      return {
        user: {
          id: user.id,
          email: email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          isOnboardingCompleted: user.is_onboarding_completed,
          twoFactorEnabled: action === 'enable' ? true : user.two_factor_enabled
        },
        token,
        refreshToken,
        message: action === 'enable' ? 
          'Two-factor authentication enabled successfully' : 
          'Login successful'
      };
    } catch (error) {
      logger.error('OTP verification error:', error);
      throw error;
    }
  }

  // Disable 2FA
  async disableTwoFactor(userId) {
    try {
      await executeQuery(
        `UPDATE users SET 
         two_factor_enabled = FALSE,
         two_factor_otp = NULL,
         two_factor_otp_expiry = NULL,
         two_factor_otp_attempts = 0,
         two_factor_verified_at = NULL
         WHERE id = ?`,
        [userId]
      );

      logger.info('2FA disabled successfully', { userId });

      return {
        message: 'Two-factor authentication disabled successfully'
      };
    } catch (error) {
      logger.error('Disable 2FA error:', error);
      throw error;
    }
  }

  // Resend OTP
  async resendOTP(email) {
    try {
      // Get user details
      const users = await executeQuery(
        'SELECT id, first_name, two_factor_otp_expiry FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        throw new Error('User not found');
      }

      const user = users[0];

      // Check if enough time has passed since last OTP (prevent spam)
      if (user.two_factor_otp_expiry) {
        const lastOtpTime = new Date(user.two_factor_otp_expiry).getTime() - 
                           (parseInt(process.env.OTP_EXPIRY_MINUTES) || 10) * 60 * 1000;
        const timeSinceLastOtp = Date.now() - lastOtpTime;
        const minWaitTime = 60 * 1000; // 1 minute

        if (timeSinceLastOtp < minWaitTime) {
          throw new Error('Please wait before requesting a new code');
        }
      }

      // Generate new OTP
      const otp = this.generateOTP();
      const expiryTime = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) || 10) * 60 * 1000);

      // Update OTP in database
      await executeQuery(
        'UPDATE users SET two_factor_otp = ?, two_factor_otp_expiry = ? WHERE id = ?',
        [otp, expiryTime, user.id]
      );

      // Send OTP email
      await sendGridService.sendOTPEmail(email, otp, user.first_name);

      logger.info('OTP resent successfully', { userId: user.id, email });

      return {
        message: 'New verification code sent to your email'
      };
    } catch (error) {
      logger.error('Resend OTP error:', error);
      throw error;
    }
  }

  // Refresh JWT token
  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      // Get user to ensure they still exist
      const users = await executeQuery(
        'SELECT id, email FROM users WHERE id = ?',
        [decoded.id]
      );

      if (users.length === 0) {
        throw new Error('User not found');
      }

      // Generate new tokens
      const newToken = this.generateToken(decoded.id);
      const newRefreshToken = this.generateRefreshToken(decoded.id);

      return {
        token: newToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      logger.error('Refresh token error:', error);
      throw new Error('Invalid refresh token');
    }
  }

  // Generate password reset token
  async generatePasswordResetToken(email) {
    try {
      const users = await executeQuery(
        'SELECT id, first_name FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        // Don't reveal if email exists or not for security
        return {
          message: 'If an account with that email exists, a password reset link has been sent'
        };
      }

      const user = users[0];
      const resetToken = uuidv4();
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store reset token
      await executeQuery(
        'UPDATE users SET password_reset_token = ?, password_reset_expiry = ? WHERE id = ?',
        [resetToken, resetExpiry, user.id]
      );

      // Send reset email
      await sendGridService.sendPasswordResetEmail(email, resetToken, user.first_name);

      logger.info('Password reset token generated', { userId: user.id, email });

      return {
        message: 'If an account with that email exists, a password reset link has been sent'
      };
    } catch (error) {
      logger.error('Password reset token error:', error);
      throw error;
    }
  }

  // Reset password with token
  async resetPassword(token, newPassword) {
    try {
      // Find user with valid reset token
      const users = await executeQuery(
        'SELECT id, email FROM users WHERE password_reset_token = ? AND password_reset_expiry > NOW()',
        [token]
      );

      if (users.length === 0) {
        throw new Error('Invalid or expired reset token');
      }

      const user = users[0];

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update password and clear reset token
      await executeQuery(
        `UPDATE users SET 
         password_hash = ?, 
         password_reset_token = NULL, 
         password_reset_expiry = NULL 
         WHERE id = ?`,
        [hashedPassword, user.id]
      );

      logger.info('Password reset successfully', { userId: user.id });

      return {
        message: 'Password reset successfully'
      };
    } catch (error) {
      logger.error('Password reset error:', error);
      throw error;
    }
  }

  // Get user profile
  async getUserProfile(userId) {
    try {
      const users = await executeQuery(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.phone_number, 
                u.whatsapp_number, u.mother_type, u.due_date, u.profile_image_url, 
                u.role, u.is_onboarding_completed, u.two_factor_enabled, u.created_at,
                ut.tier_type, ut.consultations_remaining, ut.start_date as tier_start_date,
                np.article_updates, np.call_reminders, np.group_messages, 
                np.growth_reminders, np.expert_messages
         FROM users u
         LEFT JOIN user_tiers ut ON u.id = ut.user_id AND ut.is_active = TRUE
         LEFT JOIN notification_preferences np ON u.id = np.user_id
         WHERE u.id = ?`,
        [userId]
      );

      if (users.length === 0) {
        throw new Error('User not found');
      }

      const user = users[0];

      // Get user's babies
      const babies = await executeQuery(
        'SELECT id, name, date_of_birth, gender, birth_weight, birth_height, current_weight, current_height FROM babies WHERE user_id = ? AND is_active = TRUE',
        [userId]
      );

      return {
        ...user,
        babies: babies || [],
        notificationPreferences: {
          articleUpdates: user.article_updates,
          callReminders: user.call_reminders,
          groupMessages: user.group_messages,
          growthReminders: user.growth_reminders,
          expertMessages: user.expert_messages
        },
        tier: {
          type: user.tier_type || 'basic',
          consultationsRemaining: user.consultations_remaining || 0,
          startDate: user.tier_start_date
        }
      };
    } catch (error) {
      logger.error('Get user profile error:', error);
      throw error;
    }
  }

  // Update user profile
  async updateUserProfile(userId, updateData) {
    try {
      const allowedFields = [
        'first_name', 'last_name', 'phone_number', 'whatsapp_number',
        'profile_image_url', 'mother_type', 'due_date'
      ];

      const updateFields = [];
      const updateValues = [];

      // Build dynamic update query
      Object.keys(updateData).forEach(key => {
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (allowedFields.includes(dbField)) {
          updateFields.push(`${dbField} = ?`);
          updateValues.push(updateData[key]);
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      updateValues.push(userId);

      await executeQuery(
        `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
        updateValues
      );

      logger.info('User profile updated', { userId, fields: Object.keys(updateData) });

      return {
        message: 'Profile updated successfully'
      };
    } catch (error) {
      logger.error('Update user profile error:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();