const { executeQuery } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const sendGridService = require('./sendgridService');
const logger = require('../utils/logger');

class NotificationService {
  // Register push notification token
  async registerPushToken(userId, token, platform) {
    try {
      // Deactivate old tokens for this user and platform
      await executeQuery(
        'UPDATE push_notification_tokens SET is_active = FALSE WHERE user_id = ? AND platform = ?',
        [userId, token, platform]
      );

      // Insert new token
      await executeQuery(
        `INSERT INTO push_notification_tokens 
         (id, user_id, token, platform, is_active, created_at) 
         VALUES (?, ?, ?, ?, TRUE, NOW())
         ON DUPLICATE KEY UPDATE
         is_active = TRUE, last_used_at = NOW()`,
        [uuidv4(), userId, token, platform]
      );

      logger.info('Push token registered', { userId, platform });

      return { message: 'Push notification token registered successfully' };
    } catch (error) {
      logger.error('Register push token error:', error);
      throw error;
    }
  }

  // Get user's notifications
  async getUserNotifications(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        type,
        sent
      } = options;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE user_id = ?';
      let queryParams = [userId];

      if (type) {
        whereClause += ' AND notification_type = ?';
        queryParams.push(type);
      }

      if (sent !== undefined) {
        whereClause += ' AND is_sent = ?';
        queryParams.push(sent);
      }

      queryParams.push(limit, offset);

      const notifications = await executeQuery(
        `SELECT * FROM scheduled_notifications
         ${whereClause}
         ORDER BY scheduled_time DESC
         LIMIT ? OFFSET ?`,
        queryParams
      );

      // Get total count
      const countParams = queryParams.slice(0, -2);
      const countResult = await executeQuery(
        `SELECT COUNT(*) as total FROM scheduled_notifications ${whereClause}`,
        countParams
      );

