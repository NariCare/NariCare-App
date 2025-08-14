-- Migration: Expert Consultations System
-- Description: Creates tables for expert management and consultation booking
-- Version: 1.0.0
-- Date: 2025-01-27

-- ============================================================================
-- EXPERT CONSULTATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS experts (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    credentials VARCHAR(255) NOT NULL,
    bio TEXT,
    rating DECIMAL(2,1) DEFAULT 0.0,
    total_consultations INT DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_available_experts (is_available, rating DESC),
    INDEX idx_expert_rating (rating DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS expert_specialties (
    id VARCHAR(36) PRIMARY KEY,
    expert_id VARCHAR(36) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    
    FOREIGN KEY (expert_id) REFERENCES experts(id) ON DELETE CASCADE,
    UNIQUE KEY unique_expert_specialty (expert_id, specialty),
    INDEX idx_specialty_search (specialty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS expert_availability (
    id VARCHAR(36) PRIMARY KEY,
    expert_id VARCHAR(36) NOT NULL,
    day_of_week TINYINT NOT NULL, -- 0=Sunday, 1=Monday, etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (expert_id) REFERENCES experts(id) ON DELETE CASCADE,
    INDEX idx_expert_schedule (expert_id, day_of_week, is_available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS consultations (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    expert_id VARCHAR(36) NOT NULL,
    consultation_type ENUM('scheduled', 'on-demand') DEFAULT 'scheduled',
    status ENUM('scheduled', 'in-progress', 'completed', 'cancelled') DEFAULT 'scheduled',
    scheduled_at TIMESTAMP NOT NULL,
    duration_minutes INT DEFAULT 30,
    topic VARCHAR(100) NOT NULL,
    notes TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    meeting_link TEXT,
    reminder_sent BOOLEAN DEFAULT FALSE,
    actual_start_time TIMESTAMP NULL,
    actual_end_time TIMESTAMP NULL,
    expert_notes TEXT,
    user_rating TINYINT, -- 1-5 rating
    user_feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (expert_id) REFERENCES experts(id) ON DELETE CASCADE,
    INDEX idx_user_consultations (user_id, scheduled_at DESC),
    INDEX idx_expert_consultations (expert_id, scheduled_at DESC),
    INDEX idx_consultation_status (status, scheduled_at),
    INDEX idx_reminders (reminder_sent, scheduled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- CONSULTATION FOLLOW-UPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS consultation_follow_ups (
    id VARCHAR(36) PRIMARY KEY,
    consultation_id VARCHAR(36) NOT NULL,
    follow_up_type ENUM('message', 'call', 'resource') NOT NULL,
    content TEXT NOT NULL,
    scheduled_for TIMESTAMP,
    completed_at TIMESTAMP NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
    INDEX idx_consultation_followups (consultation_id, scheduled_for),
    INDEX idx_pending_followups (is_completed, scheduled_for)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;