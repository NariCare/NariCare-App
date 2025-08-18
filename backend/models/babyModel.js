const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

class BabyModel {
  // Create new baby
  async create(babyData) {
    try {
      const {
        id, userId, name, dateOfBirth, gender,
        birthWeight, birthHeight, profileImageUrl
      } = babyData;

      await executeQuery(
        `INSERT INTO babies 
         (id, user_id, name, date_of_birth, gender, birth_weight, birth_height, 
          profile_image_url, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [id, userId, name, dateOfBirth, gender, birthWeight, birthHeight, profileImageUrl]
      );

      return await this.findById(id);
    } catch (error) {
      logger.error('Create baby error:', error);
      throw error;
    }
  }

  // Find baby by ID
  async findById(id) {
    try {
      const babies = await executeQuery(
        'SELECT * FROM babies WHERE id = ? AND is_active = TRUE',
        [id]
      );
      return babies.length > 0 ? babies[0] : null;
    } catch (error) {
      logger.error('Find baby by ID error:', error);
      throw error;
    }
  }

  // Get all babies for a user
  async findByUserId(userId, options = {}) {
    try {
      const { page = 1, limit = 10, sortBy = 'date_of_birth', sortOrder = 'DESC' } = options;
      const offset = (page - 1) * limit;

      const babies = await executeQuery(
        `SELECT * FROM babies 
         WHERE user_id = ? AND is_active = TRUE 
         ORDER BY ${sortBy} ${sortOrder}
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );

      // Get total count for pagination
      const countResult = await executeQuery(
        'SELECT COUNT(*) as total FROM babies WHERE user_id = ? AND is_active = TRUE',
        [userId]
      );

      return {
        babies,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      };
    } catch (error) {
      logger.error('Find babies by user ID error:', error);
      throw error;
    }
  }

  // Update baby
  async update(id, updateData) {
    try {
      const allowedFields = [
        'name', 'date_of_birth', 'gender', 'birth_weight', 'birth_height',
        'current_weight', 'current_height', 'profile_image_url'
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
        `UPDATE babies SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      return await this.findById(id);
    } catch (error) {
      logger.error('Update baby error:', error);
      throw error;
    }
  }

  // Soft delete baby
  async delete(id) {
    try {
      await executeQuery(
        'UPDATE babies SET is_active = FALSE, updated_at = NOW() WHERE id = ?',
        [id]
      );

      logger.info('Baby soft deleted', { babyId: id });
      return { message: 'Baby record archived successfully' };
    } catch (error) {
      logger.error('Delete baby error:', error);
      throw error;
    }
  }

  // Get baby with growth summary
  async getWithGrowthSummary(id) {
    try {
      const babies = await executeQuery(
        `SELECT b.*, 
                COUNT(DISTINCT gr.id) as total_growth_records,
                COUNT(DISTINCT wr.id) as total_weight_records,
                MAX(gr.record_date) as last_growth_record_date,
                MAX(wr.record_date) as last_weight_record_date,
                DATEDIFF(CURDATE(), b.date_of_birth) DIV 7 as age_in_weeks
         FROM babies b
         LEFT JOIN growth_records gr ON b.id = gr.baby_id
         LEFT JOIN weight_records wr ON b.id = wr.baby_id
         WHERE b.id = ? AND b.is_active = TRUE
         GROUP BY b.id`,
        [id]
      );

      return babies.length > 0 ? babies[0] : null;
    } catch (error) {
      logger.error('Get baby with growth summary error:', error);
      throw error;
    }
  }

  // Check if user owns baby
  async checkOwnership(babyId, userId) {
    try {
      const babies = await executeQuery(
        'SELECT id FROM babies WHERE id = ? AND user_id = ? AND is_active = TRUE',
        [babyId, userId]
      );
      return babies.length > 0;
    } catch (error) {
      logger.error('Check baby ownership error:', error);
      throw error;
    }
  }
}

module.exports = new BabyModel();