const { v4: uuidv4 } = require('uuid');
const babyModel = require('../models/babyModel');
const logger = require('../utils/logger');

class BabyController {
  // Create new baby
  async createBaby(req, res, next) {
    try {
      const userId = req.user.id;
      const babyData = {
        id: uuidv4(),
        userId,
        ...req.body
      };

      const baby = await babyModel.create(babyData);
      
      logger.info('Baby created successfully', { 
        babyId: baby.id, 
        userId,
        babyName: baby.name 
      });

      res.status(201).json({
        success: true,
        message: 'Baby added successfully',
        data: baby
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all babies for current user
  async getBabies(req, res, next) {
    try {
      const userId = req.user.id;
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        sortBy: req.query.sortBy || 'date_of_birth',
        sortOrder: req.query.sortOrder || 'DESC'
      };

      const result = await babyModel.findByUserId(userId, options);
      
      res.status(200).json({
        success: true,
        data: result.babies,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  // Get single baby by ID
  async getBaby(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check ownership
      const hasAccess = await babyModel.checkOwnership(id, userId);
      if (!hasAccess && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access this baby record'
        });
      }

      const baby = await babyModel.findById(id);
      
      if (!baby) {
        return res.status(404).json({
          success: false,
          error: 'Baby not found'
        });
      }

      res.status(200).json({
        success: true,
        data: baby
      });
    } catch (error) {
      next(error);
    }
  }

  // Update baby
  async updateBaby(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check ownership
      const hasAccess = await babyModel.checkOwnership(id, userId);
      if (!hasAccess && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to update this baby record'
        });
      }

      const baby = await babyModel.update(id, req.body);
      
      if (!baby) {
        return res.status(404).json({
          success: false,
          error: 'Baby not found'
        });
      }

      logger.info('Baby updated successfully', { 
        babyId: id, 
        userId,
        updatedFields: Object.keys(req.body)
      });

      res.status(200).json({
        success: true,
        message: 'Baby updated successfully',
        data: baby
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete baby
  async deleteBaby(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check ownership
      const hasAccess = await babyModel.checkOwnership(id, userId);
      if (!hasAccess && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to delete this baby record'
        });
      }

      const result = await babyModel.delete(id);
      
      logger.info('Baby deleted successfully', { babyId: id, userId });

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Get baby with growth summary
  async getBabyWithSummary(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check ownership
      const hasAccess = await babyModel.checkOwnership(id, userId);
      if (!hasAccess && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access this baby record'
        });
      }

      const baby = await babyModel.getWithGrowthSummary(id);
      
      if (!baby) {
        return res.status(404).json({
          success: false,
          error: 'Baby not found'
        });
      }

      res.status(200).json({
        success: true,
        data: baby
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BabyController();