# NariCare Database Schema

This directory contains the complete MySQL database schema for the NariCare breastfeeding support application.

## 📁 File Structure

```
database/
├── schema.sql                     # Complete schema in one file
├── migrations/                    # Individual migration files
│   ├── 001_initial_schema.sql
│   ├── 002_babies_and_tracking.sql
│   ├── 003_emotion_checkin.sql
│   ├── 004_knowledge_base.sql
│   ├── 005_chat_system.sql
│   ├── 006_consultations_experts.sql
│   ├── 007_timeline_milestones.sql
│   └── 008_notifications_analytics.sql
├── views/
│   └── dashboard_views.sql        # Optimized views for dashboards
├── stored_procedures/
│   └── growth_analytics.sql       # Procedures for analytics
├── triggers/
│   └── data_integrity.sql         # Data integrity triggers
├── indexes/
│   └── performance_indexes.sql    # Performance optimization indexes
└── sample_data/
    └── development_data.sql       # Sample data for development
```

## 🗄️ Database Overview

### Core Tables

#### User Management
- `users` - User accounts and profiles
- `user_tiers` - Subscription tiers and features
- `notification_preferences` - User notification settings

#### Baby & Family
- `babies` - Baby profiles and basic information
- `growth_records` - Feeding sessions and daily tracking
- `weight_records` - Weight and height measurements
- `stool_records` - Stool tracking and diaper logs
- `diaper_change_records` - Diaper change tracking
- `pumping_records` - Breast pump session logs

#### Emotional Health
- `emotion_checkin_records` - Maternal emotional health tracking
- `emotional_struggles_options` - Predefined struggle categories
- `positive_moments_options` - Predefined positive moment categories
- `concerning_thoughts_options` - Predefined concerning thought categories
- `crisis_interventions` - Crisis intervention tracking

#### Knowledge Base
- `article_categories` - Article categorization
- `articles` - Knowledge base articles with structured content
- `article_tags` - Article tagging system
- `user_bookmarks` - User article bookmarks

#### Communication
- `chat_rooms` - Group chat rooms
- `chat_room_participants` - Room membership
- `chat_messages` - Chat messages
- `message_attachments` - File attachments
- `chatbot_conversations` - AI chatbot sessions
- `chatbot_messages` - AI conversation history

#### Expert System
- `experts` - Expert profiles and credentials
- `expert_specialties` - Expert areas of expertise
- `expert_availability` - Expert scheduling availability
- `consultations` - Consultation bookings and sessions
- `consultation_follow_ups` - Post-consultation follow-ups

#### Timeline & Milestones
- `baby_timeline_items` - Developmental timeline content
- `user_timeline_progress` - User progress through timeline
- `growth_chart_standards` - WHO/CDC growth standards

#### System & Analytics
- `push_notification_tokens` - Push notification management
- `scheduled_notifications` - Notification scheduling
- `user_analytics` - User engagement metrics
- `app_usage_logs` - Feature usage tracking
- `app_settings` - System configuration
- `audit_logs` - Security and change auditing

## 🚀 Setup Instructions

### 1. Create Database
```sql
CREATE DATABASE naricare_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE naricare_db;
```

### 2. Run Schema (Choose One Method)

#### Option A: Complete Schema
```bash
mysql -u username -p naricare_db < database/schema.sql
```

#### Option B: Individual Migrations
```bash
mysql -u username -p naricare_db < database/migrations/001_initial_schema.sql
mysql -u username -p naricare_db < database/migrations/002_babies_and_tracking.sql
mysql -u username -p naricare_db < database/migrations/003_emotion_checkin.sql
mysql -u username -p naricare_db < database/migrations/004_knowledge_base.sql
mysql -u username -p naricare_db < database/migrations/005_chat_system.sql
mysql -u username -p naricare_db < database/migrations/006_consultations_experts.sql
mysql -u username -p naricare_db < database/migrations/007_timeline_milestones.sql
mysql -u username -p naricare_db < database/migrations/008_notifications_analytics.sql
```

