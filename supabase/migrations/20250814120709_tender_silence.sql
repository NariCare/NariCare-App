-- Migration: Emotion Check-In System
-- Description: Creates tables for maternal emotional health tracking
-- Version: 1.0.0
-- Date: 2025-01-27

-- ============================================================================
-- EMOTION CHECK-IN TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS emotion_checkin_records (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    record_date DATE NOT NULL,
    record_time TIME NOT NULL,
    
    -- Emotional struggles (stored as JSON array of selected struggle IDs)
    selected_struggles JSON,
    
    -- Positive moments (stored as JSON array of selected moment IDs)
    selected_positive_moments JSON,
    
    -- Concerning thoughts (stored as JSON array of selected thought IDs)
    selected_concerning_thoughts JSON,
    
    -- Journaling prompts
    grateful_for TEXT,
    proud_of_today TEXT,
    tomorrow_goal TEXT,
    
    -- Additional notes
    additional_notes TEXT,
    
    -- Crisis intervention tracking
    crisis_alert_triggered BOOLEAN DEFAULT FALSE,
    crisis_support_contacted BOOLEAN DEFAULT FALSE,
    crisis_contact_method VARCHAR(100), -- 'hotline', 'emergency', 'local_resources', etc.
    
    -- Metadata
    entered_via_voice BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_emotions (user_id, record_date DESC),
    INDEX idx_crisis_alerts (crisis_alert_triggered, record_date),
    INDEX idx_crisis_support (crisis_support_contacted, record_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- EMOTION CHECK-IN REFERENCE DATA
-- ============================================================================

CREATE TABLE IF NOT EXISTS emotional_struggles_options (
    id VARCHAR(50) PRIMARY KEY,
    text TEXT NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    category ENUM('physical', 'emotional', 'social', 'practical') NOT NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS positive_moments_options (
    id VARCHAR(50) PRIMARY KEY,
    text TEXT NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    category ENUM('bonding', 'achievement', 'support', 'personal') NOT NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS concerning_thoughts_options (
    id VARCHAR(50) PRIMARY KEY,
    text TEXT NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    severity ENUM('moderate', 'high', 'critical') NOT NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_severity (severity, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- CRISIS INTERVENTION TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS crisis_interventions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    checkin_record_id VARCHAR(36),
    intervention_type ENUM('alert_shown', 'hotline_called', 'emergency_called', 'resources_accessed', 'expert_contacted') NOT NULL,
    intervention_details JSON,
    user_response VARCHAR(100), -- 'accepted', 'dismissed', 'completed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (checkin_record_id) REFERENCES emotion_checkin_records(id) ON DELETE SET NULL,
    INDEX idx_user_interventions (user_id, created_at DESC),
    INDEX idx_intervention_type (intervention_type, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INSERT REFERENCE DATA
-- ============================================================================

-- Insert emotional struggles options
INSERT INTO emotional_struggles_options (id, text, emoji, category, sort_order) VALUES
('tired', 'I feel exhausted and overwhelmed', '😴', 'physical', 1),
('sad', 'I feel sad or down more than usual', '😢', 'emotional', 2),
('anxious', 'I feel anxious or worried constantly', '😰', 'emotional', 3),
('guilty', 'I feel guilty about my parenting', '😔', 'emotional', 4),
('isolated', 'I feel disconnected from others', '😞', 'social', 5),
('inadequate', 'I feel like I\'m not good enough as a mother', '😟', 'emotional', 6),
('angry', 'I feel irritable or angry more often', '😠', 'emotional', 7),
('hopeless', 'I feel hopeless about the future', '😰', 'emotional', 8),
('physical-pain', 'I\'m experiencing physical discomfort', '😣', 'physical', 9),
('sleep-deprived', 'I\'m struggling with lack of sleep', '😵', 'physical', 10);

-- Insert positive moments options
INSERT INTO positive_moments_options (id, text, emoji, category, sort_order) VALUES
('bonding', 'I felt a special connection with my baby', '🥰', 'bonding', 1),
('successful-feed', 'I had a successful breastfeeding session', '🌟', 'achievement', 2),
('support', 'I received helpful support from someone', '🤗', 'support', 3),
('proud', 'I felt proud of my progress', '😊', 'personal', 4),
('peaceful', 'I had a moment of peace and calm', '😌', 'personal', 5),
('confident', 'I felt confident in my abilities', '💪', 'personal', 6),
('grateful', 'I felt grateful for this journey', '🙏', 'personal', 7),
('baby-milestone', 'My baby reached a new milestone', '🎉', 'bonding', 8),
('self-care', 'I took time for self-care', '💆‍♀️', 'personal', 9),
('community', 'I connected with other mothers', '👥', 'support', 10);

-- Insert concerning thoughts options
INSERT INTO concerning_thoughts_options (id, text, emoji, severity, sort_order) VALUES
('harm-thoughts', 'I\'ve thought of harming myself or my baby', '🚨', 'critical', 1),
('baby-better-off', 'I think my baby would be better off without me', '💔', 'critical', 2),
('escape-thoughts', 'I have thoughts of running away or escaping', '🏃‍♀️', 'high', 3),
('failure-thoughts', 'I constantly think I\'m failing as a mother', '😞', 'moderate', 4),
('intrusive-thoughts', 'I have scary thoughts I can\'t control', '😨', 'high', 5),
('regret-baby', 'I regret having my baby', '😔', 'high', 6);