import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../db/firebase"; // your Firebase config file
import { getAuth } from "firebase/auth";

export const getusername = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      // console.log("Full user data for UID", uid, ":", userData);

      // Try multiple keys for name
      if (typeof userData.name === "string") return userData.name;
      if (userData.displayName) return userData.displayName;
      if (userData.fullName) return userData.fullName;
      if (userData.firstName || userData.lastName)
        return `${userData.firstName || ""} ${userData.lastName || ""}`.trim();

      return "Unknown Name";
    } else {
      console.warn("User not found with UID:", uid);
      return "Unknown User";
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    return "Error";
  }
};

export const getuserphone = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));

    if (userDoc.exists()) {
      const userData = userDoc.data();

      if (userData.phoneNumber) return userData.phoneNumber;

      return "Unknown Phone";
    } else {
      console.warn("User not found with UID:", uid);
      return "Unknown User";
    }
  } catch (error) {
    console.error("Error fetching user phone:", error);
    return "Error";
  }
};

export const getphonenumbervisible = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));

    if (userDoc.exists()) {
      const userData = userDoc.data();

      if (userData.phonenumbervisible)
        return userData.phonenumbervisible.toString();

      return false;
    } else {
      console.warn("User not found with UID:", uid);
      return "Unknown User";
    }
  } catch (error) {
    console.error("Error fetching user phone:", error);
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
      console.warn("User not logged in");
      return null;
    }

    const userDocRef = doc(db, "users", currentUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      return userData["notificationId"] ?? "";
    } else {
      console.warn("User document not found");
      return null;
    }
  } catch (error) {
    console.error("Error fetching user field:", error);
    return null;
  }
}

export const getRequestsByUserId = async (userId) => {
  try {
    const tripsRef = collection(db, "trips");
    const q = query(tripsRef, where("userId", "==", userId));
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
    console.error("❌ Error fetching requests by userId:", error);
    return [];
  }
};

export const getUserLocationFromDB = async (userId) => {
  try {
    const currentUser = getAuth().currentUser;
    if (!currentUser) {
      console.warn("User not logged in");
      return null;
    }

    const userDocRef = doc(db, "users", currentUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      return userData["location"] ?? "";
    } else {
      console.warn("User document not found");
      return null;
    }
  } catch (error) {
    console.error("Error fetching user field:", error);
    return null;
  }
};

export const updateUserLocation = async (userId, location) => {
  try {
    const userDocRef = doc(db, "users", userId);
    
    await updateDoc(userDocRef, {
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        coordinates: `[${location.latitude}° N, ${location.longitude}° E]`,
        lastUpdated: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        updatedAt: serverTimestamp()
      }
    });

    console.log("Location updated successfully");
  } catch (error) {
    console.error("Error updating location:", error);
  }
};

