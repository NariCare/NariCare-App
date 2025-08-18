const express = require('express');
const expertController = require('../controllers/expertController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateUUIDParam, validatePagination } = require('../middleware/validation');

const router = express.Router();

// Public routes
router.get('/', validatePagination, expertController.getExperts);
router.get('/:id', validateUUIDParam('id'), expertController.getExpert);
router.get('/:id/availability', validateUUIDParam('id'), expertController.getExpertAvailability);

// Protected routes
router.use(protect);

// Expert profile management (experts can manage their own profiles)
router.get('/profile/me', authorize('expert'), expertController.getMyProfile);
router.put('/profile/me', authorize('expert'), expertController.updateMyProfile);
router.put('/profile/me/availability', authorize('expert'), expertController.updateMyAvailability);

// Admin routes
router.use(authorize('admin'));
router.post('/', expertController.createExpert);
router.put('/:id', validateUUIDParam('id'), expertController.updateExpert);
router.delete('/:id', validateUUIDParam('id'), expertController.deleteExpert);
router.put('/:id/availability', validateUUIDParam('id'), expertController.updateExpertAvailability);

module.exports = router;