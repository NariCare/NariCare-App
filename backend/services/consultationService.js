const { executeQuery, executeTransaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const sendGridService = require('./sendgridService');
const logger = require('../utils/logger');

class ConsultationService {
  // Schedule new consultation
  async scheduleConsultation(consultationData) {
    try {
      const {
        id, userId, expertId, scheduledAt, topic, notes, durationType = 'scheduled'
      } = consultationData;

      // Check if expert exists and is available
      const experts = await executeQuery(
        'SELECT id, user_id FROM experts WHERE id = ? AND is_available = TRUE',
        [expertId]
      );

      if (experts.length === 0) {
        throw new Error('Expert not found or not available');
      }

      // Check user's tier and remaining consultations
      const userTiers = await executeQuery(
        'SELECT consultations_remaining FROM user_tiers WHERE user_id = ? AND is_active = TRUE',
        [userId]
      );

      if (userTiers.length === 0 || userTiers[0].consultations_remaining <= 0) {
        throw new Error('No consultations remaining in your current plan');
      }

      // Check for scheduling conflicts
      const conflicts = await executeQuery(
        `SELECT id FROM consultations 
         WHERE expert_id = ? AND status IN ('scheduled', 'in-progress')
         AND ABS(TIMESTAMPDIFF(MINUTE, scheduled_at, ?)) < 30`,
        [expertId, scheduledAt]
      );

      if (conflicts.length > 0) {
        throw new Error('Expert is not available at this time');
      }

      // Generate meeting link
      const meetingLink = `https://meet.jit.si/naricare-consultation-${id}`;

      // Create consultation
      await executeQuery(
        `INSERT INTO consultations 
         (id, user_id, expert_id, consultation_type, status, scheduled_at, 
          topic, notes, meeting_link, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [id, userId, expertId, durationType, 'scheduled', scheduledAt, topic, notes, meetingLink]
      );

      // Get user and expert details for email
      const userDetails = await executeQuery(
        'SELECT email, first_name FROM users WHERE id = ?',
        [userId]
      );

      const expertDetails = await executeQuery(
        `SELECT u.first_name, u.last_name, u.email 
         FROM experts e 
         JOIN users u ON e.user_id = u.id 
         WHERE e.id = ?`,
        [expertId]
      );

      // Send confirmation emails (non-blocking)
      if (userDetails.length > 0 && expertDetails.length > 0) {
        const user = userDetails[0];
        const expert = expertDetails[0];

        try {
          await sendGridService.sendConsultationReminder(user.email, {
            userName: user.first_name,
            expertName: `${expert.first_name} ${expert.last_name}`,
            scheduledAt,
            topic,
            meetingLink
          });
        } catch (emailError) {
          logger.warn('Consultation confirmation email failed:', emailError.message);
        }
      }

      return await this.getConsultationById(id);
    } catch (error) {
      logger.error('Schedule consultation error:', error);
      throw error;
    }
  }

  // Get consultation by ID
  async getConsultationById(id) {
    try {
      const consultations = await executeQuery(
        `SELECT c.*, 
                u.first_name as user_first_name, u.last_name as user_last_name, u.email as user_email,
                eu.first_name as expert_first_name, eu.last_name as expert_last_name, eu.email as expert_email,
                e.credentials as expert_credentials, e.rating as expert_rating,
                eu.id as expert_user_id
         FROM consultations c
         JOIN users u ON c.user_id = u.id
         JOIN experts e ON c.expert_id = e.id
         JOIN users eu ON e.user_id = eu.id
         WHERE c.id = ?`,
        [id]
      );

      return consultations.length > 0 ? consultations[0] : null;
    } catch (error) {
      logger.error('Get consultation by ID error:', error);
      throw error;
    }
  }

  // Get user's consultations
  async getUserConsultations(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        upcoming
      } = options;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE c.user_id = ?';
      let queryParams = [userId];

      if (status) {
        whereClause += ' AND c.status = ?';
        queryParams.push(status);
      }

      if (upcoming) {
        whereClause += ' AND c.scheduled_at > NOW() AND c.status = "scheduled"';
      }

      queryParams.push(limit, offset);

      const consultations = await executeQuery(
        `SELECT c.*, 
                eu.first_name as expert_first_name, eu.last_name as expert_last_name,
                e.credentials as expert_credentials, e.rating as expert_rating
         FROM consultations c
         JOIN experts e ON c.expert_id = e.id
         JOIN users eu ON e.user_id = eu.id
         ${whereClause}
         ORDER BY c.scheduled_at DESC
         LIMIT ? OFFSET ?`,
        queryParams
      );

      // Get total count
      const countParams = queryParams.slice(0, -2);
      const countResult = await executeQuery(
        `SELECT COUNT(*) as total FROM consultations c ${whereClause}`,
        countParams
      );

      return {
        consultations,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      };
    } catch (error) {
      logger.error('Get user consultations error:', error);
      throw error;
    }
  }

  // Get expert's consultations
  async getExpertConsultations(expertUserId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        upcoming
      } = options;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE e.user_id = ?';
      let queryParams = [expertUserId];

      if (status) {
        whereClause += ' AND c.status = ?';
        queryParams.push(status);
      }

      if (upcoming) {
        whereClause += ' AND c.scheduled_at > NOW() AND c.status = "scheduled"';
      }

      queryParams.push(limit, offset);

      const consultations = await executeQuery(
        `SELECT c.*, 
                u.first_name as user_first_name, u.last_name as user_last_name, u.email as user_email
         FROM consultations c
         JOIN experts e ON c.expert_id = e.id
         JOIN users u ON c.user_id = u.id
         ${whereClause}
         ORDER BY c.scheduled_at ASC
         LIMIT ? OFFSET ?`,
        queryParams
      );

      // Get total count
      const countParams = queryParams.slice(0, -2);
      const countResult = await executeQuery(
        `SELECT COUNT(*) as total 
         FROM consultations c 
         JOIN experts e ON c.expert_id = e.id 
         ${whereClause}`,
        countParams
      );

      return {
        consultations,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      };
    } catch (error) {
      logger.error('Get expert consultations error:', error);
      throw error;
    }
  }

  // Update consultation
  async updateConsultation(id, updateData) {
    try {
      const allowedFields = [
        'scheduled_at', 'topic', 'notes', 'user_rating', 'user_feedback'
      ];

      const updateFields = [];
      const updateValues = [];

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

      updateFields.push('updated_at = NOW()');
      updateValues.push(id);

      await executeQuery(
        `UPDATE consultations SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      return await this.getConsultationById(id);
    } catch (error) {
      logger.error('Update consultation error:', error);
      throw error;
    }
  }

  // Cancel consultation
  async cancelConsultation(id, userId) {
    try {
      // Get consultation details
      const consultation = await this.getConsultationById(id);
      
      if (!consultation) {
        throw new Error('Consultation not found');
      }

      // Check if user can cancel (owner or expert or admin)
      const canCancel = consultation.user_id === userId || 
                       consultation.expert_user_id === userId;

      if (!canCancel) {
        throw new Error('Not authorized to cancel this consultation');
      }

      // Check if consultation can be cancelled (not already completed)
      if (consultation.status === 'completed') {
        throw new Error('Cannot cancel completed consultation');
      }

      // Update status to cancelled
      await executeQuery(
        'UPDATE consultations SET status = ?, updated_at = NOW() WHERE id = ?',
        ['cancelled', id]
      );

      // If cancelled by user and not started, refund consultation credit
      if (consultation.user_id === userId && consultation.status === 'scheduled') {
        await executeQuery(
          'UPDATE user_tiers SET consultations_remaining = consultations_remaining + 1 WHERE user_id = ? AND is_active = TRUE',
          [userId]
        );
      }

      return { message: 'Consultation cancelled successfully' };
    } catch (error) {
      logger.error('Cancel consultation error:', error);
      throw error;
    }
  }

  // Expert: Start consultation
  async startConsultation(id, expertUserId) {
    try {
      // Verify expert owns this consultation
      const consultations = await executeQuery(
        `SELECT c.id FROM consultations c
         JOIN experts e ON c.expert_id = e.id
         WHERE c.id = ? AND e.user_id = ? AND c.status = 'scheduled'`,
        [id, expertUserId]
      );

      if (consultations.length === 0) {
        throw new Error('Consultation not found or not authorized');
      }

      // Update status and start time
      await executeQuery(
        'UPDATE consultations SET status = ?, actual_start_time = NOW(), updated_at = NOW() WHERE id = ?',
        ['in-progress', id]
      );

      const consultation = await this.getConsultationById(id);

      return {
        message: 'Consultation started successfully',
        consultation
      };
    } catch (error) {
      logger.error('Start consultation error:', error);
      throw error;
    }
  }

  // Expert: Complete consultation
  async completeConsultation(id, expertUserId, completionData) {
    try {
      const { expertNotes, followUpRequired = false } = completionData;

      // Verify expert owns this consultation
      const consultations = await executeQuery(
        `SELECT c.id FROM consultations c
         JOIN experts e ON c.expert_id = e.id
         WHERE c.id = ? AND e.user_id = ? AND c.status = 'in-progress'`,
        [id, expertUserId]
      );

      if (consultations.length === 0) {
        throw new Error('Consultation not found or not authorized');
      }

      // Update consultation as completed
      await executeQuery(
        `UPDATE consultations 
         SET status = ?, actual_end_time = NOW(), expert_notes = ?, 
             follow_up_required = ?, updated_at = NOW() 
         WHERE id = ?`,
        ['completed', expertNotes, followUpRequired, id]
      );

      const consultation = await this.getConsultationById(id);

      return {
        message: 'Consultation completed successfully',
        consultation
      };
    } catch (error) {
      logger.error('Complete consultation error:', error);
      throw error;
    }
  }

  // Admin: Get all consultations
  async getAllConsultations(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        expertId,
        startDate,
        endDate
      } = options;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE 1=1';
      let queryParams = [];

      if (status) {
        whereClause += ' AND c.status = ?';
        queryParams.push(status);
      }

      if (expertId) {
        whereClause += ' AND c.expert_id = ?';
        queryParams.push(expertId);
      }

      if (startDate) {
        whereClause += ' AND DATE(c.scheduled_at) >= ?';
        queryParams.push(startDate);
      }

      if (endDate) {
        whereClause += ' AND DATE(c.scheduled_at) <= ?';
        queryParams.push(endDate);
      }

      queryParams.push(limit, offset);

      const consultations = await executeQuery(
        `SELECT c.*, 
                u.first_name as user_first_name, u.last_name as user_last_name,
                eu.first_name as expert_first_name, eu.last_name as expert_last_name,
                e.credentials as expert_credentials
         FROM consultations c
         JOIN users u ON c.user_id = u.id
         JOIN experts e ON c.expert_id = e.id
         JOIN users eu ON e.user_id = eu.id
         ${whereClause}
         ORDER BY c.scheduled_at DESC
         LIMIT ? OFFSET ?`,
        queryParams
      );

      // Get total count
      const countParams = queryParams.slice(0, -2);
      const countResult = await executeQuery(
        `SELECT COUNT(*) as total FROM consultations c ${whereClause}`,
        countParams
      );

      return {
        consultations,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      };
    } catch (error) {
      logger.error('Get all consultations error:', error);
      throw error;
    }
  }

  // Get consultation statistics
  async getConsultationStats(options = {}) {
    try {
      const { startDate, endDate, expertId } = options;
      
      let whereClause = 'WHERE 1=1';
      let queryParams = [];

      if (startDate) {
        whereClause += ' AND DATE(c.scheduled_at) >= ?';
        queryParams.push(startDate);
      }

      if (endDate) {
        whereClause += ' AND DATE(c.scheduled_at) <= ?';
        queryParams.push(endDate);
      }

      if (expertId) {
        whereClause += ' AND c.expert_id = ?';
        queryParams.push(expertId);
      }

      const stats = await executeQuery(
        `SELECT 
           COUNT(*) as total_consultations,
           COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_consultations,
           COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_consultations,
           COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_consultations,
           AVG(user_rating) as average_rating,
           AVG(TIMESTAMPDIFF(MINUTE, actual_start_time, actual_end_time)) as avg_duration_minutes
         FROM consultations c
         ${whereClause}`,
        queryParams
      );

      // Get top topics
      const topTopics = await executeQuery(
        `SELECT topic, COUNT(*) as count
         FROM consultations c
         ${whereClause}
         GROUP BY topic
         ORDER BY count DESC
         LIMIT 10`,
        queryParams
      );

      // Get expert performance if specific expert
      let expertPerformance = null;
      if (expertId) {
        const performance = await executeQuery(
          `SELECT 
             AVG(user_rating) as avg_rating,
             COUNT(CASE WHEN user_rating >= 4 THEN 1 END) as positive_ratings,
             COUNT(CASE WHEN user_rating < 4 THEN 1 END) as negative_ratings
           FROM consultations c
           WHERE c.expert_id = ? AND user_rating IS NOT NULL`,
          [expertId]
        );

        expertPerformance = performance[0];
      }

      return {
        overview: stats[0],
        topTopics,
        expertPerformance,
        period: { startDate, endDate }
      };
    } catch (error) {
      logger.error('Get consultation stats error:', error);
      throw error;
    }
  }
}

module.exports = new ConsultationService();