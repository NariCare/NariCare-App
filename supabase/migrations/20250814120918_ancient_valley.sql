-- Database Views for NariCare Dashboard
-- Description: Creates optimized views for common dashboard queries
-- Version: 1.0.0
-- Date: 2025-01-27

-- ============================================================================
-- USER DASHBOARD VIEWS
-- ============================================================================

-- Comprehensive user dashboard summary
CREATE OR REPLACE VIEW user_dashboard_summary AS
SELECT 
    u.id as user_id,
    u.first_name,
    u.last_name,
    u.email,
    u.is_onboarding_completed,
    ut.tier_type,
    ut.consultations_remaining,
    ut.start_date as tier_start_date,
    ut.end_date as tier_end_date,
    COUNT(DISTINCT b.id) as total_babies,
    COUNT(DISTINCT gr.id) as total_growth_records,
    COUNT(DISTINCT wr.id) as total_weight_records,
    COUNT(DISTINCT ec.id) as total_emotion_checkins,
    MAX(gr.record_date) as last_growth_record_date,
    MAX(wr.record_date) as last_weight_record_date,
    MAX(ec.record_date) as last_emotion_checkin_date,
    (SELECT COUNT(*) FROM consultations WHERE user_id = u.id AND status = 'scheduled' AND scheduled_at > NOW()) as upcoming_consultations
FROM users u
LEFT JOIN user_tiers ut ON u.id = ut.user_id AND ut.is_active = TRUE
LEFT JOIN babies b ON u.id = b.user_id AND b.is_active = TRUE
LEFT JOIN growth_records gr ON b.id = gr.baby_id
LEFT JOIN weight_records wr ON b.id = wr.baby_id
LEFT JOIN emotion_checkin_records ec ON u.id = ec.user_id
GROUP BY u.id, u.first_name, u.last_name, u.email, u.is_onboarding_completed, 
         ut.tier_type, ut.consultations_remaining, ut.start_date, ut.end_date;

-- Baby growth summary with latest measurements
CREATE OR REPLACE VIEW baby_growth_summary AS
SELECT 
    b.id as baby_id,
    b.user_id,
    b.name as baby_name,
    b.date_of_birth,
    b.gender,
    b.birth_weight,
    b.birth_height,
    b.current_weight,
    b.current_height,
    DATEDIFF(CURDATE(), b.date_of_birth) DIV 7 as age_in_weeks,
    DATEDIFF(CURDATE(), b.date_of_birth) as age_in_days,
    COUNT(DISTINCT gr.id) as total_feed_records,
    COUNT(DISTINCT wr.id) as total_weight_records,
    COUNT(DISTINCT sr.id) as total_stool_records,
    COUNT(DISTINCT pr.id) as total_pumping_records,
    MAX(gr.record_date) as last_feed_date,
    MAX(wr.record_date) as last_weight_date,
    (SELECT weight FROM weight_records WHERE baby_id = b.id ORDER BY record_date DESC LIMIT 1) as latest_weight,
    (SELECT height FROM weight_records WHERE baby_id = b.id AND height IS NOT NULL ORDER BY record_date DESC LIMIT 1) as latest_height,
    (SELECT record_date FROM weight_records WHERE baby_id = b.id ORDER BY record_date DESC LIMIT 1) as latest_weight_date
FROM babies b
LEFT JOIN growth_records gr ON b.id = gr.baby_id
LEFT JOIN weight_records wr ON b.id = wr.baby_id
LEFT JOIN stool_records sr ON b.id = sr.baby_id
LEFT JOIN pumping_records pr ON b.id = pr.baby_id
WHERE b.is_active = TRUE
GROUP BY b.id, b.user_id, b.name, b.date_of_birth, b.gender, b.birth_weight, b.birth_height, b.current_weight, b.current_height;

-- ============================================================================
-- FEEDING ANALYTICS VIEWS
-- ============================================================================

