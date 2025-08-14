-- Migration: Baby Timeline and Milestones System
-- Description: Creates tables for developmental timeline and milestone tracking
-- Version: 1.0.0
-- Date: 2025-01-27

-- ============================================================================
-- BABY TIMELINE AND MILESTONES
-- ============================================================================

CREATE TABLE IF NOT EXISTS baby_timeline_items (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_week_range (week_start, week_end),
    INDEX idx_category (category),
    INDEX idx_timeline_order (week_start, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_timeline_progress (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- GROWTH CHART STANDARDS (WHO/CDC)
-- ============================================================================

CREATE TABLE IF NOT EXISTS growth_chart_standards (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INSERT INITIAL TIMELINE DATA
-- ============================================================================

-- Insert key timeline milestones
INSERT INTO baby_timeline_items (id, week_start, week_end, title, short_title, description, category, icon, color, what_to_expect, tips, when_to_worry, sort_order) VALUES
('birth-week', 0, 0, 'Welcome to the world!', 'Birth', 'Your baby has arrived! This is the beginning of your beautiful journey together.', 'milestone', 'heart', '#e91e63', 
JSON_ARRAY('Baby will want to feed 8-12 times in 24 hours', 'Colostrum (liquid gold) is all baby needs', 'Skin-to-skin contact helps with bonding', 'Baby may lose 5-7% of birth weight (normal!)'),
JSON_ARRAY('Start breastfeeding within the first hour if possible', 'Keep baby skin-to-skin as much as possible', 'Let baby feed as often as they want', 'Don\'t worry about schedules yet - follow baby\'s cues'),
JSON_ARRAY('Baby won\'t wake up to feed', 'No wet diapers in first 24 hours', 'Baby seems very lethargic'), 1),

('two-months-milestones', 8, 8, '2 Months: Social Smiles & Calming', '2 Months', 'Your baby is becoming more social and responsive! Watch for those magical first smiles.', 'milestone', 'happy', '#4caf50',
JSON_ARRAY('Calms down when spoken to or picked up', 'Looks at your face and makes eye contact', 'Seems happy to see you when you walk up to them', 'Smiles when you talk to or smile at them', 'Can hold head up when on tummy', 'Moves both arms and both legs', 'Opens hands briefly'),
JSON_ARRAY('Talk and sing to your baby throughout the day', 'Give plenty of tummy time when baby is awake', 'Respond to baby\'s smiles and sounds', 'Read to your baby daily', 'Take photos and videos of these precious moments'),
JSON_ARRAY('Doesn\'t respond to loud sounds', 'Doesn\'t watch things as they move', 'Doesn\'t smile at people', 'Can\'t hold head up when pushing up during tummy time', 'Doesn\'t bring hands to mouth'), 2),

('six-months-milestones', 24, 24, '6 Months: Sitting & Exploring', '6 Months', 'Half a year milestone! Your baby is becoming more mobile and curious about everything.', 'milestone', 'cube', '#2196f3',
JSON_ARRAY('Knows familiar people and begins to know if someone is a stranger', 'Likes to play with others, especially parents', 'Responds to other people\'s emotions and often seems happy', 'Likes to look at self in a mirror', 'Responds to sounds by making sounds', 'Strings vowels together when babbling', 'Takes turns making sounds with you', 'Brings things to mouth', 'Reaches for things', 'Closes lips to show they don\'t want more food'),
JSON_ARRAY('Introduce solid foods alongside breastfeeding', 'Let baby explore different textures safely', 'Play games that involve taking turns', 'Provide unbreakable mirrors for baby to look at', 'Continue reading and talking throughout the day'),
JSON_ARRAY('Doesn\'t try to get things that are in reach', 'Shows no affection for caregivers', 'Doesn\'t respond to sounds around them', 'Has difficulty getting things to mouth', 'Doesn\'t make vowel sounds', 'Doesn\'t roll over in either direction', 'Doesn\'t laugh or make squealing sounds'), 3),

('twelve-months-milestones', 52, 52, '12 Months: First Birthday!', '1 Year', 'Happy first birthday! Your baby is now a toddler with so many new skills and personality.', 'milestone', 'gift', '#e91e63',
JSON_ARRAY('Smiles on their own to get your attention', 'Chuckles when you try to make them laugh', 'Looks at you, moves, or makes sounds to get or keep your attention', 'Holds head steady without support when you are holding them', 'Holds a toy when you put it in their hand', 'Uses their arm to swing at toys', 'Brings hands to mouth', 'Pushes up onto elbows/forearms when on tummy'),
JSON_ARRAY('Celebrate this amazing milestone!', 'Continue breastfeeding as long as you both want', 'Encourage walking by holding their hands', 'Read books and point to pictures', 'Sing songs with actions and gestures'),
JSON_ARRAY('Doesn\'t crawl', 'Can\'t stand when supported', 'Doesn\'t search for things that they see you hide', 'Doesn\'t say single words like "mama" or "dada"', 'Doesn\'t learn gestures like waving or shaking head', 'Doesn\'t point at things', 'Loses skills they once had'), 4);