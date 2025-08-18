const express = require('express');
const knowledgeController = require('../controllers/knowledgeController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateUUIDParam, validatePagination } = require('../middleware/validation');

const router = express.Router();

// Public routes (no authentication required)
router.get('/categories', knowledgeController.getCategories);
router.get('/articles', validatePagination, knowledgeController.getArticles);
router.get('/articles/:id', knowledgeController.getArticle);
router.get('/articles/category/:categoryId', knowledgeController.getArticlesByCategory);
router.get('/search', knowledgeController.searchArticles);

// Protected routes (authentication required)
router.use(protect);

// User bookmark routes
router.post('/bookmarks/:articleId', validateUUIDParam('articleId'), knowledgeController.addBookmark);
router.delete('/bookmarks/:articleId', validateUUIDParam('articleId'), knowledgeController.removeBookmark);
router.get('/bookmarks', knowledgeController.getUserBookmarks);

// Admin routes for content management
router.use(authorize('admin'));
router.post('/categories', knowledgeController.createCategory);
router.put('/categories/:id', knowledgeController.updateCategory);
router.delete('/categories/:id', knowledgeController.deleteCategory);
router.post('/articles', knowledgeController.createArticle);
router.put('/articles/:id', knowledgeController.updateArticle);
router.delete('/articles/:id', knowledgeController.deleteArticle);

module.exports = router;