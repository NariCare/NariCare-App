const express = require('express');
const emotionController = require('../controllers/emotionController');
const { protect } = require('../middleware/authMiddleware');
const { validateEmotionCheckin, validateUUIDParam, validatePagination } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Emotion check-in routes
router.post('/checkin', validateEmotionCheckin, emotionController.createCheckin);
router.get('/checkins', validatePagination, emotionController.getCheckins);
router.get('/trends', emotionController.getEmotionTrends);

// Crisis intervention routes
router.get('/crisis-interventions', emotionController.getCrisisInterventions);
router.put('/crisis-interventions/:id/response', validateUUIDParam('id'), emotionController.updateCrisisResponse);

// Reference data routes
router.get('/options', emotionController.getCheckinOptions);

module.exports = router;