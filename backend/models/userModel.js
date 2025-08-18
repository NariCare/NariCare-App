const { executeQuery, executeTransaction } = require('../config/database');
const logger = require('../utils/logger');

class UserModel {
  // Find user by email
  async findByEmail(email) {
    try {
      const users = await executeQuery(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      logger.error('Find user by email error:', error);
      throw error;
    }
  }

  // Find user by ID
  async findById(id) {
    try {
      const users = await executeQuery(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      logger.error('Find user by ID error:', error);
      throw error;
    }
  }

  // Create new user
  async create(userData) {
    try {
      const {
        id, email, passwordHash, firstName, lastName,
        phoneNumber, whatsappNumber, motherType, dueDate
      } = userData;

      await executeQuery(
        `INSERT INTO users 
         (id, email, password_hash, first_name, last_name, phone_number, 
          whatsapp_number, mother_type, due_date, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [id, email, passwordHash, firstName, lastName, 
         phoneNumber, whatsappNumber, motherType, dueDate]
      );

      return await this.findById(id);
    } catch (error) {
      logger.error('Create user error:', error);
      throw error;
    }
  }

  // Update user
  async update(id, updateData) {
    try {
      const allowedFields = [
        'first_name', 'last_name', 'phone_number', 'whatsapp_number',
        'profile_image_url', 'mother_type', 'due_date', 'is_onboarding_completed',
        'two_factor_enabled', 'two_factor_otp', 'two_factor_otp_expiry',
        'two_factor_otp_attempts', 'two_factor_verified_at'
      ];

      const updateFields = [];
      const updateValues = [];

      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = ?`);
          updateValues.push(updateData[key]);
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      updateFields.push('updated_at = NOW()');
      updateValues.push(id);

      await executeQuery(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      return await this.findById(id);
    } catch (error) {
      logger.error('Update user error:', error);
      throw error;
    }
  }

  // Get user with tier and notification preferences
  async getFullProfile(id) {
    try {
      const users = await executeQuery(
        `SELECT u.*, 
                ut.tier_type, ut.consultations_remaining, ut.start_date as tier_start_date,
                np.article_updates, np.call_reminders, np.group_messages, 
                np.growth_reminders, np.expert_messages
         FROM users u
         LEFT JOIN user_tiers ut ON u.id = ut.user_id AND ut.is_active = TRUE
         LEFT JOIN notification_preferences np ON u.id = np.user_id
         WHERE u.id = ?`,
        [id]
      );

      return users.length > 0 ? users[0] : null;
    } catch (error) {
      logger.error('Get full user profile error:', error);
      throw error;
    }
  }

  // Get user's babies
  async getUserBabies(userId) {
    try {
      const babies = await executeQuery(
        'SELECT * FROM babies WHERE user_id = ? AND is_active = TRUE ORDER BY date_of_birth DESC',
        [userId]
      );
      return babies;
    } catch (error) {
      logger.error('Get user babies error:', error);
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
        [userId, articleUpdates, callReminders, groupMessages, 
         growthReminders, expertMessages]
      );

      return { message: 'Notification preferences updated successfully' };
    } catch (error) {
      logger.error('Update notification preferences error:', error);
      throw error;
    }
  }

  // Delete user (soft delete by setting inactive)
  async delete(id) {
    try {
      await executeQuery(
        'UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = ?',
        [id]
      );

      logger.info('User soft deleted', { userId: id });
      return { message: 'User account deactivated successfully' };
    } catch (error) {
      logger.error('Delete user error:', error);
      throw error;
    }
  }
}

module.exports = new UserModel();