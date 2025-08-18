const { executeQuery, executeTransaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class ChatModel {
  // Create chat room
  async createRoom(roomData) {
    try {
      const {
        name,
        description,
        roomType = 'general',
        topic,
        isPrivate = false,
        maxParticipants = 20
      } = roomData;

      const id = uuidv4();

      await executeQuery(
        `INSERT INTO chat_rooms 
         (id, name, description, room_type, topic, is_private, max_participants, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [id, name, description, roomType, topic, isPrivate, maxParticipants]
      );

      return await this.findRoomById(id);
    } catch (error) {
      logger.error('Create chat room error:', error);
      throw error;
    }
  }

  // Find chat room by ID
  async findRoomById(id) {
    try {
      const rooms = await executeQuery(
        'SELECT * FROM chat_rooms WHERE id = ?',
        [id]
      );

      if (rooms.length === 0) {
        return null;
      }

      const room = rooms[0];

      // Get participants
      const participants = await executeQuery(
        `SELECT crp.*, u.first_name, u.last_name, u.email
         FROM chat_room_participants crp
         JOIN users u ON crp.user_id = u.id
         WHERE crp.room_id = ? AND crp.is_active = TRUE`,
        [id]
      );

      room.participants = participants;

      return room;
    } catch (error) {
      logger.error('Find chat room by ID error:', error);
      throw error;
    }
  }

  // Get all chat rooms
  async getRooms(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        roomType,
        topic,
        isPrivate,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = options;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE 1=1';
      let queryParams = [];

      if (roomType) {
        whereClause += ' AND room_type = ?';
        queryParams.push(roomType);
      }

      if (topic) {
        whereClause += ' AND topic = ?';
        queryParams.push(topic);
      }

      if (isPrivate !== undefined) {
        whereClause += ' AND is_private = ?';
        queryParams.push(isPrivate);
      }

      queryParams.push(limit, offset);

      const rooms = await executeQuery(
        `SELECT cr.*, 
                COUNT(crp.user_id) as participant_count,
                MAX(cm.created_at) as last_message_at
         FROM chat_rooms cr
         LEFT JOIN chat_room_participants crp ON cr.id = crp.room_id AND crp.is_active = TRUE
         LEFT JOIN chat_messages cm ON cr.id = cm.room_id
         ${whereClause}
         GROUP BY cr.id
         ORDER BY cr.${sortBy} ${sortOrder}
         LIMIT ? OFFSET ?`,
        queryParams
      );

      // Get total count
      const countParams = queryParams.slice(0, -2);
      const countResult = await executeQuery(
        `SELECT COUNT(*) as total FROM chat_rooms cr ${whereClause}`,
        countParams
      );

      return {
        rooms,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      };
    } catch (error) {
      logger.error('Get chat rooms error:', error);
      throw error;
    }
  }

  // Join room
  async joinRoom(roomId, userId, role = 'participant') {
    try {
      // Check if room exists and has space
      const rooms = await executeQuery(
        'SELECT max_participants FROM chat_rooms WHERE id = ?',
        [roomId]
      );

      if (rooms.length === 0) {
        throw new Error('Chat room not found');
      }

      const room = rooms[0];

      // Check current participant count
      const participantCount = await executeQuery(
        'SELECT COUNT(*) as count FROM chat_room_participants WHERE room_id = ? AND is_active = TRUE',
        [roomId]
      );

      if (participantCount[0].count >= room.max_participants) {
        throw new Error('Chat room is full');
      }

      // Check if user is already in room
      const existing = await executeQuery(
        'SELECT id, is_active FROM chat_room_participants WHERE room_id = ? AND user_id = ?',
        [roomId, userId]
      );

      if (existing.length > 0) {
        if (existing[0].is_active) {
          throw new Error('User is already in this room');
        } else {
          // Reactivate participation
          await executeQuery(
            'UPDATE chat_room_participants SET is_active = TRUE, joined_at = NOW() WHERE room_id = ? AND user_id = ?',
            [roomId, userId]
          );
        }
      } else {
        // Create new participation
        await executeQuery(
          `INSERT INTO chat_room_participants 
           (id, room_id, user_id, role, joined_at, is_active)
           VALUES (?, ?, ?, ?, NOW(), TRUE)`,
          [uuidv4(), roomId, userId, role]
        );
      }

      logger.info('User joined chat room', { roomId, userId, role });
      return { message: 'Successfully joined room' };
    } catch (error) {
      logger.error('Join room error:', error);
      throw error;
    }
  }

  // Leave room
  async leaveRoom(roomId, userId) {
    try {
      await executeQuery(
        'UPDATE chat_room_participants SET is_active = FALSE, left_at = NOW() WHERE room_id = ? AND user_id = ?',
        [roomId, userId]
      );

      logger.info('User left chat room', { roomId, userId });
      return { message: 'Successfully left room' };
    } catch (error) {
      logger.error('Leave room error:', error);
      throw error;
    }
  }

  // Send message
  async sendMessage(messageData) {
    try {
      const {
        roomId,
        senderId,
        senderName,
        senderRole = 'user',
        message,
        replyToMessageId,
        attachments = []
      } = messageData;

      const messageId = uuidv4();

      const queries = [
        // Insert message
        {
          query: `INSERT INTO chat_messages 
                  (id, room_id, sender_id, sender_name, sender_role, message, 
                   reply_to_message_id, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          params: [messageId, roomId, senderId, senderName, senderRole, message, replyToMessageId]
        }
      ];

      // Add attachments
      attachments.forEach(attachment => {
        queries.push({
          query: `INSERT INTO message_attachments 
                  (id, message_id, attachment_type, file_url, filename, 
                   file_size, title, description, thumbnail_url, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          params: [
            uuidv4(), messageId, attachment.type, attachment.url,
            attachment.filename, attachment.size, attachment.title,
            attachment.description, attachment.thumbnail
          ]
        });
      });

      await executeTransaction(queries);

      return await this.findMessageById(messageId);
    } catch (error) {
      logger.error('Send message error:', error);
      throw error;
    }
  }

  // Find message by ID
  async findMessageById(id) {
    try {
      const messages = await executeQuery(
        'SELECT * FROM chat_messages WHERE id = ?',
        [id]
      );

      if (messages.length === 0) {
        return null;
      }

      const message = messages[0];

      // Get attachments
      const attachments = await executeQuery(
        'SELECT * FROM message_attachments WHERE message_id = ?',
        [id]
      );

      message.attachments = attachments;

      return message;
    } catch (error) {
      logger.error('Find message by ID error:', error);
      throw error;
    }
  }

  // Get room messages
  async getRoomMessages(roomId, options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        before,
        after,
        sortOrder = 'ASC'
      } = options;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE cm.room_id = ?';
      let queryParams = [roomId];

      if (before) {
        whereClause += ' AND cm.created_at < ?';
        queryParams.push(before);
      }

      if (after) {
        whereClause += ' AND cm.created_at > ?';
        queryParams.push(after);
      }

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
                ) as attachments_json
         FROM chat_messages cm
         LEFT JOIN message_attachments ma ON cm.id = ma.message_id
         ${whereClause}
         GROUP BY cm.id
         ORDER BY cm.created_at ${sortOrder}
         LIMIT ? OFFSET ?`,
        queryParams
      );

      // Parse attachments
      const parsedMessages = messages.map(message => ({
        ...message,
        attachments: message.attachments_json ? 
          JSON.parse(`[${message.attachments_json}]`) : []
      }));

      return parsedMessages;
    } catch (error) {
      logger.error('Get room messages error:', error);
      throw error;
    }
  }

  // Get user's rooms
  async getUserRooms(userId) {
    try {
      const rooms = await executeQuery(
        `SELECT cr.*, crp.role, crp.joined_at,
                COUNT(DISTINCT crp2.user_id) as participant_count,
                MAX(cm.created_at) as last_message_at
         FROM chat_rooms cr
         JOIN chat_room_participants crp ON cr.id = crp.room_id
         LEFT JOIN chat_room_participants crp2 ON cr.id = crp2.room_id AND crp2.is_active = TRUE
         LEFT JOIN chat_messages cm ON cr.id = cm.room_id
         WHERE crp.user_id = ? AND crp.is_active = TRUE
         GROUP BY cr.id
         ORDER BY last_message_at DESC`,
        [userId]
      );

      return rooms;
    } catch (error) {
      logger.error('Get user rooms error:', error);
      throw error;
    }
  }

  // Update message
  async updateMessage(id, message) {
    try {
      await executeQuery(
        'UPDATE chat_messages SET message = ?, is_edited = TRUE, updated_at = NOW() WHERE id = ?',
        [message, id]
      );

      return await this.findMessageById(id);
    } catch (error) {
      logger.error('Update message error:', error);
      throw error;
    }
  }

  // Delete message
  async deleteMessage(id) {
    try {
      const result = await executeQuery(
        'DELETE FROM chat_messages WHERE id = ?',
        [id]
      );

      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Delete message error:', error);
      throw error;
    }
  }
}

module.exports = new ChatModel();