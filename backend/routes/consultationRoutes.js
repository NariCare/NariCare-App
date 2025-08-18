const express = require('express');
const consultationController = require('../controllers/consultationController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateConsultation, validateUUIDParam, validatePagination } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(protect);

// User consultation routes
router.post('/', validateConsultation, consultationController.scheduleConsultation);
router.get('/my-consultations', validatePagination, consultationController.getMyConsultations);
router.get('/:id', validateUUIDParam('id'), consultationController.getConsultation);
router.put('/:id', validateUUIDParam('id'), consultationController.updateConsultation);
router.delete('/:id', validateUUIDParam('id'), consultationController.cancelConsultation);

// Expert consultation routes
router.get('/expert/my-consultations', authorize('expert'), validatePagination, consultationController.getExpertConsultations);
router.put('/:id/start', authorize('expert'), validateUUIDParam('id'), consultationController.startConsultation);
router.put('/:id/complete', authorize('expert'), validateUUIDParam('id'), consultationController.completeConsultation);

// Admin consultation routes
router.get('/admin/all', authorize('admin'), validatePagination, consultationController.getAllConsultations);
router.get('/admin/stats', authorize('admin'), consultationController.getConsultationStats);

module.exports = router;