export const environment = {
  production: false,
  beta: false,
  local: true,
  firebase: {
    apiKey: "AIzaSyCEy2gdTUlAxXOmeL2hLxBSk6BF38RB6dU",
    authDomain: "naricare-app.firebaseapp.com",
    projectId: "naricare-app",
    storageBucket: "naricare-app.firebasestorage.app",
    messagingSenderId: "382548282570",
    appId: "1:382548282570:web:3d735a09a72507813ef833",
    vapidKey: "BAQllRUKhBFunJM1QOZc_dmgEELQhietF3ll61fnClPDMMBcZtxx4FdUT1nRiKKRPkX94mGcDyGVjQmnhWmShPM" // Replace with actual VAPID key from Firebase Console
  },
  // Local Development API URL
  apiUrl: 'http://localhost:3000/api',
  
  // Encrypted OpenAI API Key - decrypt using EncryptionService
  encryptedOpenaiApiKey: "PQpfGjUCEwZRRB9XHzA5NBYYJQ9NcSgXbBcHE2RxEC8CGyF2DgISfEdXciZSADoNLCgwDhU1E2xABnJCZWQMCzYtIFgQIAdiAl4mFSYwMAwDDiwScXcXZzJEQW5jIz4BHiwIBhRcWFF8PT9UFDcROy0WTAd7chABak5MTgcMOgMADCckS1tZAhcAIUoLBAA/LFMwZxNuaRRFbGc2FCM/GRkqLX8IRXQ="
};