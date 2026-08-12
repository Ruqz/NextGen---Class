import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

let app: FirebaseApp;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const auth: Auth = getAuth(app);

// Use the explicit firestoreDatabaseId if configured in firebase-applet-config.json
const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
export const db: Firestore = getFirestore(app, databaseId);

export const storage: FirebaseStorage = getStorage(app);

export default app;
