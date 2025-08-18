const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

class StoolRecordModel {
  // Create new stool record
  async create(recordData) {
    try {
      const {
        id, babyId, recordedBy, recordDate, recordTime,
        stoolColor, stoolTexture, stoolSize, peeCount, poopCount,
        notes, enteredViaVoice
      } = recordData;

      await executeQuery(
        `INSERT INTO stool_records 
         (id, baby_id, recorded_by, record_date, record_time, stool_color, 
          stool_texture, stool_size, pee_count, poop_count, notes, 
          entered_via_voice, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [id, babyId, recordedBy, recordDate, recordTime, stoolColor,
         stoolTexture, stoolSize, peeCount, poopCount, notes, enteredViaVoice]
      );

      return await this.findById(id);
    } catch (error) {
      logger.error('Create stool record error:', error);
      throw error;
    }
  }

  // Find stool record by ID
  async findById(id) {
    try {
      const records = await executeQuery(
        `SELECT sr.*, b.name as baby_name, u.first_name, u.last_name
         FROM stool_records sr
         JOIN babies b ON sr.baby_id = b.id
         JOIN users u ON sr.recorded_by = u.id
         WHERE sr.id = ?`,
        [id]
      );
      
      return records.length > 0 ? records[0] : null;
    } catch (error) {
      logger.error('Find stool record by ID error:', error);
      throw error;
    }
  }

  // Get stool records for a baby
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
      let whereClause = 'WHERE sr.baby_id = ?';
      let queryParams = [babyId];

      // Add date filters
      if (startDate) {
        whereClause += ' AND sr.record_date >= ?';
        queryParams.push(startDate);
      }
      
      if (endDate) {
        whereClause += ' AND sr.record_date <= ?';
        queryParams.push(endDate);
      }

      // Add pagination params
      queryParams.push(limit, offset);

      const records = await executeQuery(
        `SELECT sr.*, b.name as baby_name, u.first_name, u.last_name
         FROM stool_records sr
         JOIN babies b ON sr.baby_id = b.id
         JOIN users u ON sr.recorded_by = u.id
         ${whereClause}
         ORDER BY sr.${sortBy} ${sortOrder}, sr.record_time ${sortOrder}
         LIMIT ? OFFSET ?`,
        queryParams
      );

      // Get total count for pagination
      const countParams = queryParams.slice(0, -2);
      const countResult = await executeQuery(
        `SELECT COUNT(*) as total FROM stool_records sr ${whereClause}`,
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
      logger.error('Find stool records by baby ID error:', error);
      throw error;
    }
  }

  // Update stool record
  async update(id, updateData) {
    try {
      const allowedFields = [
        'record_date', 'record_time', 'stool_color', 'stool_texture',
        'stool_size', 'pee_count', 'poop_count', 'notes', 'entered_via_voice'
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
        `UPDATE stool_records SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      return await this.findById(id);
    } catch (error) {
      logger.error('Update stool record error:', error);
      throw error;
    }
  }

  // Delete stool record
  async delete(id) {
    try {
      await executeQuery(
        'DELETE FROM stool_records WHERE id = ?',
        [id]
      );

      logger.info('Stool record deleted', { recordId: id });
      return { message: 'Stool record deleted successfully' };
    } catch (error) {
      logger.error('Delete stool record error:', error);
      throw error;
    }
  }

  // Check ownership
  async checkOwnership(recordId, userId) {
    try {
      const records = await executeQuery(
        `SELECT sr.id FROM stool_records sr
         JOIN babies b ON sr.baby_id = b.id
         WHERE sr.id = ? AND b.user_id = ?`,
        [recordId, userId]
      );
      return records.length > 0;
    } catch (error) {
      logger.error('Check stool record ownership error:', error);
      throw error;
    }
  }

  // Get stool pattern analysis
  async getStoolPatterns(babyId, days = 7) {
    try {
      const records = await executeQuery(
        `SELECT stool_color, stool_texture, stool_size, 
                COUNT(*) as frequency,
                AVG(pee_count) as avg_pee_count,
                AVG(poop_count) as avg_poop_count
         FROM stool_records 
         WHERE baby_id = ? AND record_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         GROUP BY stool_color, stool_texture, stool_size
         ORDER BY frequency DESC`,
        [babyId, days]
      );

      return records;
    } catch (error) {
      logger.error('Get stool patterns error:', error);
      throw error;
    }
  }
}

module.exports = new StoolRecordModel();