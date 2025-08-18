const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

class PumpingRecordModel {
  // Create new pumping record
  async create(recordData) {
    try {
      const {
        id, babyId, recordedBy, recordDate, recordTime,
        pumpingSide, totalOutput, durationMinutes, startTime, endTime,
        notes, enteredViaVoice
      } = recordData;

      await executeQuery(
        `INSERT INTO pumping_records 
         (id, baby_id, recorded_by, record_date, record_time, pumping_side,
          total_output, duration_minutes, start_time, end_time, notes, 
          entered_via_voice, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [id, babyId, recordedBy, recordDate, recordTime, pumpingSide,
         totalOutput, durationMinutes, startTime, endTime, notes, enteredViaVoice]
      );

      return await this.findById(id);
    } catch (error) {
      logger.error('Create pumping record error:', error);
      throw error;
    }
  }

  // Find pumping record by ID
  async findById(id) {
    try {
      const records = await executeQuery(
        `SELECT pr.*, b.name as baby_name, u.first_name, u.last_name
         FROM pumping_records pr
         JOIN babies b ON pr.baby_id = b.id
         JOIN users u ON pr.recorded_by = u.id
         WHERE pr.id = ?`,
        [id]
      );
      
      return records.length > 0 ? records[0] : null;
    } catch (error) {
      logger.error('Find pumping record by ID error:', error);
      throw error;
    }
  }

  // Get pumping records for a baby
  async findByBabyId(babyId, options = {}) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        startDate, 
        endDate,
        sortBy = 'record_date',
        sortOrder = 'DESC'
      } = options;
      
      const offset = (page - 1) * limit;
      let whereClause = 'WHERE pr.baby_id = ?';
      let queryParams = [babyId];

      // Add date filters
      if (startDate) {
        whereClause += ' AND pr.record_date >= ?';
        queryParams.push(startDate);
      }
      
      if (endDate) {
        whereClause += ' AND pr.record_date <= ?';
        queryParams.push(endDate);
      }

      // Add pagination params
      queryParams.push(limit, offset);

      const records = await executeQuery(
        `SELECT pr.*, b.name as baby_name, u.first_name, u.last_name
         FROM pumping_records pr
         JOIN babies b ON pr.baby_id = b.id
         JOIN users u ON pr.recorded_by = u.id
         ${whereClause}
         ORDER BY pr.${sortBy} ${sortOrder}, pr.record_time ${sortOrder}
         LIMIT ? OFFSET ?`,
        queryParams
      );

      // Get total count for pagination
      const countParams = queryParams.slice(0, -2);
      const countResult = await executeQuery(
        `SELECT COUNT(*) as total FROM pumping_records pr ${whereClause}`,
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
      logger.error('Find pumping records by baby ID error:', error);
      throw error;
    }
  }

  // Get pumping statistics
  async getPumpingStats(babyId, startDate, endDate) {
    try {
      const stats = await executeQuery(
        `SELECT 
           COUNT(*) as total_sessions,
           SUM(total_output) as total_output_ml,
           AVG(total_output) as avg_output_per_session,
           AVG(duration_minutes) as avg_duration_minutes,
           COUNT(CASE WHEN pumping_side = 'left' THEN 1 END) as left_sessions,
           COUNT(CASE WHEN pumping_side = 'right' THEN 1 END) as right_sessions,
           COUNT(CASE WHEN pumping_side = 'both' THEN 1 END) as both_sessions
         FROM pumping_records 
         WHERE baby_id = ? AND record_date BETWEEN ? AND ?`,
        [babyId, startDate, endDate]
      );

      return stats[0];
    } catch (error) {
      logger.error('Get pumping stats error:', error);
      throw error;
    }
  }

  // Update pumping record
  async update(id, updateData) {
    try {
      const allowedFields = [
        'record_date', 'record_time', 'pumping_side', 'total_output',
        'duration_minutes', 'start_time', 'end_time', 'notes', 'entered_via_voice'
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
        `UPDATE pumping_records SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      return await this.findById(id);
    } catch (error) {
      logger.error('Update pumping record error:', error);
      throw error;
    }
  }

  // Delete pumping record
  async delete(id) {
    try {
      await executeQuery(
        'DELETE FROM pumping_records WHERE id = ?',
        [id]
      );

      logger.info('Pumping record deleted', { recordId: id });
      return { message: 'Pumping record deleted successfully' };
    } catch (error) {
      logger.error('Delete pumping record error:', error);
      throw error;
    }
  }

  // Check ownership
  async checkOwnership(recordId, userId) {
    try {
      const records = await executeQuery(
        `SELECT pr.id FROM pumping_records pr
         JOIN babies b ON pr.baby_id = b.id
         WHERE pr.id = ? AND b.user_id = ?`,
        [recordId, userId]
      );
      return records.length > 0;
    } catch (error) {
      logger.error('Check pumping record ownership error:', error);
      throw error;
    }
  }
}

module.exports = new PumpingRecordModel();