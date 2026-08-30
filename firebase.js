// Firebase initialization.
// Fill in your project's config in .env (see .env.example) — never hardcode
// real keys directly in this file when committing to a public repo.
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAVvab3WLNqWHgiObxOKR5PO_9v5_LnFhM",
  authDomain: "shop-hub-cc92a.firebaseapp.com",
  projectId: "shop-hub-cc92a",
  storageBucket: "shop-hub-cc92a.firebasestorage.app",
  messagingSenderId: "884097759528",
  appId: "1:884097759528:web:c93b74e4e826945a49781d"
};



export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
