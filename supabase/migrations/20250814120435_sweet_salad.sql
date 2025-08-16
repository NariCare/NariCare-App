-- NariCare Application MySQL Schema
-- Comprehensive database schema for breastfeeding support application
-- Generated: 2025-01-27

-- ============================================================================
-- USERS AND AUTHENTICATION
-- ============================================================================

CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    profile_image_url TEXT,
    role ENUM('user', 'expert', 'admin') DEFAULT 'user',
    is_onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_created_at (created_at)
);

-- ============================================================================
-- USER TIERS AND SUBSCRIPTIONS
-- ============================================================================

CREATE TABLE user_tiers (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    tier_type ENUM('basic', 'one-month', 'three-month') DEFAULT 'basic',
    start_date DATE NOT NULL,
    end_date DATE,
    consultations_remaining INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_tier (user_id, tier_type),
    INDEX idx_active_tiers (is_active, end_date)
);

CREATE TABLE tier_features (
    id VARCHAR(36) PRIMARY KEY,
    tier_type ENUM('basic', 'one-month', 'three-month') NOT NULL,
    feature_name VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    
    UNIQUE KEY unique_tier_feature (tier_type, feature_name),
    INDEX idx_tier_features (tier_type)
);

-- ============================================================================
-- NOTIFICATION PREFERENCES
-- ============================================================================

CREATE TABLE notification_preferences (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    article_updates BOOLEAN DEFAULT TRUE,
    call_reminders BOOLEAN DEFAULT TRUE,
    group_messages BOOLEAN DEFAULT TRUE,
    growth_reminders BOOLEAN DEFAULT TRUE,
    expert_messages BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_preferences (user_id)
);

-- ============================================================================
-- BABIES AND FAMILY MANAGEMENT
-- ============================================================================

CREATE TABLE babies (
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
);

-- ============================================================================
-- GROWTH AND FEEDING TRACKING
-- ============================================================================

CREATE TABLE growth_records (
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
    INDEX idx_user_records (recorded_by, record_date DESC),
    INDEX idx_feed_types (baby_id, (CAST(feed_types AS CHAR(255))))
);

CREATE TABLE weight_records (
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
);

CREATE TABLE stool_records (
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
);

CREATE TABLE diaper_change_records (
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
);

CREATE TABLE pumping_records (
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
);

-- ============================================================================
-- EMOTION CHECK-IN TRACKING
-- ============================================================================

CREATE TABLE emotion_checkin_records (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    record_date DATE NOT NULL,
    record_time TIME NOT NULL,
    
    -- Emotional struggles (stored as JSON array)
    selected_struggles JSON,
    
    -- Positive moments (stored as JSON array)
    selected_positive_moments JSON,
    
    -- Concerning thoughts (stored as JSON array)
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
    
    -- Metadata
    entered_via_voice BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_emotions (user_id, record_date DESC),
    INDEX idx_crisis_alerts (crisis_alert_triggered, record_date)
);

-- ============================================================================
-- KNOWLEDGE BASE AND ARTICLES
-- ============================================================================

CREATE TABLE article_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7), -- hex color
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE articles (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    content JSON NOT NULL, -- Structured content with sections
    category_id VARCHAR(50) NOT NULL,
    author VARCHAR(100) NOT NULL,
    read_time_minutes TINYINT NOT NULL,
    difficulty ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
    is_featured BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    published_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES article_categories(id) ON DELETE CASCADE,
    INDEX idx_category_articles (category_id, published_at DESC),
    INDEX idx_featured_articles (is_featured, published_at DESC),
    INDEX idx_difficulty (difficulty),
    FULLTEXT idx_article_search (title, summary)
);

CREATE TABLE article_tags (
    id VARCHAR(36) PRIMARY KEY,
    article_id VARCHAR(50) NOT NULL,
    tag_name VARCHAR(50) NOT NULL,
    
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_article_tag (article_id, tag_name),
    INDEX idx_tag_search (tag_name)
);

CREATE TABLE user_bookmarks (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    article_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_bookmark (user_id, article_id),
    INDEX idx_user_bookmarks (user_id, created_at DESC)
);

-- ============================================================================
-- CHAT AND MESSAGING
-- ============================================================================

