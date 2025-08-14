-- Sample Data for Development Environment
-- Description: Inserts sample data for testing and development
-- Version: 1.0.0
-- Date: 2025-01-27
-- WARNING: This file should NOT be run in production!

-- ============================================================================
-- SAMPLE USERS
-- ============================================================================

-- Insert sample users (passwords are hashed versions of 'password123')
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_onboarding_completed) VALUES
('demo-user-001', 'demo@naricare.app', '$2b$10$rOvHPGkwQGKlLQjQjQjQjOJ8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8', 'Emma', 'Johnson', 'user', TRUE),
('demo-user-002', 'sarah@naricare.app', '$2b$10$rOvHPGkwQGKlLQjQjQjQjOJ8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8', 'Sarah', 'Williams', 'user', TRUE),
('demo-expert-001', 'expert1@naricare.app', '$2b$10$rOvHPGkwQGKlLQjQjQjQjOJ8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8', 'Dr. Sarah', 'Johnson', 'expert', TRUE),
('demo-expert-002', 'expert2@naricare.app', '$2b$10$rOvHPGkwQGKlLQjQjQjQjOJ8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8', 'Lisa', 'Martinez', 'expert', TRUE),
('demo-admin-001', 'admin@naricare.app', '$2b$10$rOvHPGkwQGKlLQjQjQjQjOJ8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8', 'Admin', 'User', 'admin', TRUE);

-- ============================================================================
-- SAMPLE USER TIERS
-- ============================================================================

INSERT INTO user_tiers (id, user_id, tier_type, start_date, consultations_remaining, is_active) VALUES
(UUID(), 'demo-user-001', 'one-month', CURDATE(), 2, TRUE),
(UUID(), 'demo-user-002', 'three-month', CURDATE(), 6, TRUE);

-- ============================================================================
-- SAMPLE BABIES
-- ============================================================================

INSERT INTO babies (id, user_id, name, date_of_birth, gender, birth_weight, birth_height, current_weight, current_height) VALUES
('demo-baby-001', 'demo-user-001', 'Emma', DATE_SUB(CURDATE(), INTERVAL 45 DAY), 'female', 3.20, 50.0, 4.50, 55.0),
('demo-baby-002', 'demo-user-001', 'Oliver', DATE_SUB(CURDATE(), INTERVAL 120 DAY), 'male', 3.50, 52.0, 6.20, 62.0),
('demo-baby-003', 'demo-user-002', 'Sophia', DATE_SUB(CURDATE(), INTERVAL 30 DAY), 'female', 3.10, 49.0, 4.20, 53.0);

-- ============================================================================
-- SAMPLE EXPERTS
-- ============================================================================

INSERT INTO experts (id, user_id, credentials, bio, rating, total_consultations, is_available) VALUES
('demo-expert-001', 'demo-expert-001', 'IBCLC, RN, MSN', 'Certified lactation consultant with 15+ years of experience helping new mothers. Specializes in newborn care and early breastfeeding challenges.', 4.9, 1250, TRUE),
('demo-expert-002', 'demo-expert-002', 'IBCLC, CLC', 'Passionate about supporting working mothers. Expert in pumping strategies and maintaining milk supply while returning to work.', 4.8, 890, TRUE);

-- Insert expert specialties
INSERT INTO expert_specialties (id, expert_id, specialty) VALUES
(UUID(), 'demo-expert-001', 'Newborn Care'),
(UUID(), 'demo-expert-001', 'Latching Issues'),
(UUID(), 'demo-expert-001', 'Milk Supply'),
(UUID(), 'demo-expert-002', 'Pumping Support'),
(UUID(), 'demo-expert-002', 'Return to Work'),
(UUID(), 'demo-expert-002', 'Supply Issues');

