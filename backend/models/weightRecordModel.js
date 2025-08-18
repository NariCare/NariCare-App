const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

class WeightRecordModel {
  // Create new weight record
  async create(recordData) {
    try {
      const {
        id, babyId, recordedBy, recordDate, weight, height,
        notes, enteredViaVoice
      } = recordData;

      await executeQuery(
        `INSERT INTO weight_records 
         (id, baby_id, recorded_by, record_date, weight, height, 
          notes, entered_via_voice, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [id, babyId, recordedBy, recordDate, weight, height, notes, enteredViaVoice]
      );

      return await this.findById(id);
    } catch (error) {
      logger.error('Create weight record error:', error);
      throw error;
    }
  }

  // Find weight record by ID
  async findById(id) {
    try {
      const records = await executeQuery(
        `SELECT wr.*, b.name as baby_name, u.first_name, u.last_name
         FROM weight_records wr
         JOIN babies b ON wr.baby_id = b.id
         JOIN users u ON wr.recorded_by = u.id
         WHERE wr.id = ?`,
        [id]
      );
      
      return records.length > 0 ? records[0] : null;
    } catch (error) {
      logger.error('Find weight record by ID error:', error);
      throw error;
    }
  }

  // Get weight records for a baby
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
      let whereClause = 'WHERE wr.baby_id = ?';
      let queryParams = [babyId];

      // Add date filters
      if (startDate) {
        whereClause += ' AND wr.record_date >= ?';
        queryParams.push(startDate);
      }
      
      if (endDate) {
        whereClause += ' AND wr.record_date <= ?';
        queryParams.push(endDate);
      }

      // Add pagination params
      queryParams.push(limit, offset);

      const records = await executeQuery(
        `SELECT wr.*, b.name as baby_name, u.first_name, u.last_name
         FROM weight_records wr
         JOIN babies b ON wr.baby_id = b.id
         JOIN users u ON wr.recorded_by = u.id
         ${whereClause}
         ORDER BY wr.${sortBy} ${sortOrder}
         LIMIT ? OFFSET ?`,
        queryParams
      );

      // Get total count for pagination
      const countParams = queryParams.slice(0, -2);
      const countResult = await executeQuery(
        `SELECT COUNT(*) as total FROM weight_records wr ${whereClause}`,
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
      logger.error('Find weight records by baby ID error:', error);
      throw error;
    }
  }

  // Update weight record
  async update(id, updateData) {
    try {
      const allowedFields = [
        'record_date', 'weight', 'height', 'notes', 'entered_via_voice'
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
        `UPDATE weight_records SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      return await this.findById(id);
    } catch (error) {
      logger.error('Update weight record error:', error);
      throw error;
    }
  }

  // Delete weight record
  async delete(id) {
    try {
      await executeQuery(
        'DELETE FROM weight_records WHERE id = ?',
        [id]
      );

      logger.info('Weight record deleted', { recordId: id });
      return { message: 'Weight record deleted successfully' };
    } catch (error) {
      logger.error('Delete weight record error:', error);
      throw error;
    }
  }

  // Check ownership
  async checkOwnership(recordId, userId) {
    try {
      const records = await executeQuery(
        `SELECT wr.id FROM weight_records wr
         JOIN babies b ON wr.baby_id = b.id
         WHERE wr.id = ? AND b.user_id = ?`,
        [recordId, userId]
      );
      return records.length > 0;
    } catch (error) {
      logger.error('Check weight record ownership error:', error);
      throw error;
    }
  }
}

module.exports = new WeightRecordModel();