CREATE TABLE chat_rooms (
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
);

CREATE TABLE chat_room_participants (
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
);

CREATE TABLE chat_messages (
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
);

CREATE TABLE message_attachments (
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
);

-- ============================================================================
-- CHATBOT AND AI INTERACTIONS
-- ============================================================================

CREATE TABLE chatbot_conversations (
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
);

CREATE TABLE chatbot_messages (
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
);

-- ============================================================================
-- EXPERT CONSULTATIONS
-- ============================================================================

CREATE TABLE experts (
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
);

CREATE TABLE expert_specialties (
    id VARCHAR(36) PRIMARY KEY,
    expert_id VARCHAR(36) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    
    FOREIGN KEY (expert_id) REFERENCES experts(id) ON DELETE CASCADE,
    UNIQUE KEY unique_expert_specialty (expert_id, specialty),
    INDEX idx_specialty_search (specialty)
);

CREATE TABLE expert_availability (
    id VARCHAR(36) PRIMARY KEY,
    expert_id VARCHAR(36) NOT NULL,
    day_of_week TINYINT NOT NULL, -- 0=Sunday, 1=Monday, etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (expert_id) REFERENCES experts(id) ON DELETE CASCADE,
    INDEX idx_expert_schedule (expert_id, day_of_week, is_available)
);

CREATE TABLE consultations (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (expert_id) REFERENCES experts(id) ON DELETE CASCADE,
    INDEX idx_user_consultations (user_id, scheduled_at DESC),
    INDEX idx_expert_consultations (expert_id, scheduled_at DESC),
    INDEX idx_consultation_status (status, scheduled_at),
    INDEX idx_reminders (reminder_sent, scheduled_at)
);

-- ============================================================================
-- BABY TIMELINE AND MILESTONES
-- ============================================================================

CREATE TABLE baby_timeline_items (
    id VARCHAR(50) PRIMARY KEY,
    week_start TINYINT NOT NULL,
    week_end TINYINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    short_title VARCHAR(100),
    description TEXT NOT NULL,
    category ENUM('feeding', 'development', 'sleep', 'health', 'milestone') NOT NULL,
    icon VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL, -- hex color
    what_to_expect JSON,
    tips JSON,
    when_to_worry JSON,
    video_links JSON,
    cdc_milestones JSON,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    INDEX idx_week_range (week_start, week_end),
    INDEX idx_category (category),
    INDEX idx_timeline_order (week_start, sort_order)
);

CREATE TABLE user_timeline_progress (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    baby_id VARCHAR(36) NOT NULL,
    timeline_item_id VARCHAR(50) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE,
    FOREIGN KEY (timeline_item_id) REFERENCES baby_timeline_items(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_timeline (user_id, baby_id, timeline_item_id),
    INDEX idx_baby_progress (baby_id, is_completed)
);

-- ============================================================================
-- NOTIFICATIONS AND MESSAGING
-- ============================================================================

CREATE TABLE push_notification_tokens (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token VARCHAR(255) NOT NULL,
    platform ENUM('ios', 'android', 'web') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_token (user_id, token),
    INDEX idx_active_tokens (is_active, platform)
);

CREATE TABLE scheduled_notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    scheduled_time TIMESTAMP NOT NULL,
    sent_at TIMESTAMP NULL,
    is_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_scheduled_notifications (scheduled_time, is_sent),
    INDEX idx_user_notifications (user_id, scheduled_time DESC)
);

-- ============================================================================
-- ANALYTICS AND INSIGHTS
-- ============================================================================

CREATE TABLE user_analytics (
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
);

CREATE TABLE app_usage_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    session_id VARCHAR(36),
    action_type VARCHAR(50) NOT NULL,
    page_path VARCHAR(255),
    additional_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_usage (user_id, created_at DESC),
    INDEX idx_action_analytics (action_type, created_at DESC)
);

-- ============================================================================
-- GROWTH CHART DATA (WHO/CDC Standards)
-- ============================================================================

