# Firebase Setup Guide for NariCare App

## 🔥 Firebase Configuration Required

The application is currently showing a Firebase configuration error because it needs to be connected to a real Firebase project. Follow these steps to set up Firebase:

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: `NariCare-app` (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Add Web App to Firebase Project

1. In your Firebase project dashboard, click the **Web** icon (`</>`)
2. Register your app with nickname: `NariCare Web App`
3. **Don't** check "Set up Firebase Hosting" for now
4. Click "Register app"
5. Copy the Firebase configuration object

## Step 3: Update Environment Files

Replace the placeholder values in both environment files with your actual Firebase config:

### File: `src/environments/environment.ts`
```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: "AIzaSyC...", // Your actual API key
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
  },
  openaiApiKey: "sk-..." // Your OpenAI API key (optional for now)
};
```

### File: `src/environments/environment.prod.ts`
```typescript
// Same configuration as above but with production: true
```

## Step 4: Enable Firebase Services

### Authentication
1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable **Email/Password** provider
3. Click "Save"

### Firestore Database
1. Go to **Firestore Database**
2. Click "Create database"
3. Choose **Start in test mode** (for development)
4. Select a location close to your users
5. Click "Done"

### Cloud Messaging (for Push Notifications)
1. Go to **Cloud Messaging**
2. No additional setup needed initially

## Step 5: Set Up Firestore Security Rules

In Firestore Database > Rules, replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Chat rooms are readable by authenticated users
    match /chat-rooms/{roomId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid in resource.data.participants;
      
      match /messages/{messageId} {
        allow read, write: if request.auth != null;
      }
    }
    
    // Articles are readable by all authenticated users
    match /articles/{articleId} {
      allow read: if request.auth != null;
    }
    
    // Growth records are private to the user
    match /growth-records/{recordId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.recordedBy;
    }
    
    // Consultations are private to the user
    match /consultations/{consultationId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

## Step 6: Optional - Add Sample Data

You can add some sample data to test the app:

### Sample Article Categories
Go to Firestore > Start collection > `article-categories`:

```json
{
  "id": "breastfeeding-basics",
  "name": "Breastfeeding Basics",
  "description": "Essential information for new mothers",
  "icon": "heart",
  "color": "#e91e63"
}
```

### Sample Chat Room
Go to Firestore > Start collection > `chat-rooms`:

```json
{
  "id": "newborn-support",
  "name": "Newborn Support Group",
  "description": "Support for mothers with newborns (0-3 months)",
  "topic": "newborn",
  "isPrivate": false,
  "participants": [],
  "moderators": [],
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

## Step 7: Test the Configuration

1. Save your environment files
2. Restart the development server: `ionic serve`
3. Try to register a new account
4. Check Firebase Console > Authentication to see if users are being created

## 🔑 OpenAI API Key (Optional)

To enable the AI chatbot feature:

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add it to your environment files as `openaiApiKey`

## 🚨 Security Notes

- Never commit your actual API keys to version control
- Use environment variables in production
- Consider using Firebase App Check for additional security
- Review and update Firestore security rules based on your needs

## 📱 Mobile App Setup (Later)

For iOS/Android apps, you'll need to:
1. Add iOS/Android apps in Firebase Console
2. Download configuration files (GoogleService-Info.plist / google-services.json)
3. Follow Capacitor Firebase setup guides

---

After completing these steps, your app should connect to Firebase successfully and all authentication and database features will work properly.