const { v4: uuidv4 } = require('uuid');
const { executeQuery } = require('../config/database');
const sendGridService = require('./sendgridService');
const logger = require('../utils/logger');

class EmotionService {
  // Create emotion check-in record
  async createCheckin(userId, checkinData) {
    try {
      const {
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
      const recordDate = new Date().toISOString().split('T')[0];
      const recordTime = new Date().toTimeString().split(' ')[0];

      // Check for crisis intervention needs
      const hasCriticalThoughts = selectedConcerningThoughts.some(
        thought => thought.severity === 'critical'
      );

      await executeQuery(
        `INSERT INTO emotion_checkin_records 
         (id, user_id, record_date, record_time, selected_struggles, 
          selected_positive_moments, selected_concerning_thoughts, 
          grateful_for, proud_of_today, tomorrow_goal, additional_notes,
          crisis_alert_triggered, entered_via_voice, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          id, userId, recordDate, recordTime,
          JSON.stringify(selectedStruggles),
          JSON.stringify(selectedPositiveMoments),
          JSON.stringify(selectedConcerningThoughts),
          gratefulFor, proudOfToday, tomorrowGoal, additionalNotes,
          hasCriticalThoughts, enteredViaVoice
        ]
      );

      // Handle crisis intervention if needed
      if (hasCriticalThoughts || selectedConcerningThoughts.length > 0) {
        await this.handleCrisisIntervention(userId, id, selectedConcerningThoughts);
      }

      logger.info('Emotion check-in created', { 
        checkinId: id, 
        userId,
        hasCriticalThoughts,
        strugglesCount: selectedStruggles.length,
        positiveCount: selectedPositiveMoments.length,
        concerningCount: selectedConcerningThoughts.length
      });

      return await this.findById(id);
    } catch (error) {
      logger.error('Create emotion check-in error:', error);
      throw error;
    }
  }

  // Handle crisis intervention
  async handleCrisisIntervention(userId, checkinId, concerningThoughts) {
    try {
      // Get user details for personalized intervention
      const users = await executeQuery(
        'SELECT email, first_name FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        throw new Error('User not found for crisis intervention');
      }

      const user = users[0];

      // Determine intervention type based on severity
      const hasCritical = concerningThoughts.some(t => t.severity === 'critical');
      const hasHigh = concerningThoughts.some(t => t.severity === 'high');

      let interventionType = 'alert_shown';
      if (hasCritical) {
        interventionType = 'resources_accessed';
      } else if (hasHigh) {
        interventionType = 'expert_contacted';
      }

      // Create crisis intervention record
      const interventionId = uuidv4();
      await executeQuery(
        `INSERT INTO crisis_interventions 
         (id, user_id, checkin_record_id, intervention_type, intervention_details, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          interventionId, userId, checkinId, interventionType,
          JSON.stringify({
            concerning_thoughts_count: concerningThoughts.length,
            severity_levels: concerningThoughts.map(t => t.severity),
            auto_triggered: true,
            timestamp: new Date().toISOString()
          })
        ]
      );

      // Send crisis intervention email for critical cases
      if (hasCritical) {
        try {
          const resources = {
            crisisHotline: '988',
            emergency: '911',
            localResources: 'https://www.postpartum.net/get-help/locations/'
          };

          await sendGridService.sendCrisisInterventionEmail(
            user.email, 
            user.first_name, 
            resources
          );

          // Update intervention record to show email was sent
          await executeQuery(
            'UPDATE crisis_interventions SET user_response = ? WHERE id = ?',
            ['email_sent', interventionId]
          );

        } catch (emailError) {
          logger.error('Crisis intervention email failed:', emailError);
          // Don't fail the whole process if email fails
        }
      }

      logger.info('Crisis intervention handled', {
        userId,
        checkinId,
        interventionId,
        interventionType,
        severity: hasCritical ? 'critical' : hasHigh ? 'high' : 'moderate'
      });

      return {
        interventionTriggered: true,
        interventionType,
        resources: {
          crisisHotline: '988',
          emergency: '911',
          textLine: '741741',
          maternalHotline: '1-833-9-HELP4MOMS',
          localResources: 'https://www.postpartum.net/get-help/locations/'
        }
      };
    } catch (error) {
      logger.error('Crisis intervention error:', error);
      throw error;
    }
  }

  // Find emotion check-in by ID
  async findById(id) {
    try {
      const records = await executeQuery(
        `SELECT ec.*, u.first_name, u.last_name
         FROM emotion_checkin_records ec
         JOIN users u ON ec.user_id = u.id
         WHERE ec.id = ?`,
        [id]
      );
      
      if (records.length > 0) {
        const record = records[0];
        // Parse JSON fields
        record.selected_struggles = JSON.parse(record.selected_struggles || '[]');
        record.selected_positive_moments = JSON.parse(record.selected_positive_moments || '[]');
        record.selected_concerning_thoughts = JSON.parse(record.selected_concerning_thoughts || '[]');
        return record;
      }
      
      return null;
    } catch (error) {
      logger.error('Find emotion check-in by ID error:', error);
      throw error;
    }
  }

  // Get emotion check-ins for a user
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
      let whereClause = 'WHERE ec.user_id = ?';
      let queryParams = [userId];

      // Add date filters
      if (startDate) {
        whereClause += ' AND ec.record_date >= ?';
        queryParams.push(startDate);
      }
      
      if (endDate) {
        whereClause += ' AND ec.record_date <= ?';
        queryParams.push(endDate);
      }

      // Add pagination params
      queryParams.push(limit, offset);

      const records = await executeQuery(
        `SELECT ec.*, u.first_name, u.last_name
         FROM emotion_checkin_records ec
         JOIN users u ON ec.user_id = u.id
         ${whereClause}
         ORDER BY ec.${sortBy} ${sortOrder}
         LIMIT ? OFFSET ?`,
        queryParams
      );

      // Parse JSON fields
      const parsedRecords = records.map(record => ({
        ...record,
        selected_struggles: JSON.parse(record.selected_struggles || '[]'),
        selected_positive_moments: JSON.parse(record.selected_positive_moments || '[]'),
        selected_concerning_thoughts: JSON.parse(record.selected_concerning_thoughts || '[]')
      }));

      // Get total count for pagination
      const countParams = queryParams.slice(0, -2); // Remove limit and offset
      const countResult = await executeQuery(
        `SELECT COUNT(*) as total FROM emotion_checkin_records ec ${whereClause}`,
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
      logger.error('Find emotion check-ins by user ID error:', error);
      throw error;
    }
  }

