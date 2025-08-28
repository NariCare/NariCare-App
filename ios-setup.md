# iOS Push Notification Setup

## 1. Generate the iOS project (if not already done):
```bash
ionic capacitor add ios
ionic capacitor sync ios
```

## 2. Add GoogleService-Info.plist file:
- Go to Firebase Console → Project Settings → General
- Under "Your apps" section, add an iOS app
- Enter your iOS Bundle ID (e.g., io.ionic.starter or your custom bundle ID)
- Download `GoogleService-Info.plist`
- Open Xcode: `ionic capacitor open ios`
- Drag `GoogleService-Info.plist` into the App folder in Xcode (make sure "Add to target" is checked)

## 3. Configure Capabilities in Xcode:
- Open your project in Xcode
- Select your app target
- Go to "Signing & Capabilities" tab
- Click "+ Capability" and add:
  - **Push Notifications**
  - **Background Modes** (check "Remote notifications")

## 4. Update AppDelegate.swift:
Replace the content of `ios/App/App/AppDelegate.swift`:

```swift
import UIKit
import Capacitor
import Firebase
import FirebaseMessaging

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        
        // Initialize Firebase
        FirebaseApp.configure()
        
        // Set up push notifications
        setupPushNotifications(application)

        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url.
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
    
    // MARK: - Push Notifications Setup
    
    private func setupPushNotifications(_ application: UIApplication) {
        // Set the messaging delegate
        Messaging.messaging().delegate = self
        
        // Request permission for notifications
        let authOptions: UNAuthorizationOptions = [.alert, .badge, .sound]
        UNUserNotificationCenter.current().requestAuthorization(
            options: authOptions,
            completionHandler: { granted, error in
                if granted {
                    print("Push notification permission granted")
                } else {
                    print("Push notification permission denied")
                }
            }
        )

        // Register for remote notifications
        application.registerForRemoteNotifications()
        
        // Set the notification center delegate
        UNUserNotificationCenter.current().delegate = self
    }
    
    // MARK: - Remote Notifications
    
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
    }
    
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("Failed to register for remote notifications: \(error)")
    }
}

// MARK: - MessagingDelegate

extension AppDelegate: MessagingDelegate {
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }
        print("FCM Registration Token: \(token)")
        
        // Send token to your server
        sendTokenToServer(token)
    }
    
    private func sendTokenToServer(_ token: String) {
        // Implement your API call to send token to server
        // You can use URLSession, Alamofire, or any HTTP client
        print("Sending FCM token to server: \(token)")
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension AppDelegate: UNUserNotificationCenterDelegate {
    // Handle notification when app is in foreground
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        // Show notification even when app is in foreground
        completionHandler([.alert, .badge, .sound])
    }
    
    // Handle notification tap
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        handleNotificationAction(userInfo)
        completionHandler()
    }
    
    private func handleNotificationAction(_ userInfo: [AnyHashable: Any]) {
        // Handle notification tap based on the data
        if let type = userInfo["type"] as? String {
            switch type {
            case "consultation":
                // Navigate to consultation
                break
            case "chat":
                // Navigate to chat
                break
            default:
                // Navigate to home
                break
            }
        }
    }
}
```

## 5. Update Info.plist:
Add these keys to `ios/App/App/Info.plist`:
```xml
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
</array>
<key>FirebaseAppDelegateProxyEnabled</key>
<false/>
```

## 6. Add Firebase SDK dependencies:
In Xcode, go to:
- File → Add Package Dependencies
- Add: `https://github.com/firebase/firebase-ios-sdk`
- Select these products:
  - FirebaseMessaging
  - FirebaseAnalytics (optional)

Or add to `ios/App/Podfile`:
```ruby
target 'App' do
  capacitor_pods
  # Add your Pods here
  pod 'Firebase/Messaging'
end
```

Then run:
```bash
cd ios/App && pod install
```

## 7. Configure Apple Push Notification service (APNs):
- Go to Apple Developer Console
- Create an APNs certificate or key
- Upload the certificate/key to Firebase Console:
  - Project Settings → Cloud Messaging → iOS app
  - Upload your APNs certificate or key

## 8. Build and test:
```bash
ionic capacitor run ios
```

## Important Notes:
- Test push notifications on a physical device (simulator doesn't support push notifications)
- Make sure your Bundle ID matches in Xcode, Firebase, and Apple Developer Console
- For production, you'll need a production APNs certificate