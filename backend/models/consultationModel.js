const { executeQuery, executeTransaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class ConsultationModel {
  // Create consultation
  async create(consultationData) {
    try {
      const {
        userId,
        expertId,
        consultationType = 'scheduled',
        scheduledAt,
        durationMinutes = 30,
        topic,
        notes,
        meetingLink
      } = consultationData;

      const id = uuidv4();

      await executeQuery(
        `INSERT INTO consultations 
         (id, user_id, expert_id, consultation_type, status, scheduled_at, 
          duration_minutes, topic, notes, meeting_link, created_at)
         VALUES (?, ?, ?, ?, 'scheduled', ?, ?, ?, ?, ?, NOW())`,
        [id, userId, expertId, consultationType, scheduledAt, durationMinutes, topic, notes, meetingLink]
      );

      return await this.findById(id);
    } catch (error) {
      logger.error('Create consultation error:', error);
      throw error;
    }
  }

  // Find consultation by ID
  async findById(id) {
    try {
      const consultations = await executeQuery(
        `SELECT c.*, 
                u.first_name as user_first_name, u.last_name as user_last_name, u.email as user_email,
                eu.first_name as expert_first_name, eu.last_name as expert_last_name,
                e.credentials as expert_credentials
         FROM consultations c
         JOIN users u ON c.user_id = u.id
         JOIN experts e ON c.expert_id = e.id
         JOIN users eu ON e.user_id = eu.id
         WHERE c.id = ?`,
        [id]
      );

      return consultations.length > 0 ? consultations[0] : null;
    } catch (error) {
      logger.error('Find consultation by ID error:', error);
      throw error;
    }
  }

  // Find consultations by user ID
  async findByUserId(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        startDate,
        endDate,
        sortBy = 'scheduled_at',
        sortOrder = 'DESC'
      } = options;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE c.user_id = ?';
      let queryParams = [userId];

      if (status) {
        whereClause += ' AND c.status = ?';
        queryParams.push(status);
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
                eu.first_name as expert_first_name, eu.last_name as expert_last_name,
                e.credentials as expert_credentials
         FROM consultations c
         JOIN experts e ON c.expert_id = e.id
         JOIN users eu ON e.user_id = eu.id
         ${whereClause}
         ORDER BY c.${sortBy} ${sortOrder}
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
      logger.error('Find consultations by user ID error:', error);
      throw error;
    }
  }

  // Find consultations by expert ID
  async findByExpertId(expertId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        startDate,
        endDate,
        sortBy = 'scheduled_at',
        sortOrder = 'ASC'
      } = options;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE c.expert_id = ?';
      let queryParams = [expertId];

      if (status) {
        whereClause += ' AND c.status = ?';
        queryParams.push(status);
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
                u.first_name as user_first_name, u.last_name as user_last_name, u.email as user_email
         FROM consultations c
         JOIN users u ON c.user_id = u.id
         ${whereClause}
         ORDER BY c.${sortBy} ${sortOrder}
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
      logger.error('Find consultations by expert ID error:', error);
      throw error;
    }
  }

  // Update consultation
  async update(id, updateData) {
    try {
      const allowedFields = [
        'status', 'actual_start_time', 'actual_end_time', 'expert_notes',
        'user_rating', 'user_feedback', 'follow_up_required'
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

      return await this.findById(id);
    } catch (error) {
      logger.error('Update consultation error:', error);
      throw error;
    }
  }

  // Delete consultation
  async delete(id) {
    try {
      const result = await executeQuery(
        'DELETE FROM consultations WHERE id = ?',
        [id]
      );

      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Delete consultation error:', error);
      throw error;
    }
  }

  // Get upcoming consultations
  async getUpcomingConsultations(options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        expertId,
        userId,
        hoursAhead = 24
      } = options;

      const offset = (page - 1) * limit;
      let whereClause = `WHERE c.status = 'scheduled' AND c.scheduled_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? HOUR)`;
      let queryParams = [hoursAhead];

      if (expertId) {
        whereClause += ' AND c.expert_id = ?';
        queryParams.push(expertId);
      }

      if (userId) {
        whereClause += ' AND c.user_id = ?';
        queryParams.push(userId);
      }

      queryParams.push(limit, offset);

      const consultations = await executeQuery(
        `SELECT c.*, 
                u.first_name as user_first_name, u.last_name as user_last_name, u.email as user_email,
                eu.first_name as expert_first_name, eu.last_name as expert_last_name,
                e.credentials as expert_credentials
         FROM consultations c
         JOIN users u ON c.user_id = u.id
         JOIN experts e ON c.expert_id = e.id
         JOIN users eu ON e.user_id = eu.id
         ${whereClause}
         ORDER BY c.scheduled_at ASC
         LIMIT ? OFFSET ?`,
        queryParams
      );

      return consultations;
    } catch (error) {
      logger.error('Get upcoming consultations error:', error);
      throw error;
    }
  }

  // Check consultation conflicts
  async checkConflicts(expertId, scheduledAt, durationMinutes, excludeId = null) {
    try {
      let whereClause = `WHERE expert_id = ? AND status IN ('scheduled', 'in-progress')
                        AND (
                          (scheduled_at <= ? AND DATE_ADD(scheduled_at, INTERVAL duration_minutes MINUTE) > ?) OR
                          (? <= scheduled_at AND DATE_ADD(?, INTERVAL ? MINUTE) > scheduled_at)
                        )`;
      let queryParams = [expertId, scheduledAt, scheduledAt, scheduledAt, scheduledAt, durationMinutes];

      if (excludeId) {
        whereClause += ' AND id != ?';
        queryParams.push(excludeId);
      }

      const conflicts = await executeQuery(
        `SELECT id, scheduled_at, duration_minutes FROM consultations ${whereClause}`,
        queryParams
      );

      return conflicts;
    } catch (error) {
      logger.error('Check consultation conflicts error:', error);
      throw error;
    }
  }
}

module.exports = new ConsultationModel();