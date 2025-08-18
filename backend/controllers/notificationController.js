const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

class NotificationController {
  // Register push notification token
  async registerPushToken(req, res, next) {
    try {
      const userId = req.user.id;
      const { token, platform } = req.body;

      if (!token || !platform) {
        return res.status(400).json({
          success: false,
          error: 'Token and platform are required'
        });
      }

      const result = await notificationService.registerPushToken(userId, token, platform);
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Get user's notifications
  async getMyNotifications(req, res, next) {
    try {
      const userId = req.user.id;
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        type: req.query.type,
        sent: req.query.sent === 'true'
      };

      const result = await notificationService.getUserNotifications(userId, options);
      
      res.status(200).json({
        success: true,
        data: result.notifications,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  // Update notification preferences
  async updateNotificationPreferences(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await notificationService.updateNotificationPreferences(userId, req.body);
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Send notification
  async sendNotification(req, res, next) {
    try {
      const { userIds, title, body, type, scheduledTime } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'User IDs array is required'
        });
      }

      if (!title || !body) {
        return res.status(400).json({
          success: false,
          error: 'Title and body are required'
        });
      }

      const result = await notificationService.sendNotification({
        userIds,
        title,
        body,
        type,
        scheduledTime
      });
      
      logger.info('Notification sent by admin', { 
        userCount: userIds.length,
        type,
        sentBy: req.user.id 
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Get scheduled notifications
  async getScheduledNotifications(req, res, next) {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        type: req.query.type,
        sent: req.query.sent === 'true'
      };

      const result = await notificationService.getScheduledNotifications(options);
      
      res.status(200).json({
        success: true,
        data: result.notifications,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Get notification statistics
  async getNotificationStats(req, res, next) {
    try {
      const { startDate, endDate, type } = req.query;
      
      const stats = await notificationService.getNotificationStats({
        startDate,
        endDate,
        type
      });
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationController();