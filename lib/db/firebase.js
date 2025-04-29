import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
// import * as geofirestore from 'geofirestore';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { GeoFirestore } from 'geofirestore';

const firebaseConfig = {
  apiKey: "AIzaSyCV1y35Yn5kd1h-S1ZsPPUpGdYEnT-Z7HQ",
  authDomain: "parcelo-e9635.firebaseapp.com",
  databaseURL: "https://parcelo-e9635-default-rtdb.firebaseio.com",
  projectId: "parcelo-e9635",
  storageBucket: "parcelo-e9635.firebasestorage.app",
  messagingSenderId: "718354714847",
  appId: "1:718354714847:web:4c3e308da5e8967b47996a",
  measurementId: "G-78S7YPE5MC",
};
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
const db = getFirestore(app);

// Initialize Firebase compat version specifically for GeoFirestore
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const firestoreCompat = firebase.firestore();
const geofirestore = new GeoFirestore(firestoreCompat);



export { auth, db, geofirestore, firebase };
export default app;