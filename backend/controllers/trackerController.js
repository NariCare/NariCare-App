const { v4: uuidv4 } = require('uuid');
const growthRecordModel = require('../models/growthRecordModel');
const weightRecordModel = require('../models/weightRecordModel');
const stoolRecordModel = require('../models/stoolRecordModel');
const pumpingRecordModel = require('../models/pumpingRecordModel');
const diaperChangeModel = require('../models/diaperChangeModel');
const babyModel = require('../models/babyModel');
const logger = require('../utils/logger');

class TrackerController {
  // Growth/Feed Records
  async createFeedRecord(req, res, next) {
    try {
      const userId = req.user.id;
      const { babyId } = req.body;

      // Check if user owns the baby
      const hasAccess = await babyModel.checkOwnership(babyId, userId);
      if (!hasAccess && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to add records for this baby'
        });
      }

      const recordData = {
        id: uuidv4(),
        recordedBy: userId,
        recordDate: req.body.recordDate || new Date().toISOString().split('T')[0],
        ...req.body
      };

      const record = await growthRecordModel.create(recordData);
      
      logger.info('Feed record created', { 
        recordId: record.id, 
        babyId, 
        userId 
      });

      res.status(201).json({
        success: true,
        message: 'Feed record added successfully',
        data: record
      });
    } catch (error) {
      next(error);
    }
  }

  async getFeedRecords(req, res, next) {
    try {
      const { babyId } = req.params;
      const userId = req.user.id;

      // Check ownership
      const hasAccess = await babyModel.checkOwnership(babyId, userId);
      if (!hasAccess && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access records for this baby'
        });
      }

      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        feedTypes: req.query.feedTypes ? req.query.feedTypes.split(',') : null,
        sortBy: req.query.sortBy || 'record_date',
        sortOrder: req.query.sortOrder || 'DESC'
      };

      const result = await growthRecordModel.findByBabyId(babyId, options);
      
      res.status(200).json({
        success: true,
        data: result.records,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  async updateFeedRecord(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check ownership
      const hasAccess = await growthRecordModel.checkOwnership(id, userId);
      if (!hasAccess && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to update this record'
        });
      }

      const record = await growthRecordModel.update(id, req.body);
      
      if (!record) {
        return res.status(404).json({
          success: false,
          error: 'Feed record not found'
        });
      }

      logger.info('Feed record updated', { recordId: id, userId });

      res.status(200).json({
        success: true,
        message: 'Feed record updated successfully',
        data: record
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteFeedRecord(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check ownership
      const hasAccess = await growthRecordModel.checkOwnership(id, userId);
      if (!hasAccess && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to delete this record'
        });
      }

      const result = await growthRecordModel.delete(id);
      
      logger.info('Feed record deleted', { recordId: id, userId });

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Weight Records
  async createWeightRecord(req, res, next) {
    try {
      const userId = req.user.id;
      const { babyId } = req.body;

      // Check ownership
      const hasAccess = await babyModel.checkOwnership(babyId, userId);
      if (!hasAccess && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to add records for this baby'
        });
      }

      const recordData = {
        id: uuidv4(),
        recordedBy: userId,
        recordDate: req.body.recordDate || new Date().toISOString().split('T')[0],
        ...req.body
      };

      const record = await weightRecordModel.create(recordData);
      
      logger.info('Weight record created', { 
        recordId: record.id, 
        babyId, 
        userId 
      });

      res.status(201).json({
        success: true,
        message: 'Weight record added successfully',
        data: record
      });
    } catch (error) {
      next(error);
    }
  }

  async getWeightRecords(req, res, next) {
    try {
      const { babyId } = req.params;
      const userId = req.user.id;

      // Check ownership
      const hasAccess = await babyModel.checkOwnership(babyId, userId);
      if (!hasAccess && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access records for this baby'
        });
      }

      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const result = await weightRecordModel.findByBabyId(babyId, options);
      
      res.status(200).json({
        success: true,
        data: result.records,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  // Get feeding statistics
  async getFeedingStats(req, res, next) {
    try {
      const { babyId } = req.params;
      const userId = req.user.id;
      const { startDate, endDate } = req.query;

      // Check ownership
      const hasAccess = await babyModel.checkOwnership(babyId, userId);
      if (!hasAccess && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access stats for this baby'
        });
      }

      // Default to last 7 days if no dates provided
      const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const end = endDate || new Date().toISOString().split('T')[0];

      const stats = await growthRecordModel.getFeedingStats(babyId, start, end);
      
      res.status(200).json({
        success: true,
        data: {
          ...stats,
          period: { startDate: start, endDate: end }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get recent records for dashboard
  async getRecentRecords(req, res, next) {
    try {
      const { babyId } = req.params;
      const userId = req.user.id;
      const days = parseInt(req.query.days) || 7;

      // Check ownership
      const hasAccess = await babyModel.checkOwnership(babyId, userId);
      if (!hasAccess && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access records for this baby'
        });
      }

      const records = await growthRecordModel.getRecentRecords(babyId, days);
      
      res.status(200).json({
        success: true,
        data: records
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TrackerController();