CREATE TABLE growth_chart_standards (
    id VARCHAR(36) PRIMARY KEY,
    standard_type ENUM('WHO', 'CDC') NOT NULL,
    gender ENUM('male', 'female') NOT NULL,
    measurement_type ENUM('weight', 'length', 'head-circumference') NOT NULL,
    age_in_weeks SMALLINT NOT NULL,
    p3 DECIMAL(5,2) NOT NULL,
    p5 DECIMAL(5,2) NOT NULL,
    p10 DECIMAL(5,2) NOT NULL,
    p25 DECIMAL(5,2) NOT NULL,
    p50 DECIMAL(5,2) NOT NULL,
    p75 DECIMAL(5,2) NOT NULL,
    p90 DECIMAL(5,2) NOT NULL,
    p95 DECIMAL(5,2) NOT NULL,
    p97 DECIMAL(5,2) NOT NULL,
    
    UNIQUE KEY unique_standard_point (standard_type, gender, measurement_type, age_in_weeks),
    INDEX idx_chart_lookup (standard_type, gender, measurement_type, age_in_weeks)
);

-- ============================================================================
-- SYSTEM CONFIGURATION
-- ============================================================================

CREATE TABLE app_settings (
    id VARCHAR(36) PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_public_settings (is_public)
);

-- ============================================================================
-- AUDIT AND SECURITY
-- ============================================================================

CREATE TABLE audit_logs (
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
);

-- ============================================================================
-- INITIAL DATA INSERTS
-- ============================================================================

-- Insert default tier features
INSERT INTO tier_features (id, tier_type, feature_name, is_enabled) VALUES
(UUID(), 'basic', 'knowledge-base', TRUE),
(UUID(), 'basic', 'group-chat', TRUE),
(UUID(), 'one-month', 'knowledge-base', TRUE),
(UUID(), 'one-month', 'group-chat', TRUE),
(UUID(), 'one-month', 'expert-consultation', TRUE),
(UUID(), 'one-month', 'growth-tracking', TRUE),
(UUID(), 'one-month', 'ai-chatbot', TRUE),
(UUID(), 'three-month', 'knowledge-base', TRUE),
(UUID(), 'three-month', 'group-chat', TRUE),
(UUID(), 'three-month', 'expert-consultation', TRUE),
(UUID(), 'three-month', 'growth-tracking', TRUE),
(UUID(), 'three-month', 'ai-chatbot', TRUE),
(UUID(), 'three-month', 'priority-support', TRUE),
(UUID(), 'three-month', 'timeline', TRUE);

-- Insert article categories
INSERT INTO article_categories (id, name, description, icon, color, sort_order) VALUES
('postpartum-early-days', 'Postpartum & Early Days', 'Essential information for the first days after delivery', 'heart', '#e91e63', 1),
('breastfeeding-techniques', 'Breastfeeding Techniques', 'Proper positioning, latching, and feeding techniques', 'baby', '#26a69a', 2),
('milk-supply-production', 'Milk Supply & Production', 'Understanding milk production and supply issues', 'water', '#42a5f5', 3),
('common-challenges', 'Common Challenges', 'Solutions for common breastfeeding problems', 'help-circle', '#ff7043', 4),
('baby-health-growth', 'Baby Health & Growth', 'Monitoring your baby\'s health and development', 'trending-up', '#4caf50', 5),
('preparation-planning', 'Preparation & Planning', 'Getting ready for your breastfeeding journey', 'calendar', '#9c27b0', 6);

-- Insert default chat rooms
INSERT INTO chat_rooms (id, name, description, room_type, topic, is_private, max_participants) VALUES
(UUID(), 'Newborn Support Group', 'Support for mothers with newborns (0-3 months)', 'general', 'newborn', FALSE, 20),
(UUID(), 'Pumping Moms Unite', 'Tips and support for pumping mothers', 'general', 'pumping', FALSE, 20),
(UUID(), 'Twin Baby Support', 'Special support for mothers of twins', 'general', 'twins', FALSE, 20),
(UUID(), 'Breastfeeding Achievements', 'Celebrate your breastfeeding milestones and victories', 'general', 'achievements', FALSE, 20),
(UUID(), 'Working Moms Support', 'Support for mothers returning to work while breastfeeding', 'general', 'work', FALSE, 20);