-- Daily feeding summary for babies
CREATE OR REPLACE VIEW daily_feeding_summary AS
SELECT 
    gr.baby_id,
    gr.record_date,
    COUNT(CASE WHEN JSON_CONTAINS(gr.feed_types, '"direct"') THEN 1 END) as direct_feeds,
    COUNT(CASE WHEN JSON_CONTAINS(gr.feed_types, '"expressed"') THEN 1 END) as expressed_feeds,
    COUNT(CASE WHEN JSON_CONTAINS(gr.feed_types, '"formula"') THEN 1 END) as formula_feeds,
    SUM(CASE WHEN gr.expressed_quantity IS NOT NULL THEN gr.expressed_quantity ELSE 0 END) as total_expressed_ml,
    SUM(CASE WHEN gr.formula_quantity IS NOT NULL THEN gr.formula_quantity ELSE 0 END) as total_formula_ml,
    AVG(CASE WHEN gr.direct_duration IS NOT NULL THEN gr.direct_duration END) as avg_direct_duration,
    AVG(CASE WHEN gr.direct_pain_level IS NOT NULL THEN gr.direct_pain_level END) as avg_pain_level,
    COUNT(*) as total_records
FROM growth_records gr
GROUP BY gr.baby_id, gr.record_date;

-- Weekly feeding trends
CREATE OR REPLACE VIEW weekly_feeding_trends AS
SELECT 
    dfs.baby_id,
    YEAR(dfs.record_date) as year,
    WEEK(dfs.record_date) as week,
    AVG(dfs.direct_feeds) as avg_daily_direct_feeds,
    AVG(dfs.expressed_feeds) as avg_daily_expressed_feeds,
    AVG(dfs.formula_feeds) as avg_daily_formula_feeds,
    AVG(dfs.total_expressed_ml) as avg_daily_expressed_ml,
    AVG(dfs.total_formula_ml) as avg_daily_formula_ml,
    AVG(dfs.avg_direct_duration) as avg_feeding_duration,
    AVG(dfs.avg_pain_level) as avg_pain_level,
    COUNT(DISTINCT dfs.record_date) as days_with_records
FROM daily_feeding_summary dfs
GROUP BY dfs.baby_id, YEAR(dfs.record_date), WEEK(dfs.record_date);

-- ============================================================================
-- EMOTIONAL HEALTH VIEWS
-- ============================================================================

-- Emotion check-in trends
CREATE OR REPLACE VIEW emotion_checkin_trends AS
SELECT 
    ec.user_id,
    DATE(ec.record_date) as checkin_date,
    JSON_LENGTH(ec.selected_struggles) as struggles_count,
    JSON_LENGTH(ec.selected_positive_moments) as positive_moments_count,
    JSON_LENGTH(ec.selected_concerning_thoughts) as concerning_thoughts_count,
    ec.crisis_alert_triggered,
    ec.crisis_support_contacted,
    CASE 
        WHEN JSON_LENGTH(ec.selected_concerning_thoughts) > 0 THEN 'high_concern'
        WHEN JSON_LENGTH(ec.selected_struggles) > JSON_LENGTH(ec.selected_positive_moments) THEN 'struggling'
        WHEN JSON_LENGTH(ec.selected_positive_moments) > JSON_LENGTH(ec.selected_struggles) THEN 'positive'
        ELSE 'neutral'
    END as overall_mood_category
FROM emotion_checkin_records ec;

-- Crisis intervention summary
CREATE OR REPLACE VIEW crisis_intervention_summary AS
SELECT 
    u.id as user_id,
    u.first_name,
    u.last_name,
    u.email,
    COUNT(ec.id) as total_concerning_checkins,
    COUNT(CASE WHEN ec.crisis_alert_triggered = TRUE THEN 1 END) as crisis_alerts_triggered,
    COUNT(CASE WHEN ec.crisis_support_contacted = TRUE THEN 1 END) as crisis_support_contacted,
    MAX(ec.record_date) as last_concerning_checkin,
    COUNT(ci.id) as total_interventions,
    MAX(ci.created_at) as last_intervention_date
