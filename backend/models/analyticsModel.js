const { executeQuery } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class AnalyticsModel {
  // Record user analytics
  async recordUserMetric(userId, metricName, metricValue, metricDate = null, additionalData = {}) {
    try {
      const date = metricDate || new Date().toISOString().split('T')[0];

      // Use INSERT ... ON DUPLICATE KEY UPDATE for upsert behavior
      await executeQuery(
        `INSERT INTO user_analytics (id, user_id, metric_name, metric_value, metric_date, additional_data, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE 
         metric_value = VALUES(metric_value),
         additional_data = VALUES(additional_data)`,
        [uuidv4(), userId, metricName, metricValue, date, JSON.stringify(additionalData)]
      );

      return { message: 'Metric recorded successfully' };
    } catch (error) {
      logger.error('Record user metric error:', error);
      throw error;
    }
  }

  // Log app usage
  async logAppUsage(usageData) {
    try {
      const {
        userId,
        sessionId,
        actionType,
        pagePath,
        featureUsed,
        durationSeconds,
        additionalData = {},
        ipAddress,
        userAgent
      } = usageData;

      await executeQuery(
        `INSERT INTO app_usage_logs 
         (id, user_id, session_id, action_type, page_path, feature_used, 
          duration_seconds, additional_data, ip_address, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [uuidv4(), userId, sessionId, actionType, pagePath, featureUsed, 
         durationSeconds, JSON.stringify(additionalData), ipAddress, userAgent]
      );

      return { message: 'Usage logged successfully' };
    } catch (error) {
      logger.error('Log app usage error:', error);
      throw error;
    }
  }

  // Get user analytics
  async getUserAnalytics(userId, options = {}) {
    try {
      const {
        metricName,
        startDate,
        endDate,
        limit = 100
      } = options;

      let whereClause = 'WHERE user_id = ?';
      let queryParams = [userId];

      if (metricName) {
        whereClause += ' AND metric_name = ?';
        queryParams.push(metricName);
      }

      if (startDate) {
        whereClause += ' AND metric_date >= ?';
        queryParams.push(startDate);
      }

      if (endDate) {
        whereClause += ' AND metric_date <= ?';
        queryParams.push(endDate);
      }

      queryParams.push(limit);

      const analytics = await executeQuery(
        `SELECT * FROM user_analytics
         ${whereClause}
         ORDER BY metric_date DESC
         LIMIT ?`,
        queryParams
      );

      // Parse additional_data JSON
      const parsedAnalytics = analytics.map(record => ({
        ...record,
        additional_data: JSON.parse(record.additional_data || '{}')
      }));

      return parsedAnalytics;
    } catch (error) {
      logger.error('Get user analytics error:', error);
      throw error;
    }
  }

  // Get app usage logs
  async getAppUsageLogs(options = {}) {
    try {
      const {
        userId,
        actionType,
        featureUsed,
        startDate,
        endDate,
        page = 1,
        limit = 100
      } = options;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE 1=1';
      let queryParams = [];

      if (userId) {
        whereClause += ' AND user_id = ?';
        queryParams.push(userId);
      }

      if (actionType) {
        whereClause += ' AND action_type = ?';
        queryParams.push(actionType);
      }

      if (featureUsed) {
        whereClause += ' AND feature_used = ?';
        queryParams.push(featureUsed);
      }

      if (startDate) {
        whereClause += ' AND created_at >= ?';
        queryParams.push(startDate);
      }

      if (endDate) {
        whereClause += ' AND created_at <= ?';
        queryParams.push(endDate);
      }

      queryParams.push(limit, offset);

      const logs = await executeQuery(
        `SELECT * FROM app_usage_logs
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        queryParams
      );

      // Parse additional_data JSON
      const parsedLogs = logs.map(log => ({
        ...log,
        additional_data: JSON.parse(log.additional_data || '{}')
      }));

      return parsedLogs;
    } catch (error) {
      logger.error('Get app usage logs error:', error);
      throw error;
    }
  }

  // Get feature usage statistics
  async getFeatureUsageStats(options = {}) {
    try {
      const {
        featureName,
        startDate,
        endDate,
        limit = 50
      } = options;

      let whereClause = 'WHERE 1=1';
      let queryParams = [];

      if (featureName) {
        whereClause += ' AND feature_name = ?';
        queryParams.push(featureName);
      }

      if (startDate) {
        whereClause += ' AND usage_date >= ?';
        queryParams.push(startDate);
      }

      if (endDate) {
        whereClause += ' AND usage_date <= ?';
        queryParams.push(endDate);
      }

      queryParams.push(limit);

      const stats = await executeQuery(
        `SELECT * FROM feature_usage_stats
         ${whereClause}
         ORDER BY usage_date DESC
         LIMIT ?`,
        queryParams
      );

      return stats;
    } catch (error) {
      logger.error('Get feature usage stats error:', error);
      throw error;
    }
  }

  // Get dashboard analytics
  async getDashboardAnalytics(userId) {
    try {
      // Get user's babies
      const babies = await executeQuery(
        'SELECT id, name, date_of_birth FROM babies WHERE user_id = ? AND is_active = TRUE',
        [userId]
      );

      if (babies.length === 0) {
        return {
          totalBabies: 0,
          totalRecords: 0,
          lastActivity: null,
          weeklyStats: {}
        };
      }

      const babyIds = babies.map(b => b.id);
      const placeholders = babyIds.map(() => '?').join(',');

      // Get total records
      const recordCounts = await executeQuery(
        `SELECT 
           COUNT(DISTINCT gr.id) as growth_records,
           COUNT(DISTINCT wr.id) as weight_records,
           COUNT(DISTINCT sr.id) as stool_records,
           COUNT(DISTINCT pr.id) as pumping_records
         FROM babies b
         LEFT JOIN growth_records gr ON b.id = gr.baby_id
         LEFT JOIN weight_records wr ON b.id = wr.baby_id
         LEFT JOIN stool_records sr ON b.id = sr.baby_id
         LEFT JOIN pumping_records pr ON b.id = pr.baby_id
         WHERE b.id IN (${placeholders})`,
        babyIds
      );

      // Get last activity
      const lastActivity = await executeQuery(
        `SELECT MAX(created_at) as last_activity
         FROM (
           SELECT created_at FROM growth_records WHERE baby_id IN (${placeholders})
           UNION ALL
           SELECT created_at FROM weight_records WHERE baby_id IN (${placeholders})
           UNION ALL
           SELECT created_at FROM stool_records WHERE baby_id IN (${placeholders})
           UNION ALL
           SELECT created_at FROM pumping_records WHERE baby_id IN (${placeholders})
         ) all_records`,
        [...babyIds, ...babyIds, ...babyIds, ...babyIds]
      );

      // Get weekly stats (last 7 days)
      const weeklyStats = await executeQuery(
        `SELECT 
           DATE(record_date) as date,
           COUNT(*) as daily_records
         FROM growth_records
         WHERE baby_id IN (${placeholders})
           AND record_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
         GROUP BY DATE(record_date)
         ORDER BY date ASC`,
        babyIds
      );

      return {
        totalBabies: babies.length,
        totalRecords: recordCounts[0].growth_records + recordCounts[0].weight_records + 
                     recordCounts[0].stool_records + recordCounts[0].pumping_records,
        lastActivity: lastActivity[0].last_activity,
        weeklyStats: weeklyStats.reduce((acc, stat) => {
          acc[stat.date] = stat.daily_records;
          return acc;
        }, {}),
        recordBreakdown: recordCounts[0]
      };
    } catch (error) {
      logger.error('Get dashboard analytics error:', error);
      throw error;
    }
  }

  // Get system analytics (admin only)
  async getSystemAnalytics(options = {}) {
    try {
      const {
        startDate,
        endDate,
        groupBy = 'day'
      } = options;

      let dateFormat;
      switch (groupBy) {
        case 'hour':
          dateFormat = '%Y-%m-%d %H:00:00';
          break;
        case 'week':
          dateFormat = '%Y-%u';
          break;
        case 'month':
          dateFormat = '%Y-%m';
          break;
        default:
          dateFormat = '%Y-%m-%d';
      }

      let whereClause = 'WHERE 1=1';
      let queryParams = [];

      if (startDate) {
        whereClause += ' AND created_at >= ?';
        queryParams.push(startDate);
      }

      if (endDate) {
        whereClause += ' AND created_at <= ?';
        queryParams.push(endDate);
      }

      // Get user registration trends
      const userTrends = await executeQuery(
        `SELECT DATE_FORMAT(created_at, ?) as period, COUNT(*) as new_users
         FROM users
         ${whereClause}
         GROUP BY period
         ORDER BY period ASC`,
        [dateFormat, ...queryParams]
      );

      // Get feature usage trends
      const featureTrends = await executeQuery(
        `SELECT DATE_FORMAT(created_at, ?) as period, feature_used, COUNT(*) as usage_count
         FROM app_usage_logs
         ${whereClause} AND feature_used IS NOT NULL
         GROUP BY period, feature_used
         ORDER BY period ASC, usage_count DESC`,
        [dateFormat, ...queryParams]
      );

      // Get active users
      const activeUsers = await executeQuery(
        `SELECT DATE_FORMAT(created_at, ?) as period, COUNT(DISTINCT user_id) as active_users
         FROM app_usage_logs
         ${whereClause} AND user_id IS NOT NULL
         GROUP BY period
         ORDER BY period ASC`,
        [dateFormat, ...queryParams]
      );

      return {
        userTrends,
        featureTrends,
        activeUsers
      };
    } catch (error) {
      logger.error('Get system analytics error:', error);
      throw error;
    }
  }

  // Deactivate token
  async deactivateToken(userId, token) {
    try {
      await executeQuery(
        'UPDATE push_notification_tokens SET is_active = FALSE, updated_at = NOW() WHERE user_id = ? AND token = ?',
        [userId, token]
      );

      return { message: 'Token deactivated successfully' };
    } catch (error) {
      logger.error('Deactivate token error:', error);
      throw error;
    }
  }
}

module.exports = new AnalyticsModel();