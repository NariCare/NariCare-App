const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

class GrowthRecordModel {
  // Create new growth record
  async create(recordData) {
    try {
      const {
        id, babyId, recordedBy, recordDate, feedTypes,
        directFeedDetails, expressedMilkDetails, formulaDetails,
        notes, enteredViaVoice
      } = recordData;

      await executeQuery(
        `INSERT INTO growth_records 
         (id, baby_id, recorded_by, record_date, feed_types,
          direct_start_time, direct_breast_side, direct_duration, direct_pain_level,
          expressed_quantity, formula_quantity, notes, entered_via_voice, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          id, babyId, recordedBy, recordDate, JSON.stringify(feedTypes),
          directFeedDetails?.startTime, directFeedDetails?.breastSide,
          directFeedDetails?.duration, directFeedDetails?.painLevel,
          expressedMilkDetails?.quantity, formulaDetails?.quantity,
          notes, enteredViaVoice
        ]
      );

      return await this.findById(id);
    } catch (error) {
      logger.error('Create growth record error:', error);
      throw error;
    }
  }

  // Find growth record by ID
  async findById(id) {
    try {
      const records = await executeQuery(
        `SELECT gr.*, b.name as baby_name, u.first_name, u.last_name
         FROM growth_records gr
         JOIN babies b ON gr.baby_id = b.id
         JOIN users u ON gr.recorded_by = u.id
         WHERE gr.id = ?`,
        [id]
      );
      
      if (records.length > 0) {
        const record = records[0];
        // Parse JSON fields
        record.feed_types = JSON.parse(record.feed_types);
        return record;
      }
      
      return null;
    } catch (error) {
      logger.error('Find growth record by ID error:', error);
      throw error;
    }
  }

  // Get growth records for a baby
  async findByBabyId(babyId, options = {}) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        startDate, 
        endDate,
        feedTypes,
        sortBy = 'record_date',
        sortOrder = 'DESC'
      } = options;
      
      const offset = (page - 1) * limit;
      let whereClause = 'WHERE gr.baby_id = ?';
      let queryParams = [babyId];

      // Add date filters
      if (startDate) {
        whereClause += ' AND gr.record_date >= ?';
        queryParams.push(startDate);
      }
      
      if (endDate) {
        whereClause += ' AND gr.record_date <= ?';
        queryParams.push(endDate);
      }

      // Add feed type filter
      if (feedTypes && feedTypes.length > 0) {
        const feedTypeConditions = feedTypes.map(() => 'JSON_CONTAINS(gr.feed_types, ?)').join(' OR ');
        whereClause += ` AND (${feedTypeConditions})`;
        feedTypes.forEach(type => queryParams.push(`"${type}"`));
      }

      // Add pagination params
      queryParams.push(limit, offset);

      const records = await executeQuery(
        `SELECT gr.*, b.name as baby_name, u.first_name, u.last_name
         FROM growth_records gr
         JOIN babies b ON gr.baby_id = b.id
         JOIN users u ON gr.recorded_by = u.id
         ${whereClause}
         ORDER BY gr.${sortBy} ${sortOrder}
         LIMIT ? OFFSET ?`,
        queryParams
      );

      // Parse JSON fields
      const parsedRecords = records.map(record => ({
        ...record,
        feed_types: JSON.parse(record.feed_types)
      }));

      // Get total count for pagination
      const countParams = queryParams.slice(0, -2); // Remove limit and offset
      const countResult = await executeQuery(
        `SELECT COUNT(*) as total FROM growth_records gr ${whereClause}`,
        countParams
      );

      return {
        records: parsedRecords,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      };
    } catch (error) {
      logger.error('Find growth records by baby ID error:', error);
      throw error;
    }
  }

  // Get recent records for a baby
  async getRecentRecords(babyId, days = 7) {
    try {
      const records = await executeQuery(
        `SELECT gr.*, b.name as baby_name
         FROM growth_records gr
         JOIN babies b ON gr.baby_id = b.id
         WHERE gr.baby_id = ? AND gr.record_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         ORDER BY gr.record_date DESC, gr.created_at DESC`,
        [babyId, days]
      );

      return records.map(record => ({
        ...record,
        feed_types: JSON.parse(record.feed_types)
      }));
    } catch (error) {
      logger.error('Get recent growth records error:', error);
      throw error;
    }
  }

  // Update growth record
  async update(id, updateData) {
    try {
      const allowedFields = [
        'record_date', 'feed_types', 'direct_start_time', 'direct_breast_side',
        'direct_duration', 'direct_pain_level', 'expressed_quantity',
        'formula_quantity', 'notes', 'entered_via_voice'
      ];

      const updateFields = [];
      const updateValues = [];

      Object.keys(updateData).forEach(key => {
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (allowedFields.includes(dbField)) {
          if (dbField === 'feed_types') {
            updateFields.push(`${dbField} = ?`);
            updateValues.push(JSON.stringify(updateData[key]));
          } else {
            updateFields.push(`${dbField} = ?`);
            updateValues.push(updateData[key]);
          }
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      updateFields.push('updated_at = NOW()');
      updateValues.push(id);

      await executeQuery(
        `UPDATE growth_records SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      return await this.findById(id);
    } catch (error) {
      logger.error('Update growth record error:', error);
      throw error;
    }
  }

  // Delete growth record
  async delete(id) {
    try {
      await executeQuery(
        'DELETE FROM growth_records WHERE id = ?',
        [id]
      );

      logger.info('Growth record deleted', { recordId: id });
      return { message: 'Growth record deleted successfully' };
    } catch (error) {
      logger.error('Delete growth record error:', error);
      throw error;
    }
  }

  // Get feeding statistics for a baby
  async getFeedingStats(babyId, startDate, endDate) {
    try {
      const stats = await executeQuery(
        `SELECT 
           COUNT(*) as total_records,
           COUNT(CASE WHEN JSON_CONTAINS(feed_types, '"direct"') THEN 1 END) as direct_feeds,
           COUNT(CASE WHEN JSON_CONTAINS(feed_types, '"expressed"') THEN 1 END) as expressed_feeds,
           COUNT(CASE WHEN JSON_CONTAINS(feed_types, '"formula"') THEN 1 END) as formula_feeds,
           AVG(direct_duration) as avg_direct_duration,
           AVG(direct_pain_level) as avg_pain_level,
           SUM(expressed_quantity) as total_expressed_ml,
           SUM(formula_quantity) as total_formula_ml
         FROM growth_records 
         WHERE baby_id = ? AND record_date BETWEEN ? AND ?`,
        [babyId, startDate, endDate]
      );

      return stats[0];
    } catch (error) {
      logger.error('Get feeding stats error:', error);
      throw error;
    }
  }

  // Check if user owns the growth record
  async checkOwnership(recordId, userId) {
    try {
      const records = await executeQuery(
        `SELECT gr.id FROM growth_records gr
         JOIN babies b ON gr.baby_id = b.id
         WHERE gr.id = ? AND b.user_id = ?`,
        [recordId, userId]
      );
      return records.length > 0;
    } catch (error) {
      logger.error('Check growth record ownership error:', error);
      throw error;
    }
  }
}

module.exports = new GrowthRecordModel();