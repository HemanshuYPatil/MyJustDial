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
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "../lib/db/firebase";

export default function MyTripsScreen({ navigation }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(auth.currentUser);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        // Clear data immediately when user logs out
        setTrips([]);
        setLoading(false);
        setRefreshing(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Real-time data listener
  useEffect(() => {
    if (!user?.uid) {
      // Clear trips and stop loading when no user
      setTrips([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const tripsRef = collection(db, "trips");
    const q = query(tripsRef, where("userId", "==", user.uid));

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const tripsData = [];
        querySnapshot.forEach((doc) => {
          tripsData.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        // Sort trips by creation date (newest first)
        tripsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setTrips(tripsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to trips:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    if (!user?.uid) return;
    
    setRefreshing(true);
    try {
      const tripsRef = collection(db, "trips");
      const q = query(tripsRef, where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);

      const tripsData = [];
      querySnapshot.forEach((doc) => {
        tripsData.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      tripsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setTrips(tripsData);
    } catch (error) {
      console.error("Error refreshing trips:", error);
    } finally {
      setRefreshing(false);
    }
  }, [user?.uid]);

  // Guest/Login prompt component
  const renderGuestPrompt = () => (
    <View style={styles.guestContainer}>
      <MaterialCommunityIcons name="account-circle-outline" size={60} color="#ccc" />
      <Text style={styles.guestTitle}>Please Login</Text>
      <Text style={styles.guestText}>
        You need to login to view your movements history
      </Text>
      <TouchableOpacity
        style={styles.guestButton}
        onPress={() => navigation.navigate("login")} // Adjust navigation route as needed
      >
        <Text style={styles.guestButtonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );

  const renderNoTrips = () => (
    <View style={styles.emptyStateContainer}>
      <MaterialCommunityIcons name="map-marker-path" size={50} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No movements yet</Text>
      <Text style={styles.emptyStateText}>
        Start your journey by booking a movements
      </Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={() => navigation.navigate("Home")}
      >
        <Text style={styles.emptyStateButtonText}>Book movements</Text>
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
        return "motorcycle"; // Default to motorcycle
    }
  };

  const renderExactTripCard = (trip) => (
    <TouchableOpacity
      key={trip.id}
      style={styles.exactCard}
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
      {/* Header with dynamic icon, date/time, and status */}
      <View style={styles.exactCardHeader}>
        <View style={styles.exactLeftSection}>
          <View style={styles.bikeIconContainer}>
            <MaterialIcons
              name={getTripIcon(trip.tripType || trip.vehicleType)}
              size={18}
              color="#fff"
            />
          </View>
          <Text style={styles.exactDateTimeText}>
            {formatDate(trip.departureTime)} {formatTime(trip.departureTime)}
          </Text>
        </View>

        <View style={styles.exactRightSection}>
          <View
            style={[
              styles.exactStatusBadge,
              { backgroundColor: getStatusColor(trip.status) },
            ]}
          >
            <Text style={styles.exactStatusText}>
              {trip.status?.toUpperCase() || "PENDING"}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#D1D5DB" />
        </View>
      </View>

      {/* Locations with dots and lines */}
      <View style={styles.exactLocationsContainer}>
        {/* Location texts */}
        <View style={styles.exactLocationTexts}>
          <View style={styles.exactLocationRow}>
            <MaterialIcons name="location-on" size={16} color="#10B981" />
            <Text style={styles.exactLocationText} numberOfLines={1}>
              {trip.startlocationName || "Unknown location"}
            </Text>
          </View>
          <View style={styles.exactLocationRow}>
            <MaterialIcons name="location-on" size={16} color="#EF4444" />
            <Text style={styles.exactLocationText} numberOfLines={1}>
              {trip.endlocationName || "Unknown destination"}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" hidden={false} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>My Movements</Text>
        {user && trips.length > 0 && (
          <Text style={styles.tripCount}>{trips.length} movements</Text>
        )}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          user ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#000"]}
              tintColor="#000"
            />
          ) : undefined
        }
      >
        {!user ? (
          renderGuestPrompt()
        ) : loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Loading movements...</Text>
          </View>
        ) : trips.length > 0 ? (
          trips.map((trip) => renderExactTripCard(trip))
        ) : (
          renderNoTrips()
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
  tripCount: {
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
  // Guest/Login Prompt Styles
  guestContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  guestTitle: {
    fontSize: 20,
    fontFamily: "Bold",
    color: "#374151",
    marginTop: 20,
  },
  guestText: {
    fontSize: 16,
    fontFamily: "Regular",
    color: "#6B7280",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 22,
  },
  guestButton: {
    backgroundColor: "#000",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
    marginTop: 30,
  },
  guestButtonText: {
    fontSize: 16,
    fontFamily: "Bold",
    color: "#fff",
  },
  // Empty State Styles
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
  // Exact Card Styles
  exactCard: {
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
  exactCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  exactLeftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  bikeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  exactDateTimeText: {
    fontSize: 14,
    fontFamily: "Bold",
    color: "#111827",
  },
  exactRightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  exactStatusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  exactStatusText: {
    fontSize: 12,
    fontFamily: "Bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  exactLocationsContainer: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  exactRouteVisual: {
    width: 20,
    alignItems: "center",
    marginRight: 12,
    paddingTop: 2,
  },
  exactStartDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
    marginBottom: 8,
  },
  exactRouteLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E5E7EB",
    minHeight: 24,
    marginBottom: 8,
  },
  exactEndDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  exactLocationTexts: {
    flex: 1,
    justifyContent: "space-between",
  },
  exactLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  exactLocationText: {
    fontSize: 14,
    fontFamily: "Regular",
    color: "#374151",
    marginLeft: 8,
    flex: 1,
  },
  bottomSpacing: {
    height: 80,
  },
});