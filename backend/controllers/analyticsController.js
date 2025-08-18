const analyticsService = require('../services/analyticsService');
const logger = require('../utils/logger');

class AnalyticsController {
  // Get user's personal statistics
  async getMyStats(req, res, next) {
    try {
      const userId = req.user.id;
      const { days = 30 } = req.query;

      const stats = await analyticsService.getUserStats(userId, parseInt(days));
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  // Get user's growth trends for a specific baby
  async getMyGrowthTrends(req, res, next) {
    try {
      const userId = req.user.id;
      const { babyId } = req.params;
      const { days = 30 } = req.query;

      // Check ownership
      const babyModel = require('../models/babyModel');
      const hasAccess = await babyModel.checkOwnership(babyId, userId);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access this baby\'s data'
        });
      }

      const trends = await analyticsService.getBabyGrowthTrends(babyId, parseInt(days));
      
      res.status(200).json({
        success: true,
        data: trends
      });
    } catch (error) {
      next(error);
    }
  }

  // Get user's emotion trends
  async getMyEmotionTrends(req, res, next) {
    try {
      const userId = req.user.id;
      const { days = 30 } = req.query;

      const trends = await analyticsService.getUserEmotionTrends(userId, parseInt(days));
      
      res.status(200).json({
        success: true,
        data: trends
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Get dashboard analytics
  async getAdminDashboard(req, res, next) {
    try {
      const { days = 30 } = req.query;
      const dashboard = await analyticsService.getAdminDashboard(parseInt(days));
      
      res.status(200).json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Get user engagement analytics
  async getUserEngagement(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const engagement = await analyticsService.getUserEngagement(startDate, endDate);
      
      res.status(200).json({
        success: true,
        data: engagement
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Get feature usage analytics
  async getFeatureUsage(req, res, next) {
    try {
      const { startDate, endDate, feature } = req.query;
      const usage = await analyticsService.getFeatureUsage({ startDate, endDate, feature });
      
      res.status(200).json({
        success: true,
        data: usage
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Get growth analytics
  async getGrowthAnalytics(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const analytics = await analyticsService.getGrowthAnalytics(startDate, endDate);
      
      res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Get crisis monitoring data
  async getCrisisMonitoring(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const monitoring = await analyticsService.getCrisisMonitoring(startDate, endDate);
      
      res.status(200).json({
        success: true,
        data: monitoring
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnalyticsController();