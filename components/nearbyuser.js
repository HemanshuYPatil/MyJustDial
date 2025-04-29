import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { auth, geofirestore, firebase } from "../lib/db/firebase";
import { getusername } from "../lib/query/user";
import * as Location from "expo-location";

const { width } = Dimensions.get("window");

export const NearbyRidersSection = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // Get current user location
  const getCurrentLocation = async () => {
    try {
      setIsLoading(true);

      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setLocationError("Permission to access location was denied");
        setIsLoading(false);
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // After getting location, fetch nearby riders
      fetchNearbyRiders(location.coords);
    } catch (error) {
      console.error("Error getting location:", error);
      setLocationError("Could not fetch location");
      setIsLoading(false);
    }
  };

  // Calculate distance between two coordinates in kilometers
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
  };

  // Fetch nearby riders
  const fetchNearbyRiders = async (coords) => {
    try {
      // Skip if no user location
      if (!coords || !coords.latitude || !coords.longitude) {
        setIsLoading(false);
        return;
      }

      // Get reference point (current location)
      const center = new firebase.firestore.GeoPoint(
        coords.latitude,
        coords.longitude
      );

      // Query trips within 5km radius
      const geoCollection = geofirestore.collection("trips");
      const query = geoCollection.near({
        center,
        radius: 5, // 5km radius
      });

      const snapshot = await query.get();

      // Process results
      const usersData = [];
      const processedUserIds = new Set();
      const userPromises = [];

      snapshot.forEach((doc) => {
        const tripData = doc.data();

        // Skip user's own trips
        if (tripData.userId === auth.currentUser.uid) return;

        // Check if user has already been processed
        if (processedUserIds.has(tripData.userId)) return;

        if (tripData.status !== "active") return;

        processedUserIds.add(tripData.userId);

        // Add to user data
        const userData = {
          id: tripData.userId,
          tripId: doc.id,
          startLocation:
            tripData.startlocationName?.split(",")[0] || "Location",
          endLocation: tripData.endlocationName?.split(",")[0] || "Destination",
          startCoords: tripData.startLocation,
          endCoords: tripData.endLocation,
          timestamp: tripData.timestamp || Date.now(),
          distance: calculateDistance(
            coords.latitude,
            coords.longitude,
            tripData.startLocation.latitude,
            tripData.startLocation.longitude
          ),
          rating: (Math.random() * 2 + 3).toFixed(1), // Mock rating between 3.0-5.0
          rides: Math.floor(Math.random() * 50) + 1, // Mock number of rides
          avatarColor: getRandomColor(),
          verified: Math.random() > 0.3, // Random verification status
          createdAt: tripData.createdAt,
          departure: tripData.departureTime,
        };

        usersData.push(userData);

        // Add promise to fetch username
        userPromises.push(
          getusername(tripData.userId)
            .then((name) => {
              userData.username = name || "User";
              return userData;
            })
            .catch((err) => {
              console.error("Error fetching username:", err);
              userData.username = "User";
              return userData;
            })
        );
      });

      // Wait for all username fetches to complete
      await Promise.all(userPromises);

      // Sort by distance
      usersData.sort((a, b) => a.distance - b.distance);

      // Limit to 5 users for the preview
      setNearbyUsers(usersData.slice(0, 5));
    } catch (error) {
      console.error("Error fetching nearby riders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get random color for avatar
  const getRandomColor = () => {
    const colors = [
      "#4D7EFF",
      "#FF5A5A",
      "#5CE1E6",
      "#FFB946",
      "#6CD9A6",
      "#9D7FEA",
      "#FF8FB2",
      "#42B883",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  useEffect(() => {
    // Get location and fetch nearby riders when component mounts
    getCurrentLocation();

    // Set up location subscription
    let locationSubscription;

    (async () => {
      if (
        Platform.OS === "android" &&
        !Location.hasStartedLocationUpdatesAsync
      ) {
        await Location.startLocationUpdatesAsync("location-tracking", {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 60000, // Update every 60 seconds
          distanceInterval: 100, // Or every 100 meters
        });
      }

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 60000, // Update every 60 seconds
          distanceInterval: 100, // Or every 100 meters
        },
        (location) => {
          const coords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };

          setUserLocation(coords);
          fetchNearbyRiders(coords);
        }
      );
    })();

    // Clean up subscription
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  const handleSeeAll = () => {
    // Navigate to full rider search results screen
    if (!userLocation) {
      Alert.alert(
        "Location Error",
        "Could not determine your location. Please try again."
      );
      return;
    }

    navigation.navigate("RiderSearchResults", {
      pickup: "Current Location",
      destination: "Any Destination",
      pickupCoordinates: userLocation,
      destinationCoordinates: {
        latitude: userLocation.latitude + 0.05,
        longitude: userLocation.longitude + 0.05,
      },
    });
  };

  const handleViewRider = (rider) => {
    // Navigate to rider details screen
    navigation.navigate("TripUserDetails", {
      userId: rider.id,
      pickupLocation: rider.startLocation,
      destinationLocation: rider.endLocation,
      tripId: rider.tripId,
      username: rider.username,
    });
  };

  const handleRefresh = () => {
    getCurrentLocation();
  };

  const renderNearbyRidersList = () => {
    return (
      <View style={styles.recentsList}>
        {nearbyUsers.map((rider, index) => (
          <React.Fragment key={rider.id + index}>
            <TouchableOpacity 
              style={styles.recentItem}
              onPress={() => handleViewRider(rider)}
            >
              <View style={[styles.recentIcon, { backgroundColor: rider.avatarColor }]}>
                <Text style={styles.avatarText}>
                  {rider.username?.charAt(0) || "U"}
                </Text>
              </View>
              <View style={styles.recentDetails}>
                <Text style={styles.recentName}>{rider.username}</Text>
                <Text style={styles.recentAddress}>
                  {rider.startLocation} → {rider.endLocation} • {rider.distance.toFixed(1)}km
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.favoriteButton}
                onPress={() => handleViewRider(rider)}
              >
                <Feather name="arrow-right" size={20} color="#ccc" />
              </TouchableOpacity>
            </TouchableOpacity>
            
            {index < nearbyUsers.length - 1 && (
              <View style={styles.itemDivider} />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyStateContainer}>
          <ActivityIndicator size="small" color="#000" />
          <Text style={styles.emptyStateText}>Finding riders...</Text>
        </View>
      );
    } else if (locationError) {
      return (
        <View style={styles.emptyStateContainer}>
          <Feather name="map-pin-off" size={22} color="#999" />
          <Text style={styles.emptyStateText}>{locationError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      return (
        <View style={styles.emptyStateContainer}>
          <Feather name="users" size={22} color="#999" />
          <Text style={styles.emptyStateText}>No nearby riders found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <MaterialIcons
            name="person"
            size={20}
            color="#000"
            style={styles.sectionIcon}
          />
          <Text style={styles.sectionTitle}>Nearby Riders</Text>
        </View>
        <TouchableOpacity
          style={styles.sectionActionButton}
          onPress={handleSeeAll}
        >
          <Text style={styles.sectionAction}>See All</Text>
          <Feather name="chevron-right" size={16} color="#000" />
        </TouchableOpacity>
      </View>

      {nearbyUsers.length > 0 ? renderNearbyRidersList() : renderEmptyState()}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Medium",
    color: "#000",
  },
  sectionActionButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionAction: {
    fontSize: 12,
    fontFamily: "Medium",
    color: "#000",
    marginRight: 4,
  },
  
  // Recent places style for nearby users
  recentsList: {
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#FFF",
    fontFamily: "Bold",
    fontSize: 16,
  },
  recentDetails: {
    flex: 1,
  },
  recentName: {
    fontSize: 14,
    fontFamily: "Medium",
    color: "#000",
    marginBottom: 2,
  },
  recentAddress: {
    fontSize: 12,
    fontFamily: "Regular",
    color: "#666",
  },
  favoriteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  itemDivider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 2,
  },
  
  // Empty state
  emptyStateContainer: {
    height: 150,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
  },
  emptyStateText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: "Medium",
    color: "#666",
  },
  retryButton: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: "#000",
    borderRadius: 10,
  },
  retryText: {
    color: "#fff",
    fontFamily: "Medium",
    fontSize: 12,
  }
});