  // Get emotion trends and analytics
  async getEmotionTrends(userId, days = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const trends = await executeQuery(
        `SELECT 
           DATE(record_date) as date,
           JSON_LENGTH(selected_struggles) as struggles_count,
           JSON_LENGTH(selected_positive_moments) as positive_count,
           JSON_LENGTH(selected_concerning_thoughts) as concerning_count,
           crisis_alert_triggered
         FROM emotion_checkin_records 
         WHERE user_id = ? AND record_date >= ?
         ORDER BY record_date ASC`,
        [userId, startDate]
      );

      // Calculate overall wellness trend
      const totalCheckins = trends.length;
      const totalStruggles = trends.reduce((sum, day) => sum + day.struggles_count, 0);
      const totalPositive = trends.reduce((sum, day) => sum + day.positive_count, 0);
      const totalConcerning = trends.reduce((sum, day) => sum + day.concerning_count, 0);
      const crisisAlerts = trends.filter(day => day.crisis_alert_triggered).length;

      const wellnessScore = totalCheckins > 0 ? Math.max(0, Math.min(100,
        50 + (totalPositive * 5) - (totalStruggles * 3) - (totalConcerning * 10) - (crisisAlerts * 20)
      )) : null;

      return {
        trends,
        summary: {
          totalCheckins,
          averageStruggles: totalCheckins > 0 ? totalStruggles / totalCheckins : 0,
          averagePositive: totalCheckins > 0 ? totalPositive / totalCheckins : 0,
          concerningThoughts: totalConcerning,
          crisisAlerts,
          wellnessScore,
          period: { days, startDate }
        }
      };
    } catch (error) {
      logger.error('Get emotion trends error:', error);
      throw error;
    }
  }

  // Get crisis interventions for a user
  async getCrisisInterventions(userId) {
    try {
      const interventions = await executeQuery(
        `SELECT ci.*, ec.record_date, ec.record_time
         FROM crisis_interventions ci
         JOIN emotion_checkin_records ec ON ci.checkin_record_id = ec.id
         WHERE ci.user_id = ?
         ORDER BY ci.created_at DESC`,
        [userId]
      );

      return interventions.map(intervention => ({
        ...intervention,
        intervention_details: JSON.parse(intervention.intervention_details || '{}')
      }));
    } catch (error) {
      logger.error('Get crisis interventions error:', error);
      throw error;
    }
  }

  // Update crisis intervention response
  async updateCrisisResponse(interventionId, response) {
    try {
      await executeQuery(
        'UPDATE crisis_interventions SET user_response = ? WHERE id = ?',
        [response, interventionId]
      );

      logger.info('Crisis intervention response updated', {
        interventionId,
        response
      });

      return { message: 'Response recorded successfully' };
    } catch (error) {
      logger.error('Update crisis response error:', error);
      throw error;
    }
  }
}

module.exports = new EmotionService();