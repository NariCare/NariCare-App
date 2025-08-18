# NariCare API Postman Collection

This directory contains the Postman collection and environment files for testing the NariCare backend API.

## 📁 Files

- **`NariCare-API.postman_collection.json`** - Complete API collection with all endpoints
- **`NariCare-Environment.postman_environment.json`** - Environment variables for development
- **`README.md`** - This documentation file

## 🚀 Quick Start

### 1. Import into Postman

1. Open Postman
2. Click **Import** button
3. Drag and drop both JSON files or click **Upload Files**
4. Select both files:
   - `NariCare-API.postman_collection.json`
   - `NariCare-Environment.postman_environment.json`
5. Click **Import**

### 2. Set Environment

1. In Postman, click the environment dropdown (top right)
2. Select **"NariCare Development"**
3. Verify the `base_url` is set to `http://localhost:3000/api`

### 3. Start Testing

1. Make sure your backend server is running (`npm start` or `npm run dev`)
2. Start with the **Authentication** folder
3. Run **"Register User"** first
4. Then **"Login User"** (this will auto-save your JWT token)
5. Continue with other endpoints

## 🔐 Authentication Flow

### Basic Authentication
1. **Register User** → Creates new account
2. **Login User** → Returns JWT token (auto-saved to environment)
3. All subsequent requests use the saved JWT token automatically

### 2FA Authentication
1. **Enable 2FA** → Activates 2FA for user account
2. **Check your email** for the 6-digit OTP code
3. **Verify 2FA OTP** → Completes 2FA setup
4. **Future logins** will require OTP verification

## 📊 Testing Scenarios

### Complete User Journey
```
1. Register User
2. Login User
3. Create Baby Profile
4. Create Feed Record
5. Create Weight Record
6. Get Daily Summary
7. Join Chat Room
8. Send Message
9. Book Consultation
10. Get Timeline
```

### 2FA Testing
```
1. Login User
2. Enable 2FA
3. Check email for OTP
4. Verify OTP
5. Logout
6. Login again (now requires OTP)
```

### Crisis Intervention Testing
```
1. Create Crisis Check-in (use the test request)
2. Check server logs for crisis intervention
3. Verify email notifications sent
4. Check analytics for crisis events
```

## 🎯 Key Features

### Auto-Token Management
- JWT tokens are automatically extracted and saved after login
- All authenticated requests use the saved token
- No need to manually copy/paste tokens

### Environment Variables
- `{{base_url}}` - API server URL
- `{{jwt_token}}` - Authentication token (auto-saved)
- `{{user_id}}` - Current user ID (auto-saved)
- `{{baby_id}}` - Selected baby ID (auto-saved after creating baby)
- `{{expert_id}}` - Expert ID (auto-saved when getting experts)
- `{{consultation_id}}` - Consultation ID (auto-saved when booking)

### Smart Test Scripts
- Automatic extraction of IDs from responses
- Environment variable updates
- Console logging for debugging

## 📋 API Endpoints Overview

### 🔐 Authentication (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `POST /2fa/enable` - Enable 2FA
- `POST /2fa/verify` - Verify OTP
- `POST /2fa/resend-otp` - Resend OTP
- `POST /2fa/disable` - Disable 2FA
- `POST /refresh` - Refresh JWT token

### 👤 User Management (`/api/users`)
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile
- `PUT /notifications` - Update notification preferences

### 👶 Baby Management (`/api/babies`)
- `POST /` - Create baby
- `GET /` - Get user's babies
- `GET /:id` - Get baby by ID
- `PUT /:id` - Update baby
- `DELETE /:id` - Delete baby

### 📊 Growth Tracking (`/api/tracker`)
- `POST /growth-records` - Create feed record
- `GET /growth-records` - Get feed records
- `POST /weight-records` - Create weight record
- `GET /weight-records` - Get weight records
- `POST /stool-records` - Create stool record
- `POST /pumping-records` - Create pumping record
- `GET /daily-summary` - Get daily summary

### 💭 Emotion Check-ins (`/api/emotions`)
- `POST /checkins` - Create emotion check-in
- `GET /checkins` - Get emotion check-ins
- `GET /summary` - Get emotion summary

### 📚 Knowledge Base (`/api/knowledge`)
- `GET /categories` - Get categories
- `GET /articles` - Get articles
- `GET /articles/search` - Search articles
- `POST /bookmarks` - Bookmark article
- `GET /bookmarks` - Get bookmarks

### 💬 Chat System (`/api/chat`)
- `GET /rooms` - Get chat rooms
- `POST /rooms/:id/join` - Join room
- `POST /rooms/:id/messages` - Send message
- `GET /rooms/:id/messages` - Get messages

### 👩‍⚕️ Expert System (`/api/experts`)
- `GET /` - Get experts
- `GET /:id` - Get expert by ID
- `GET /:id/availability` - Get expert availability

### 📅 Consultations (`/api/consultations`)
- `POST /` - Book consultation
- `GET /` - Get user consultations
- `PUT /:id` - Update consultation
- `DELETE /:id` - Cancel consultation

### 📈 Timeline (`/api/timeline`)
- `GET /items` - Get timeline items
- `GET /baby/:id` - Get baby timeline
- `POST /baby/:id/progress` - Mark milestone completed
- `GET /baby/:id/milestones` - Get milestone summary

### 🔔 Notifications (`/api/notifications`)
- `POST /send` - Send push notification
- `POST /schedule` - Schedule notification
- `GET /` - Get user notifications

### 📊 Analytics (`/api/analytics`)
- `POST /events` - Track user event
- `GET /dashboard` - Get dashboard analytics
- `GET /features` - Get feature usage

## 🛠️ Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Make sure you've run the login request first
   - Check that JWT token is saved in environment variables
   - Verify the token hasn't expired

2. **404 Not Found**
   - Ensure the backend server is running on port 3000
   - Check the `base_url` environment variable
   - Verify the endpoint path is correct

3. **500 Internal Server Error**
   - Check server logs for detailed error messages
   - Verify database connection
   - Ensure all required environment variables are set

4. **2FA Issues**
   - Make sure SendGrid is properly configured
   - Check your email for OTP codes
   - Verify OTP hasn't expired (5 minutes)

### Environment Setup

Make sure your backend `.env` file includes:
```
# Database
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=naricare_db

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@naricare.app

# Server
PORT=3000
NODE_ENV=development
```

## 📞 Support

If you encounter issues:
1. Check the server logs for detailed error messages
2. Verify all environment variables are properly set
3. Ensure the database schema is properly created
4. Test the health check endpoint first

Happy testing! 🎉