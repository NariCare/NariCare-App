const { v4: uuidv4 } = require('uuid');
const knowledgeService = require('../services/knowledgeService');
const logger = require('../utils/logger');

class KnowledgeController {
  // Get all categories
  async getCategories(req, res, next) {
    try {
      const categories = await knowledgeService.getCategories();
      
      res.status(200).json({
        success: true,
        data: categories
      });
    } catch (error) {
      next(error);
    }
  }

  // Get articles with filtering and pagination
  async getArticles(req, res, next) {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        category: req.query.category,
        difficulty: req.query.difficulty,
        featured: req.query.featured === 'true',
        sortBy: req.query.sortBy || 'published_at',
        sortOrder: req.query.sortOrder || 'DESC'
      };

      const result = await knowledgeService.getArticles(options);
      
      res.status(200).json({
        success: true,
        data: result.articles,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  // Get single article
  async getArticle(req, res, next) {
    try {
      const { id } = req.params;
      const article = await knowledgeService.getArticleById(id);
      
      if (!article) {
        return res.status(404).json({
          success: false,
          error: 'Article not found'
        });
      }

      res.status(200).json({
        success: true,
        data: article
      });
    } catch (error) {
      next(error);
    }
  }

  // Get articles by category
  async getArticlesByCategory(req, res, next) {
    try {
      const { categoryId } = req.params;
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sortBy: req.query.sortBy || 'published_at',
        sortOrder: req.query.sortOrder || 'DESC'
      };

      const result = await knowledgeService.getArticlesByCategory(categoryId, options);
      
      res.status(200).json({
        success: true,
        data: result.articles,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  // Search articles
  async searchArticles(req, res, next) {
    try {
      const { q: query, category, difficulty, tags } = req.query;
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20
      };

      const result = await knowledgeService.searchArticles(query, {
        category,
        difficulty,
        tags: tags ? tags.split(',') : null,
        ...options
      });
      
      res.status(200).json({
        success: true,
        data: result.articles,
        pagination: result.pagination,
        facets: result.facets
      });
    } catch (error) {
      next(error);
    }
  }

  // Add bookmark (protected)
  async addBookmark(req, res, next) {
    try {
      const userId = req.user.id;
      const { articleId } = req.params;

      const result = await knowledgeService.addBookmark(userId, articleId);
      
      res.status(201).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Remove bookmark (protected)
  async removeBookmark(req, res, next) {
    try {
      const userId = req.user.id;
      const { articleId } = req.params;

      const result = await knowledgeService.removeBookmark(userId, articleId);
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Get user bookmarks (protected)
  async getUserBookmarks(req, res, next) {
    try {
      const userId = req.user.id;
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20
      };

      const result = await knowledgeService.getUserBookmarks(userId, options);
      
      res.status(200).json({
        success: true,
        data: result.bookmarks,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Create category
  async createCategory(req, res, next) {
    try {
      const categoryData = {
        id: req.body.id || uuidv4(),
        ...req.body
      };

      const category = await knowledgeService.createCategory(categoryData);
      
      logger.info('Category created', { 
        categoryId: category.id, 
        createdBy: req.user.id 
      });

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Update category
  async updateCategory(req, res, next) {
    try {
      const { id } = req.params;
      const category = await knowledgeService.updateCategory(id, req.body);
      
      if (!category) {
        return res.status(404).json({
          success: false,
          error: 'Category not found'
        });
      }

      logger.info('Category updated', { 
        categoryId: id, 
        updatedBy: req.user.id 
      });

      res.status(200).json({
        success: true,
        message: 'Category updated successfully',
        data: category
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Delete category
  async deleteCategory(req, res, next) {
    try {
      const { id } = req.params;
      const result = await knowledgeService.deleteCategory(id);
      
      logger.info('Category deleted', { 
        categoryId: id, 
        deletedBy: req.user.id 
      });

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Create article
  async createArticle(req, res, next) {
    try {
      const articleData = {
        id: req.body.id || uuidv4(),
        author: req.body.author || `${req.user.first_name} ${req.user.last_name}`,
        publishedAt: new Date(),
        ...req.body
      };

      const article = await knowledgeService.createArticle(articleData);
      
      logger.info('Article created', { 
        articleId: article.id, 
        createdBy: req.user.id 
      });

      res.status(201).json({
        success: true,
        message: 'Article created successfully',
        data: article
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Update article
  async updateArticle(req, res, next) {
    try {
      const { id } = req.params;
      const article = await knowledgeService.updateArticle(id, req.body);
      
      if (!article) {
        return res.status(404).json({
          success: false,
          error: 'Article not found'
        });
      }

      logger.info('Article updated', { 
        articleId: id, 
        updatedBy: req.user.id 
      });

      res.status(200).json({
        success: true,
        message: 'Article updated successfully',
        data: article
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Delete article
  async deleteArticle(req, res, next) {
    try {
      const { id } = req.params;
      const result = await knowledgeService.deleteArticle(id);
      
      logger.info('Article deleted', { 
        articleId: id, 
        deletedBy: req.user.id 
      });

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new KnowledgeController();