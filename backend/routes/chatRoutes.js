const express = require('express');
const chatController = require('../controllers/chatController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateUUIDParam, validatePagination } = require('../middleware/validation');

const router = express.Router();

// Public routes
router.get('/rooms', chatController.getChatRooms);
router.get('/rooms/:id', validateUUIDParam('id'), chatController.getChatRoom);

// Protected routes
router.use(protect);

// Chat room management
router.post('/rooms/:id/join', validateUUIDParam('id'), chatController.joinRoom);
router.post('/rooms/:id/leave', validateUUIDParam('id'), chatController.leaveRoom);

// Messages
router.get('/rooms/:id/messages', validateUUIDParam('id'), validatePagination, chatController.getMessages);
router.post('/rooms/:id/messages', validateUUIDParam('id'), chatController.sendMessage);

// Admin routes
router.use(authorize('admin', 'expert'));
router.post('/rooms', chatController.createRoom);
router.put('/rooms/:id', validateUUIDParam('id'), chatController.updateRoom);
router.delete('/rooms/:id', validateUUIDParam('id'), chatController.deleteRoom);
router.post('/rooms/:id/moderators', validateUUIDParam('id'), chatController.addModerator);

module.exports = router;