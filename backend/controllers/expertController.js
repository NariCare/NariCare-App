const { v4: uuidv4 } = require('uuid');
const expertService = require('../services/expertService');
const logger = require('../utils/logger');

class ExpertController {
  // Get all experts
  async getExperts(req, res, next) {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        specialty: req.query.specialty,
        available: req.query.available === 'true',
        sortBy: req.query.sortBy || 'rating',
        sortOrder: req.query.sortOrder || 'DESC'
      };

      const result = await expertService.getExperts(options);
      
      res.status(200).json({
        success: true,
        data: result.experts,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  // Get single expert
  async getExpert(req, res, next) {
    try {
      const { id } = req.params;
      const expert = await expertService.getExpertById(id);
      
      if (!expert) {
        return res.status(404).json({
          success: false,
          error: 'Expert not found'
        });
      }

      res.status(200).json({
        success: true,
        data: expert
      });
    } catch (error) {
      next(error);
    }
  }

  // Get expert availability
  async getExpertAvailability(req, res, next) {
    try {
      const { id } = req.params;
      const { date } = req.query;

      const availability = await expertService.getExpertAvailability(id, date);
      
      res.status(200).json({
        success: true,
        data: availability
      });
    } catch (error) {
      next(error);
    }
  }

  // Expert: Get own profile
  async getMyProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const expert = await expertService.getExpertByUserId(userId);
      
      if (!expert) {
        return res.status(404).json({
          success: false,
          error: 'Expert profile not found'
        });
      }

      res.status(200).json({
        success: true,
        data: expert
      });
    } catch (error) {
      next(error);
    }
  }

  // Expert: Update own profile
  async updateMyProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const expert = await expertService.updateExpertByUserId(userId, req.body);
      
      if (!expert) {
        return res.status(404).json({
          success: false,
          error: 'Expert profile not found'
        });
      }

      logger.info('Expert profile updated', { userId });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: expert
      });
    } catch (error) {
      next(error);
    }
  }

  // Expert: Update own availability
  async updateMyAvailability(req, res, next) {
    try {
      const userId = req.user.id;
      const { availability } = req.body;

      if (!Array.isArray(availability)) {
        return res.status(400).json({
          success: false,
          error: 'Availability must be an array'
        });
      }

      const result = await expertService.updateExpertAvailabilityByUserId(userId, availability);
      
      logger.info('Expert availability updated', { userId });

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Create expert
  async createExpert(req, res, next) {
    try {
      const expertData = {
        id: uuidv4(),
        ...req.body
      };

      const expert = await expertService.createExpert(expertData);
      
      logger.info('Expert created', { 
        expertId: expert.id, 
        createdBy: req.user.id 
      });

      res.status(201).json({
        success: true,
        message: 'Expert created successfully',
        data: expert
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Update expert
  async updateExpert(req, res, next) {
    try {
      const { id } = req.params;
      const expert = await expertService.updateExpert(id, req.body);
      
      if (!expert) {
        return res.status(404).json({
          success: false,
          error: 'Expert not found'
        });
      }

      logger.info('Expert updated', { 
        expertId: id, 
        updatedBy: req.user.id 
      });

      res.status(200).json({
        success: true,
        message: 'Expert updated successfully',
        data: expert
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Delete expert
  async deleteExpert(req, res, next) {
    try {
      const { id } = req.params;
      const result = await expertService.deleteExpert(id);
      
      logger.info('Expert deleted', { 
        expertId: id, 
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

  // Admin: Update expert availability
  async updateExpertAvailability(req, res, next) {
    try {
      const { id } = req.params;
      const { availability } = req.body;

      if (!Array.isArray(availability)) {
        return res.status(400).json({
          success: false,
          error: 'Availability must be an array'
        });
      }

      const result = await expertService.updateExpertAvailability(id, availability);
      
      logger.info('Expert availability updated by admin', { 
        expertId: id, 
        updatedBy: req.user.id 
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

module.exports = new ExpertController();