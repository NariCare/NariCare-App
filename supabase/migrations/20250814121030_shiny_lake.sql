-- Database Triggers for Data Integrity
-- Description: Triggers to maintain data consistency and business rules
-- Version: 1.0.0
-- Date: 2025-01-27

DELIMITER //

-- ============================================================================
-- BABY DATA INTEGRITY TRIGGERS
-- ============================================================================

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

-- Prevent deletion of babies with existing records
CREATE TRIGGER prevent_baby_deletion_with_records
    BEFORE DELETE ON babies
    FOR EACH ROW
BEGIN
    DECLARE record_count INT DEFAULT 0;
    
    SELECT COUNT(*) INTO record_count
    FROM growth_records
    WHERE baby_id = OLD.id;
    
    IF record_count > 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Cannot delete baby with existing growth records. Archive instead.';
    END IF;
END//

-- ============================================================================
-- USER TIER MANAGEMENT TRIGGERS
-- ============================================================================

-- Automatically create notification preferences for new users
CREATE TRIGGER create_default_notification_preferences
    AFTER INSERT ON users
    FOR EACH ROW
BEGIN
    INSERT INTO notification_preferences (id, user_id, article_updates, call_reminders, group_messages, growth_reminders, expert_messages)
    VALUES (UUID(), NEW.id, TRUE, TRUE, TRUE, TRUE, TRUE);
END//

-- Update user tier when consultations are used
CREATE TRIGGER update_consultations_remaining
    AFTER UPDATE ON consultations
    FOR EACH ROW
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE user_tiers 
        SET consultations_remaining = GREATEST(0, consultations_remaining - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = NEW.user_id AND is_active = TRUE;
    END IF;
END//

-- ============================================================================
-- EXPERT PERFORMANCE TRIGGERS
-- ============================================================================

-- Update expert statistics when consultation is completed
CREATE TRIGGER update_expert_stats
    AFTER UPDATE ON consultations
    FOR EACH ROW
BEGIN
    DECLARE new_rating DECIMAL(2,1);
    
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Update total consultations
        UPDATE experts 
        SET total_consultations = total_consultations + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.expert_id;
        
        -- Update rating if user provided feedback
        IF NEW.user_rating IS NOT NULL THEN
            SELECT AVG(user_rating) INTO new_rating
            FROM consultations
            WHERE expert_id = NEW.expert_id AND user_rating IS NOT NULL;
            
            UPDATE experts
            SET rating = new_rating,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.expert_id;
        END IF;
    END IF;
END//

-- ============================================================================
-- CRISIS INTERVENTION TRIGGERS
-- ============================================================================

-- Automatically create crisis intervention record when concerning thoughts are detected
CREATE TRIGGER create_crisis_intervention
    AFTER INSERT ON emotion_checkin_records
    FOR EACH ROW
BEGIN
    DECLARE critical_thoughts_count INT DEFAULT 0;
    
    -- Check if any concerning thoughts were selected
    IF NEW.selected_concerning_thoughts IS NOT NULL THEN
        -- Count concerning thoughts (simplified - in real implementation would check severity)
        SET critical_thoughts_count = JSON_LENGTH(NEW.selected_concerning_thoughts);
        
        IF critical_thoughts_count > 0 THEN
            -- Update the record to mark crisis alert as triggered
            UPDATE emotion_checkin_records 
            SET crisis_alert_triggered = TRUE 
            WHERE id = NEW.id;
            
            -- Create crisis intervention record
            INSERT INTO crisis_interventions (id, user_id, checkin_record_id, intervention_type, intervention_details, created_at)
            VALUES (
                UUID(),
                NEW.user_id,
                NEW.id,
                'alert_shown',
                JSON_OBJECT('concerning_thoughts_count', critical_thoughts_count, 'auto_triggered', TRUE),
                CURRENT_TIMESTAMP
            );
        END IF;
    END IF;
END//

-- ============================================================================
-- AUDIT TRIGGERS
-- ============================================================================

-- Audit trigger for user changes
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
            'role', OLD.role,
            'is_onboarding_completed', OLD.is_onboarding_completed
        ),
        JSON_OBJECT(
            'email', NEW.email,
            'first_name', NEW.first_name,
            'last_name', NEW.last_name,
            'role', NEW.role,
            'is_onboarding_completed', NEW.is_onboarding_completed
        ),
        CURRENT_TIMESTAMP
    );
END//

-- Audit trigger for baby data changes
CREATE TRIGGER audit_baby_changes
    AFTER UPDATE ON babies
    FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (id, user_id, action, table_name, record_id, old_values, new_values, created_at)
    VALUES (
        UUID(),
        NEW.user_id,
        'UPDATE',
        'babies',
        NEW.id,
        JSON_OBJECT(
            'name', OLD.name,
            'current_weight', OLD.current_weight,
            'current_height', OLD.current_height,
            'is_active', OLD.is_active
        ),
        JSON_OBJECT(
            'name', NEW.name,
            'current_weight', NEW.current_weight,
            'current_height', NEW.current_height,
            'is_active', NEW.is_active
        ),
        CURRENT_TIMESTAMP
    );
END//

-- ============================================================================
-- NOTIFICATION TRIGGERS
-- ============================================================================

-- Schedule weight reminder when baby hasn't been weighed in a week
CREATE TRIGGER schedule_weight_reminder
    AFTER INSERT ON weight_records
    FOR EACH ROW
BEGIN
    -- Schedule next weight reminder for 7 days from now
    INSERT INTO scheduled_notifications (id, user_id, notification_type, title, body, scheduled_time, created_at)
    VALUES (
        UUID(),
        (SELECT user_id FROM babies WHERE id = NEW.baby_id),
        'weight_reminder',
        'Time to weigh your baby! 📏',
        CONCAT('It\'s been a week since you last recorded ', (SELECT name FROM babies WHERE id = NEW.baby_id), '\'s weight. Regular tracking helps monitor healthy growth!'),
        DATE_ADD(NEW.record_date, INTERVAL 7 DAY),
        CURRENT_TIMESTAMP
    );
END//

-- Schedule consultation reminder
CREATE TRIGGER schedule_consultation_reminder
    AFTER INSERT ON consultations
    FOR EACH ROW
BEGIN
    -- Schedule reminder 24 hours before consultation
    INSERT INTO scheduled_notifications (id, user_id, notification_type, title, body, scheduled_time, created_at)
    VALUES (
        UUID(),
        NEW.user_id,
        'consultation_reminder',
        'Consultation Reminder 📅',
        CONCAT('Your consultation about "', NEW.topic, '" is scheduled for tomorrow. Don\'t forget to prepare any questions you\'d like to discuss!'),
        DATE_SUB(NEW.scheduled_at, INTERVAL 1 DAY),
        CURRENT_TIMESTAMP
    );
    
    -- Schedule reminder 1 hour before consultation
    INSERT INTO scheduled_notifications (id, user_id, notification_type, title, body, scheduled_time, created_at)
    VALUES (
        UUID(),
        NEW.user_id,
        'consultation_reminder_urgent',
        'Consultation Starting Soon! 🎥',
        CONCAT('Your consultation starts in 1 hour. Meeting link: ', COALESCE(NEW.meeting_link, 'Will be provided shortly')),
        DATE_SUB(NEW.scheduled_at, INTERVAL 1 HOUR),
        CURRENT_TIMESTAMP
    );
END//

DELIMITER ;