-- Insert expert availability
INSERT INTO expert_availability (id, expert_id, day_of_week, start_time, end_time, is_available) VALUES
(UUID(), 'demo-expert-001', 1, '09:00:00', '17:00:00', TRUE),
(UUID(), 'demo-expert-001', 2, '09:00:00', '17:00:00', TRUE),
(UUID(), 'demo-expert-001', 3, '09:00:00', '17:00:00', TRUE),
(UUID(), 'demo-expert-001', 4, '09:00:00', '17:00:00', TRUE),
(UUID(), 'demo-expert-001', 5, '09:00:00', '15:00:00', TRUE),
(UUID(), 'demo-expert-002', 1, '10:00:00', '18:00:00', TRUE),
(UUID(), 'demo-expert-002', 2, '10:00:00', '18:00:00', TRUE),
(UUID(), 'demo-expert-002', 3, '10:00:00', '18:00:00', TRUE),
(UUID(), 'demo-expert-002', 5, '10:00:00', '16:00:00', TRUE),
(UUID(), 'demo-expert-002', 6, '09:00:00', '13:00:00', TRUE);

-- ============================================================================
-- SAMPLE GROWTH RECORDS
-- ============================================================================

-- Insert sample growth records for the past week
INSERT INTO growth_records (id, baby_id, recorded_by, record_date, feed_types, direct_start_time, direct_breast_side, direct_duration, direct_pain_level, notes, entered_via_voice) VALUES
(UUID(), 'demo-baby-001', 'demo-user-001', CURDATE(), '["direct"]', '08:30:00', 'both', 25, 0, 'Great feeding session this morning!', FALSE),
(UUID(), 'demo-baby-001', 'demo-user-001', DATE_SUB(CURDATE(), INTERVAL 1 DAY), '["direct"]', '07:45:00', 'left', 20, 1, 'Baby seemed extra hungry', FALSE),
(UUID(), 'demo-baby-001', 'demo-user-001', DATE_SUB(CURDATE(), INTERVAL 2 DAY), '["direct", "expressed"]', '09:15:00', 'both', 30, 0, 'Perfect latch today', FALSE),
(UUID(), 'demo-baby-002', 'demo-user-001', CURDATE(), '["direct", "formula"]', '09:00:00', 'right', 15, 0, 'Quick feed before daycare', FALSE),
(UUID(), 'demo-baby-003', 'demo-user-002', CURDATE(), '["direct"]', '10:30:00', 'both', 35, 2, 'Longer session today', FALSE);

-- Update expressed and formula quantities for relevant records
UPDATE growth_records SET expressed_quantity = 120 WHERE JSON_CONTAINS(feed_types, '"expressed"') AND baby_id = 'demo-baby-001';
UPDATE growth_records SET formula_quantity = 90 WHERE JSON_CONTAINS(feed_types, '"formula"') AND baby_id = 'demo-baby-002';

-- ============================================================================
-- SAMPLE WEIGHT RECORDS
-- ============================================================================

INSERT INTO weight_records (id, baby_id, recorded_by, record_date, weight, height, notes) VALUES
(UUID(), 'demo-baby-001', 'demo-user-001', CURDATE(), 4.50, 55.0, 'Great weight gain this week!'),
(UUID(), 'demo-baby-001', 'demo-user-001', DATE_SUB(CURDATE(), INTERVAL 7 DAY), 4.35, 54.5, 'Steady progress'),
(UUID(), 'demo-baby-001', 'demo-user-001', DATE_SUB(CURDATE(), INTERVAL 14 DAY), 4.20, 54.0, 'Back to birth weight!'),
(UUID(), 'demo-baby-002', 'demo-user-001', CURDATE(), 6.20, 62.0, 'Growing so fast!'),
(UUID(), 'demo-baby-002', 'demo-user-001', DATE_SUB(CURDATE(), INTERVAL 7 DAY), 6.05, 61.5, 'Healthy growth'),
(UUID(), 'demo-baby-003', 'demo-user-002', CURDATE(), 4.20, 53.0, 'Perfect weight for age');

-- ============================================================================
-- SAMPLE EMOTION CHECK-INS
-- ============================================================================

INSERT INTO emotion_checkin_records (id, user_id, record_date, record_time, selected_struggles, selected_positive_moments, selected_concerning_thoughts, grateful_for, proud_of_today, tomorrow_goal, crisis_alert_triggered) VALUES
(UUID(), 'demo-user-001', CURDATE(), '14:30:00', 
'["tired", "anxious"]', 
'["bonding", "successful-feed"]', 
'[]',
'My baby\'s beautiful smile this morning',
'Successfully breastfeeding for 6 weeks now',
'Get more rest when baby sleeps',
FALSE),