FROM users u
LEFT JOIN emotion_checkin_records ec ON u.id = ec.user_id AND JSON_LENGTH(ec.selected_concerning_thoughts) > 0
LEFT JOIN crisis_interventions ci ON u.id = ci.user_id
GROUP BY u.id, u.first_name, u.last_name, u.email
HAVING total_concerning_checkins > 0 OR total_interventions > 0;

-- ============================================================================
-- EXPERT AND CONSULTATION VIEWS
-- ============================================================================

-- Expert performance summary
CREATE OR REPLACE VIEW expert_performance_summary AS
SELECT 
    e.id as expert_id,
    u.first_name,
    u.last_name,
    e.credentials,
    e.rating,
    e.total_consultations,
    COUNT(c.id) as consultations_this_month,
    COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_consultations_this_month,
    COUNT(CASE WHEN c.status = 'cancelled' THEN 1 END) as cancelled_consultations_this_month,
    AVG(c.user_rating) as avg_user_rating_this_month,
    COUNT(CASE WHEN c.user_rating >= 4 THEN 1 END) as positive_ratings_this_month
FROM experts e
JOIN users u ON e.user_id = u.id
LEFT JOIN consultations c ON e.id = c.expert_id AND c.created_at >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
WHERE e.is_available = TRUE
GROUP BY e.id, u.first_name, u.last_name, e.credentials, e.rating, e.total_consultations;

-- Consultation scheduling view
CREATE OR REPLACE VIEW consultation_schedule AS
SELECT 
    c.id as consultation_id,
    c.scheduled_at,
    c.duration_minutes,
    c.topic,
    c.status,
    u.first_name as user_first_name,
    u.last_name as user_last_name,
    u.email as user_email,
    eu.first_name as expert_first_name,
    eu.last_name as expert_last_name,
    e.credentials as expert_credentials,
    c.meeting_link,
    c.reminder_sent
FROM consultations c
JOIN users u ON c.user_id = u.id
JOIN experts e ON c.expert_id = e.id
JOIN users eu ON e.user_id = eu.id
WHERE c.status IN ('scheduled', 'in-progress')
ORDER BY c.scheduled_at ASC;

-- ============================================================================
-- GROWTH TRACKING VIEWS
-- ============================================================================

-- Baby weight progression with percentiles
CREATE OR REPLACE VIEW baby_weight_progression AS
SELECT 
    wr.baby_id,
    b.name as baby_name,
    b.gender,
    b.date_of_birth,
    wr.record_date,
    wr.weight,
    wr.height,
    DATEDIFF(wr.record_date, b.date_of_birth) DIV 7 as age_in_weeks,
    -- Percentile calculation would be done in application logic
    wr.notes,
    ROW_NUMBER() OVER (PARTITION BY wr.baby_id ORDER BY wr.record_date ASC) as measurement_sequence
FROM weight_records wr
JOIN babies b ON wr.baby_id = b.id
WHERE b.is_active = TRUE
ORDER BY wr.baby_id, wr.record_date ASC;

-- Recent activity summary for users
CREATE OR REPLACE VIEW user_recent_activity AS
SELECT 
    u.id as user_id,
    'growth_record' as activity_type,
    gr.record_date as activity_date,
    CONCAT('Logged feeding for ', b.name) as activity_description,
    gr.id as record_id
FROM users u
JOIN babies b ON u.id = b.user_id
JOIN growth_records gr ON b.id = gr.baby_id
WHERE gr.record_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)

UNION ALL

SELECT 
    u.id as user_id,
    'weight_record' as activity_type,
    wr.record_date as activity_date,
    CONCAT('Recorded weight for ', b.name, ': ', wr.weight, 'kg') as activity_description,
    wr.id as record_id
FROM users u
JOIN babies b ON u.id = b.user_id
JOIN weight_records wr ON b.id = wr.baby_id
WHERE wr.record_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)

UNION ALL

SELECT 
    u.id as user_id,
    'emotion_checkin' as activity_type,
    ec.record_date as activity_date,
    'Completed emotion check-in' as activity_description,
    ec.id as record_id
FROM users u
JOIN emotion_checkin_records ec ON u.id = ec.user_id
WHERE ec.record_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)

ORDER BY activity_date DESC;