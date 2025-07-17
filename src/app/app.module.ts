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
import { AngularFireMessagingModule } from '@angular/fire/compat/messaging';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';

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
      AngularFirestoreModule,
      AngularFireMessagingModule,
      AngularFireStorageModule
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
    // Initialize Firebase SDK if configured
    if (isFirebaseConfigured) {
      this.initializeFirebaseSDK();
    }
  }

  private async initializeFirebaseSDK() {
    try {
      // Import Firebase SDK
      const { initializeApp } = await import('firebase/app');
      const { getAuth } = await import('firebase/auth');
      const { getFirestore } = await import('firebase/firestore');
      
      // Initialize Firebase
      const app = initializeApp(environment.firebase);
      const auth = getAuth(app);
      const firestore = getFirestore(app);
      
      // Make Firebase available globally for the auth service
      (window as any).firebase = {
        auth: () => ({
          createUserWithEmailAndPassword: async (email: string, password: string) => {
            const { createUserWithEmailAndPassword } = await import('firebase/auth');
            return createUserWithEmailAndPassword(auth, email, password);
          },
          signInWithEmailAndPassword: async (email: string, password: string) => {
            const { signInWithEmailAndPassword } = await import('firebase/auth');
            return signInWithEmailAndPassword(auth, email, password);
          },
          signOut: async () => {
            const { signOut } = await import('firebase/auth');
            return signOut(auth);
          },
          onAuthStateChanged: async (callback: any) => {
            const { onAuthStateChanged } = await import('firebase/auth');
            return onAuthStateChanged(auth, callback);
          }
        }),
        firestore: () => ({
          collection: (path: string) => ({
            doc: (id: string) => ({
              set: async (data: any) => {
                const { doc, setDoc } = await import('firebase/firestore');
                const docRef = doc(firestore, path, id);
                return setDoc(docRef, data);
              },
              get: async () => {
                const { doc, getDoc } = await import('firebase/firestore');
                const docRef = doc(firestore, path, id);
                const docSnap = await getDoc(docRef);
                return {
                  exists: docSnap.exists(),
                  data: () => docSnap.data(),
                  id: docSnap.id
                };
              },
              update: async (data: any) => {
                const { doc, updateDoc } = await import('firebase/firestore');
                const docRef = doc(firestore, path, id);
                return updateDoc(docRef, data);
              }
            })
          })
        })
      };
      
      console.log('✅ Firebase SDK initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Firebase SDK:', error);
    }
  }
}