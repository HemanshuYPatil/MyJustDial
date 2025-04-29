import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../db/firebase"; // your Firebase config file
import { getAuth } from "firebase/auth";

export const getusername = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.name || "";
    } else {
      console.warn("User not found with UID:", uid);
      return "Unknown User";
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    return "Error";
  }
};

export const getUserProfile = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return userDoc.data();
    } else {
      console.warn(`User not found for UID: ${uid}`);
      return null;
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};

export async function getuserNotificationToken() {
  try {
    const currentUser = getAuth().currentUser;
    if (!currentUser) {
      console.warn('User not logged in');
      return null;
    }

    const userDocRef = doc(db, 'users', currentUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      return userData['notificationId'] ?? '';
    } else {
      console.warn('User document not found');
      return null;
    }
  } catch (error) {
    console.error('Error fetching user field:', error);
    return null;
  }
}

export const getRequestsByUserId = async (userId) => {
  try {
    const tripsRef = collection(db, 'trips');
    const q = query(tripsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    let allRequests = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (Array.isArray(data.requests)) {
        allRequests.push(...data.requests); // spread to flatten
      }
    });

    // Optional: sort requests if they contain timestamp/date field
    // allRequests.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return allRequests;
  } catch (error) {
    console.error('❌ Error fetching requests by userId:', error);
    return [];
  }
};