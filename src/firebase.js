import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDZ_7WSKUYB48TGZKZ6XNI5KLpjZ0R0uuM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "nwsp-tablet.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "nwsp-tablet",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "nwsp-tablet.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "786784302197",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:786784302197:web:dbc5b88f9fcaf964dfb43c",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-8ZYT3E0Q8S"
};

let db = null;
let isFirebaseActive = false;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  isFirebaseActive = true;
  console.log("🔥 Connected to central Firebase Cloud Firestore (nwsp-tablet)");
} catch (error) {
  console.error("Firebase initialization failed, using Local Fallback:", error);
}

export { db, isFirebaseActive };
