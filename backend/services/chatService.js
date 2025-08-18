const { executeQuery, executeTransaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class ChatService {
  // Get all chat rooms
  async getChatRooms(options = {}) {
    try {
      const { type, topic, isPrivate } = options;
      let whereClause = 'WHERE 1=1';
      let queryParams = [];

      if (type) {
        whereClause += ' AND room_type = ?';
        queryParams.push(type);
      }

      if (topic) {
        whereClause += ' AND topic = ?';
        queryParams.push(topic);
      }

      if (isPrivate !== undefined) {
        whereClause += ' AND is_private = ?';
        queryParams.push(isPrivate);
      }

      const rooms = await executeQuery(
        `SELECT cr.*, 
                COUNT(DISTINCT crp.user_id) as participant_count,
                COUNT(DISTINCT CASE WHEN crp.role = 'moderator' THEN crp.user_id END) as moderator_count,
                MAX(cm.created_at) as last_message_at
         FROM chat_rooms cr
         LEFT JOIN chat_room_participants crp ON cr.id = crp.room_id AND crp.is_active = TRUE
         LEFT JOIN chat_messages cm ON cr.id = cm.room_id
         ${whereClause}
         GROUP BY cr.id
         ORDER BY last_message_at DESC, cr.created_at DESC`,
        queryParams
      );

      return rooms;
    } catch (error) {
      logger.error('Get chat rooms error:', error);
      throw error;
    }
  }

  // Get chat room by ID
  async getChatRoomById(id) {
    try {
      const rooms = await executeQuery(
        `SELECT cr.*, 
                COUNT(DISTINCT crp.user_id) as participant_count,
                COUNT(DISTINCT CASE WHEN crp.role = 'moderator' THEN crp.user_id END) as moderator_count
         FROM chat_rooms cr
         LEFT JOIN chat_room_participants crp ON cr.id = crp.room_id AND crp.is_active = TRUE
         WHERE cr.id = ?
         GROUP BY cr.id`,
        [id]
      );

      if (rooms.length === 0) {
        return null;
      }

      const room = rooms[0];

      // Get participants
      const participants = await executeQuery(
        `SELECT crp.user_id, crp.role, crp.joined_at, u.first_name, u.last_name
         FROM chat_room_participants crp
         JOIN users u ON crp.user_id = u.id
         WHERE crp.room_id = ? AND crp.is_active = TRUE
         ORDER BY crp.joined_at ASC`,
        [id]
      );

      room.participants = participants;

      return room;
    } catch (error) {
      logger.error('Get chat room by ID error:', error);
      throw error;
    }
  }

  // Join chat room
  async joinRoom(roomId, userId) {
    try {
      // Check if room exists and has space
      const rooms = await executeQuery(
        `SELECT cr.*, COUNT(crp.user_id) as current_participants
         FROM chat_rooms cr
         LEFT JOIN chat_room_participants crp ON cr.id = crp.room_id AND crp.is_active = TRUE
         WHERE cr.id = ?
         GROUP BY cr.id`,
        [roomId]
      );

      if (rooms.length === 0) {
        throw new Error('Chat room not found');
      }

      const room = rooms[0];

      if (room.current_participants >= room.max_participants) {
        throw new Error('Chat room is full');
      }

      // Check if user is already in the room
      const existingParticipants = await executeQuery(
        'SELECT id FROM chat_room_participants WHERE room_id = ? AND user_id = ? AND is_active = TRUE',
        [roomId, userId]
      );

      if (existingParticipants.length > 0) {
        throw new Error('User is already in this chat room');
      }

      // Add user to room
      await executeQuery(
        `INSERT INTO chat_room_participants 
         (id, room_id, user_id, role, joined_at, is_active) 
         VALUES (?, ?, ?, ?, NOW(), TRUE)`,
        [uuidv4(), roomId, userId, 'participant']
      );

      return { message: 'Successfully joined chat room' };
    } catch (error) {
      logger.error('Join room error:', error);
      throw error;
    }
  }

  // Leave chat room
  async leaveRoom(roomId, userId) {
    try {
      // Update participant record to inactive
      const result = await executeQuery(
        'UPDATE chat_room_participants SET is_active = FALSE, left_at = NOW() WHERE room_id = ? AND user_id = ?',
        [roomId, userId]
      );

      if (result.affectedRows === 0) {
        throw new Error('User is not in this chat room');
      }

      return { message: 'Successfully left chat room' };
    } catch (error) {
      logger.error('Leave room error:', error);
      throw error;
    }
  }

  // Get messages for a room
  async getMessages(roomId, options = {}) {
    try {
      const { page = 1, limit = 50, before, after } = options;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE cm.room_id = ?';
      let queryParams = [roomId];

      // Add time-based filters
      if (before) {
        whereClause += ' AND cm.created_at < ?';
        queryParams.push(before);
      }

      if (after) {
        whereClause += ' AND cm.created_at > ?';
        queryParams.push(after);
      }

      // Add pagination params
      queryParams.push(limit, offset);

      const messages = await executeQuery(
        `SELECT cm.*, 
                GROUP_CONCAT(
                  JSON_OBJECT(
                    'id', ma.id,
                    'type', ma.attachment_type,
                    'url', ma.file_url,
                    'title', ma.title,
                    'description', ma.description,
                    'thumbnail', ma.thumbnail_url
                  )
                ) as attachments
         FROM chat_messages cm
         LEFT JOIN message_attachments ma ON cm.id = ma.message_id
         ${whereClause}
         GROUP BY cm.id
         ORDER BY cm.created_at ASC
         LIMIT ? OFFSET ?`,
        queryParams
      );

      // Parse attachments JSON
      const parsedMessages = messages.map(message => ({
        ...message,
        attachments: message.attachments ? JSON.parse(`[${message.attachments}]`) : []
      }));

      // Get total count
      const countParams = queryParams.slice(0, -2);
      const countResult = await executeQuery(
        `SELECT COUNT(*) as total FROM chat_messages cm ${whereClause}`,
        countParams
      );

      return {
        messages: parsedMessages,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      };
    } catch (error) {
      logger.error('Get messages error:', error);
      throw error;
    }
  }

  // Send message to room
  async sendMessage(messageData) {
    try {
      const {
        roomId, senderId, senderName, senderRole,
        message, attachments = []
      } = messageData;

      // Check if user is in the room
      const participants = await executeQuery(
        'SELECT id FROM chat_room_participants WHERE room_id = ? AND user_id = ? AND is_active = TRUE',
        [roomId, senderId]
      );

      if (participants.length === 0) {
        throw new Error('User is not a member of this chat room');
      }

      const messageId = uuidv4();

      // Create message
      await executeQuery(
        `INSERT INTO chat_messages 
         (id, room_id, sender_id, sender_name, sender_role, message, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [messageId, roomId, senderId, senderName, senderRole, message]
      );

      // Add attachments if any
      if (attachments && attachments.length > 0) {
        const attachmentQueries = attachments.map(attachment => ({
          query: `INSERT INTO message_attachments 
                  (id, message_id, attachment_type, file_url, title, description, thumbnail_url, created_at) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          params: [
            uuidv4(), messageId, attachment.type, attachment.url,
            attachment.title, attachment.description, attachment.thumbnail
          ]
        }));

        await executeTransaction(attachmentQueries);
      }

      // Get the complete message with attachments
      const sentMessage = await this.getMessageById(messageId);

      return sentMessage;
    } catch (error) {
      logger.error('Send message error:', error);
      throw error;
    }
  }

  // Get message by ID
  async getMessageById(id) {
    try {
      const messages = await executeQuery(
        `SELECT cm.*, 
                GROUP_CONCAT(
                  JSON_OBJECT(
                    'id', ma.id,
                    'type', ma.attachment_type,
                    'url', ma.file_url,
                    'title', ma.title,
                    'description', ma.description,
                    'thumbnail', ma.thumbnail_url
                  )
                ) as attachments
         FROM chat_messages cm
         LEFT JOIN message_attachments ma ON cm.id = ma.message_id
         WHERE cm.id = ?
         GROUP BY cm.id`,
        [id]
      );

      if (messages.length === 0) {
        return null;
      }

      const message = messages[0];
      message.attachments = message.attachments ? JSON.parse(`[${message.attachments}]`) : [];

      return message;
    } catch (error) {
      logger.error('Get message by ID error:', error);
      throw error;
    }
  }

  // Admin: Create chat room
  async createRoom(roomData) {
    try {
      const {
        id, name, description, roomType = 'general',
        topic, isPrivate = false, maxParticipants = 20
      } = roomData;

      await executeQuery(
        `INSERT INTO chat_rooms 
         (id, name, description, room_type, topic, is_private, max_participants, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [id, name, description, roomType, topic, isPrivate, maxParticipants]
      );

      return await this.getChatRoomById(id);
    } catch (error) {
      logger.error('Create room error:', error);
      throw error;
    }
  }

  // Admin: Update chat room
  async updateRoom(id, updateData) {
    try {
      const allowedFields = [
        'name', 'description', 'room_type', 'topic', 'is_private', 'max_participants'
      ];

      const updateFields = [];
      const updateValues = [];

      Object.keys(updateData).forEach(key => {
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (allowedFields.includes(dbField)) {
          updateFields.push(`${dbField} = ?`);
          updateValues.push(updateData[key]);
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      updateFields.push('updated_at = NOW()');
      updateValues.push(id);

      await executeQuery(
        `UPDATE chat_rooms SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      return await this.getChatRoomById(id);
    } catch (error) {
      logger.error('Update room error:', error);
      throw error;
    }
  }

  // Admin: Delete chat room
  async deleteRoom(id) {
    try {
      await executeQuery(
        'DELETE FROM chat_rooms WHERE id = ?',
        [id]
      );

      logger.info('Chat room deleted', { roomId: id });
      return { message: 'Chat room deleted successfully' };
    } catch (error) {
      logger.error('Delete room error:', error);
      throw error;
    }
  }

  // Admin: Add moderator
  async addModerator(roomId, userId) {
    try {
      // Check if user exists
      const users = await executeQuery(
        'SELECT id, role FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        throw new Error('User not found');
      }

      const user = users[0];

      // Only experts can be moderators
      if (user.role !== 'expert' && user.role !== 'admin') {
        throw new Error('Only experts can be moderators');
      }

      // Add user as moderator or update existing participant
      await executeQuery(
        `INSERT INTO chat_room_participants 
         (id, room_id, user_id, role, joined_at, is_active) 
         VALUES (?, ?, ?, ?, NOW(), TRUE)
         ON DUPLICATE KEY UPDATE
         role = 'moderator', is_active = TRUE`,
        [uuidv4(), roomId, userId]
      );

      return { message: 'Moderator added successfully' };
    } catch (error) {
      logger.error('Add moderator error:', error);
      throw error;
    }
  }
}

module.exports = new ChatService();