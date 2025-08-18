const express = require('express');
const trackerController = require('../controllers/trackerController');
const { protect } = require('../middleware/authMiddleware');
const { 
  validateGrowthRecord, 
  validateWeightRecord, 
  validateUUIDParam, 
  validatePagination 
} = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Feed/Growth Records
router.post('/feed', validateGrowthRecord, trackerController.createFeedRecord);
router.get('/feed/:babyId', validateUUIDParam('babyId'), validatePagination, trackerController.getFeedRecords);
router.put('/feed/:id', validateUUIDParam('id'), trackerController.updateFeedRecord);
router.delete('/feed/:id', validateUUIDParam('id'), trackerController.deleteFeedRecord);

// Weight Records
router.post('/weight', validateWeightRecord, trackerController.createWeightRecord);
router.get('/weight/:babyId', validateUUIDParam('babyId'), validatePagination, trackerController.getWeightRecords);
router.put('/weight/:id', validateUUIDParam('id'), trackerController.updateWeightRecord);
router.delete('/weight/:id', validateUUIDParam('id'), trackerController.deleteWeightRecord);

// Statistics and Analytics
router.get('/stats/:babyId', validateUUIDParam('babyId'), trackerController.getFeedingStats);
router.get('/recent/:babyId', validateUUIDParam('babyId'), trackerController.getRecentRecords);
router.get('/weight-progression/:babyId', validateUUIDParam('babyId'), trackerController.getWeightProgression);

module.exports = router;