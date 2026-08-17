import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAhsvp6ncLFecU01ZV24X6TOn82AZGdk3A",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "nextgen-academy-class.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "nextgen-academy-class",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "nextgen-academy-class.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "125834319981",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:125834319981:web:c04461a93242295fdcc764",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-ZXSSM1DNHH"
};

let app: FirebaseApp;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Optional analytics placeholder without triggering blocking installations requests
export const analytics = null;

export const auth: Auth = getAuth(app);

// Use default firestoreDatabaseId and initialize with auto long polling fallback
export const db: Firestore = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});

export const storage: FirebaseStorage = getStorage(app);
export default app;

