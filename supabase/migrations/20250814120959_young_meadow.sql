-- Stored Procedures for Growth Analytics
-- Description: Procedures for calculating growth percentiles and analytics
-- Version: 1.0.0
-- Date: 2025-01-27

DELIMITER //

-- ============================================================================
-- GROWTH PERCENTILE CALCULATIONS
-- ============================================================================

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
    DECLARE p10_weight, p25_weight, p50_weight, p75_weight, p90_weight DECIMAL(5,2);
    
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
    
    -- Get WHO percentile data for this age and gender
    SELECT p10, p25, p50, p75, p90 
    INTO p10_weight, p25_weight, p50_weight, p75_weight, p90_weight
    FROM growth_chart_standards
    WHERE standard_type = 'WHO' 
        AND gender = baby_gender_var 
        AND measurement_type = 'weight'
        AND age_in_weeks = age_weeks
    LIMIT 1;
    
    -- Calculate percentile (simplified logic)
    SET percentile_result = CASE 
        WHEN latest_weight IS NULL THEN NULL
        WHEN latest_weight <= p10_weight THEN 10
        WHEN latest_weight <= p25_weight THEN 25
        WHEN latest_weight <= p50_weight THEN 50
        WHEN latest_weight <= p75_weight THEN 75
        WHEN latest_weight <= p90_weight THEN 90
        ELSE 95
    END;
    
END//

-- ============================================================================
-- FEEDING ANALYTICS
-- ============================================================================

-- Procedure to calculate feeding consistency score
CREATE PROCEDURE CalculateFeedingConsistency(
    IN baby_id_param VARCHAR(36),
    IN start_date DATE,
    IN end_date DATE,
    OUT consistency_score DECIMAL(5,2)
)
BEGIN
    DECLARE total_days INT;
    DECLARE days_with_records INT;
    DECLARE avg_daily_feeds DECIMAL(5,2);
    DECLARE target_feeds_per_day DECIMAL(5,2) DEFAULT 8.0; -- WHO recommendation
    
    -- Calculate total days in period
    SET total_days = DATEDIFF(end_date, start_date) + 1;
    
    -- Count days with feeding records
    SELECT COUNT(DISTINCT record_date) INTO days_with_records
    FROM growth_records
    WHERE baby_id = baby_id_param 
        AND record_date BETWEEN start_date AND end_date
        AND JSON_CONTAINS(feed_types, '"direct"');
    
    -- Calculate average daily feeds
    SELECT AVG(daily_feeds) INTO avg_daily_feeds
    FROM (
        SELECT record_date, COUNT(*) as daily_feeds
        FROM growth_records
        WHERE baby_id = baby_id_param 
            AND record_date BETWEEN start_date AND end_date
            AND JSON_CONTAINS(feed_types, '"direct"')
        GROUP BY record_date
    ) daily_counts;
    
    -- Calculate consistency score (0-100)
    SET consistency_score = LEAST(100, 
        (days_with_records / total_days * 50) + 
        (LEAST(avg_daily_feeds, target_feeds_per_day) / target_feeds_per_day * 50)
    );
    
END//

-- ============================================================================
-- EMOTION ANALYTICS
-- ============================================================================

