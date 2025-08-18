const { executeQuery } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class KnowledgeService {
  // Get all categories
  async getCategories() {
    try {
      const categories = await executeQuery(
        'SELECT * FROM article_categories WHERE is_active = TRUE ORDER BY sort_order, name'
      );
      return categories;
    } catch (error) {
      logger.error('Get categories error:', error);
      throw error;
    }
  }

  // Get articles with filtering and pagination
  async getArticles(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        difficulty,
        featured,
        sortBy = 'published_at',
        sortOrder = 'DESC'
      } = options;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE 1=1';
      let queryParams = [];

      // Add filters
      if (category) {
        whereClause += ' AND a.category_id = ?';
        queryParams.push(category);
      }

      if (difficulty) {
        whereClause += ' AND a.difficulty = ?';
        queryParams.push(difficulty);
      }

      if (featured !== undefined) {
        whereClause += ' AND a.is_featured = ?';
        queryParams.push(featured);
      }

      // Add pagination params
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

      // Parse JSON content
      const parsedArticles = articles.map(article => ({
        ...article,
        content: JSON.parse(article.content)
      }));

      // Get total count for pagination
      const countParams = queryParams.slice(0, -2);
      const countResult = await executeQuery(
        `SELECT COUNT(*) as total FROM articles a ${whereClause}`,
        countParams
      );

      return {
        articles: parsedArticles,
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
      
      // Parse JSON content
      article.content = JSON.parse(article.content);

      // Get article tags
      const tags = await executeQuery(
        'SELECT tag_name FROM article_tags WHERE article_id = ?',
        [id]
      );

      article.tags = tags.map(tag => tag.tag_name);

      return article;
    } catch (error) {
      logger.error('Get article by ID error:', error);
      throw error;
    }
  }

  // Get articles by category
  async getArticlesByCategory(categoryId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'published_at',
        sortOrder = 'DESC'
      } = options;

      return await this.getArticles({
        page,
        limit,
        category: categoryId,
        sortBy,
        sortOrder
      });
    } catch (error) {
      logger.error('Get articles by category error:', error);
      throw error;
    }
  }

  // Search articles
  async searchArticles(query, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        difficulty,
        tags
      } = options;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE 1=1';
      let queryParams = [];

      // Add search query
      if (query) {
        whereClause += ' AND (MATCH(a.title, a.summary) AGAINST(? IN NATURAL LANGUAGE MODE) OR a.title LIKE ? OR a.summary LIKE ?)';
        queryParams.push(query, `%${query}%`, `%${query}%`);
      }

      // Add filters
      if (category) {
        whereClause += ' AND a.category_id = ?';
        queryParams.push(category);
      }

      if (difficulty) {
        whereClause += ' AND a.difficulty = ?';
        queryParams.push(difficulty);
      }

      if (tags && tags.length > 0) {
        const tagPlaceholders = tags.map(() => '?').join(',');
        whereClause += ` AND a.id IN (SELECT article_id FROM article_tags WHERE tag_name IN (${tagPlaceholders}))`;
        queryParams.push(...tags);
      }

      // Add pagination params
      queryParams.push(limit, offset);

      const articles = await executeQuery(
        `SELECT a.*, ac.name as category_name, ac.icon as category_icon, ac.color as category_color
         FROM articles a
         JOIN article_categories ac ON a.category_id = ac.id
         ${whereClause}
         ORDER BY a.published_at DESC
         LIMIT ? OFFSET ?`,
        queryParams
      );

      // Parse JSON content
      const parsedArticles = articles.map(article => ({
        ...article,
        content: JSON.parse(article.content)
      }));

      // Get total count
      const countParams = queryParams.slice(0, -2);
      const countResult = await executeQuery(
        `SELECT COUNT(*) as total FROM articles a ${whereClause}`,
        countParams
      );

      // Generate facets for search results
      const facets = await this.generateSearchFacets(whereClause, countParams);

      return {
        articles: parsedArticles,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        },
        facets
      };
    } catch (error) {
      logger.error('Search articles error:', error);
      throw error;
    }
  }

  // Generate search facets
  async generateSearchFacets(whereClause, params) {
    try {
      // Get category facets
      const categoryFacets = await executeQuery(
        `SELECT ac.name, COUNT(*) as count
         FROM articles a
         JOIN article_categories ac ON a.category_id = ac.id
         ${whereClause}
         GROUP BY ac.id, ac.name
         ORDER BY count DESC`,
        params
      );

      // Get difficulty facets
      const difficultyFacets = await executeQuery(
        `SELECT a.difficulty, COUNT(*) as count
         FROM articles a
         ${whereClause}
         GROUP BY a.difficulty
         ORDER BY count DESC`,
        params
      );

      // Get tag facets
      const tagFacets = await executeQuery(
        `SELECT at.tag_name, COUNT(*) as count
         FROM articles a
         JOIN article_tags at ON a.id = at.article_id
         ${whereClause}
         GROUP BY at.tag_name
         ORDER BY count DESC
         LIMIT 20`,
        params
      );

      return {
        categories: categoryFacets.reduce((acc, item) => {
          acc[item.name] = item.count;
          return acc;
        }, {}),
        difficulty: difficultyFacets.reduce((acc, item) => {
          acc[item.difficulty] = item.count;
          return acc;
        }, {}),
        tags: tagFacets.reduce((acc, item) => {
          acc[item.tag_name] = item.count;
          return acc;
        }, {})
      };
    } catch (error) {
      logger.error('Generate search facets error:', error);
      return { categories: {}, difficulty: {}, tags: {} };
    }
  }

  // Add bookmark
  async addBookmark(userId, articleId) {
    try {
      // Check if article exists
      const articles = await executeQuery(
        'SELECT id FROM articles WHERE id = ?',
        [articleId]
      );

      if (articles.length === 0) {
        throw new Error('Article not found');
      }

      // Check if bookmark already exists
      const existingBookmarks = await executeQuery(
        'SELECT id FROM user_bookmarks WHERE user_id = ? AND article_id = ?',
        [userId, articleId]
      );

      if (existingBookmarks.length > 0) {
        throw new Error('Article already bookmarked');
      }

      // Create bookmark
      await executeQuery(
        'INSERT INTO user_bookmarks (id, user_id, article_id, created_at) VALUES (?, ?, ?, NOW())',
        [uuidv4(), userId, articleId]
      );

      logger.info('Bookmark added', { userId, articleId });

      return { message: 'Article bookmarked successfully' };
    } catch (error) {
      logger.error('Add bookmark error:', error);
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

      if (result.affectedRows === 0) {
        throw new Error('Bookmark not found');
      }

      logger.info('Bookmark removed', { userId, articleId });

      return { message: 'Bookmark removed successfully' };
    } catch (error) {
      logger.error('Remove bookmark error:', error);
      throw error;
    }
  }

  // Get user bookmarks
  async getUserBookmarks(userId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      const bookmarks = await executeQuery(
        `SELECT a.*, ac.name as category_name, ac.icon as category_icon, 
                ac.color as category_color, ub.created_at as bookmarked_at
         FROM user_bookmarks ub
         JOIN articles a ON ub.article_id = a.id
         JOIN article_categories ac ON a.category_id = ac.id
         WHERE ub.user_id = ?
         ORDER BY ub.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );

      // Parse JSON content
      const parsedBookmarks = bookmarks.map(bookmark => ({
        ...bookmark,
        content: JSON.parse(bookmark.content)
      }));

      // Get total count
      const countResult = await executeQuery(
        'SELECT COUNT(*) as total FROM user_bookmarks WHERE user_id = ?',
        [userId]
      );

      return {
        bookmarks: parsedBookmarks,
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

  // Admin: Create category
  async createCategory(categoryData) {
    try {
      const { id, name, description, icon, color, sortOrder } = categoryData;

      await executeQuery(
        `INSERT INTO article_categories 
         (id, name, description, icon, color, sort_order, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [id, name, description, icon, color, sortOrder || 0]
      );

      return await this.getCategoryById(id);
    } catch (error) {
      logger.error('Create category error:', error);
      throw error;
    }
  }

  // Get category by ID
  async getCategoryById(id) {
    try {
      const categories = await executeQuery(
        'SELECT * FROM article_categories WHERE id = ?',
        [id]
      );
      return categories.length > 0 ? categories[0] : null;
    } catch (error) {
      logger.error('Get category by ID error:', error);
      throw error;
    }
  }
}

module.exports = new KnowledgeService();