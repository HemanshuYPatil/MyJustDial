// firebase.js
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore, GeoPoint, serverTimestamp } from "firebase/firestore";

// ✅ Import compat version for GeoFirestore support
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import { GeoFirestore } from "geofirestore";
import { getStorage } from "firebase/storage";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCV1y35Yn5kd1h-S1ZsPPUpGdYEnT-Z7HQ",
  authDomain: "parcelo-e9635.firebaseapp.com",
  databaseURL: "https://parcelo-e9635-default-rtdb.firebaseio.com",
  projectId: "parcelo-e9635",
  storageBucket: "parcelo-e9635.appspot.com",
  messagingSenderId: "718354714847",
  appId: "1:718354714847:web:4c3e308da5e8967b47996a",
  measurementId: "G-78S7YPE5MC",
};

// ✅ Modular app init (used by firestore/auth)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// ✅ Compat init for GeoFirestore
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const compatFirestore = firebase.firestore(); // 🔥 Classic Firestore for geofirestore

// ✅ Firebase Auth with AsyncStorage (modular)
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// ✅ Modular Firestore for other uses
const db = getFirestore(app);
const storage = getStorage(app, "gs://parcelo-e9635.firebasestorage.app");
// ✅ Initialize GeoFirestore
const geofirestore = new GeoFirestore(compatFirestore);
export { app, auth, db, geofirestore, GeoPoint, serverTimestamp, compatFirestore,storage };
