const { v4: uuidv4 } = require('uuid');
const consultationService = require('../services/consultationService');
const logger = require('../utils/logger');

class ConsultationController {
  // Schedule new consultation
  async scheduleConsultation(req, res, next) {
    try {
      const userId = req.user.id;
      const consultationData = {
        id: uuidv4(),
        userId,
        ...req.body
      };

      const consultation = await consultationService.scheduleConsultation(consultationData);
      
      logger.info('Consultation scheduled', { 
        consultationId: consultation.id, 
        userId,
        expertId: consultation.expert_id
      });

      res.status(201).json({
        success: true,
        message: 'Consultation scheduled successfully',
        data: consultation
      });
    } catch (error) {
      next(error);
    }
  }

  // Get user's consultations
  async getMyConsultations(req, res, next) {
    try {
      const userId = req.user.id;
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        status: req.query.status,
        upcoming: req.query.upcoming === 'true'
      };

      const result = await consultationService.getUserConsultations(userId, options);
      
      res.status(200).json({
        success: true,
        data: result.consultations,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  // Get single consultation
  async getConsultation(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const consultation = await consultationService.getConsultationById(id);
      
      if (!consultation) {
        return res.status(404).json({
          success: false,
          error: 'Consultation not found'
        });
      }

      // Check access (user owns consultation or is the expert or is admin)
      const hasAccess = consultation.user_id === userId || 
                       consultation.expert_user_id === userId || 
                       req.user.role === 'admin';

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access this consultation'
        });
      }

      res.status(200).json({
        success: true,
        data: consultation
      });
    } catch (error) {
      next(error);
    }
  }

  // Update consultation
  async updateConsultation(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check ownership
      const consultation = await consultationService.getConsultationById(id);
      if (!consultation) {
        return res.status(404).json({
          success: false,
          error: 'Consultation not found'
        });
      }

      const hasAccess = consultation.user_id === userId || req.user.role === 'admin';
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to update this consultation'
        });
      }

      const updatedConsultation = await consultationService.updateConsultation(id, req.body);
      
      logger.info('Consultation updated', { consultationId: id, userId });

      res.status(200).json({
        success: true,
        message: 'Consultation updated successfully',
        data: updatedConsultation
      });
    } catch (error) {
      next(error);
    }
  }

  // Cancel consultation
  async cancelConsultation(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await consultationService.cancelConsultation(id, userId);
      
      logger.info('Consultation cancelled', { consultationId: id, userId });

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Expert: Get expert's consultations
  async getExpertConsultations(req, res, next) {
    try {
      const userId = req.user.id;
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        status: req.query.status,
        upcoming: req.query.upcoming === 'true'
      };

      const result = await consultationService.getExpertConsultations(userId, options);
      
      res.status(200).json({
        success: true,
        data: result.consultations,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  // Expert: Start consultation
  async startConsultation(req, res, next) {
    try {
      const { id } = req.params;
      const expertUserId = req.user.id;

      const result = await consultationService.startConsultation(id, expertUserId);
      
      logger.info('Consultation started', { 
        consultationId: id, 
        expertUserId 
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: result.consultation
      });
    } catch (error) {
      next(error);
    }
  }

  // Expert: Complete consultation
  async completeConsultation(req, res, next) {
    try {
      const { id } = req.params;
      const expertUserId = req.user.id;
      const { expertNotes, followUpRequired } = req.body;

      const result = await consultationService.completeConsultation(id, expertUserId, {
        expertNotes,
        followUpRequired
      });
      
      logger.info('Consultation completed', { 
        consultationId: id, 
        expertUserId 
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: result.consultation
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Get all consultations
  async getAllConsultations(req, res, next) {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        status: req.query.status,
        expertId: req.query.expertId,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const result = await consultationService.getAllConsultations(options);
      
      res.status(200).json({
        success: true,
        data: result.consultations,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Get consultation statistics
  async getConsultationStats(req, res, next) {
    try {
      const { startDate, endDate, expertId } = req.query;
      
      const stats = await consultationService.getConsultationStats({
        startDate,
        endDate,
        expertId
      });
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ConsultationController();