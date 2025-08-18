const express = require('express');
const timelineController = require('../controllers/timelineController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateUUIDParam } = require('../middleware/validation');

const router = express.Router();

// Public routes
router.get('/items', timelineController.getTimelineItems);
router.get('/items/:id', timelineController.getTimelineItem);

// Protected routes
router.use(protect);

// User timeline routes
router.get('/baby/:babyId', validateUUIDParam('babyId'), timelineController.getBabyTimeline);
router.post('/progress', timelineController.markTimelineProgress);
router.get('/progress/:babyId', validateUUIDParam('babyId'), timelineController.getTimelineProgress);

// Admin routes for timeline management
router.use(authorize('admin'));
router.post('/items', timelineController.createTimelineItem);
router.put('/items/:id', timelineController.updateTimelineItem);
router.delete('/items/:id', timelineController.deleteTimelineItem);

module.exports = router;