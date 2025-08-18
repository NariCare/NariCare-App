const { executeQuery, executeTransaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class NotificationModel {
  // Create push notification token
  async createToken(tokenData) {
    try {
      const { userId, token, platform } = tokenData;

      // Check if token already exists
      const existing = await executeQuery(
        'SELECT id FROM push_notification_tokens WHERE user_id = ? AND token = ?',
        [userId, token]
      );

      if (existing.length > 0) {
        // Update existing token
        await executeQuery(
          'UPDATE push_notification_tokens SET is_active = TRUE, last_used_at = NOW(), updated_at = NOW() WHERE user_id = ? AND token = ?',
          [userId, token]
        );
        return { message: 'Token updated successfully' };
      }

      // Create new token
      await executeQuery(
        `INSERT INTO push_notification_tokens 
         (id, user_id, token, platform, is_active, last_used_at, created_at)
         VALUES (?, ?, ?, ?, TRUE, NOW(), NOW())`,
        [uuidv4(), userId, token, platform]
      );

      return { message: 'Token created successfully' };
    } catch (error) {
      logger.error('Create notification token error:', error);
      throw error;
    }
  }

  // Get user tokens
  async getUserTokens(userId, platform = null) {
    try {
      let query = 'SELECT * FROM push_notification_tokens WHERE user_id = ? AND is_active = TRUE';
      let params = [userId];

      if (platform) {
        query += ' AND platform = ?';
        params.push(platform);
      }

      const tokens = await executeQuery(query, params);
      return tokens;
    } catch (error) {
      logger.error('Get user tokens error:', error);
      throw error;
    }
  }

  // Schedule notification
  async scheduleNotification(notificationData) {
    try {
      const {
        userId,
        notificationType,
        title,
        body,
        scheduledTime,
        additionalData = {}
      } = notificationData;

      const id = uuidv4();

      await executeQuery(
        `INSERT INTO scheduled_notifications 
         (id, user_id, notification_type, title, body, scheduled_time, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [id, userId, notificationType, title, body, scheduledTime]
      );

      return { id, message: 'Notification scheduled successfully' };
    } catch (error) {
      logger.error('Schedule notification error:', error);
      throw error;
    }
  }

  // Get pending notifications
  async getPendingNotifications(limit = 100) {
    try {
      const notifications = await executeQuery(
        `SELECT sn.*, u.email, u.first_name, u.last_name
         FROM scheduled_notifications sn
         JOIN users u ON sn.user_id = u.id
         WHERE sn.is_sent = FALSE 
           AND sn.scheduled_time <= NOW()
           AND sn.retry_count < sn.max_retries
         ORDER BY sn.scheduled_time ASC
         LIMIT ?`,
        [limit]
      );

      return notifications;
    } catch (error) {
      logger.error('Get pending notifications error:', error);
      throw error;
    }
  }

  // Mark notification as sent
  async markNotificationSent(id, deliveryStatus = 'sent', errorMessage = null) {
    try {
      await executeQuery(
        `UPDATE scheduled_notifications 
         SET is_sent = TRUE, sent_at = NOW(), delivery_status = ?, error_message = ?
         WHERE id = ?`,
        [deliveryStatus, errorMessage, id]
      );

      return { message: 'Notification marked as sent' };
    } catch (error) {
      logger.error('Mark notification sent error:', error);
      throw error;
    }
  }

  // Increment retry count
  async incrementRetryCount(id) {
    try {
      await executeQuery(
        'UPDATE scheduled_notifications SET retry_count = retry_count + 1 WHERE id = ?',
        [id]
      );

      return { message: 'Retry count incremented' };
    } catch (error) {
      logger.error('Increment retry count error:', error);
      throw error;
    }
  }

  // Get user notification preferences
  async getUserPreferences(userId) {
    try {
      const preferences = await executeQuery(
        'SELECT * FROM notification_preferences WHERE user_id = ?',
        [userId]
      );

      return preferences.length > 0 ? preferences[0] : null;
    } catch (error) {
      logger.error('Get user notification preferences error:', error);
      throw error;
    }
  }

  // Update user notification preferences
  async updateUserPreferences(userId, preferences) {
    try {
      const allowedFields = [
        'article_updates', 'call_reminders', 'group_messages',
        'growth_reminders', 'expert_messages'
      ];
      
      const updateFields = [];
      const updateValues = [];

      Object.keys(preferences).forEach(key => {
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (allowedFields.includes(dbField)) {
          updateFields.push(`${dbField} = ?`);
          updateValues.push(preferences[key]);
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      updateFields.push('updated_at = NOW()');
      updateValues.push(userId);

      await executeQuery(
        `UPDATE notification_preferences SET ${updateFields.join(', ')} WHERE user_id = ?`,
        updateValues
      );

      return await this.getUserPreferences(userId);
    } catch (error) {
      logger.error('Update user notification preferences error:', error);
      throw error;
    }
  }

  // Delete old notifications
  async deleteOldNotifications(daysOld = 30) {
    try {
      const result = await executeQuery(
        'DELETE FROM scheduled_notifications WHERE is_sent = TRUE AND sent_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
        [daysOld]
      );

      logger.info('Deleted old notifications', { deletedCount: result.affectedRows });
      return { deletedCount: result.affectedRows };
    } catch (error) {
      logger.error('Delete old notifications error:', error);
      throw error;
    }
  }
}

module.exports = new NotificationModel();