# Claude Context File - NariCare App

This file contains long-term context and design decisions for the NariCare breastfeeding support app.

## Project Overview

**App Name**: NariCare  
**Tagline**: "Your breast friend"  
**Purpose**: Comprehensive breastfeeding support app for new mothers  
**Tech Stack**: Ionic 7 + Angular 17, Firebase, Capacitor  

## Brand Identity & Design System

### Logo & Branding
- **Logo**: Stylized mother and baby icon in teardrop shape
- **Primary Brand Colors**: Purple (#8383ed) and coral (#ff9e88)
- **Design Language**: Clean, maternal-focused, warm and accessible
- **Target Audience**: New mothers, breastfeeding mothers

### Design Resources
- **Figma Files Location**: `/Users/davindersingh/NariCare/figma-designs/`
- **Key Design Files**:
  - `Login.png` - Authentication screens with form layouts
  - `Button Primary.png` - Primary button styling
  - `Color.png` - Complete color palette with hex codes
  - `Typography.png` - Font specifications (Poppins)
  - `Tracker.png` - Main tracking interface with cards
  - `Vertical Card.png` - Feed type selection components
  - `iPhone 16 Pro - 5.png` - Complete mobile interface mockup
  - `NariCare logo.svg` - Brand logo in vector format
  - Icon files: `Feed.svg`, `Diaper change.svg`, `Weight.svg`, `Pump.svg`, `Emotional check-in.svg`

### Color Palette (Updated 2024)
```scss
// Primary Colors
--ion-color-primary: #8383ed;        // Purple - main brand color
--ion-color-secondary: #ff9e88;      // Coral - accent color
--ion-color-tertiary: #fff1b6;       // Light yellow - backgrounds

// Support Colors
--ion-color-success: #28b2c7;        // Teal - success states
--ion-color-warning: #ffb37c;        // Light orange - warnings
--ion-color-danger: #ed3241;         // Red - errors

// Neutral Colors (Purple-tinted)
Step 50: #ffffff     Step 550: #a7a1c7
Step 100: #fbf9fe    Step 600: #9892bd
Step 150: #8383ed    Step 700: #7a73a9
Step 200: #f8f6fc    Step 800: #5c5595
Step 300: #f2f0f8    Step 900: #3e3681
Step 400: #d4d0e5    Step 950: #2f2777
```

### Typography
- **Primary Font**: Poppins
- **Font Weights**: Regular (400), Medium (500), Semi Bold (600), Bold (700), Extra Bold (800)
- **Scale**: H1 (24px) to H5 (12px), Body XL (18px) to XS (10px)

### UI Component Categories

#### Tracker Cards (Color-coded)
- **Feed Tracking**: Pink (#ff9e88 variants)
- **Diaper Change**: Purple (#8383ed variants)  
- **Weight Tracking**: Yellow (#fff1b6 variants)
- **Pump Sessions**: Teal (#28b2c7 variants)
- **Emotional Check-in**: Yellow (#fff1b6 variants)

#### Navigation Structure
- **Bottom Tab Bar**: 5 main sections
  1. Home/Dashboard
  2. Learn (Educational content)
  3. Chat (Community)
  4. Tracker (Main feature)
  5. Profile (Settings)

## Architecture Insights

### Key Features
- **Authentication**: Firebase Auth with 2FA support
- **Real-time Data**: Firestore for live updates
- **Multi-baby Support**: Track multiple children
- **Growth Charts**: Highcharts integration
- **AI Integration**: OpenAI GPT for support
- **Video Consultations**: Expert appointments
- **Community Chat**: Peer support

### Data Models
- **User**: Tier-based access (Basic, 1-Month, 3-Month)
- **GrowthTracking**: Baby measurements over time  
- **Chat**: Real-time messaging system
- **Consultation**: Video appointment scheduling

### File Structure Understanding
```
src/app/
├── guards/           # Auth protection
├── models/           # TypeScript interfaces
├── pages/           # Feature pages
│   ├── auth/        # Login/register
│   ├── onboarding/  # Setup flow
│   └── tabs/        # Main navigation
├── services/        # Business logic
└── components/      # Reusable UI
```

## Design Patterns & Conventions

### Component Naming
- All components end with "Page" or "Component" (ESLint enforced)
- Use "app" prefix with kebab-case selectors
- Modals for forms and data entry

### Color Usage Guidelines
- **Primary Purple**: Main actions, buttons, headers
- **Coral Secondary**: Accents, highlights, secondary actions
- **Light Yellow**: Backgrounds, cards, gentle emphasis
- **Teal Success**: Confirmations, completed actions
- **Orange Warning**: Alerts, important notices
- **Red Danger**: Errors, destructive actions

### Accessibility Standards
- High contrast ratios maintained
- Dark text on light backgrounds
- Purple-tinted neutrals for cohesive feel
- Proper focus states and keyboard navigation

## Development Context

### Recently Updated (Current Session)
- ✅ Updated variables.scss with new color palette
- ✅ Updated global.scss with matching colors and Poppins font
- ✅ Established purple-tinted design system
- ✅ Fixed background colors and step gradients

### Current Branch Status
- **Working Branch**: `ux-mockup`
- **Main Branch**: `master`
- **Last Commits**: Consultation module updates, chat WebSocket implementation

### Key Considerations
- Mobile-first responsive design
- PWA capabilities with offline support
- iOS/Android native builds via Capacitor  
- Firebase security rules for data isolation
- Encrypted OpenAI API integration

## User Experience Flow

### Onboarding Journey
1. Welcome screen with brand introduction
2. Account creation (email/social login)
3. Baby profile setup
4. Initial preferences
5. First tracking session tutorial

### Core User Actions
- **Daily Tracking**: Feed, diaper, weight, mood
- **Growth Monitoring**: Charts and milestone tracking
- **Learning**: Articles and educational content
- **Community**: Chat and peer support
- **Expert Help**: Video consultations

### Emotional Considerations
- New mothers are often stressed and sleep-deprived
- Need quick, intuitive interactions
- Warm, supportive tone throughout
- Celebration of small wins and progress
- Non-judgmental tracking and guidance

## Technical Decisions Log

### Color System Rationale
- Moved from pink (#e91e63) to purple (#8383ed) for more professional feel
- Purple conveys trust, wisdom, and calm
- Coral secondary adds warmth and friendliness
- Tinted neutrals create cohesive visual hierarchy

### Font Choice
- Poppins selected for readability and modern feel
- Geometric sans-serif works well for mobile interfaces
- Multiple weights available for hierarchy

## Future Considerations

### Potential Features
- Apple Health/Google Fit integration
- Wearable device connectivity
- AI-powered insights and recommendations
- Telehealth provider integrations
- Multiple language support

### Design Evolution
- Consider seasonal color themes
- Accessibility improvements for vision impaired users
- Voice interaction capabilities
- Gesture-based navigation enhancements

---

**Last Updated**: 2024-08-26  
**Context Version**: 1.0  
**Next Review**: When major features are added or design changes occur