const emotionService = require('../services/emotionService');
const logger = require('../utils/logger');

class EmotionController {
  // Create emotion check-in
  async createCheckin(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await emotionService.createCheckin(userId, req.body);
      
      // If crisis intervention was triggered, include that in response
      if (result.interventionTriggered) {
        res.status(201).json({
          success: true,
          message: 'Emotion check-in saved successfully',
          data: result,
          crisisIntervention: {
            triggered: true,
            resources: result.resources,
            message: 'We noticed you might be going through a difficult time. Please know that help is available and you are not alone.'
          }
        });
      } else {
        res.status(201).json({
          success: true,
          message: 'Emotion check-in saved successfully',
          data: result
        });
      }
    } catch (error) {
      next(error);
    }
  }

  // Get emotion check-ins for current user
  async getCheckins(req, res, next) {
    try {
      const userId = req.user.id;
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        sortBy: req.query.sortBy || 'record_date',
        sortOrder: req.query.sortOrder || 'DESC'
      };

      const result = await emotionService.findByUserId(userId, options);
      
      res.status(200).json({
        success: true,
        data: result.records,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  // Get emotion trends and analytics
  async getEmotionTrends(req, res, next) {
    try {
      const userId = req.user.id;
      const days = parseInt(req.query.days) || 30;

      const trends = await emotionService.getEmotionTrends(userId, days);
      
      res.status(200).json({
        success: true,
        data: trends
      });
    } catch (error) {
      next(error);
    }
  }

  // Get crisis interventions for current user
  async getCrisisInterventions(req, res, next) {
    try {
      const userId = req.user.id;
      const interventions = await emotionService.getCrisisInterventions(userId);
      
      res.status(200).json({
        success: true,
        data: interventions
      });
    } catch (error) {
      next(error);
    }
  }

  // Update crisis intervention response
  async updateCrisisResponse(req, res, next) {
    try {
      const { id } = req.params;
      const { response } = req.body;

      if (!['accepted', 'dismissed', 'completed'].includes(response)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid response. Must be accepted, dismissed, or completed'
        });
      }

      const result = await emotionService.updateCrisisResponse(id, response);
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Get emotion check-in options (struggles, positive moments, concerning thoughts)
  async getCheckinOptions(req, res, next) {
    try {
      const struggles = await executeQuery(
        'SELECT * FROM emotional_struggles_options WHERE is_active = TRUE ORDER BY sort_order'
      );

      const positiveMoments = await executeQuery(
        'SELECT * FROM positive_moments_options WHERE is_active = TRUE ORDER BY sort_order'
      );

      const concerningThoughts = await executeQuery(
        'SELECT * FROM concerning_thoughts_options WHERE is_active = TRUE ORDER BY severity DESC, sort_order'
      );

      res.status(200).json({
        success: true,
        data: {
          struggles,
          positiveMoments,
          concerningThoughts
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EmotionController();