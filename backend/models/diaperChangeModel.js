const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

class DiaperChangeModel {
  // Create new diaper change record
  async create(recordData) {
    try {
      const {
        id, babyId, recordedBy, recordDate, recordTime,
        changeType, wetnessLevel, notes, enteredViaVoice
      } = recordData;

      await executeQuery(
        `INSERT INTO diaper_change_records 
         (id, baby_id, recorded_by, record_date, record_time, change_type,
          wetness_level, notes, entered_via_voice, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [id, babyId, recordedBy, recordDate, recordTime, changeType,
         wetnessLevel, notes, enteredViaVoice]
      );

      return await this.findById(id);
    } catch (error) {
      logger.error('Create diaper change record error:', error);
      throw error;
    }
  }

  // Find diaper change record by ID
  async findById(id) {
    try {
      const records = await executeQuery(
        `SELECT dr.*, b.name as baby_name, u.first_name, u.last_name
         FROM diaper_change_records dr
         JOIN babies b ON dr.baby_id = b.id
         JOIN users u ON dr.recorded_by = u.id
         WHERE dr.id = ?`,
        [id]
      );
      
      return records.length > 0 ? records[0] : null;
    } catch (error) {
      logger.error('Find diaper change record by ID error:', error);
      throw error;
    }
  }

  // Get diaper change records for a baby
  async findByBabyId(babyId, options = {}) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        startDate, 
        endDate,
        changeType,
        sortBy = 'record_date',
        sortOrder = 'DESC'
      } = options;
      
      const offset = (page - 1) * limit;
      let whereClause = 'WHERE dr.baby_id = ?';
      let queryParams = [babyId];

      // Add date filters
      if (startDate) {
        whereClause += ' AND dr.record_date >= ?';
        queryParams.push(startDate);
      }
      
      if (endDate) {
        whereClause += ' AND dr.record_date <= ?';
        queryParams.push(endDate);
      }

      // Add change type filter
      if (changeType) {
        whereClause += ' AND dr.change_type = ?';
        queryParams.push(changeType);
      }

      // Add pagination params
      queryParams.push(limit, offset);

      const records = await executeQuery(
        `SELECT dr.*, b.name as baby_name, u.first_name, u.last_name
         FROM diaper_change_records dr
         JOIN babies b ON dr.baby_id = b.id
         JOIN users u ON dr.recorded_by = u.id
         ${whereClause}
         ORDER BY dr.${sortBy} ${sortOrder}, dr.record_time ${sortOrder}
         LIMIT ? OFFSET ?`,
        queryParams
      );

      // Get total count for pagination
      const countParams = queryParams.slice(0, -2);
      const countResult = await executeQuery(
        `SELECT COUNT(*) as total FROM diaper_change_records dr ${whereClause}`,
        countParams
      );

      return {
        records,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      };
    } catch (error) {
      logger.error('Find diaper change records by baby ID error:', error);
      throw error;
    }
  }

  // Get diaper change statistics
  async getDiaperStats(babyId, startDate, endDate) {
    try {
      const stats = await executeQuery(
        `SELECT 
           COUNT(*) as total_changes,
           COUNT(CASE WHEN change_type = 'pee' THEN 1 END) as pee_only_changes,
           COUNT(CASE WHEN change_type = 'poop' THEN 1 END) as poop_only_changes,
           COUNT(CASE WHEN change_type = 'both' THEN 1 END) as both_changes,
           COUNT(CASE WHEN wetness_level = 'light' THEN 1 END) as light_wetness,
           COUNT(CASE WHEN wetness_level = 'medium' THEN 1 END) as medium_wetness,
           COUNT(CASE WHEN wetness_level = 'heavy' THEN 1 END) as heavy_wetness
         FROM diaper_change_records 
         WHERE baby_id = ? AND record_date BETWEEN ? AND ?`,
        [babyId, startDate, endDate]
      );

      return stats[0];
    } catch (error) {
      logger.error('Get diaper stats error:', error);
      throw error;
    }
  }

  // Update diaper change record
  async update(id, updateData) {
    try {
      const allowedFields = [
        'record_date', 'record_time', 'change_type', 'wetness_level',
        'notes', 'entered_via_voice'
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

      updateValues.push(id);

      await executeQuery(
        `UPDATE diaper_change_records SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      return await this.findById(id);
    } catch (error) {
      logger.error('Update diaper change record error:', error);
      throw error;
    }
  }

  // Delete diaper change record
  async delete(id) {
    try {
      await executeQuery(
        'DELETE FROM diaper_change_records WHERE id = ?',
        [id]
      );

      logger.info('Diaper change record deleted', { recordId: id });
      return { message: 'Diaper change record deleted successfully' };
    } catch (error) {
      logger.error('Delete diaper change record error:', error);
      throw error;
    }
  }

  // Check ownership
  async checkOwnership(recordId, userId) {
    try {
      const records = await executeQuery(
        `SELECT dr.id FROM diaper_change_records dr
         JOIN babies b ON dr.baby_id = b.id
         WHERE dr.id = ? AND b.user_id = ?`,
        [recordId, userId]
      );
      return records.length > 0;
    } catch (error) {
      logger.error('Check diaper change record ownership error:', error);
      throw error;
    }
  }
}

module.exports = new DiaperChangeModel();