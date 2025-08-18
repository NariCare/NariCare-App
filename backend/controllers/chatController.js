const { v4: uuidv4 } = require('uuid');
const chatService = require('../services/chatService');
const logger = require('../utils/logger');

class ChatController {
  // Get all chat rooms
  async getChatRooms(req, res, next) {
    try {
      const options = {
        type: req.query.type,
        topic: req.query.topic,
        isPrivate: req.query.isPrivate === 'true'
      };

      const rooms = await chatService.getChatRooms(options);
      
      res.status(200).json({
        success: true,
        data: rooms
      });
    } catch (error) {
      next(error);
    }
  }

  // Get single chat room
  async getChatRoom(req, res, next) {
    try {
      const { id } = req.params;
      const room = await chatService.getChatRoomById(id);
      
      if (!room) {
        return res.status(404).json({
          success: false,
          error: 'Chat room not found'
        });
      }

      res.status(200).json({
        success: true,
        data: room
      });
    } catch (error) {
      next(error);
    }
  }

  // Join chat room
  async joinRoom(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await chatService.joinRoom(id, userId);
      
      logger.info('User joined chat room', { roomId: id, userId });

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Leave chat room
  async leaveRoom(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await chatService.leaveRoom(id, userId);
      
      logger.info('User left chat room', { roomId: id, userId });

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Get messages for a room
  async getMessages(req, res, next) {
    try {
      const { id } = req.params;
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
        before: req.query.before,
        after: req.query.after
      };

      const result = await chatService.getMessages(id, options);
      
      res.status(200).json({
        success: true,
        data: result.messages,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  // Send message to room
  async sendMessage(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { message, attachments } = req.body;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Message content is required'
        });
      }

      const messageData = {
        roomId: id,
        senderId: userId,
        senderName: `${req.user.first_name} ${req.user.last_name}`,
        senderRole: req.user.role,
        message: message.trim(),
        attachments
      };

      const sentMessage = await chatService.sendMessage(messageData);
      
      logger.info('Message sent to chat room', { 
        roomId: id, 
        userId, 
        messageId: sentMessage.id 
      });

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: sentMessage
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Create chat room
  async createRoom(req, res, next) {
    try {
      const roomData = {
        id: uuidv4(),
        ...req.body
      };

      const room = await chatService.createRoom(roomData);
      
      logger.info('Chat room created', { 
        roomId: room.id, 
        createdBy: req.user.id 
      });

      res.status(201).json({
        success: true,
        message: 'Chat room created successfully',
        data: room
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Update chat room
  async updateRoom(req, res, next) {
    try {
      const { id } = req.params;
      const room = await chatService.updateRoom(id, req.body);
      
      if (!room) {
        return res.status(404).json({
          success: false,
          error: 'Chat room not found'
        });
      }

      logger.info('Chat room updated', { 
        roomId: id, 
        updatedBy: req.user.id 
      });

      res.status(200).json({
        success: true,
        message: 'Chat room updated successfully',
        data: room
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Delete chat room
  async deleteRoom(req, res, next) {
    try {
      const { id } = req.params;
      const result = await chatService.deleteRoom(id);
      
      logger.info('Chat room deleted', { 
        roomId: id, 
        deletedBy: req.user.id 
      });

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Add moderator to room
  async addModerator(req, res, next) {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const result = await chatService.addModerator(id, userId);
      
      logger.info('Moderator added to chat room', { 
        roomId: id, 
        moderatorId: userId,
        addedBy: req.user.id 
      });

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChatController();