const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validatePagination } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(protect);

// User analytics routes
router.get('/my-stats', analyticsController.getMyStats);
router.get('/my-growth-trends/:babyId', analyticsController.getMyGrowthTrends);
router.get('/my-emotion-trends', analyticsController.getMyEmotionTrends);

// Admin analytics routes
router.use(authorize('admin'));
router.get('/dashboard', analyticsController.getAdminDashboard);
router.get('/user-engagement', analyticsController.getUserEngagement);
router.get('/feature-usage', analyticsController.getFeatureUsage);
router.get('/growth-analytics', analyticsController.getGrowthAnalytics);
router.get('/crisis-monitoring', analyticsController.getCrisisMonitoring);

module.exports = router;