const { executeQuery, executeTransaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class ExpertModel {
  // Create expert
  async create(expertData) {
    try {
      const {
        userId,
        credentials,
        bio,
        specialties = [],
        availability = []
      } = expertData;

      const id = uuidv4();

      const queries = [
        // Create expert record
        {
          query: `INSERT INTO experts 
                  (id, user_id, credentials, bio, created_at) 
                  VALUES (?, ?, ?, ?, NOW())`,
          params: [id, userId, credentials, bio]
        },
        // Update user role to expert
        {
          query: 'UPDATE users SET role = ? WHERE id = ?',
          params: ['expert', userId]
        }
      ];

      // Add specialties
      specialties.forEach(specialty => {
        queries.push({
          query: `INSERT INTO expert_specialties (id, expert_id, specialty) VALUES (?, ?, ?)`,
          params: [uuidv4(), id, specialty]
        });
      });

      // Add availability
      availability.forEach(slot => {
        queries.push({
          query: `INSERT INTO expert_availability 
                  (id, expert_id, day_of_week, start_time, end_time, is_available) 
                  VALUES (?, ?, ?, ?, ?, ?)`,
          params: [uuidv4(), id, slot.dayOfWeek, slot.startTime, slot.endTime, slot.isAvailable]
        });
      });

      await executeTransaction(queries);

      return await this.findById(id);
    } catch (error) {
      logger.error('Create expert error:', error);
      throw error;
    }
  }

  // Find expert by ID
  async findById(id) {
    try {
      const experts = await executeQuery(
        `SELECT e.*, u.first_name, u.last_name, u.email, u.profile_image_url
         FROM experts e
         JOIN users u ON e.user_id = u.id
         WHERE e.id = ?`,
        [id]
      );

      if (experts.length === 0) {
        return null;
      }

      const expert = experts[0];

      // Get specialties
      const specialties = await executeQuery(
        'SELECT specialty FROM expert_specialties WHERE expert_id = ?',
        [id]
      );

      expert.specialties = specialties.map(s => s.specialty);

      // Get availability
      const availability = await executeQuery(
        'SELECT * FROM expert_availability WHERE expert_id = ? ORDER BY day_of_week',
        [id]
      );

      expert.availability = availability;

      return expert;
    } catch (error) {
      logger.error('Find expert by ID error:', error);
      throw error;
    }
  }

  // Find expert by user ID
  async findByUserId(userId) {
    try {
      const experts = await executeQuery(
        'SELECT id FROM experts WHERE user_id = ?',
        [userId]
      );

      if (experts.length === 0) {
        return null;
      }

      return await this.findById(experts[0].id);
    } catch (error) {
      logger.error('Find expert by user ID error:', error);
      throw error;
    }
  }

  // Get all experts
  async findAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        specialty,
        available,
        sortBy = 'rating',
        sortOrder = 'DESC'
      } = options;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE e.is_available = TRUE';
      let queryParams = [];

      // Add specialty filter
      if (specialty) {
        whereClause += ` AND e.id IN (
          SELECT expert_id FROM expert_specialties WHERE specialty = ?
        )`;
        queryParams.push(specialty);
      }

      // Add availability filter
      if (available !== undefined) {
        whereClause += ' AND e.is_available = ?';
        queryParams.push(available);
      }

      queryParams.push(limit, offset);

      const experts = await executeQuery(
        `SELECT e.*, u.first_name, u.last_name, u.email, u.profile_image_url,
                GROUP_CONCAT(es.specialty) as specialties
         FROM experts e
         JOIN users u ON e.user_id = u.id
         LEFT JOIN expert_specialties es ON e.id = es.expert_id
         ${whereClause}
         GROUP BY e.id
         ORDER BY e.${sortBy} ${sortOrder}
         LIMIT ? OFFSET ?`,
        queryParams
      );

      // Parse specialties
      const parsedExperts = experts.map(expert => ({
        ...expert,
        specialties: expert.specialties ? expert.specialties.split(',') : []
      }));

      // Get total count
      const countParams = queryParams.slice(0, -2);
      const countResult = await executeQuery(
        `SELECT COUNT(DISTINCT e.id) as total FROM experts e ${whereClause}`,
        countParams
      );

      return {
        experts: parsedExperts,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      };
    } catch (error) {
      logger.error('Find all experts error:', error);
      throw error;
    }
  }

  // Update expert
  async update(id, updateData) {
    try {
      const allowedFields = ['credentials', 'bio', 'is_available'];
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
        `UPDATE experts SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      return await this.findById(id);
    } catch (error) {
      logger.error('Update expert error:', error);
      throw error;
    }
  }

  // Delete expert
  async delete(id) {
    try {
      // Get user ID before deletion
      const experts = await executeQuery(
        'SELECT user_id FROM experts WHERE id = ?',
        [id]
      );

      if (experts.length === 0) {
        throw new Error('Expert not found');
      }

      const userId = experts[0].user_id;

      const queries = [
        // Delete expert record (cascades to specialties and availability)
        {
          query: 'DELETE FROM experts WHERE id = ?',
          params: [id]
        },
        // Update user role back to user
        {
          query: 'UPDATE users SET role = ? WHERE id = ?',
          params: ['user', userId]
        }
      ];

      await executeTransaction(queries);

      logger.info('Expert deleted', { expertId: id, userId });
      return { message: 'Expert deleted successfully' };
    } catch (error) {
      logger.error('Delete expert error:', error);
      throw error;
    }
  }
}

module.exports = new ExpertModel();