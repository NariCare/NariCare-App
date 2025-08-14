-- Migration: Babies and Growth Tracking Tables
-- Description: Creates tables for baby management and growth tracking
-- Version: 1.0.0
-- Date: 2025-01-27

-- ============================================================================
-- BABIES AND FAMILY MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS babies (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender ENUM('male', 'female', 'other') NOT NULL,
    birth_weight DECIMAL(4,2) NOT NULL, -- in kg
    birth_height DECIMAL(5,2) NOT NULL, -- in cm
    current_weight DECIMAL(4,2),
    current_height DECIMAL(5,2),
    profile_image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_babies (user_id, is_active),
    INDEX idx_birth_date (date_of_birth)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- GROWTH AND FEEDING TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS growth_records (
    id VARCHAR(36) PRIMARY KEY,
    baby_id VARCHAR(36) NOT NULL,
    recorded_by VARCHAR(36) NOT NULL,
    record_date DATE NOT NULL,
    feed_types JSON NOT NULL, -- Array of 'direct', 'expressed', 'formula'
    
    -- Direct feeding details
    direct_start_time TIME,
    direct_breast_side ENUM('left', 'right', 'both'),
    direct_duration INT, -- minutes
    direct_pain_level TINYINT, -- 0-4 scale
    
    -- Expressed milk details
    expressed_quantity INT, -- ml
    
    -- Formula details
    formula_quantity INT, -- ml
    
    -- Additional tracking
    notes TEXT,
    entered_via_voice BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_baby_records (baby_id, record_date DESC),
    INDEX idx_user_records (recorded_by, record_date DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS weight_records (
    id VARCHAR(36) PRIMARY KEY,
    baby_id VARCHAR(36) NOT NULL,
    recorded_by VARCHAR(36) NOT NULL,
    record_date DATE NOT NULL,
    weight DECIMAL(4,2) NOT NULL, -- in kg
    height DECIMAL(5,2), -- in cm
    notes TEXT,
    reminder_sent BOOLEAN DEFAULT FALSE,
    entered_via_voice BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_baby_weight (baby_id, record_date DESC),
    INDEX idx_weight_reminders (reminder_sent, record_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stool_records (
    id VARCHAR(36) PRIMARY KEY,
    baby_id VARCHAR(36) NOT NULL,
    recorded_by VARCHAR(36) NOT NULL,
    record_date DATE NOT NULL,
    record_time TIME NOT NULL,
    stool_color ENUM('very-dark', 'dark-green', 'dark-brown', 'mustard-yellow', 'other') NOT NULL,
    stool_texture ENUM('liquid', 'pasty', 'hard', 'snotty', 'bloody') NOT NULL,
    stool_size ENUM('coin', 'tablespoon', 'bigger') NOT NULL,
    pee_count TINYINT,
    poop_count TINYINT,
    notes TEXT,
    entered_via_voice BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_baby_stool (baby_id, record_date DESC),
    INDEX idx_stool_patterns (baby_id, stool_color, stool_texture)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS diaper_change_records (
    id VARCHAR(36) PRIMARY KEY,
    baby_id VARCHAR(36) NOT NULL,
    recorded_by VARCHAR(36) NOT NULL,
    record_date DATE NOT NULL,
    record_time TIME NOT NULL,
    change_type ENUM('pee', 'poop', 'both') NOT NULL,
    wetness_level ENUM('light', 'medium', 'heavy'),
    notes TEXT,
    entered_via_voice BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_baby_diapers (baby_id, record_date DESC),
    INDEX idx_diaper_type (baby_id, change_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pumping_records (
    id VARCHAR(36) PRIMARY KEY,
    baby_id VARCHAR(36) NOT NULL,
    recorded_by VARCHAR(36) NOT NULL,
    record_date DATE NOT NULL,
    record_time TIME NOT NULL,
    pumping_side ENUM('left', 'right', 'both') NOT NULL,
    total_output INT NOT NULL, -- ml
    duration_minutes INT,
    start_time TIME,
    end_time TIME,
    notes TEXT,
    entered_via_voice BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_baby_pumping (baby_id, record_date DESC),
    INDEX idx_pumping_output (baby_id, total_output)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;