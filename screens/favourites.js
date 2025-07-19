import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  arrayRemove,
} from "firebase/firestore";
import { auth, db } from "../lib/db/firebase";

export default function MyFavouritesScreen({ navigation }) {
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const user = auth.currentUser;

  // Fetch favourite trips based on tripIds in user's favourites array
  const fetchFavourites = async () => {
    if (!user?.uid) return;

    try {
      // Get user document to get favourites array
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        setFavourites([]);
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      const favouriteIds = userData.favorites || [];

      if (favouriteIds.length === 0) {
        setFavourites([]);
        setLoading(false);
        return;
      }

      // Fetch trip details for each favourite ID
      const favouritesData = [];
      for (const tripId of favouriteIds) {
        try {
          const tripDocRef = doc(db, "trips", tripId);
          const tripDoc = await getDoc(tripDocRef);
          
          if (tripDoc.exists()) {
            favouritesData.push({
              id: tripDoc.id,
              ...tripDoc.data(),
              isFavourite: true,
            });
          }
        } catch (error) {
          console.error(`Error fetching trip ${tripId}:`, error);
        }
      }

      // Sort by creation date (newest first)
      favouritesData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setFavourites(favouritesData);
    } catch (error) {
      console.error("Error fetching favourites:", error);
    } finally {
      setLoading(false);
    }
  };

  // Real-time listener for user document changes
  useEffect(() => {
    if (!user?.uid) return;

    const userDocRef = doc(db, "users", user.uid);
    
    const unsubscribe = onSnapshot(
      userDocRef,
      (doc) => {
        if (doc.exists()) {
          fetchFavourites();
        }
      },
      (error) => {
        console.error("Error listening to user document:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFavourites();
    setRefreshing(false);
  }, [user?.uid]);

  // Remove from favourites handler
  const handleRemoveFromFavourites = (tripId, tripName) => {
    Alert.alert(
      "Remove Favourite",
      `Are you sure you want to remove "${tripName}" from your favourites?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const userDocRef = doc(db, "users", user.uid);
              await updateDoc(userDocRef, {
                favorites: arrayRemove(tripId)
              });
            } catch (error) {
              console.error("Error removing favourite:", error);
              Alert.alert("Error", "Failed to remove favourite. Please try again.");
            }
          },
        },
      ]
    );
  };

  const renderNoFavourites = () => (
    <View style={styles.emptyStateContainer}>
      <MaterialIcons name="favorite-border" size={50} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No favourite trips yet</Text>
      <Text style={styles.emptyStateText}>
        Mark your favorite trips for quick access and easy rebooking
      </Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={() => navigation.navigate("Home")}
      >
        <Text style={styles.emptyStateButtonText}>Book Trip</Text>
      </TouchableOpacity>
    </View>
  );

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "ongoing":
        return "#10B981";
      case "completed":
        return "#3B82F6";
      case "cancelled":
      case "expired":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getTripIcon = (tripType) => {
    switch (tripType?.toLowerCase()) {
      case "bike":
      case "motorcycle":
      case "two-wheeler":
        return "motorcycle";
      case "car":
      case "taxi":
      case "cab":
        return "directions-car";
      case "auto":
      case "rickshaw":
      case "auto-rickshaw":
        return "airport-shuttle";
      case "bus":
        return "directions-bus";
      case "truck":
      case "goods":
      case "delivery":
        return "local-shipping";
      case "walk":
      case "walking":
        return "directions-walk";
      case "cycle":
      case "bicycle":
        return "directions-bike";
      case "train":
        return "train";
      case "flight":
      case "plane":
        return "flight";
      default:
        return "motorcycle";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const renderFavouriteCard = (trip) => (
    <TouchableOpacity
      key={trip.id}
      style={styles.favouriteCard}
      onPress={() =>
        navigation.navigate("TripUserDetails", {
          userId: trip.userId,
          pickupLocation: trip.startlocationName?.split(",")[0],
          destinationLocation: trip.endlocationName?.split(",")[0],
          tripId: trip.id,
          tripType: trip.tripType,
        })
      }
      activeOpacity={0.7}
    >
      {/* Header with trip icon, date/time, and favourite indicator */}
      <View style={styles.favouriteCardHeader}>
        <View style={styles.leftSection}>
          <View style={styles.iconContainer}>
            <MaterialIcons
              name={getTripIcon(trip.tripType || trip.vehicleType)}
              size={18}
              color="#fff"
            />
          </View>
          <View style={styles.tripInfoContainer}>
            <Text style={styles.dateTimeText}>
              {formatDate(trip.departureTime)} {formatTime(trip.departureTime)}
            </Text>
            <Text style={styles.tripTypeText}>
              {trip.tripType?.toUpperCase() || "TRIP"}
            </Text>
          </View>
        </View>

        <View style={styles.rightSection}>
          <MaterialIcons name="favorite" size={20} color="#EF4444" />
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleRemoveFromFavourites(trip.id, trip.startlocationName)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
          <MaterialIcons name="chevron-right" size={24} color="#D1D5DB" />
        </View>
      </View>

      {/* Trip Status */}
      <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(trip.status) },
          ]}
        >
          <Text style={styles.statusText}>
            {trip.status?.toUpperCase() || "PENDING"}
          </Text>
        </View>
      </View>

      {/* Locations */}
      <View style={styles.locationsContainer}>
        <View style={styles.locationRow}>
          <MaterialIcons name="location-on" size={16} color="#10B981" />
          <Text style={styles.locationText} numberOfLines={1}>
            {trip.startlocationName || "Unknown pickup"}
          </Text>
        </View>
        <View style={styles.locationRow}>
          <MaterialIcons name="location-on" size={16} color="#EF4444" />
          <Text style={styles.locationText} numberOfLines={1}>
            {trip.endlocationName || "Unknown destination"}
          </Text>
        </View>
      </View>

      {/* Footer with quick actions */}
      {/* <View style={styles.footerContainer}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => {
            navigation.navigate("Home", {
              pickupLocation: {
                name: trip.startlocationName,
                latitude: trip.startLatitude,
                longitude: trip.startLongitude,
              },
              destinationLocation: {
                name: trip.endlocationName,
                latitude: trip.endLatitude,
                longitude: trip.endLongitude,
              },
              tripType: trip.tripType,
            });
          }}
        >
          <MaterialIcons name="refresh" size={16} color="#3B82F6" />
          <Text style={styles.quickActionText}>Rebook Trip</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => {
            // Share trip details
            console.log("Share trip:", trip.id);
          }}
        >
          <MaterialIcons name="share" size={16} color="#10B981" />
          <Text style={styles.quickActionText}>Share Route</Text>
        </TouchableOpacity>
      </View> */}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" hidden={false} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>My Favourites</Text>
        {favourites.length > 0 && (
          <Text style={styles.favouriteCount}>{favourites.length} trips</Text>
        )}
      </View>

      {/* Favourites List */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#000"]}
            tintColor="#000"
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Loading favourites...</Text>
          </View>
        ) : favourites.length > 0 ? (
          favourites.map((trip) => renderFavouriteCard(trip))
        ) : (
          renderNoFavourites()
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 40 : 10,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerText: {
    fontSize: 20,
    fontFamily: "Bold",
    color: "#000",
  },
  favouriteCount: {
    fontSize: 14,
    fontFamily: "Regular",
    color: "#6B7280",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 16,
    fontFamily: "Regular",
    color: "#6B7280",
    marginTop: 10,
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: "Bold",
    color: "#374151",
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: "Regular",
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
  emptyStateButton: {
    backgroundColor: "#000",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 20,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontFamily: "Bold",
    color: "#fff",
  },
  // Favourite Card Styles
  favouriteCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  favouriteCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  tripInfoContainer: {
    flex: 1,
  },
  dateTimeText: {
    fontSize: 14,
    fontFamily: "Bold",
    color: "#111827",
  },
  tripTypeText: {
    fontSize: 12,
    fontFamily: "Regular",
    color: "#6B7280",
    marginTop: 2,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  statusContainer: {
    marginBottom: 12,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  locationsContainer: {
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    fontFamily: "Regular",
    color: "#374151",
    marginLeft: 8,
    flex: 1,
  },
  footerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  quickActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    flex: 0.48,
    justifyContent: "center",
  },
  quickActionText: {
    fontSize: 12,
    fontFamily: "Regular",
    color: "#374151",
    marginLeft: 4,
  },
  bottomSpacing: {
    height: 80,
  },
});