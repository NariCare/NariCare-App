-- Migration: Notifications and Analytics System
-- Description: Creates tables for push notifications, analytics, and system monitoring
-- Version: 1.0.0
-- Date: 2025-01-27

-- ============================================================================
-- NOTIFICATIONS AND MESSAGING
-- ============================================================================

CREATE TABLE IF NOT EXISTS push_notification_tokens (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token VARCHAR(255) NOT NULL,
    platform ENUM('ios', 'android', 'web') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_token (user_id, token),
    INDEX idx_active_tokens (is_active, platform),
    INDEX idx_token_usage (last_used_at, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    scheduled_time TIMESTAMP NOT NULL,
    sent_at TIMESTAMP NULL,
    is_sent BOOLEAN DEFAULT FALSE,
    delivery_status ENUM('pending', 'sent', 'delivered', 'failed') DEFAULT 'pending',
    error_message TEXT,
    retry_count TINYINT DEFAULT 0,
    max_retries TINYINT DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_scheduled_notifications (scheduled_time, is_sent),
    INDEX idx_user_notifications (user_id, scheduled_time DESC),
    INDEX idx_failed_notifications (delivery_status, retry_count, scheduled_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ANALYTICS AND INSIGHTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_analytics (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    metric_date DATE NOT NULL,
    additional_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_metric_date (user_id, metric_name, metric_date),
    INDEX idx_user_metrics (user_id, metric_name, metric_date DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_usage_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    session_id VARCHAR(36),
    action_type VARCHAR(50) NOT NULL,
    page_path VARCHAR(255),
    feature_used VARCHAR(100),
    duration_seconds INT,
    additional_data JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_usage (user_id, created_at DESC),
    INDEX idx_action_analytics (action_type, created_at DESC),
    INDEX idx_feature_usage (feature_used, created_at DESC),
    INDEX idx_session_tracking (session_id, created_at ASC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS feature_usage_stats (
    id VARCHAR(36) PRIMARY KEY,
    feature_name VARCHAR(100) NOT NULL,
    usage_date DATE NOT NULL,
    total_users INT DEFAULT 0,
    total_sessions INT DEFAULT 0,
    avg_duration_seconds DECIMAL(8,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_feature_date (feature_name, usage_date),
    INDEX idx_feature_stats (feature_name, usage_date DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SYSTEM CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_settings (
    id VARCHAR(36) PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    category VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_public_settings (is_public),
    INDEX idx_setting_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- AUDIT AND SECURITY
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id VARCHAR(36),
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_audit (user_id, created_at DESC),
    INDEX idx_table_audit (table_name, record_id, created_at DESC),
    INDEX idx_action_audit (action, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INSERT INITIAL SETTINGS
-- ============================================================================

INSERT INTO app_settings (id, setting_key, setting_value, setting_type, description, is_public, category) VALUES
(UUID(), 'app_version', '1.0.0', 'string', 'Current application version', TRUE, 'app'),
(UUID(), 'maintenance_mode', 'false', 'boolean', 'Application maintenance mode', TRUE, 'app'),
(UUID(), 'max_file_upload_size', '10485760', 'number', 'Maximum file upload size in bytes (10MB)', FALSE, 'uploads'),
(UUID(), 'openai_model', 'gpt-4-turbo', 'string', 'OpenAI model for chatbot', FALSE, 'ai'),
(UUID(), 'consultation_duration_default', '30', 'number', 'Default consultation duration in minutes', FALSE, 'consultations'),
(UUID(), 'weight_reminder_frequency_days', '7', 'number', 'Days between weight tracking reminders', FALSE, 'reminders'),
(UUID(), 'crisis_hotline_number', '988', 'string', 'Crisis hotline number for emergency support', FALSE, 'crisis'),
(UUID(), 'emergency_number', '911', 'string', 'Emergency services number', FALSE, 'crisis'),
(UUID(), 'postpartum_resources_url', 'https://www.postpartum.net/get-help/locations/', 'string', 'URL for local mental health resources', FALSE, 'crisis');