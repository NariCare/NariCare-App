# NariCare - Breastfeeding Support Application

A comprehensive cross-platform breastfeeding support application built with Ionic and Angular, designed to assist new mothers through expert support, peer interaction, and data-driven insights.

## 🚀 Features

### Core Functionality
- **User Authentication**: Secure login/register with tier-based access control
- **Onboarding Flow**: Guided setup for new mothers with baby information
- **GPT-Powered Chatbot**: AI assistant for breastfeeding support with expert fallback
- **Knowledge Base**: Categorized articles with search and filtering
- **Mom-to-Mom Chat**: Real-time group chat with expert moderation
- **Growth Tracking**: Baby measurement logging with visual progress charts
- **Expert Consultations**: Scheduled 1:1 calls with lactation consultants
- **Push Notifications**: Configurable notifications for updates and reminders

### User Tiers
- **Basic (Free)**: Knowledge base and community chat access
- **1-Month Program**: Basic features + 2 expert consultations
- **3-Month Program**: Extended support + 6 consultations + priority access

## 🛠️ Technology Stack

- **Frontend**: Ionic 7 with Angular 17
- **Backend**: Firebase/Firestore for real-time data
- **Authentication**: Firebase Auth
- **AI Integration**: OpenAI GPT API
- **Push Notifications**: Firebase Cloud Messaging
- **Mobile**: Capacitor for iOS and Android
- **Styling**: SCSS with custom design system

## 📱 Platform Support

- iOS (iPhone and iPad)
- Android (Phone and Tablet)
- Progressive Web App (Desktop and Mobile browsers)

## 🔧 Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Ionic CLI (`npm install -g @ionic/cli`)
- Capacitor CLI (included in dependencies)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/NariCare/breastfeeding-support.git
   cd breastfeeding-support
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Authentication, Firestore, and Cloud Messaging
   - Update `src/environments/environment.ts` with your Firebase config

4. **Configure OpenAI**
   - Get an API key from https://platform.openai.com
   - Add your API key to the environment files

5. **Run the application**
   ```bash
   ionic serve
   ```

## 📦 Building for Production

### Web Build
```bash
ionic build --prod
```

### iOS Build
```bash
ionic capacitor add ios
ionic capacitor build ios
ionic capacitor open ios
```

### Android Build
```bash
ionic capacitor add android
ionic capacitor build android
ionic capacitor open android
```

## 🏗️ Project Structure

```
src/
├── app/
│   ├── guards/           # Route guards
│   ├── models/           # TypeScript interfaces
│   ├── pages/            # Application pages
│   │   ├── auth/         # Authentication pages
│   │   └── onboarding/   # User onboarding
│   ├── services/         # Business logic services
│   └── tabs/             # Main application tabs
├── assets/               # Static assets
├── environments/         # Environment configurations
├── global.scss          # Global styles
└── theme/               # Ionic theme variables
```

## 🔐 Environment Configuration

Create your environment files with the following structure:

```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
  },
  openaiApiKey: "your-openai-api-key"
};
```

## 🎨 Design System

The application uses a maternal-focused design system with:
- **Primary Color**: Pink (#8383ed)
- **Secondary Color**: Teal (#26A69A)
- **Accent Colors**: Warm orange and soft blues
- **Typography**: Inter font family
- **Components**: Custom Ionic components with consistent styling

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run e2e

# Linting
npm run lint
```

## 📱 Mobile Features

- **Offline Support**: Service worker for offline article access
- **Push Notifications**: Real-time notifications for messages and reminders
- **Native Features**: Camera access, local storage, and device APIs
- **Responsive Design**: Optimized for all screen sizes

## 🔒 Security & Privacy

- **Data Encryption**: All sensitive data is encrypted
- **HIPAA Compliance**: Medical data handling follows privacy regulations
- **Secure Authentication**: Firebase Auth with proper session management
- **API Security**: Secure endpoints with proper authentication

## 🌐 Deployment

### Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
ionic build --prod
firebase deploy
```

### App Stores
- Follow platform-specific guidelines for iOS App Store and Google Play Store
- Use Capacitor for native app builds
- Configure proper app icons, splash screens, and metadata

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Support

For support and questions:
- Email: support@NariCare.app
- Documentation: https://docs.NariCare.app
- Community: https://community.NariCare.app

## 🙏 Acknowledgments

- Ionic Framework team for the excellent mobile development platform
- Firebase team for backend services
- OpenAI for AI integration capabilities
- The breastfeeding and lactation consultant community for guidance

---

Made with ❤️ for mothers everywhere