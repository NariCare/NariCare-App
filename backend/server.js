require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const db = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const babyRoutes = require('./routes/babyRoutes');
const trackerRoutes = require('./routes/trackerRoutes');
const emotionRoutes = require('./routes/emotionRoutes');
const knowledgeRoutes = require('./routes/knowledgeRoutes');
const chatRoutes = require('./routes/chatRoutes');
const expertRoutes = require('./routes/expertRoutes');
const consultationRoutes = require('./routes/consultationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const timelineRoutes = require('./routes/timelineRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:8100',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: require('./package.json').version
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/babies', babyRoutes);
app.use('/api/tracker', trackerRoutes);
app.use('/api/emotions', emotionRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/experts', expertRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/timeline', timelineRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET /health',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/auth/2fa/enable',
      'POST /api/auth/2fa/verify',
      'GET /api/users/profile',
      'GET /api/babies',
      'POST /api/tracker/feed',
      'GET /api/knowledge/articles'
    ]
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  try {
    await db.end();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections:', error);
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  try {
    await db.end();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections:', error);
  }
  
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 NariCare API server running on port ${PORT}`);
  logger.info(`📊 Health check available at http://localhost:${PORT}/health`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
  
  // Test database connection on startup
  db.getConnection()
    .then(connection => {
      logger.info('✅ Database connection successful');
      connection.release();
    })
    .catch(err => {
      logger.error('❌ Database connection failed:', err.message);
    });
});

module.exports = app;