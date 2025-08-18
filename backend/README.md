# NariCare Backend API

A comprehensive Node.js Express.js backend for the NariCare breastfeeding support application with 2-Factor Authentication, CRUD operations, and crisis intervention features.

## 🚀 Features

### Core Functionality
- **JWT Authentication**: Secure token-based authentication with refresh tokens
- **2-Factor Authentication**: Email-based OTP using SendGrid
- **Role-Based Access Control**: User, Expert, and Admin roles
- **Comprehensive CRUD APIs**: Full coverage for all application modules
- **Crisis Intervention**: Automated detection and response for mental health concerns
- **Real-time Notifications**: Email notifications for various events
- **Data Analytics**: Growth tracking, emotion trends, and user engagement metrics

### Security Features
- **Password Hashing**: bcrypt with configurable rounds
- **Rate Limiting**: Configurable request limits per IP
- **Input Validation**: Comprehensive validation using express-validator
- **SQL Injection Protection**: Parameterized queries
- **CORS Protection**: Configurable cross-origin resource sharing
- **Helmet Security**: Security headers and XSS protection

### Database Integration
- **MySQL Connection Pooling**: Efficient database connections
- **Transaction Support**: ACID compliance for complex operations
- **Audit Logging**: Complete audit trail for sensitive operations
- **Data Integrity**: Foreign key constraints and validation

## 📁 Project Structure

```
backend/
├── config/
│   └── database.js              # Database connection and configuration
├── controllers/
│   ├── authController.js        # Authentication endpoints
│   ├── babyController.js        # Baby management
│   ├── trackerController.js     # Growth and feeding tracking
│   ├── emotionController.js     # Emotion check-ins and crisis intervention
│   ├── userController.js        # User profile management
│   └── ...                     # Other module controllers
├── middleware/
│   ├── authMiddleware.js        # JWT verification and authorization
│   ├── twoFactorAuthMiddleware.js # 2FA verification
│   ├── validation.js            # Input validation rules
│   └── errorHandler.js          # Global error handling
├── models/
│   ├── userModel.js             # User data access layer
│   ├── babyModel.js             # Baby data access layer
│   ├── growthRecordModel.js     # Growth tracking data access
│   └── ...                     # Other model files
├── routes/
│   ├── authRoutes.js            # Authentication routes
│   ├── babyRoutes.js            # Baby management routes
│   ├── trackerRoutes.js         # Tracking routes
│   └── ...                     # Other route files
├── services/
│   ├── authService.js           # Authentication business logic
│   ├── sendgridService.js       # Email service integration
│   ├── emotionService.js        # Emotion tracking and crisis intervention
│   └── ...                     # Other service files
├── utils/
│   └── logger.js                # Winston logging configuration
├── logs/                        # Log files (auto-created)
├── .env.example                 # Environment variables template
├── package.json                 # Dependencies and scripts
├── server.js                    # Main application entry point
└── README.md                    # This file
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- MySQL (v8.0 or higher)
- SendGrid account and API key

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
# Database
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=naricare_db

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=24h

# SendGrid
SENDGRID_API_KEY=SG.your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@naricare.app

# Server
PORT=3000
NODE_ENV=development
```

### 3. Database Setup
Ensure your MySQL database is running and execute the schema:
```bash
mysql -u your_user -p naricare_db < ../database/naricare_schema.sql
```

### 4. Start the Server
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "Jane",
  "lastName": "Doe",
  "phoneNumber": "+1234567890",
  "whatsappNumber": "+1234567890",
  "motherType": "new_mom"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

#### Enable 2FA
```http
POST /api/auth/2fa/enable
Authorization: Bearer <jwt_token>
```

#### Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456",
  "action": "login"
}
```

### Baby Management Endpoints

#### Create Baby
```http
POST /api/babies
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Emma",
  "dateOfBirth": "2024-12-01",
  "gender": "female",
  "birthWeight": 3.2,
  "birthHeight": 50.0
}
```

#### Get User's Babies
```http
GET /api/babies?page=1&limit=10
Authorization: Bearer <jwt_token>
```

### Growth Tracking Endpoints

#### Create Feed Record
```http
POST /api/tracker/feed
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "babyId": "baby-uuid",
  "feedTypes": ["direct"],
  "directFeedDetails": {
    "startTime": "08:30",
    "breastSide": "both",
    "duration": 25,
    "painLevel": 0
  },
  "notes": "Great feeding session!"
}
```

#### Get Feed Records
```http
GET /api/tracker/feed/{babyId}?page=1&limit=20&startDate=2024-01-01
Authorization: Bearer <jwt_token>
```

### Emotion Check-in Endpoints

#### Create Emotion Check-in
```http
POST /api/emotions/checkin
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "selectedStruggles": [
    {"id": "tired", "text": "I feel exhausted", "emoji": "😴", "category": "physical"}
  ],
  "selectedPositiveMoments": [
    {"id": "bonding", "text": "Special connection", "emoji": "🥰", "category": "bonding"}
  ],
  "gratefulFor": "My baby's smile this morning",
  "proudOfToday": "Successfully breastfeeding for 6 weeks"
}
```

## 🔐 Security Features

### 2-Factor Authentication Flow

1. **User enables 2FA**: `POST /api/auth/2fa/enable`
   - Sends OTP to user's email
   - User verifies OTP to complete setup

2. **Login with 2FA enabled**:
   - User provides email/password: `POST /api/auth/login`
   - System sends OTP to email (returns `requiresTwoFactor: true`)
   - User provides OTP: `POST /api/auth/verify-otp`
   - System returns JWT tokens

3. **OTP Management**:
   - OTPs expire after 10 minutes (configurable)
   - Maximum 3 attempts before account lock
   - Resend OTP: `POST /api/auth/resend-otp`

### Crisis Intervention System

The system automatically detects concerning thoughts in emotion check-ins:

- **Moderate concerns**: Logs intervention, provides resources
- **High concerns**: Triggers expert notification
- **Critical concerns**: Sends immediate crisis intervention email with hotline numbers

Resources provided:
- Crisis Hotline: 988
- Emergency Services: 911
- Crisis Text Line: 741741
- Maternal Mental Health Hotline: 1-833-9-HELP4MOMS
- Local resources link

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | MySQL host | localhost |
| `DB_USER` | MySQL username | - |
| `DB_PASSWORD` | MySQL password | - |
| `DB_NAME` | Database name | naricare_db |
| `JWT_SECRET` | JWT signing secret | - |
| `SENDGRID_API_KEY` | SendGrid API key | - |
| `OTP_EXPIRY_MINUTES` | OTP expiration time | 10 |
| `MAX_OTP_ATTEMPTS` | Max failed OTP attempts | 3 |
| `BCRYPT_ROUNDS` | Password hashing rounds | 12 |
| `RATE_LIMIT_MAX_REQUESTS` | Rate limit per window | 100 |

### Logging

The application uses Winston for logging:
- **Development**: Console + file logging
- **Production**: File logging only
- **Log files**: `logs/combined.log`, `logs/error.log`
- **Log rotation**: 5MB max file size, 5 files retained

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 📊 Monitoring & Analytics

### Health Check
```http
GET /health
```

Returns server status, uptime, and version information.

### User Analytics
The system tracks:
- User engagement metrics
- Feature usage statistics
- Growth tracking consistency
- Emotion wellness trends
- Crisis intervention effectiveness

## 🚀 Deployment

### Production Checklist

1. **Environment Variables**: Set all production values in `.env`
2. **Database**: Ensure production MySQL is configured and accessible
3. **SendGrid**: Verify sender email and domain authentication
4. **SSL/TLS**: Configure HTTPS for production
5. **Process Management**: Use PM2 or similar for process management
6. **Monitoring**: Set up application monitoring and alerting
7. **Backups**: Configure automated database backups

### Docker Deployment (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Follow the established project structure
2. Add comprehensive error handling
3. Include input validation for all endpoints
4. Write unit tests for new features
5. Update API documentation
6. Follow security best practices

## 📄 License

This project is licensed under the MIT License - see the main project LICENSE file for details.

## 🆘 Support

For backend-specific issues:
- Check logs in `logs/` directory
- Verify environment variables
- Ensure database connectivity
- Review SendGrid configuration

For general support: support@naricare.app

---

Made with ❤️ for mothers everywhere