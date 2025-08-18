const { executeQuery, executeTransaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class EmotionCheckinModel {
  // Create emotion check-in record
  async create(checkinData) {
    try {
      const {
        userId,
        selectedStruggles = [],
        selectedPositiveMoments = [],
        selectedConcerningThoughts = [],
        gratefulFor,
        proudOfToday,
        tomorrowGoal,
        additionalNotes,
        enteredViaVoice = false
      } = checkinData;

      const id = uuidv4();
      const now = new Date();
      const recordDate = now.toISOString().split('T')[0];
      const recordTime = now.toTimeString().split(' ')[0];

      await executeQuery(
        `INSERT INTO emotion_checkin_records 
         (id, user_id, record_date, record_time, selected_struggles, 
          selected_positive_moments, selected_concerning_thoughts, 
          grateful_for, proud_of_today, tomorrow_goal, additional_notes, 
          entered_via_voice, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          id, userId, recordDate, recordTime,
          JSON.stringify(selectedStruggles),
          JSON.stringify(selectedPositiveMoments),
          JSON.stringify(selectedConcerningThoughts),
          gratefulFor, proudOfToday, tomorrowGoal, additionalNotes,
          enteredViaVoice
        ]
      );

      return await this.findById(id);
    } catch (error) {
      logger.error('Create emotion checkin error:', error);
      throw error;
    }
  }

  // Find emotion check-in by ID
  async findById(id) {
    try {
      const records = await executeQuery(
        'SELECT * FROM emotion_checkin_records WHERE id = ?',
        [id]
      );

      if (records.length === 0) {
        return null;
      }

      const record = records[0];
      
      // Parse JSON fields
      record.selected_struggles = JSON.parse(record.selected_struggles || '[]');
      record.selected_positive_moments = JSON.parse(record.selected_positive_moments || '[]');
      record.selected_concerning_thoughts = JSON.parse(record.selected_concerning_thoughts || '[]');

      return record;
    } catch (error) {
      logger.error('Find emotion checkin by ID error:', error);
      throw error;
    }
  }

  // Find emotion check-ins by user ID
  async findByUserId(userId, options = {}) {
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
      let whereClause = 'WHERE user_id = ?';
      let queryParams = [userId];

      if (startDate) {
        whereClause += ' AND record_date >= ?';
        queryParams.push(startDate);
      }

      if (endDate) {
        whereClause += ' AND record_date <= ?';
        queryParams.push(endDate);
      }

      queryParams.push(limit, offset);

      const records = await executeQuery(
        `SELECT * FROM emotion_checkin_records
         ${whereClause}
         ORDER BY ${sortBy} ${sortOrder}
         LIMIT ? OFFSET ?`,
        queryParams
      );

      // Parse JSON fields for each record
      const parsedRecords = records.map(record => ({
        ...record,
        selected_struggles: JSON.parse(record.selected_struggles || '[]'),
        selected_positive_moments: JSON.parse(record.selected_positive_moments || '[]'),
        selected_concerning_thoughts: JSON.parse(record.selected_concerning_thoughts || '[]')
      }));

      // Get total count
      const countParams = queryParams.slice(0, -2);
      const countResult = await executeQuery(
        `SELECT COUNT(*) as total FROM emotion_checkin_records ${whereClause}`,
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
      logger.error('Find emotion checkins by user ID error:', error);
      throw error;
    }
  }

  // Get recent emotion check-ins
  async getRecentCheckins(userId, days = 7) {
    try {
      const records = await executeQuery(
        `SELECT * FROM emotion_checkin_records
         WHERE user_id = ? AND record_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         ORDER BY record_date DESC, record_time DESC`,
        [userId, days]
      );

      // Parse JSON fields
      const parsedRecords = records.map(record => ({
        ...record,
        selected_struggles: JSON.parse(record.selected_struggles || '[]'),
        selected_positive_moments: JSON.parse(record.selected_positive_moments || '[]'),
        selected_concerning_thoughts: JSON.parse(record.selected_concerning_thoughts || '[]')
      }));

      return parsedRecords;
    } catch (error) {
      logger.error('Get recent emotion checkins error:', error);
      throw error;
    }
  }

  // Get crisis alerts
  async getCrisisAlerts(options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        startDate,
        endDate,
        resolved
      } = options;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE ec.crisis_alert_triggered = TRUE';
      let queryParams = [];

      if (startDate) {
        whereClause += ' AND ec.record_date >= ?';
        queryParams.push(startDate);
      }

      if (endDate) {
        whereClause += ' AND ec.record_date <= ?';
        queryParams.push(endDate);
      }

      if (resolved !== undefined) {
        whereClause += ' AND ec.crisis_support_contacted = ?';
        queryParams.push(resolved);
      }

      queryParams.push(limit, offset);

      const alerts = await executeQuery(
        `SELECT ec.*, u.first_name, u.last_name, u.email
         FROM emotion_checkin_records ec
         JOIN users u ON ec.user_id = u.id
         ${whereClause}
         ORDER BY ec.record_date DESC, ec.record_time DESC
         LIMIT ? OFFSET ?`,
        queryParams
      );

      // Parse JSON fields
      const parsedAlerts = alerts.map(alert => ({
        ...alert,
        selected_struggles: JSON.parse(alert.selected_struggles || '[]'),
        selected_positive_moments: JSON.parse(alert.selected_positive_moments || '[]'),
        selected_concerning_thoughts: JSON.parse(alert.selected_concerning_thoughts || '[]')
      }));

      // Get total count
      const countParams = queryParams.slice(0, -2);
      const countResult = await executeQuery(
        `SELECT COUNT(*) as total FROM emotion_checkin_records ec ${whereClause}`,
        countParams
      );

      return {
        alerts: parsedAlerts,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      };
    } catch (error) {
      logger.error('Get crisis alerts error:', error);
      throw error;
    }
  }

  // Update emotion check-in
  async update(id, updateData) {
    try {
      const allowedFields = [
        'grateful_for', 'proud_of_today', 'tomorrow_goal', 
        'additional_notes', 'crisis_support_contacted', 'crisis_contact_method'
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
        `UPDATE emotion_checkin_records SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      return await this.findById(id);
    } catch (error) {
      logger.error('Update emotion checkin error:', error);
      throw error;
    }
  }

  // Delete emotion check-in
  async delete(id) {
    try {
      const result = await executeQuery(
        'DELETE FROM emotion_checkin_records WHERE id = ?',
        [id]
      );

      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Delete emotion checkin error:', error);
      throw error;
    }
  }

  // Get emotion check-in options
  async getEmotionOptions() {
    try {
      const [struggles, positiveMoments, concerningThoughts] = await Promise.all([
        executeQuery(
          'SELECT * FROM emotional_struggles_options WHERE is_active = TRUE ORDER BY sort_order ASC'
        ),
        executeQuery(
          'SELECT * FROM positive_moments_options WHERE is_active = TRUE ORDER BY sort_order ASC'
        ),
        executeQuery(
          'SELECT * FROM concerning_thoughts_options WHERE is_active = TRUE ORDER BY sort_order ASC'
        )
      ]);

      return {
        struggles,
        positiveMoments,
        concerningThoughts
      };
    } catch (error) {
      logger.error('Get emotion options error:', error);
      throw error;
    }
  }
}

module.exports = new EmotionCheckinModel();