const express = require('express');
const babyController = require('../controllers/babyController');
const { protect } = require('../middleware/authMiddleware');
const { validateBaby, validateUUIDParam, validatePagination } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Baby CRUD routes
router.post('/', validateBaby, babyController.createBaby);
router.get('/', validatePagination, babyController.getBabies);
router.get('/:id', validateUUIDParam('id'), babyController.getBaby);
router.put('/:id', validateUUIDParam('id'), babyController.updateBaby);
router.delete('/:id', validateUUIDParam('id'), babyController.deleteBaby);

// Additional baby routes
router.get('/:id/summary', validateUUIDParam('id'), babyController.getBabyWithSummary);

module.exports = router;