      return {
        notifications,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      };
    } catch (error) {
      logger.error('Get user notifications error:', error);
      throw error;
    }
  }

  // Update notification preferences
  async updateNotificationPreferences(userId, preferences) {
    try {
      const {
        articleUpdates, callReminders, groupMessages,
        growthReminders, expertMessages
      } = preferences;

      await executeQuery(
        `INSERT INTO notification_preferences 
         (id, user_id, article_updates, call_reminders, group_messages, 
          growth_reminders, expert_messages, updated_at)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
         article_updates = VALUES(article_updates),
         call_reminders = VALUES(call_reminders),
         group_messages = VALUES(group_messages),
         growth_reminders = VALUES(growth_reminders),
         expert_messages = VALUES(expert_messages),
         updated_at = NOW()`,
        [userId, articleUpdates, callReminders, groupMessages, growthReminders, expertMessages]
      );

      return { message: 'Notification preferences updated successfully' };
    } catch (error) {
      logger.error('Update notification preferences error:', error);
      throw error;
    }
  }

  // Send notification to multiple users
  async sendNotification(notificationData) {
    try {
      const { userIds, title, body, type = 'general', scheduledTime } = notificationData;
      const sendTime = scheduledTime ? new Date(scheduledTime) : new Date();

      const notifications = [];

      // Create notification records for each user
      for (const userId of userIds) {
        const notificationId = uuidv4();
        
        await executeQuery(
          `INSERT INTO scheduled_notifications 
           (id, user_id, notification_type, title, body, scheduled_time, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [notificationId, userId, type, title, body, sendTime]
        );

        notifications.push(notificationId);
      }

      // If scheduled for immediate sending, process now
      if (!scheduledTime || sendTime <= new Date()) {
        await this.processScheduledNotifications();
      }

      logger.info('Notifications scheduled', { 
        count: userIds.length, 
        type, 
        scheduledTime: sendTime 
      });

      return {
        message: `${userIds.length} notifications ${scheduledTime ? 'scheduled' : 'sent'} successfully`,
        notificationIds: notifications
      };
    } catch (error) {
      logger.error('Send notification error:', error);
      throw error;
    }
  }

  // Process scheduled notifications (called by cron job or manually)
  async processScheduledNotifications() {
    try {
      // Get notifications ready to be sent
      const notifications = await executeQuery(
        `SELECT sn.*, u.email, u.first_name
         FROM scheduled_notifications sn
         JOIN users u ON sn.user_id = u.id
         WHERE sn.scheduled_time <= NOW() 
         AND sn.is_sent = FALSE 
         AND sn.retry_count < sn.max_retries
         ORDER BY sn.scheduled_time ASC
         LIMIT 100`
      );

      let successCount = 0;
      let failureCount = 0;

      for (const notification of notifications) {
        try {
          // Send email notification
          await sendGridService.sendNotificationEmail(
            notification.email,
            notification.title,
            notification.body,
            notification.first_name
          );

          // Mark as sent
          await executeQuery(
            'UPDATE scheduled_notifications SET is_sent = TRUE, sent_at = NOW(), delivery_status = ? WHERE id = ?',
            ['sent', notification.id]
          );

          successCount++;
        } catch (error) {
          // Mark as failed and increment retry count
          await executeQuery(
            `UPDATE scheduled_notifications 
             SET retry_count = retry_count + 1, 
                 delivery_status = ?, 
                 error_message = ? 
             WHERE id = ?`,
            ['failed', error.message, notification.id]
          );

          failureCount++;
          logger.error('Notification send failed:', {
            notificationId: notification.id,
            error: error.message
          });
        }
      }

      logger.info('Scheduled notifications processed', {
        total: notifications.length,
        success: successCount,
        failures: failureCount
      });

      return {
        processed: notifications.length,
        successful: successCount,
        failed: failureCount
      };
    } catch (error) {
      logger.error('Process scheduled notifications error:', error);
      throw error;
    }
  }

  // Get scheduled notifications (admin)
  async getScheduledNotifications(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        type,
        sent
      } = options;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE 1=1';
      let queryParams = [];

      if (type) {
        whereClause += ' AND notification_type = ?';
        queryParams.push(type);
      }

      if (sent !== undefined) {
        whereClause += ' AND is_sent = ?';
        queryParams.push(sent);
      }

      queryParams.push(limit, offset);

      const notifications = await executeQuery(
        `SELECT sn.*, u.first_name, u.last_name, u.email
         FROM scheduled_notifications sn
         JOIN users u ON sn.user_id = u.id
         ${whereClause}
         ORDER BY sn.scheduled_time DESC
         LIMIT ? OFFSET ?`,
        queryParams
      );

      // Get total count
      const countParams = queryParams.slice(0, -2);
      const countResult = await executeQuery(
        `SELECT COUNT(*) as total FROM scheduled_notifications sn ${whereClause}`,
        countParams
      );

      return {
        notifications,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      };
    } catch (error) {
      logger.error('Get scheduled notifications error:', error);
      throw error;
    }
  }

  // Get notification statistics
  async getNotificationStats(options = {}) {
    try {
      const { startDate, endDate, type } = options;
      
      let whereClause = 'WHERE 1=1';
      let queryParams = [];

      if (startDate) {
        whereClause += ' AND DATE(scheduled_time) >= ?';
        queryParams.push(startDate);
      }

      if (endDate) {
        whereClause += ' AND DATE(scheduled_time) <= ?';
        queryParams.push(endDate);
      }

      if (type) {
        whereClause += ' AND notification_type = ?';
        queryParams.push(type);
      }

      const stats = await executeQuery(
        `SELECT 
           COUNT(*) as total_notifications,
           COUNT(CASE WHEN is_sent = TRUE THEN 1 END) as sent_notifications,
           COUNT(CASE WHEN delivery_status = 'delivered' THEN 1 END) as delivered_notifications,
           COUNT(CASE WHEN delivery_status = 'failed' THEN 1 END) as failed_notifications,
           AVG(retry_count) as avg_retry_count
         FROM scheduled_notifications
         ${whereClause}`,
        queryParams
      );

      // Get notification types breakdown
      const typeBreakdown = await executeQuery(
        `SELECT notification_type, COUNT(*) as count
         FROM scheduled_notifications
         ${whereClause}
         GROUP BY notification_type
         ORDER BY count DESC`,
        queryParams
      );

      return {
        overview: stats[0],
        typeBreakdown,
        period: { startDate, endDate }
      };
    } catch (error) {
      logger.error('Get notification stats error:', error);
      throw error;
    }
  }
}

module.exports = new NotificationController();