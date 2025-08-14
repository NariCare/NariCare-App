-- Migration: Knowledge Base System
-- Description: Creates tables for articles, categories, and knowledge management
-- Version: 1.0.0
-- Date: 2025-01-27

-- ============================================================================
-- KNOWLEDGE BASE AND ARTICLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS article_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7), -- hex color
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_category_order (sort_order, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS articles (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS article_tags (
    id VARCHAR(36) PRIMARY KEY,
    article_id VARCHAR(50) NOT NULL,
    tag_name VARCHAR(50) NOT NULL,
    
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_article_tag (article_id, tag_name),
    INDEX idx_tag_search (tag_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_bookmarks (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    article_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_bookmark (user_id, article_id),
    INDEX idx_user_bookmarks (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INSERT INITIAL KNOWLEDGE BASE DATA
-- ============================================================================

-- Insert article categories
INSERT INTO article_categories (id, name, description, icon, color, sort_order) VALUES
('postpartum-early-days', 'Postpartum & Early Days', 'Essential information for the first days after delivery', 'heart', '#e91e63', 1),
('breastfeeding-techniques', 'Breastfeeding Techniques', 'Proper positioning, latching, and feeding techniques', 'baby', '#26a69a', 2),
('milk-supply-production', 'Milk Supply & Production', 'Understanding milk production and supply issues', 'water', '#42a5f5', 3),
('common-challenges', 'Common Challenges', 'Solutions for common breastfeeding problems', 'help-circle', '#ff7043', 4),
('baby-health-growth', 'Baby Health & Growth', 'Monitoring your baby\'s health and development', 'trending-up', '#4caf50', 5),
('preparation-planning', 'Preparation & Planning', 'Getting ready for your breastfeeding journey', 'calendar', '#9c27b0', 6);