(UUID(), 'demo-user-002', CURDATE(), '16:45:00',
'["sleep-deprived"]',
'["confident", "support"]',
'[]',
'The amazing support from my partner',
'Feeling more confident with breastfeeding',
'Try the new feeding position we learned',
FALSE),

(UUID(), 'demo-user-001', DATE_SUB(CURDATE(), INTERVAL 1 DAY), '20:15:00',
'["tired", "overwhelmed"]',
'["peaceful", "grateful"]',
'[]',
'A quiet moment with my baby before bed',
'Making it through another day',
'Ask for help with household tasks',
FALSE);

-- ============================================================================
-- SAMPLE CONSULTATIONS
-- ============================================================================

INSERT INTO consultations (id, user_id, expert_id, consultation_type, status, scheduled_at, duration_minutes, topic, notes, meeting_link, reminder_sent) VALUES
(UUID(), 'demo-user-001', 'demo-expert-001', 'scheduled', 'scheduled', DATE_ADD(NOW(), INTERVAL 2 DAY), 30, 'Latching Issues', 'Baby having trouble latching properly', 'https://meet.jit.si/naricare-demo-consultation-1', FALSE),
(UUID(), 'demo-user-002', 'demo-expert-002', 'scheduled', 'scheduled', DATE_ADD(NOW(), INTERVAL 5 DAY), 30, 'Return to Work', 'Need help with pumping schedule for returning to work', 'https://meet.jit.si/naricare-demo-consultation-2', FALSE),
(UUID(), 'demo-user-001', 'demo-expert-001', 'scheduled', 'completed', DATE_SUB(NOW(), INTERVAL 3 DAY), 30, 'Milk Supply', 'Concerns about milk production', NULL, TRUE);

-- ============================================================================
-- SAMPLE CHAT MESSAGES
-- ============================================================================

-- Get chat room IDs for sample messages
SET @newborn_room_id = (SELECT id FROM chat_rooms WHERE name = 'Newborn Support Group' LIMIT 1);
SET @pumping_room_id = (SELECT id FROM chat_rooms WHERE name = 'Pumping Moms Unite' LIMIT 1);

-- Add users to chat rooms
INSERT INTO chat_room_participants (id, room_id, user_id, role, joined_at) VALUES
(UUID(), @newborn_room_id, 'demo-user-001', 'participant', NOW()),
(UUID(), @newborn_room_id, 'demo-user-002', 'participant', NOW()),
(UUID(), @newborn_room_id, 'demo-expert-001', 'moderator', NOW()),
(UUID(), @pumping_room_id, 'demo-user-001', 'participant', NOW()),
(UUID(), @pumping_room_id, 'demo-expert-002', 'moderator', NOW());

