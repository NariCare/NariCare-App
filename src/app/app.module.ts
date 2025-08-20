import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage-angular';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Firebase - Only import if configuration is valid
import { environment } from '../environments/environment';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';

// Conditional Firebase imports
let firebaseImports: any[] = [];

// Check if Firebase config is properly set (not placeholder values)
const isFirebaseConfigured = environment.firebase.apiKey !== 'your-api-key-here' && 
                             environment.firebase.projectId !== 'your-project-id' &&
                             environment.firebase.apiKey.length > 10;

if (isFirebaseConfigured) {
  // Only import Firebase modules if properly configured
  try {
    firebaseImports = [
      AngularFireModule.initializeApp(environment.firebase),
      AngularFireAuthModule,
      AngularFirestoreModule
    ];
    
    console.log('✅ Firebase modules loaded successfully');
  } catch (error) {
    console.warn('⚠️ Firebase modules not available:', error);
  }
} else {
  console.warn('⚠️ Firebase not configured - using mock authentication');
  console.log('📝 To enable Firebase:');
  console.log('1. Create a Firebase project at https://console.firebase.google.com/');
  console.log('2. Get your config from Project Settings > General');
  console.log('3. Update src/environments/environment.ts with your config');
}

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot({
      mode: 'ios'
    }),
    IonicStorageModule.forRoot(),
    AppRoutingModule,
    HttpClientModule,
    ...firebaseImports
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }
  ],
  bootstrap: [AppComponent],
})
export class AppModule {
  constructor() {
    if (isFirebaseConfigured) {
      console.log('✅ Firebase modules loaded successfully');
    }
  }
}