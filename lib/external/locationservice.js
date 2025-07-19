// locationService.js
import { db, geofirestore, GeoPoint } from '../db/firebase';
import { doc, setDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import * as Location from 'expo-location';
import { PermissionsAndroid } from 'react-native';

// Function to update user location in Firestore
export async function updateUserLocation(userId, location) {
  if (!userId || !location) return;

  const userRef = doc(db, 'users', userId);
  const geoPoint = new GeoPoint(location.latitude, location.longitude);

  try {
    await setDoc(userRef, {
      location: {
        coordinates: geoPoint,
        lastUpdated: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    }, { merge: true });

    console.log('Location updated successfully');
  } catch (error) {
    console.error('Error updating location:', error);
  }
}

// Function to get current location and update Firestore
export async function trackAndUpdateUserLocation(userId) {
  try {
    // Request permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Permission to access location was denied');
      return;
    }

    // Get current location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High
    });

    // Update Firestore
    await updateUserLocation(userId, {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    });

    // Start watching for location updates
    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 100, // Update every 100 meters
        timeInterval: 30000 // Update every 30 seconds
      },
      (newLocation) => {
        updateUserLocation(userId, {
          latitude: newLocation.coords.latitude,
          longitude: newLocation.coords.longitude
        });
      }
    );

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    };
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
}

// Function to get user's location from Firestore
export async function getUserLocationFromFirestore(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      if (userData.location?.coordinates) {
        return {
          latitude: userData.location.coordinates.latitude,
          longitude: userData.location.coordinates.longitude,
          lastUpdated: userData.location.lastUpdated?.toDate()
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting user location:', error);
    return null;
  }
}