-- Insert sample chat messages
INSERT INTO chat_messages (id, room_id, sender_id, sender_name, sender_role, message, created_at) VALUES
(UUID(), @newborn_room_id, 'demo-expert-001', 'Dr. Sarah Johnson', 'expert', 'Welcome to the Newborn Support Group! 👶 I\'m here to help with any questions about feeding, sleeping, or caring for your little one.', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(UUID(), @newborn_room_id, 'demo-user-001', 'Emma Johnson', 'user', 'Thank you Dr. Johnson! I have a question about my 3-week-old\'s feeding schedule. She seems to want to feed every hour - is this normal?', DATE_SUB(NOW(), INTERVAL 90 MINUTE)),
(UUID(), @newborn_room_id, 'demo-expert-001', 'Dr. Sarah Johnson', 'expert', 'That\'s completely normal, Emma! **Cluster feeding** is very common at 3 weeks. Your baby is likely going through a growth spurt. This frequent feeding helps build your milk supply and comfort your baby. Try to rest when baby rests! 💕', DATE_SUB(NOW(), INTERVAL 85 MINUTE)),
(UUID(), @newborn_room_id, 'demo-user-002', 'Sarah Williams', 'user', 'I went through the same thing with my little one! It gets easier around 6 weeks. Hang in there mama! 🌟', DATE_SUB(NOW(), INTERVAL 80 MINUTE));

-- ============================================================================
-- SAMPLE ARTICLES
-- ============================================================================

INSERT INTO articles (id, title, summary, content, category_id, author, read_time_minutes, difficulty, is_featured, published_at) VALUES
('sample-article-001', 'What to expect around 2-5 days after delivery?', 'Understanding milk transition and managing engorgement in the first few days', 
JSON_OBJECT(
    'sections', JSON_ARRAY(
        JSON_OBJECT('type', 'text', 'content', 'For most mothers, this thinner, whiter form of milk comes in by about 3 days after birth, but may take longer for first-time moms. You may notice your breasts feeling full, hard, and warm as this happens.'),
        JSON_OBJECT('type', 'callout', 'style', 'info', 'title', 'Managing Engorgement', 'content', 'To minimize engorgement: nurse often, don\'t skip feedings (even at night), ensure good latch/positioning, and let the baby finish the first breast before offering the other side.')
    )
), 'postpartum-early-days', 'NariCare Team', 4, 'beginner', TRUE, NOW()),

('sample-article-002', 'How to get a good latch while breastfeeding?', 'Step-by-step guide to achieving the perfect latch for comfortable feeding',
JSON_OBJECT(
    'sections', JSON_ARRAY(
        JSON_OBJECT('type', 'text', 'content', 'Whatever breastfeeding position you chose - cradle hold, football hold, cross cradle hold, side lying - follow the below steps for the perfect latch:'),
        JSON_OBJECT('type', 'list', 'style', 'numbered', 'items', JSON_ARRAY('Support your baby\'s neck, shoulders, and hips', 'Bring the baby to the breast, not your breast to the baby', 'Wait till the baby opens the mouth wide enough'))
    )
), 'breastfeeding-techniques', 'NariCare Team', 5, 'beginner', TRUE, NOW());

-- Insert article tags
INSERT INTO article_tags (id, article_id, tag_name) VALUES
(UUID(), 'sample-article-001', 'milk-coming-in'),
(UUID(), 'sample-article-001', 'engorgement'),
(UUID(), 'sample-article-001', 'early-days'),
(UUID(), 'sample-article-002', 'latch'),
(UUID(), 'sample-article-002', 'positioning'),
(UUID(), 'sample-article-002', 'technique');

-- ============================================================================
-- SAMPLE GROWTH CHART STANDARDS (WHO DATA SAMPLE)
-- ============================================================================

-- Insert sample WHO weight standards for girls (first few weeks)
INSERT INTO growth_chart_standards (id, standard_type, gender, measurement_type, age_in_weeks, p3, p5, p10, p25, p50, p75, p90, p95, p97) VALUES
(UUID(), 'WHO', 'female', 'weight', 0, 2.4, 2.5, 2.7, 2.9, 3.2, 3.5, 3.8, 4.0, 4.2),
(UUID(), 'WHO', 'female', 'weight', 2, 3.0, 3.2, 3.4, 3.7, 4.0, 4.4, 4.8, 5.1, 5.3),
(UUID(), 'WHO', 'female', 'weight', 4, 3.6, 3.8, 4.0, 4.4, 4.8, 5.3, 5.8, 6.1, 6.4),
(UUID(), 'WHO', 'female', 'weight', 6, 4.0, 4.2, 4.5, 5.0, 5.5, 6.1, 6.7, 7.0, 7.3),
(UUID(), 'WHO', 'female', 'weight', 8, 4.4, 4.6, 5.0, 5.5, 6.1, 6.7, 7.4, 7.8, 8.1),
(UUID(), 'WHO', 'female', 'weight', 12, 5.1, 5.4, 5.8, 6.4, 7.0, 7.8, 8.6, 9.1, 9.5),
(UUID(), 'WHO', 'female', 'weight', 16, 5.7, 6.0, 6.5, 7.2, 7.9, 8.8, 9.8, 10.4, 10.9),
(UUID(), 'WHO', 'female', 'weight', 24, 6.7, 7.1, 7.6, 8.5, 9.4, 10.5, 11.8, 12.6, 13.2);

-- Insert sample WHO weight standards for boys (first few weeks)
INSERT INTO growth_chart_standards (id, standard_type, gender, measurement_type, age_in_weeks, p3, p5, p10, p25, p50, p75, p90, p95, p97) VALUES
(UUID(), 'WHO', 'male', 'weight', 0, 2.5, 2.6, 2.8, 3.0, 3.3, 3.6, 3.9, 4.1, 4.3),
(UUID(), 'WHO', 'male', 'weight', 2, 3.2, 3.4, 3.6, 3.9, 4.3, 4.7, 5.1, 5.4, 5.6),
(UUID(), 'WHO', 'male', 'weight', 4, 3.8, 4.0, 4.3, 4.7, 5.1, 5.6, 6.1, 6.4, 6.7),
(UUID(), 'WHO', 'male', 'weight', 6, 4.3, 4.5, 4.8, 5.3, 5.8, 6.3, 6.9, 7.3, 7.6),
(UUID(), 'WHO', 'male', 'weight', 8, 4.7, 4.9, 5.3, 5.8, 6.3, 7.0, 7.7, 8.1, 8.4),
(UUID(), 'WHO', 'male', 'weight', 12, 5.4, 5.7, 6.1, 6.7, 7.4, 8.2, 9.0, 9.5, 9.9),
(UUID(), 'WHO', 'male', 'weight', 16, 6.0, 6.3, 6.8, 7.5, 8.3, 9.2, 10.2, 10.8, 11.2),
(UUID(), 'WHO', 'male', 'weight', 24, 7.0, 7.4, 8.0, 8.8, 9.8, 11.0, 12.3, 13.1, 13.7);

-- ============================================================================
-- SAMPLE SCHEDULED NOTIFICATIONS
-- ============================================================================

INSERT INTO scheduled_notifications (id, user_id, notification_type, title, body, scheduled_time, is_sent) VALUES
(UUID(), 'demo-user-001', 'weight_reminder', 'Time to weigh Emma! 📏', 'It\'s been a week since you last recorded Emma\'s weight. Regular tracking helps monitor healthy growth!', DATE_ADD(NOW(), INTERVAL 1 DAY), FALSE),
(UUID(), 'demo-user-002', 'article_update', 'New Article Available! 📚', 'Check out our latest article: "Returning to Work While Breastfeeding"', DATE_ADD(NOW(), INTERVAL 2 HOUR), FALSE);

-- ============================================================================
-- SAMPLE APP USAGE LOGS
-- ============================================================================

INSERT INTO app_usage_logs (id, user_id, session_id, action_type, page_path, feature_used, duration_seconds, additional_data) VALUES
(UUID(), 'demo-user-001', UUID(), 'page_view', '/tabs/dashboard', 'dashboard', 45, JSON_OBJECT('device_type', 'mobile')),
(UUID(), 'demo-user-001', UUID(), 'feature_use', '/tabs/growth', 'feed_log', 120, JSON_OBJECT('baby_id', 'demo-baby-001')),
(UUID(), 'demo-user-002', UUID(), 'page_view', '/tabs/knowledge', 'knowledge_base', 180, JSON_OBJECT('article_viewed', 'sample-article-001')),
(UUID(), 'demo-user-001', UUID(), 'feature_use', '/tabs/chat', 'ai_chatbot', 300, JSON_OBJECT('messages_sent', 3));

-- ============================================================================
-- DEVELOPMENT NOTES
-- ============================================================================

/*
This sample data provides:

1. Multiple user types (regular users, experts, admin)
2. Babies of different ages for testing growth tracking
3. Various feeding records showing different patterns
4. Weight progression data for chart testing
5. Emotion check-ins with different scenarios
6. Scheduled consultations for testing booking system
7. Chat room participation and messages
8. Knowledge base content with proper categorization
9. WHO growth standards for percentile calculations
10. Usage analytics for dashboard insights

To reset sample data:
- Run: DELETE FROM users WHERE id LIKE 'demo-%';
- This will cascade delete all related sample data

For production deployment:
- Remove or comment out this entire file
- Use proper password hashing
- Generate real UUIDs
- Set up proper user registration flow
*/