-- Migration: Chat and Messaging System
-- Description: Creates tables for group chat, messaging, and communication
-- Version: 1.0.0
-- Date: 2025-01-27

-- ============================================================================
-- CHAT AND MESSAGING
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_rooms (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    room_type ENUM('general', 'consultation') DEFAULT 'general',
    topic VARCHAR(50),
    is_private BOOLEAN DEFAULT FALSE,
    max_participants INT DEFAULT 20,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_room_type (room_type, is_private),
    INDEX idx_topic (topic)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_room_participants (
    id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role ENUM('participant', 'moderator') DEFAULT 'participant',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_room_participant (room_id, user_id),
    INDEX idx_room_participants (room_id, is_active),
    INDEX idx_user_rooms (user_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(36) NOT NULL,
    sender_id VARCHAR(36) NOT NULL,
    sender_name VARCHAR(200) NOT NULL,
    sender_role ENUM('user', 'expert', 'moderator') DEFAULT 'user',
    message TEXT NOT NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    reply_to_message_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to_message_id) REFERENCES chat_messages(id) ON DELETE SET NULL,
    INDEX idx_room_messages (room_id, created_at DESC),
    INDEX idx_sender_messages (sender_id, created_at DESC),
    FULLTEXT idx_message_search (message)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS message_attachments (
    id VARCHAR(36) PRIMARY KEY,
    message_id VARCHAR(36) NOT NULL,
    attachment_type ENUM('image', 'video', 'document') NOT NULL,
    file_url TEXT NOT NULL,
    filename VARCHAR(255),
    file_size INT,
    title VARCHAR(255),
    description TEXT,
    thumbnail_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
    INDEX idx_message_attachments (message_id),
    INDEX idx_attachment_type (attachment_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- CHATBOT AND AI INTERACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    baby_age_weeks INT,
    conversation_context JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_conversations (user_id, is_active),
    INDEX idx_active_conversations (is_active, updated_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chatbot_messages (
    id VARCHAR(36) PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL,
    sender ENUM('user', 'bot', 'expert') NOT NULL,
    content TEXT NOT NULL,
    formatted_content JSON,
    follow_up_options JSON,
    attachments JSON,
    is_typing BOOLEAN DEFAULT FALSE,
    is_playing BOOLEAN DEFAULT FALSE,
    audio_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (conversation_id) REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
    INDEX idx_conversation_messages (conversation_id, created_at ASC),
    INDEX idx_message_type (sender, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INSERT INITIAL CHAT ROOMS
-- ============================================================================

INSERT INTO chat_rooms (id, name, description, room_type, topic, is_private, max_participants) VALUES
(UUID(), 'Newborn Support Group', 'Support for mothers with newborns (0-3 months)', 'general', 'newborn', FALSE, 20),
(UUID(), 'Pumping Moms Unite', 'Tips and support for pumping mothers', 'general', 'pumping', FALSE, 20),
(UUID(), 'Twin Baby Support', 'Special support for mothers of twins', 'general', 'twins', FALSE, 20),
(UUID(), 'Breastfeeding Achievements', 'Celebrate your breastfeeding milestones and victories', 'general', 'achievements', FALSE, 20),
(UUID(), 'Working Moms Support', 'Support for mothers returning to work while breastfeeding', 'general', 'work', FALSE, 20);