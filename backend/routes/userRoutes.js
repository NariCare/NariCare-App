const express = require('express');
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateUUIDParam } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(protect);

// User profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/notification-preferences', userController.updateNotificationPreferences);

// Admin only routes
router.get('/', authorize('admin'), userController.getAllUsers);
router.get('/:id', authorize('admin'), validateUUIDParam('id'), userController.getUserById);
router.put('/:id/role', authorize('admin'), validateUUIDParam('id'), userController.updateUserRole);
router.delete('/:id', authorize('admin'), validateUUIDParam('id'), userController.deleteUser);

module.exports = router;