### 3. Add Views and Procedures
```bash
mysql -u username -p naricare_db < database/views/dashboard_views.sql
mysql -u username -p naricare_db < database/stored_procedures/growth_analytics.sql
mysql -u username -p naricare_db < database/triggers/data_integrity.sql
mysql -u username -p naricare_db < database/indexes/performance_indexes.sql
```

### 4. Add Sample Data (Development Only)
```bash
mysql -u username -p naricare_db < database/sample_data/development_data.sql
```

## 🔧 Key Features

### Data Integrity
- Foreign key constraints ensure referential integrity
- Triggers maintain data consistency
- Audit logging for sensitive operations
- Cascade deletes for proper cleanup

### Performance Optimization
- Strategic indexing for common queries
- Optimized views for dashboard data
- Stored procedures for complex analytics
- Partitioning suggestions for scale

### Security & Privacy
- Audit trails for all sensitive operations
- Crisis intervention tracking
- Secure handling of emotional health data
- HIPAA-compliant data structures

### Scalability
- JSON fields for flexible data structures
- Partitioning strategy for large tables
- Efficient indexing for growth
- Archive strategy for old data

## 📊 Key Relationships

```
users (1) ←→ (n) babies
users (1) ←→ (n) emotion_checkin_records
babies (1) ←→ (n) growth_records
babies (1) ←→ (n) weight_records
users (1) ←→ (n) consultations ←→ (1) experts
users (n) ←→ (n) chat_rooms (via chat_room_participants)
```

## 🔍 Important Queries

### Get Baby's Latest Weight with Percentile
```sql
SELECT b.name, wr.weight, wr.record_date,
       DATEDIFF(wr.record_date, b.date_of_birth) DIV 7 as age_weeks
FROM babies b
JOIN weight_records wr ON b.id = wr.baby_id
WHERE b.id = 'baby_id'
ORDER BY wr.record_date DESC
LIMIT 1;
```

### Get User's Recent Feeding Pattern
```sql
SELECT record_date, 
       COUNT(*) as total_feeds,
       AVG(direct_duration) as avg_duration,
       AVG(direct_pain_level) as avg_pain
FROM growth_records
WHERE baby_id = 'baby_id' 
  AND record_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
  AND JSON_CONTAINS(feed_types, '"direct"')
GROUP BY record_date
ORDER BY record_date DESC;
```

### Monitor Crisis Interventions
```sql
SELECT u.first_name, u.last_name, u.email,
       ec.record_date, ec.crisis_alert_triggered,
       JSON_LENGTH(ec.selected_concerning_thoughts) as concerning_count
FROM users u
JOIN emotion_checkin_records ec ON u.id = ec.user_id
WHERE ec.crisis_alert_triggered = TRUE
  AND ec.record_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
ORDER BY ec.record_date DESC;
```

## 🛠️ Maintenance

### Regular Cleanup
```sql
CALL CleanupOldData(365); -- Keep 1 year of audit logs
```

### Performance Monitoring
```sql
-- Check slow queries
SELECT * FROM mysql.slow_log WHERE start_time >= DATE_SUB(NOW(), INTERVAL 1 DAY);

-- Monitor table sizes
SELECT table_name, 
       ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.tables 
WHERE table_schema = 'naricare_db'
ORDER BY (data_length + index_length) DESC;
```

## 🔒 Security Considerations

1. **Sensitive Data**: Emotion check-in data requires special handling
2. **Crisis Intervention**: Immediate alerts for concerning thoughts
3. **HIPAA Compliance**: Medical data handling protocols
4. **Audit Trails**: Complete logging of sensitive operations
5. **Data Retention**: Policies for archiving old data

## 📈 Analytics Capabilities

- User engagement tracking
- Feeding pattern analysis
- Growth percentile calculations
- Emotional wellness monitoring
- Expert performance metrics
- Feature usage statistics

## 🚨 Crisis Intervention System

The schema includes comprehensive crisis intervention tracking:
- Automatic detection of concerning thoughts
- Crisis intervention logging
- Support contact tracking
- Emergency resource management

This ensures user safety while maintaining privacy and providing appropriate support resources.