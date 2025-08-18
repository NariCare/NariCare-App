const timelineService = require('../services/timelineService');
const babyModel = require('../models/babyModel');
const logger = require('../utils/logger');

class TimelineController {
  // Get all timeline items
  async getTimelineItems(req, res, next) {
    try {
      const { category, weekStart, weekEnd } = req.query;
      
      const items = await timelineService.getTimelineItems({
        category,
        weekStart: weekStart ? parseInt(weekStart) : undefined,
        weekEnd: weekEnd ? parseInt(weekEnd) : undefined
      });
      
      res.status(200).json({
        success: true,
        data: items
      });
    } catch (error) {
      next(error);
    }
  }

  // Get single timeline item
  async getTimelineItem(req, res, next) {
    try {
      const { id } = req.params;
      const item = await timelineService.getTimelineItemById(id);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Timeline item not found'
        });
      }

      res.status(200).json({
        success: true,
        data: item
      });
    } catch (error) {
      next(error);
    }
  }

  // Get timeline for specific baby
  async getBabyTimeline(req, res, next) {
    try {
      const { babyId } = req.params;
      const userId = req.user.id;

      // Check ownership
      const hasAccess = await babyModel.checkOwnership(babyId, userId);
      if (!hasAccess && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access this baby\'s timeline'
        });
      }

      const timeline = await timelineService.getBabyTimeline(babyId, userId);
      
      res.status(200).json({
        success: true,
        data: timeline
      });
    } catch (error) {
      next(error);
    }
  }

  // Mark timeline progress
  async markTimelineProgress(req, res, next) {
    try {
      const userId = req.user.id;
      const { babyId, timelineItemId, isCompleted, notes } = req.body;

      if (!babyId || !timelineItemId) {
        return res.status(400).json({
          success: false,
          error: 'Baby ID and timeline item ID are required'
        });
      }

      // Check ownership
      const hasAccess = await babyModel.checkOwnership(babyId, userId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to update this baby\'s timeline'
        });
      }

      const result = await timelineService.markTimelineProgress(
        userId, babyId, timelineItemId, isCompleted, notes
      );
      
      logger.info('Timeline progress updated', { 
        userId, 
        babyId, 
        timelineItemId, 
        isCompleted 
      });

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Get timeline progress for baby
  async getTimelineProgress(req, res, next) {
    try {
      const { babyId } = req.params;
      const userId = req.user.id;

      // Check ownership
      const hasAccess = await babyModel.checkOwnership(babyId, userId);
      if (!hasAccess && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access this baby\'s timeline progress'
        });
      }

      const progress = await timelineService.getTimelineProgress(userId, babyId);
      
      res.status(200).json({
        success: true,
        data: progress
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Create timeline item
  async createTimelineItem(req, res, next) {
    try {
      const item = await timelineService.createTimelineItem(req.body);
      
      logger.info('Timeline item created', { 
        itemId: item.id, 
        createdBy: req.user.id 
      });

      res.status(201).json({
        success: true,
        message: 'Timeline item created successfully',
        data: item
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Update timeline item
  async updateTimelineItem(req, res, next) {
    try {
      const { id } = req.params;
      const item = await timelineService.updateTimelineItem(id, req.body);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Timeline item not found'
        });
      }

      logger.info('Timeline item updated', { 
        itemId: id, 
        updatedBy: req.user.id 
      });

      res.status(200).json({
        success: true,
        message: 'Timeline item updated successfully',
        data: item
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Delete timeline item
  async deleteTimelineItem(req, res, next) {
    try {
      const { id } = req.params;
      const result = await timelineService.deleteTimelineItem(id);
      
      logger.info('Timeline item deleted', { 
        itemId: id, 
        deletedBy: req.user.id 
      });

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TimelineController();