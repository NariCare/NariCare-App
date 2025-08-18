const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

// Check if 2FA is required and verified for sensitive operations
const requireTwoFactor = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user's 2FA settings
    const user = await executeQuery(
      'SELECT two_factor_enabled, two_factor_verified_at FROM users WHERE id = ?',
      [userId]
    );

    if (!user || user.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    const userData = user[0];

    // If 2FA is not enabled, allow access
    if (!userData.two_factor_enabled) {
      return next();
    }

    // Check if 2FA was recently verified (within last 30 minutes)
    const twoFactorVerifiedAt = userData.two_factor_verified_at;
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    if (!twoFactorVerifiedAt || new Date(twoFactorVerifiedAt) < thirtyMinutesAgo) {
      return res.status(403).json({
        success: false,
        error: 'Two-factor authentication required',
        code: 'TWO_FACTOR_REQUIRED',
        message: 'Please verify your identity with 2FA to access this resource'
      });
    }

    next();
  } catch (error) {
    logger.error('Two-factor auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error in two-factor authentication check'
    });
  }
};

// Optional 2FA check - warns but doesn't block
const optionalTwoFactor = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user's 2FA settings
    const user = await executeQuery(
      'SELECT two_factor_enabled FROM users WHERE id = ?',
      [userId]
    );

    if (user && user.length > 0) {
      req.user.twoFactorEnabled = user[0].two_factor_enabled;
    }

    next();
  } catch (error) {
    logger.error('Optional two-factor check error:', error);
    // Don't block the request for optional checks
    next();
  }
};

module.exports = {
  requireTwoFactor,
  optionalTwoFactor
};