const userModel = require('../models/userModel');
const authService = require('../services/authService');
const logger = require('../utils/logger');

class UserController {
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

  // Update current user profile
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

  // Update notification preferences
  async updateNotificationPreferences(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await userModel.updateNotificationPreferences(userId, req.body);
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Get all users
  async getAllUsers(req, res, next) {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sortBy: req.query.sortBy || 'created_at',
        sortOrder: req.query.sortOrder || 'DESC'
      };

      // This would need to be implemented in userModel
      const users = await userModel.findAll(options);
      
      res.status(200).json({
        success: true,
        data: users
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Get user by ID
  async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      const user = await userModel.getFullProfile(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Update user role
  async updateUserRole(req, res, next) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!['user', 'expert', 'admin'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role. Must be user, expert, or admin'
        });
      }

      await userModel.update(id, { role });
      
      logger.info('User role updated', { 
        userId: id, 
        newRole: role, 
        updatedBy: req.user.id 
      });

      res.status(200).json({
        success: true,
        message: 'User role updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Delete user
  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      
      // Prevent admin from deleting themselves
      if (id === req.user.id) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete your own account'
        });
      }

      const result = await userModel.delete(id);
      
      logger.info('User deleted by admin', { 
        deletedUserId: id, 
        deletedBy: req.user.id 
      });

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();