-- Procedure to calculate emotional wellness score
CREATE PROCEDURE CalculateEmotionalWellnessScore(
    IN user_id_param VARCHAR(36),
    IN start_date DATE,
    IN end_date DATE,
    OUT wellness_score DECIMAL(5,2),
    OUT risk_level ENUM('low', 'moderate', 'high', 'critical')
)
BEGIN
    DECLARE total_checkins INT DEFAULT 0;
    DECLARE total_struggles INT DEFAULT 0;
    DECLARE total_positive_moments INT DEFAULT 0;
    DECLARE total_concerning_thoughts INT DEFAULT 0;
    DECLARE crisis_alerts INT DEFAULT 0;
    
    -- Get emotion check-in data for the period
    SELECT 
        COUNT(*),
        COALESCE(SUM(JSON_LENGTH(selected_struggles)), 0),
        COALESCE(SUM(JSON_LENGTH(selected_positive_moments)), 0),
        COALESCE(SUM(JSON_LENGTH(selected_concerning_thoughts)), 0),
        COUNT(CASE WHEN crisis_alert_triggered = TRUE THEN 1 END)
    INTO total_checkins, total_struggles, total_positive_moments, total_concerning_thoughts, crisis_alerts
    FROM emotion_checkin_records
    WHERE user_id = user_id_param 
        AND record_date BETWEEN start_date AND end_date;
    
    -- Calculate wellness score (0-100, higher is better)
    IF total_checkins = 0 THEN
        SET wellness_score = NULL;
        SET risk_level = 'low';
    ELSE
        SET wellness_score = GREATEST(0, 
            50 + 
            (total_positive_moments * 5) - 
            (total_struggles * 3) - 
            (total_concerning_thoughts * 10) -
            (crisis_alerts * 20)
        );
        
        -- Determine risk level
        SET risk_level = CASE
            WHEN crisis_alerts > 0 OR total_concerning_thoughts > 0 THEN 'critical'
            WHEN wellness_score < 30 THEN 'high'
            WHEN wellness_score < 60 THEN 'moderate'
            ELSE 'low'
        END;
    END IF;
    
END//

-- ============================================================================
-- DATA CLEANUP AND MAINTENANCE
-- ============================================================================

-- Procedure to clean up old data
CREATE PROCEDURE CleanupOldData(IN days_to_keep INT)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Clean up old audit logs (keep 1 year by default)
    DELETE FROM audit_logs 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL COALESCE(days_to_keep, 365) DAY);
    
    -- Clean up old app usage logs (keep 90 days by default)
    DELETE FROM app_usage_logs 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL COALESCE(days_to_keep, 90) DAY);
    
    -- Clean up sent notifications older than 30 days
    DELETE FROM scheduled_notifications 
    WHERE is_sent = TRUE AND sent_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
    
    -- Clean up inactive notification tokens older than 6 months
    DELETE FROM push_notification_tokens 
    WHERE is_active = FALSE AND updated_at < DATE_SUB(NOW(), INTERVAL 180 DAY);
    
    COMMIT;
    
    SELECT CONCAT('Cleanup completed. Removed data older than ', COALESCE(days_to_keep, 365), ' days.') as result;
    
END//

-- ============================================================================
-- REPORTING PROCEDURES
-- ============================================================================

-- Procedure to generate user engagement report
CREATE PROCEDURE GenerateUserEngagementReport(
    IN start_date DATE,
    IN end_date DATE
)
BEGIN
    SELECT 
        'User Engagement Report' as report_title,
        start_date as report_start_date,
        end_date as report_end_date,
        COUNT(DISTINCT u.id) as total_active_users,
        COUNT(DISTINCT gr.recorded_by) as users_with_growth_records,
        COUNT(DISTINCT ec.user_id) as users_with_emotion_checkins,
        COUNT(DISTINCT c.user_id) as users_with_consultations,
        AVG(daily_records.records_per_user) as avg_records_per_user
    FROM users u
    LEFT JOIN growth_records gr ON u.id = gr.recorded_by AND gr.record_date BETWEEN start_date AND end_date
    LEFT JOIN emotion_checkin_records ec ON u.id = ec.user_id AND ec.record_date BETWEEN start_date AND end_date
    LEFT JOIN consultations c ON u.id = c.user_id AND DATE(c.scheduled_at) BETWEEN start_date AND end_date
    LEFT JOIN (
        SELECT recorded_by, COUNT(*) as records_per_user
        FROM growth_records
        WHERE record_date BETWEEN start_date AND end_date
        GROUP BY recorded_by
    ) daily_records ON u.id = daily_records.recorded_by;
    
END//

DELIMITER ;