-- Insert app settings
INSERT INTO app_settings (id, setting_key, setting_value, setting_type, description, is_public) VALUES
(UUID(), 'app_version', '1.0.0', 'string', 'Current application version', TRUE),
(UUID(), 'maintenance_mode', 'false', 'boolean', 'Application maintenance mode', TRUE),
(UUID(), 'max_file_upload_size', '10485760', 'number', 'Maximum file upload size in bytes (10MB)', FALSE),
(UUID(), 'openai_model', 'gpt-4-turbo', 'string', 'OpenAI model for chatbot', FALSE),
(UUID(), 'consultation_duration_default', '30', 'number', 'Default consultation duration in minutes', FALSE);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Composite indexes for common queries
CREATE INDEX idx_baby_growth_tracking ON growth_records (baby_id, record_date DESC, feed_types(50));
CREATE INDEX idx_user_baby_records ON growth_records (recorded_by, baby_id, record_date DESC);
CREATE INDEX idx_weight_tracking ON weight_records (baby_id, record_date DESC, weight);
CREATE INDEX idx_recent_messages ON chat_messages (room_id, created_at DESC) USING BTREE;
CREATE INDEX idx_consultation_scheduling ON consultations (expert_id, status, scheduled_at);
CREATE INDEX idx_emotion_trends ON emotion_checkin_records (user_id, record_date DESC, crisis_alert_triggered);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for user dashboard summary
CREATE VIEW user_dashboard_summary AS
SELECT 
    u.id as user_id,
    u.first_name,
    u.last_name,
    ut.tier_type,
    ut.consultations_remaining,
    COUNT(DISTINCT b.id) as total_babies,
    COUNT(DISTINCT gr.id) as total_growth_records,
    COUNT(DISTINCT wr.id) as total_weight_records,
    MAX(gr.record_date) as last_growth_record_date,
    MAX(wr.record_date) as last_weight_record_date
FROM users u
LEFT JOIN user_tiers ut ON u.id = ut.user_id AND ut.is_active = TRUE
LEFT JOIN babies b ON u.id = b.user_id AND b.is_active = TRUE
LEFT JOIN growth_records gr ON b.id = gr.baby_id
LEFT JOIN weight_records wr ON b.id = wr.baby_id
GROUP BY u.id, u.first_name, u.last_name, ut.tier_type, ut.consultations_remaining;

-- View for baby growth summary
CREATE VIEW baby_growth_summary AS
SELECT 
    b.id as baby_id,
    b.name as baby_name,
    b.date_of_birth,
    b.gender,
    b.birth_weight,
    b.current_weight,
    DATEDIFF(CURDATE(), b.date_of_birth) DIV 7 as age_in_weeks,
    COUNT(DISTINCT gr.id) as total_feed_records,
    COUNT(DISTINCT wr.id) as total_weight_records,
    MAX(gr.record_date) as last_feed_date,
    MAX(wr.record_date) as last_weight_date,
    (SELECT weight FROM weight_records WHERE baby_id = b.id ORDER BY record_date DESC LIMIT 1) as latest_weight
FROM babies b
LEFT JOIN growth_records gr ON b.id = gr.baby_id
LEFT JOIN weight_records wr ON b.id = wr.baby_id
WHERE b.is_active = TRUE
GROUP BY b.id, b.name, b.date_of_birth, b.gender, b.birth_weight, b.current_weight;

-- ============================================================================
-- TRIGGERS FOR DATA INTEGRITY
-- ============================================================================

DELIMITER //

-- Update baby's current weight when new weight record is added
CREATE TRIGGER update_baby_current_weight
    AFTER INSERT ON weight_records
    FOR EACH ROW
BEGIN
    UPDATE babies 
    SET current_weight = NEW.weight,
        current_height = COALESCE(NEW.height, current_height),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.baby_id;
END//

-- Update expert rating when consultation is completed
CREATE TRIGGER update_expert_stats
    AFTER UPDATE ON consultations
    FOR EACH ROW
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE experts 
        SET total_consultations = total_consultations + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.expert_id;
    END IF;
END//

