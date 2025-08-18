const express = require('express');
const notificationController = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateUUIDParam, validatePagination } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(protect);

// User notification routes
router.post('/register-token', notificationController.registerPushToken);
router.get('/my-notifications', validatePagination, notificationController.getMyNotifications);
router.put('/preferences', notificationController.updateNotificationPreferences);

// Admin notification routes
router.use(authorize('admin'));
router.post('/send', notificationController.sendNotification);
router.get('/scheduled', validatePagination, notificationController.getScheduledNotifications);
router.get('/stats', notificationController.getNotificationStats);

module.exports = router;