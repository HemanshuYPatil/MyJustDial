import {
  doc,
  collection,
  setDoc,
  getDoc,
  GeoPoint,
  serverTimestamp,
  addDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import {
  auth,
  db,
  geocollection,
  geofirestore,
  firebase,
} from "../db/firebase";


const migrateExistingDocument = async (docId) => {
  try {
    const docRef = doc(db, "trips", docId);
    const docSnap = await getDoc(docRef);
    const data = docSnap.data();

    if (!data) {
      console.error(`Document ${docId} not found`);
      return;
    }

    const latitude = data.startLocation?.latitude || 0;
    const longitude = data.startLocation?.longitude || 0;

    const geoCollection = geofirestore.collection("trips");

    await geoCollection.doc(docId).set({
      ...data,
      coordinates: new GeoPoint(latitude, longitude),
    });

    console.log(`Successfully migrated document ${docId}`);
  } catch (error) {
    console.error(`Error migrating document ${docId}:`, error);
  }
};


export const createTrip = async ({
  userId,
  startLocation,
  endLocation,
  departureTime,
  startlocationName,
  endlocationName,
  tripType,
  additionalInfo
}) => {
  if (!userId || !startLocation || !endLocation) {
    throw new Error("Missing required trip data.");
  }

  try {
    const tripRef = doc(collection(db, "trips"));

    const tripData = {
      userId,
      startlocationName,
      endlocationName,
      startLocation,
      endLocation,
      departureTime,
      createdAt: new Date().toISOString(),
      status: "active",
      availableForDelivery: true,
      tripType: tripType,
      requests: [],
      additionalInfo: additionalInfo,
      coordinates: new GeoPoint(startLocation.latitude, startLocation.longitude),
    };

    await setDoc(tripRef, tripData);

    migrateExistingDocument(tripRef.id); 
    console.log("✅ Trip created with ID:", tripRef.id);
    return tripRef.id;
  } catch (error) {
    console.error("❌ Error creating trip:", error);
    throw error;
  }
};

export const fetchUserLocation = async (userId) => {
  try {
    const userDocRef = doc(db, "users", userId);
    const userSnapshot = await getDoc(userDocRef);

    if (!userSnapshot.exists()) throw new Error("User not found.");

    const data = userSnapshot.data();
    const location = data.location;

    if (location instanceof GeoPoint) {
      return location;
    } else if (location && location.latitude && location.longitude) {
      return new GeoPoint(location.latitude, location.longitude);
    } else {
      throw new Error("User location is not valid.");
    }
  } catch (error) {
    console.error("❌ Error fetching user location:", error);
    throw error;
  }
};


export const sendMatchRequest = async (tripId, userId, requestData) => {
  try {
    const tripRef = doc(db, "trips", tripId);

    // Structure the request
    const matchRequest = {
      userId,
      ...requestData,
      status: "pending",
      timestamp: new Date().toISOString(), // or use serverTimestamp if needed
    };

    // Add to 'requests' array
    await updateDoc(tripRef, {
      requests: arrayUnion(matchRequest),
    });
  } catch (error) {
    console.error("Error adding match request to trip:", error);
    throw error;
  }
};