-- Audit trigger for sensitive data changes
CREATE TRIGGER audit_user_changes
    AFTER UPDATE ON users
    FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (id, user_id, action, table_name, record_id, old_values, new_values, created_at)
    VALUES (
        UUID(),
        NEW.id,
        'UPDATE',
        'users',
        NEW.id,
        JSON_OBJECT(
            'email', OLD.email,
            'first_name', OLD.first_name,
            'last_name', OLD.last_name,
            'role', OLD.role
        ),
        JSON_OBJECT(
            'email', NEW.email,
            'first_name', NEW.first_name,
            'last_name', NEW.last_name,
            'role', NEW.role
        ),
        CURRENT_TIMESTAMP
    );
END//

DELIMITER ;

-- ============================================================================
-- STORED PROCEDURES FOR COMMON OPERATIONS
-- ============================================================================

DELIMITER //

-- Procedure to get baby's growth percentile
CREATE PROCEDURE GetBabyGrowthPercentile(
    IN baby_id_param VARCHAR(36),
    IN measurement_date DATE,
    OUT percentile_result DECIMAL(5,2)
)
BEGIN
    DECLARE baby_gender_var ENUM('male', 'female');
    DECLARE baby_birth_date DATE;
    DECLARE age_weeks INT;
    DECLARE latest_weight DECIMAL(4,2);
    
    -- Get baby info
    SELECT gender, date_of_birth INTO baby_gender_var, baby_birth_date
    FROM babies WHERE id = baby_id_param;
    
    -- Calculate age in weeks
    SET age_weeks = FLOOR(DATEDIFF(measurement_date, baby_birth_date) / 7);
    
    -- Get latest weight
    SELECT weight INTO latest_weight
    FROM weight_records 
    WHERE baby_id = baby_id_param AND record_date <= measurement_date
    ORDER BY record_date DESC 
    LIMIT 1;
    
    -- Calculate percentile (simplified logic - would need more complex interpolation)
    SELECT 
        CASE 
            WHEN latest_weight <= p10 THEN 10
            WHEN latest_weight <= p25 THEN 25
            WHEN latest_weight <= p50 THEN 50
            WHEN latest_weight <= p75 THEN 75
            WHEN latest_weight <= p90 THEN 90
            ELSE 95
        END INTO percentile_result
    FROM growth_chart_standards
    WHERE standard_type = 'WHO' 
        AND gender = baby_gender_var 
        AND measurement_type = 'weight'
        AND age_in_weeks = age_weeks
    LIMIT 1;
    
END//

-- Procedure to clean up old data
CREATE PROCEDURE CleanupOldData(IN days_to_keep INT)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Clean up old audit logs
    DELETE FROM audit_logs 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);
    
    -- Clean up old app usage logs
    DELETE FROM app_usage_logs 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);
    
    -- Clean up sent notifications older than 30 days
    DELETE FROM scheduled_notifications 
    WHERE is_sent = TRUE AND sent_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
    
    COMMIT;
END//

DELIMITER ;

-- ============================================================================
-- SAMPLE DATA FOR DEVELOPMENT
-- ============================================================================

-- Note: In production, this section would be removed or moved to a separate file
-- This is included for development and testing purposes

-- Sample users (passwords would be properly hashed in real implementation)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_onboarding_completed) VALUES
(UUID(), 'demo@naricare.app', '$2b$10$example_hash', 'Demo', 'User', 'user', TRUE),
(UUID(), 'expert@naricare.app', '$2b$10$example_hash', 'Dr. Sarah', 'Johnson', 'expert', TRUE),
(UUID(), 'admin@naricare.app', '$2b$10$example_hash', 'Admin', 'User', 'admin', TRUE);

-- ============================================================================
-- PERFORMANCE OPTIMIZATION NOTES
-- ============================================================================

/*
Performance Considerations:

1. Partitioning Strategy:
   - Consider partitioning large tables like growth_records, chat_messages by date
   - Example: PARTITION BY RANGE (YEAR(record_date))

2. Archival Strategy:
   - Move old records to archive tables after 2+ years
   - Keep recent data in main tables for performance

3. Caching Strategy:
   - Cache frequently accessed data like article categories, chat rooms
   - Use Redis for session management and real-time features

4. Monitoring:
   - Monitor slow queries and add indexes as needed
   - Track table growth and implement data retention policies

5. Backup Strategy:
   - Daily backups with point-in-time recovery
   - Test restore procedures regularly
*/