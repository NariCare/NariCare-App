const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database
      const user = await executeQuery(
        'SELECT id, email, first_name, last_name, role, is_onboarding_completed, two_factor_enabled FROM users WHERE id = ?',
        [decoded.id]
      );

      if (!user || user.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Token is valid but user no longer exists'
        });
      }

      req.user = user[0];
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error in authentication'
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role ${req.user.role} is not authorized to access this route`
      });
    }

    next();
  };
};

// Check if user owns the resource
const checkOwnership = (resourceIdParam = 'id', userIdField = 'user_id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];
      const userId = req.user.id;

      // For admin users, skip ownership check
      if (req.user.role === 'admin') {
        return next();
      }

      // This is a generic ownership check - specific implementations
      // should be done in individual route handlers
      req.resourceId = resourceId;
      req.userId = userId;
      
      next();
    } catch (error) {
      logger.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Server error in ownership verification'
      });
    }
  };
};

module.exports = {
  protect,
  authorize,
  checkOwnership
};