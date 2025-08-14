-- Performance Indexes for NariCare Database
-- Description: Additional indexes for query optimization
-- Version: 1.0.0
-- Date: 2025-01-27

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================================================

-- Growth tracking performance indexes
CREATE INDEX idx_baby_growth_tracking ON growth_records (baby_id, record_date DESC, feed_types(50));
CREATE INDEX idx_user_baby_records ON growth_records (recorded_by, baby_id, record_date DESC);
CREATE INDEX idx_recent_growth_records ON growth_records (baby_id, created_at DESC) USING BTREE;

-- Weight tracking performance
CREATE INDEX idx_weight_tracking ON weight_records (baby_id, record_date DESC, weight);
CREATE INDEX idx_weight_percentile_calc ON weight_records (baby_id, record_date DESC, weight, height);

-- Chat and messaging performance
CREATE INDEX idx_recent_messages ON chat_messages (room_id, created_at DESC) USING BTREE;
CREATE INDEX idx_user_message_history ON chat_messages (sender_id, room_id, created_at DESC);
CREATE INDEX idx_room_activity ON chat_messages (room_id, sender_role, created_at DESC);

-- Consultation scheduling optimization
CREATE INDEX idx_consultation_scheduling ON consultations (expert_id, status, scheduled_at);
CREATE INDEX idx_upcoming_consultations ON consultations (user_id, status, scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_expert_availability_lookup ON expert_availability (expert_id, day_of_week, is_available, start_time, end_time);

-- Emotion tracking trends
CREATE INDEX idx_emotion_trends ON emotion_checkin_records (user_id, record_date DESC, crisis_alert_triggered);
CREATE INDEX idx_crisis_monitoring ON emotion_checkin_records (crisis_alert_triggered, record_date DESC) WHERE crisis_alert_triggered = TRUE;

-- Knowledge base search optimization
CREATE INDEX idx_article_category_search ON articles (category_id, is_featured DESC, published_at DESC);
CREATE INDEX idx_article_difficulty_search ON articles (difficulty, published_at DESC);
CREATE INDEX idx_featured_articles_optimized ON articles (is_featured, category_id, published_at DESC) WHERE is_featured = TRUE;

-- User engagement tracking
CREATE INDEX idx_user_activity_timeline ON app_usage_logs (user_id, action_type, created_at DESC);
CREATE INDEX idx_feature_popularity ON app_usage_logs (feature_used, created_at DESC) WHERE feature_used IS NOT NULL;

-- Notification delivery optimization
CREATE INDEX idx_pending_notifications ON scheduled_notifications (scheduled_time ASC, is_sent) WHERE is_sent = FALSE;
CREATE INDEX idx_notification_delivery_status ON scheduled_notifications (delivery_status, retry_count, scheduled_time);

-- ============================================================================
-- PARTITIONING SUGGESTIONS (FOR LARGE SCALE)
-- ============================================================================

/*
For high-volume production environments, consider partitioning these tables:

-- Partition growth_records by month
ALTER TABLE growth_records 
PARTITION BY RANGE (TO_DAYS(record_date)) (
    PARTITION p202501 VALUES LESS THAN (TO_DAYS('2025-02-01')),
    PARTITION p202502 VALUES LESS THAN (TO_DAYS('2025-03-01')),
    -- Add more partitions as needed
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- Partition chat_messages by month
ALTER TABLE chat_messages 
PARTITION BY RANGE (TO_DAYS(created_at)) (
    PARTITION p202501 VALUES LESS THAN (TO_DAYS('2025-02-01')),
    PARTITION p202502 VALUES LESS THAN (TO_DAYS('2025-03-01')),
    -- Add more partitions as needed
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- Partition audit_logs by month
ALTER TABLE audit_logs 
PARTITION BY RANGE (TO_DAYS(created_at)) (
    PARTITION p202501 VALUES LESS THAN (TO_DAYS('2025-02-01')),
    PARTITION p202502 VALUES LESS THAN (TO_DAYS('2025-03-01')),
    -- Add more partitions as needed
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
*/

-- ============================================================================
-- QUERY OPTIMIZATION HINTS
-- ============================================================================

/*
Common Query Patterns and Optimizations:

1. Baby Dashboard Queries:
   - Use baby_growth_summary view for overview data
   - Index on (baby_id, record_date DESC) for recent records
   - Consider materialized views for complex aggregations

2. User Feed History:
   - Use composite index on (baby_id, record_date DESC, feed_types)
   - Limit queries to recent data (last 30-90 days) for performance
   - Archive old data to separate tables if needed

3. Expert Consultation Queries:
   - Use covering indexes for availability lookups
   - Index on (expert_id, status, scheduled_at) for scheduling
   - Consider caching expert availability data

4. Emotion Tracking Queries:
   - Use partial indexes for crisis monitoring
   - Index on (user_id, record_date DESC) for trends
   - Consider separate table for crisis interventions

5. Knowledge Base Queries:
   - Use FULLTEXT indexes for article search
   - Index on (category_id, is_featured, published_at) for browsing
   - Consider search engine integration for complex queries

Performance Monitoring:
- Monitor slow query log regularly
- Use EXPLAIN ANALYZE for query optimization
- Track index usage with performance_schema
- Consider query caching for read-heavy operations
*/