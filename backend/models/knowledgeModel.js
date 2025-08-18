const { executeQuery, executeTransaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class KnowledgeModel {
  // Get all categories
  async getCategories() {
    try {
      const categories = await executeQuery(
        'SELECT * FROM article_categories WHERE is_active = TRUE ORDER BY sort_order ASC'
      );

      return categories;
    } catch (error) {
      logger.error('Get categories error:', error);
      throw error;
    }
  }

  // Get category by ID
  async getCategoryById(id) {
    try {
      const categories = await executeQuery(
        'SELECT * FROM article_categories WHERE id = ? AND is_active = TRUE',
        [id]
      );

      return categories.length > 0 ? categories[0] : null;
    } catch (error) {
      logger.error('Get category by ID error:', error);
      throw error;
    }
  }

  // Get articles
  async getArticles(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        categoryId,
        difficulty,
        featured,
        search,
        sortBy = 'published_at',
        sortOrder = 'DESC'
      } = options;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE 1=1';
      let queryParams = [];

      if (categoryId) {
        whereClause += ' AND a.category_id = ?';
        queryParams.push(categoryId);
      }

      if (difficulty) {
        whereClause += ' AND a.difficulty = ?';
        queryParams.push(difficulty);
      }

      if (featured !== undefined) {
        whereClause += ' AND a.is_featured = ?';
        queryParams.push(featured);
      }

      if (search) {
        whereClause += ' AND (MATCH(a.title, a.summary) AGAINST(? IN NATURAL LANGUAGE MODE) OR a.title LIKE ? OR a.summary LIKE ?)';
        queryParams.push(search, `%${search}%`, `%${search}%`);
      }

      queryParams.push(limit, offset);

      const articles = await executeQuery(
        `SELECT a.*, ac.name as category_name, ac.icon as category_icon, ac.color as category_color
         FROM articles a
         JOIN article_categories ac ON a.category_id = ac.id
         ${whereClause}
         ORDER BY a.${sortBy} ${sortOrder}
         LIMIT ? OFFSET ?`,
        queryParams
      );

      // Parse content JSON and get tags for each article
      const articlesWithTags = await Promise.all(
        articles.map(async (article) => {
          // Parse content
          article.content = JSON.parse(article.content || '{}');
          
          // Get tags
          const tags = await executeQuery(
            'SELECT tag_name FROM article_tags WHERE article_id = ?',
            [article.id]
          );
          article.tags = tags.map(t => t.tag_name);

          return article;
        })
      );

      // Get total count
      const countParams = queryParams.slice(0, -2);
      const countResult = await executeQuery(
        `SELECT COUNT(*) as total FROM articles a ${whereClause}`,
        countParams
      );

      return {
        articles: articlesWithTags,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      };
    } catch (error) {
      logger.error('Get articles error:', error);
      throw error;
    }
  }

  // Get article by ID
  async getArticleById(id) {
    try {
      const articles = await executeQuery(
        `SELECT a.*, ac.name as category_name, ac.icon as category_icon, ac.color as category_color
         FROM articles a
         JOIN article_categories ac ON a.category_id = ac.id
         WHERE a.id = ?`,
        [id]
      );

      if (articles.length === 0) {
        return null;
      }

      const article = articles[0];
      
      // Parse content
      article.content = JSON.parse(article.content || '{}');
      
      // Get tags
      const tags = await executeQuery(
        'SELECT tag_name FROM article_tags WHERE article_id = ?',
        [id]
      );
      article.tags = tags.map(t => t.tag_name);

      return article;
    } catch (error) {
      logger.error('Get article by ID error:', error);
      throw error;
    }
  }

  // Create article
  async createArticle(articleData) {
    try {
      const {
        id,
        title,
        summary,
        content,
        categoryId,
        author,
        readTimeMinutes,
        difficulty = 'beginner',
        isFeatured = false,
        imageUrl,
        tags = []
      } = articleData;

      const queries = [
        // Create article
        {
          query: `INSERT INTO articles 
                  (id, title, summary, content, category_id, author, 
                   read_time_minutes, difficulty, is_featured, image_url, 
                   published_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          params: [id, title, summary, JSON.stringify(content), categoryId, author, 
                  readTimeMinutes, difficulty, isFeatured, imageUrl]
        }
      ];

      // Add tags
      tags.forEach(tag => {
        queries.push({
          query: 'INSERT INTO article_tags (id, article_id, tag_name) VALUES (?, ?, ?)',
          params: [uuidv4(), id, tag]
        });
      });

      await executeTransaction(queries);

      return await this.getArticleById(id);
    } catch (error) {
      logger.error('Create article error:', error);
      throw error;
    }
  }

  // Update article
  async updateArticle(id, updateData) {
    try {
      const allowedFields = [
        'title', 'summary', 'content', 'category_id', 'author',
        'read_time_minutes', 'difficulty', 'is_featured', 'image_url'
      ];
      
      const updateFields = [];
      const updateValues = [];

      Object.keys(updateData).forEach(key => {
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (allowedFields.includes(dbField)) {
          if (key === 'content') {
            updateFields.push(`${dbField} = ?`);
            updateValues.push(JSON.stringify(updateData[key]));
          } else {
            updateFields.push(`${dbField} = ?`);
            updateValues.push(updateData[key]);
          }
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      updateFields.push('updated_at = NOW()');
      updateValues.push(id);

      await executeQuery(
        `UPDATE articles SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      // Update tags if provided
      if (updateData.tags) {
        await this.updateArticleTags(id, updateData.tags);
      }

      return await this.getArticleById(id);
    } catch (error) {
      logger.error('Update article error:', error);
      throw error;
    }
  }

  // Update article tags
  async updateArticleTags(articleId, tags) {
    try {
      const queries = [
        // Remove existing tags
        {
          query: 'DELETE FROM article_tags WHERE article_id = ?',
          params: [articleId]
        }
      ];

      // Add new tags
      tags.forEach(tag => {
        queries.push({
          query: 'INSERT INTO article_tags (id, article_id, tag_name) VALUES (?, ?, ?)',
          params: [uuidv4(), articleId, tag]
        });
      });

      await executeTransaction(queries);
    } catch (error) {
      logger.error('Update article tags error:', error);
      throw error;
    }
  }

  // Delete article
  async deleteArticle(id) {
    try {
      const result = await executeQuery(
        'DELETE FROM articles WHERE id = ?',
        [id]
      );

      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Delete article error:', error);
      throw error;
    }
  }

  // Bookmark article
  async bookmarkArticle(userId, articleId) {
    try {
      // Check if already bookmarked
      const existing = await executeQuery(
        'SELECT id FROM user_bookmarks WHERE user_id = ? AND article_id = ?',
        [userId, articleId]
      );

      if (existing.length > 0) {
        throw new Error('Article already bookmarked');
      }

      await executeQuery(
        'INSERT INTO user_bookmarks (id, user_id, article_id, created_at) VALUES (?, ?, ?, NOW())',
        [uuidv4(), userId, articleId]
      );

      return { message: 'Article bookmarked successfully' };
    } catch (error) {
      logger.error('Bookmark article error:', error);
      throw error;
    }
  }

  // Remove bookmark
  async removeBookmark(userId, articleId) {
    try {
      const result = await executeQuery(
        'DELETE FROM user_bookmarks WHERE user_id = ? AND article_id = ?',
        [userId, articleId]
      );

      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Remove bookmark error:', error);
      throw error;
    }
  }

  // Get user bookmarks
  async getUserBookmarks(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20
      } = options;

      const offset = (page - 1) * limit;

      const bookmarks = await executeQuery(
        `SELECT a.*, ac.name as category_name, ac.icon as category_icon, ac.color as category_color,
                ub.created_at as bookmarked_at
         FROM user_bookmarks ub
         JOIN articles a ON ub.article_id = a.id
         JOIN article_categories ac ON a.category_id = ac.id
         WHERE ub.user_id = ?
         ORDER BY ub.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );

      // Parse content and get tags for each article
      const bookmarksWithTags = await Promise.all(
        bookmarks.map(async (article) => {
          article.content = JSON.parse(article.content || '{}');
          
          const tags = await executeQuery(
            'SELECT tag_name FROM article_tags WHERE article_id = ?',
            [article.id]
          );
          article.tags = tags.map(t => t.tag_name);

          return article;
        })
      );

      // Get total count
      const countResult = await executeQuery(
        'SELECT COUNT(*) as total FROM user_bookmarks WHERE user_id = ?',
        [userId]
      );

      return {
        bookmarks: bookmarksWithTags,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      };
    } catch (error) {
      logger.error('Get user bookmarks error:', error);
      throw error;
    }
  }

  // Search articles by tag
  async searchByTag(tag, options = {}) {
    try {
      const {
        page = 1,
        limit = 20
      } = options;

      const offset = (page - 1) * limit;

      const articles = await executeQuery(
        `SELECT a.*, ac.name as category_name, ac.icon as category_icon, ac.color as category_color
         FROM articles a
         JOIN article_categories ac ON a.category_id = ac.id
         JOIN article_tags at ON a.id = at.article_id
         WHERE at.tag_name LIKE ?
         ORDER BY a.published_at DESC
         LIMIT ? OFFSET ?`,
        [`%${tag}%`, limit, offset]
      );

      // Parse content and get all tags for each article
      const articlesWithTags = await Promise.all(
        articles.map(async (article) => {
          article.content = JSON.parse(article.content || '{}');
          
          const tags = await executeQuery(
            'SELECT tag_name FROM article_tags WHERE article_id = ?',
            [article.id]
          );
          article.tags = tags.map(t => t.tag_name);

          return article;
        })
      );

      return articlesWithTags;
    } catch (error) {
      logger.error('Search articles by tag error:', error);
      throw error;
    }
  }
}

module.exports = new KnowledgeModel();