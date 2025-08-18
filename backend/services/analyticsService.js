const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

class AnalyticsService {
  // Get user's personal statistics
  async getUserStats(userId, days = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get user's babies
      const babies = await executeQuery(
        'SELECT id, name FROM babies WHERE user_id = ? AND is_active = TRUE',
        [userId]
      );

      const stats = {
        totalBabies: babies.length,
        babies: []
      };

      // Get stats for each baby
      for (const baby of babies) {
        const babyStats = await executeQuery(
          `SELECT 
             COUNT(DISTINCT gr.id) as total_feed_records,
             COUNT(DISTINCT wr.id) as total_weight_records,
             COUNT(DISTINCT sr.id) as total_stool_records,
             COUNT(DISTINCT pr.id) as total_pumping_records,
             MAX(gr.record_date) as last_feed_date,
             MAX(wr.record_date) as last_weight_date
           FROM babies b
           LEFT JOIN growth_records gr ON b.id = gr.baby_id AND gr.record_date >= ?
           LEFT JOIN weight_records wr ON b.id = wr.baby_id AND wr.record_date >= ?
           LEFT JOIN stool_records sr ON b.id = sr.baby_id AND sr.record_date >= ?
           LEFT JOIN pumping_records pr ON b.id = pr.baby_id AND pr.record_date >= ?
           WHERE b.id = ?`,
          [startDate, startDate, startDate, startDate, baby.id]
        );

        stats.babies.push({
          ...baby,
          ...babyStats[0]
        });
      }

      // Get emotion check-in stats
      const emotionStats = await executeQuery(
        `SELECT 
           COUNT(*) as total_checkins,
           COUNT(CASE WHEN crisis_alert_triggered = TRUE THEN 1 END) as crisis_alerts,
           AVG(JSON_LENGTH(selected_struggles)) as avg_struggles,
           AVG(JSON_LENGTH(selected_positive_moments)) as avg_positive_moments
         FROM emotion_checkin_records
         WHERE user_id = ? AND record_date >= ?`,
        [userId, startDate]
      );

      stats.emotionWellness = emotionStats[0];

      return stats;
    } catch (error) {
      logger.error('Get user stats error:', error);
      throw error;
    }
  }

  // Get baby growth trends
  async getBabyGrowthTrends(babyId, days = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get weight progression
      const weightTrends = await executeQuery(
        `SELECT record_date, weight, height
         FROM weight_records
         WHERE baby_id = ? AND record_date >= ?
         ORDER BY record_date ASC`,
        [babyId, startDate]
      );

      // Get feeding trends
      const feedingTrends = await executeQuery(
        `SELECT 
           record_date,
           COUNT(CASE WHEN JSON_CONTAINS(feed_types, '"direct"') THEN 1 END) as direct_feeds,
           AVG(direct_duration) as avg_duration,
           AVG(direct_pain_level) as avg_pain_level
         FROM growth_records
         WHERE baby_id = ? AND record_date >= ?
         GROUP BY record_date
         ORDER BY record_date ASC`,
        [babyId, startDate]
      );

      return {
        weightProgression: weightTrends,
        feedingPatterns: feedingTrends,
        period: { days, startDate }
      };
    } catch (error) {
      logger.error('Get baby growth trends error:', error);
      throw error;
    }
  }

  // Get user emotion trends
  async getUserEmotionTrends(userId, days = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const trends = await executeQuery(
        `SELECT 
           record_date,
           JSON_LENGTH(selected_struggles) as struggles_count,
           JSON_LENGTH(selected_positive_moments) as positive_count,
           JSON_LENGTH(selected_concerning_thoughts) as concerning_count,
           crisis_alert_triggered
         FROM emotion_checkin_records
         WHERE user_id = ? AND record_date >= ?
         ORDER BY record_date ASC`,
        [userId, startDate]
      );

      // Calculate wellness score for each day
      const trendsWithWellness = trends.map(day => ({
        ...day,
        wellness_score: Math.max(0, Math.min(100,
          50 + (day.positive_count * 5) - (day.struggles_count * 3) - (day.concerning_count * 10)
        ))
      }));

      return {
        dailyTrends: trendsWithWellness,
        period: { days, startDate }
      };
    } catch (error) {
      logger.error('Get user emotion trends error:', error);
      throw error;
    }
  }

  // Admin: Get dashboard overview
  async getAdminDashboard(days = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Overall stats
      const overallStats = await executeQuery(
        `SELECT 
           COUNT(DISTINCT u.id) as total_users,
           COUNT(DISTINCT CASE WHEN u.created_at >= ? THEN u.id END) as new_users,
           COUNT(DISTINCT b.id) as total_babies,
           COUNT(DISTINCT e.id) as total_experts,
           COUNT(DISTINCT cr.id) as total_chat_rooms
         FROM users u
         LEFT JOIN babies b ON u.id = b.user_id AND b.is_active = TRUE
         LEFT JOIN experts e ON u.id = e.user_id AND e.is_available = TRUE
         LEFT JOIN chat_rooms cr ON cr.room_type = 'general'`,
        [startDate]
      );

      // Activity stats
      const activityStats = await executeQuery(
        `SELECT 
           COUNT(DISTINCT gr.id) as total_growth_records,
           COUNT(DISTINCT wr.id) as total_weight_records,
           COUNT(DISTINCT ec.id) as total_emotion_checkins,
           COUNT(DISTINCT c.id) as total_consultations,
           COUNT(DISTINCT cm.id) as total_chat_messages
         FROM growth_records gr
         LEFT JOIN weight_records wr ON DATE(wr.created_at) >= ?
         LEFT JOIN emotion_checkin_records ec ON DATE(ec.created_at) >= ?
         LEFT JOIN consultations c ON DATE(c.created_at) >= ?
         LEFT JOIN chat_messages cm ON DATE(cm.created_at) >= ?
         WHERE DATE(gr.created_at) >= ?`,
        [startDate, startDate, startDate, startDate, startDate]
      );

      // Crisis monitoring
      const crisisStats = await executeQuery(
        `SELECT 
           COUNT(*) as total_crisis_alerts,
           COUNT(CASE WHEN crisis_support_contacted = TRUE THEN 1 END) as support_contacted,
           COUNT(DISTINCT user_id) as users_with_crisis_alerts
         FROM emotion_checkin_records
         WHERE crisis_alert_triggered = TRUE AND record_date >= ?`,
        [startDate]
      );

      return {
        overview: overallStats[0],
        activity: activityStats[0],
        crisisMonitoring: crisisStats[0],
        period: { days, startDate }
      };
    } catch (error) {
      logger.error('Get admin dashboard error:', error);
      throw error;
    }
  }

  // Admin: Get user engagement metrics
  async getUserEngagement(startDate, endDate) {
    try {
      const engagement = await executeQuery(
        `SELECT 
           COUNT(DISTINCT user_id) as active_users,
           COUNT(DISTINCT session_id) as total_sessions,
           AVG(duration_seconds) as avg_session_duration,
           COUNT(*) as total_actions
         FROM app_usage_logs
         WHERE created_at BETWEEN ? AND ?`,
        [startDate, endDate]
      );

      // Get feature usage breakdown
      const featureUsage = await executeQuery(
        `SELECT 
           feature_used,
           COUNT(*) as usage_count,
           COUNT(DISTINCT user_id) as unique_users,
           AVG(duration_seconds) as avg_duration
         FROM app_usage_logs
         WHERE created_at BETWEEN ? AND ? AND feature_used IS NOT NULL
         GROUP BY feature_used
         ORDER BY usage_count DESC`,
        [startDate, endDate]
      );

      return {
        overview: engagement[0],
        featureBreakdown: featureUsage,
        period: { startDate, endDate }
      };
    } catch (error) {
      logger.error('Get user engagement error:', error);
      throw error;
    }
  }

  // Admin: Get feature usage analytics
  async getFeatureUsage(options = {}) {
    try {
      const { startDate, endDate, feature } = options;
      
      let whereClause = 'WHERE created_at BETWEEN ? AND ?';
      let queryParams = [startDate, endDate];

      if (feature) {
        whereClause += ' AND feature_used = ?';
        queryParams.push(feature);
      }

      const usage = await executeQuery(
        `SELECT 
           DATE(created_at) as date,
           feature_used,
           COUNT(*) as usage_count,
           COUNT(DISTINCT user_id) as unique_users,
           AVG(duration_seconds) as avg_duration
         FROM app_usage_logs
         ${whereClause}
         GROUP BY DATE(created_at), feature_used
         ORDER BY date DESC, usage_count DESC`,
        queryParams
      );

      return {
        dailyUsage: usage,
        period: { startDate, endDate }
      };
    } catch (error) {
      logger.error('Get feature usage error:', error);
      throw error;
    }
  }

  // Admin: Get growth analytics
  async getGrowthAnalytics(startDate, endDate) {
    try {
      // Overall growth tracking stats
      const growthStats = await executeQuery(
        `SELECT 
           COUNT(DISTINCT b.id) as total_babies_tracked,
           COUNT(DISTINCT gr.baby_id) as babies_with_feed_records,
           COUNT(DISTINCT wr.baby_id) as babies_with_weight_records,
           AVG(daily_feeds.avg_daily_feeds) as platform_avg_daily_feeds,
           COUNT(DISTINCT gr.recorded_by) as active_tracking_users
         FROM babies b
         LEFT JOIN growth_records gr ON b.id = gr.baby_id AND gr.record_date BETWEEN ? AND ?
         LEFT JOIN weight_records wr ON b.id = wr.baby_id AND wr.record_date BETWEEN ? AND ?
         LEFT JOIN (
           SELECT baby_id, AVG(daily_feed_count) as avg_daily_feeds
           FROM (
             SELECT baby_id, record_date, COUNT(*) as daily_feed_count
             FROM growth_records
             WHERE record_date BETWEEN ? AND ? AND JSON_CONTAINS(feed_types, '"direct"')
             GROUP BY baby_id, record_date
           ) daily_counts
           GROUP BY baby_id
         ) daily_feeds ON b.id = daily_feeds.baby_id
         WHERE b.is_active = TRUE`,
        [startDate, endDate, startDate, endDate, startDate, endDate]
      );

      // Weight gain patterns
      const weightPatterns = await executeQuery(
        `SELECT 
           b.gender,
           COUNT(*) as babies_count,
           AVG(weight_gain.weekly_gain) as avg_weekly_gain
         FROM babies b
         JOIN (
           SELECT 
             baby_id,
             (MAX(weight) - MIN(weight)) / (DATEDIFF(MAX(record_date), MIN(record_date)) / 7) as weekly_gain
           FROM weight_records
           WHERE record_date BETWEEN ? AND ?
           GROUP BY baby_id
           HAVING COUNT(*) >= 2
         ) weight_gain ON b.id = weight_gain.baby_id
         GROUP BY b.gender`,
        [startDate, endDate]
      );

      return {
        overview: growthStats[0],
        weightPatterns,
        period: { startDate, endDate }
      };
    } catch (error) {
      logger.error('Get growth analytics error:', error);
      throw error;
    }
  }

  // Admin: Get crisis monitoring data
  async getCrisisMonitoring(startDate, endDate) {
    try {
      // Crisis intervention stats
      const crisisStats = await executeQuery(
        `SELECT 
           COUNT(*) as total_crisis_alerts,
           COUNT(DISTINCT user_id) as users_affected,
           COUNT(CASE WHEN crisis_support_contacted = TRUE THEN 1 END) as support_contacted,
           AVG(JSON_LENGTH(selected_concerning_thoughts)) as avg_concerning_thoughts
         FROM emotion_checkin_records
         WHERE crisis_alert_triggered = TRUE AND record_date BETWEEN ? AND ?`,
        [startDate, endDate]
      );

      // Crisis intervention types
      const interventionTypes = await executeQuery(
        `SELECT 
           intervention_type,
           COUNT(*) as count,
           COUNT(CASE WHEN user_response = 'accepted' THEN 1 END) as accepted,
           COUNT(CASE WHEN user_response = 'dismissed' THEN 1 END) as dismissed
         FROM crisis_interventions
         WHERE created_at BETWEEN ? AND ?
         GROUP BY intervention_type
         ORDER BY count DESC`,
        [startDate, endDate]
      );

      // Daily crisis trends
      const dailyTrends = await executeQuery(
        `SELECT 
           DATE(record_date) as date,
           COUNT(*) as crisis_alerts,
           COUNT(DISTINCT user_id) as unique_users
         FROM emotion_checkin_records
         WHERE crisis_alert_triggered = TRUE AND record_date BETWEEN ? AND ?
         GROUP BY DATE(record_date)
         ORDER BY date ASC`,
        [startDate, endDate]
      );

      return {
        overview: crisisStats[0],
        interventionTypes,
        dailyTrends,
        period: { startDate, endDate }
      };
    } catch (error) {
      logger.error('Get crisis monitoring error:', error);
      throw error;
    }
  }
}

module.exports = new AnalyticsService();