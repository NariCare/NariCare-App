# Android Push Notification Setup

## 1. Generate the Android project (if not already done):
```bash
ionic capacitor add android
ionic capacitor sync android
```

## 2. Add google-services.json file:
- Go to Firebase Console → Project Settings → General
- Under "Your apps" section, add an Android app
- Download `google-services.json` 
- Place it in: `android/app/google-services.json`

## 3. Update android/app/build.gradle:
Add at the top (after existing plugins):
```gradle
plugins {
    id 'com.android.application'
    id 'com.google.gms.google-services'  // Add this line
}

android {
    // ... existing config
}

dependencies {
    // ... existing dependencies
    implementation 'com.google.firebase:firebase-messaging:23.2.1'
    implementation 'androidx.work:work-runtime:2.8.1'
}
```

## 4. Update android/build.gradle (project level):
```gradle
buildscript {
    dependencies {
        // ... existing dependencies
        classpath 'com.google.gms:google-services:4.3.15'  // Add this line
    }
}
```

## 5. Update AndroidManifest.xml (android/app/src/main/AndroidManifest.xml):
Add these permissions and services:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<application>
    <!-- ... existing config ... -->
    
    <!-- Firebase Messaging Service -->
    <service
        android:name=".FirebaseMessagingService"
        android:exported="false">
        <intent-filter>
            <action android:name="com.google.firebase.MESSAGING_EVENT" />
        </intent-filter>
    </service>
    
    <!-- Default notification channel (Android 8.0+) -->
    <meta-data
        android:name="com.google.firebase.messaging.default_notification_channel_id"
        android:value="naricare_notifications" />
        
    <!-- Default notification icon -->
    <meta-data
        android:name="com.google.firebase.messaging.default_notification_icon"
        android:resource="@mipmap/ic_launcher" />
        
    <!-- Default notification color -->
    <meta-data
        android:name="com.google.firebase.messaging.default_notification_color"
        android:resource="@color/primary" />
</application>
```

## 6. Create FirebaseMessagingService.java:
Create file: `android/app/src/main/java/[your-package]/FirebaseMessagingService.java`

```java
package io.ionic.starter; // Replace with your package name

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class FirebaseMessagingService extends FirebaseMessagingService {

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        
        if (remoteMessage.getNotification() != null) {
            showNotification(
                remoteMessage.getNotification().getTitle(),
                remoteMessage.getNotification().getBody()
            );
        }
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        // Send token to your server
        sendTokenToServer(token);
    }

    private void showNotification(String title, String body) {
        NotificationManager notificationManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        String channelId = "naricare_notifications";

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                channelId,
                "NariCare Notifications",
                NotificationManager.IMPORTANCE_HIGH
            );
            notificationManager.createNotificationChannel(channel);
        }

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, intent, 
            PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(this, channelId)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent);

        notificationManager.notify(0, notificationBuilder.build());
    }

    private void sendTokenToServer(String token) {
        // Implement your API call to send token to server
        // You can use Retrofit, OkHttp, or any HTTP client
    }
}
```

## 7. Build and test:
```bash
ionic capacitor run android
```