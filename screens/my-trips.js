import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../lib/db/firebase";

const { width } = Dimensions.get("window");

export default function MyTripsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState("active");
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    fetchTrips();
  }, [activeTab]);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      let tripStatus = activeTab === "cancelled" ? ["cancelled", "expired"] : [activeTab];
      
      const tripsRef = collection(db, "trips");
      const q = query(
        tripsRef, 
        where("userId", "==", user.uid),
        where("status", "in", tripStatus)  // Fetch both cancelled and expired for the cancelled tab
      );
      
      const querySnapshot = await getDocs(q);
      const tripsData = [];
      
      querySnapshot.forEach((doc) => {
        tripsData.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      
      setTrips(tripsData);
    } catch (error) {
      console.error("Error fetching trips:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderNoTrips = () => (
    <View style={styles.emptyStateContainer}>
      <MaterialCommunityIcons name="map-marker-path" size={70} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No trips found</Text>
      <Text style={styles.emptyStateText}>
        {activeTab === "active" 
          ? "You don't have any active trips." 
          : activeTab === "completed" 
            ? "You haven't completed any trips yet."
            : "You don't have any cancelled trips."}
      </Text>
      <TouchableOpacity 
        style={styles.emptyStateButton}
        onPress={() => navigation.navigate("Home")}
      >
        <Text style={styles.emptyStateButtonText}>Book a Trip</Text>
      </TouchableOpacity>
    </View>
  );

  const getStatusColor = (status) => {
    switch(status) {
      case "active":
        return "#4CAF50";
      case "completed":
        return "#2196F3";
      case "cancelled":
        return "#F44336";
      case "expired":
        return "#F44336";
      default:
        return "#9E9E9E";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderTripCard = (trip) => (
    <TouchableOpacity 
      key={trip.id} 
      style={styles.tripCard}
      onPress={() => navigation.navigate("TripDetails", { tripId: trip.id })}
    >
      <View style={styles.tripHeader}>
        <View style={styles.tripDateContainer}>
          <Text style={styles.tripDate}>{formatDate(trip.createdAt)}</Text>
          <Text style={styles.tripTime}>{formatTime(trip.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trip.status) }]}>
          <Text style={styles.statusText}>{trip.status}</Text>
        </View>
      </View>
      
      <View style={styles.tripLocations}>
        <View style={styles.locationLine}>
          <View style={styles.locationDot} />
          <View style={styles.locationVerticalLine} />
          <View style={styles.destinationDot} />
        </View>
        
        <View style={styles.locationTextContainer}>
          <View style={styles.locationItem}>
            <Text style={styles.locationLabel}>From</Text>
            <Text style={styles.locationText} numberOfLines={1}>{trip.startlocationName || "Unknown location"}</Text>
          </View>
          
          <View style={styles.locationItem}>
            <Text style={styles.locationLabel}>To</Text>
            <Text style={styles.locationText} numberOfLines={1}>{trip.endlocationName || "Unknown destination"}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.tripDetails}>
        <View style={styles.tripDetailItem}>
          <MaterialIcons name="access-time" size={16} color="#777" />
          <Text style={styles.tripDetailText}>
            Departure: {formatTime(trip.departureTime)}
          </Text>
        </View>
        
        {trip.availableForDelivery && (
          <View style={styles.tripDetailItem}>
            <MaterialIcons name="local-shipping" size={16} color="#777" />
            <Text style={styles.tripDetailText}>Available for delivery</Text>
          </View>
        )}
      </View>
      
      <View style={styles.tripFooter}>
        <View style={styles.tripPrice}>
          <Text style={styles.priceLabel}>Trip ID</Text>
          <Text style={styles.idValue}>{trip.id.substring(0, 8)}...</Text>
        </View>
        
        <TouchableOpacity style={styles.detailsButton}>
          <Text style={styles.detailsButtonText}>Details</Text>
          <MaterialIcons name="chevron-right" size={20} color="#777" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" hidden={false} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>My Trips</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === "active" && styles.activeTab]}
          onPress={() => setActiveTab("active")}
        >
          <Text style={[styles.tabText, activeTab === "active" && styles.activeTabText]}>Active</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === "completed" && styles.activeTab]}
          onPress={() => setActiveTab("completed")}
        >
          <Text style={[styles.tabText, activeTab === "completed" && styles.activeTabText]}>Completed</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === "cancelled" && styles.activeTab]}
          onPress={() => setActiveTab("cancelled")}
        >
          <Text style={[styles.tabText, activeTab === "cancelled" && styles.activeTabText]}>Cancelled</Text>
        </TouchableOpacity>

    
      </View>

      {/* Trips List */}
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Loading trips...</Text>
          </View>
        ) : trips.length > 0 ? (
          trips.map(trip => renderTripCard(trip))
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
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 40 : 10,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    fontSize: 20,
    fontFamily: "Bold",
    color: "#000",
  },
  placeholder: {
    width: 40,
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: "#000",
  },
  tabText: {
    fontSize: 16,
    fontFamily: "Regular",
    color: "#777",
  },
  activeTabText: {
    color: "#000",
    fontFamily: "Bold",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 16,
    fontFamily: "Regular",
    color: "#333",
    marginTop: 10,
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: "Bold",
    color: "#333",
    marginTop: 20,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: "Regular",
    color: "#777",
    textAlign: "center",
    marginTop: 10,
    paddingHorizontal: 40,
  },
  emptyStateButton: {
    backgroundColor: "#000",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    marginTop: 20,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontFamily: "Bold",
    color: "#fff",
  },
  tripCard: {
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
    borderColor: "#f0f0f0",
  },
  tripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  tripDateContainer: {
    flexDirection: "column",
  },
  tripDate: {
    fontSize: 16,
    fontFamily: "Bold",
    color: "#000",
  },
  tripTime: {
    fontSize: 14,
    fontFamily: "Regular",
    color: "#777",
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Bold",
    color: "#fff",
    textTransform: "capitalize",
  },
  tripLocations: {
    flexDirection: "row",
    marginBottom: 16,
  },
  locationLine: {
    width: 24,
    alignItems: "center",
    marginRight: 12,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4CAF50",
  },
  locationVerticalLine: {
    width: 2,
    height: 30,
    backgroundColor: "#ddd",
    marginVertical: 4,
  },
  destinationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#F44336",
  },
  locationTextContainer: {
    flex: 1,
  },
  locationItem: {
    marginBottom: 16,
  },
  locationLabel: {
    fontSize: 12,
    fontFamily: "Regular",
    color: "#777",
    marginBottom: 2,
  },
  locationText: {
    fontSize: 14,
    fontFamily: "Medium",
    color: "#000",
  },
  tripDetails: {
    marginBottom: 16,
  },
  tripDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  tripDetailText: {
    fontSize: 14,
    fontFamily: "Regular",
    color: "#555",
    marginLeft: 8,
  },
  tripFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 16,
  },
  tripPrice: {
    flexDirection: "column",
  },
  priceLabel: {
    fontSize: 12,
    fontFamily: "Regular",
    color: "#777",
  },
  idValue: {
    fontSize: 14,
    fontFamily: "Bold",
    color: "#000",
  },
  detailsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  detailsButtonText: {
    fontSize: 14,
    fontFamily: "Medium",
    color: "#333",
    marginRight: 4,
  },
  bottomSpacing: {
    height: 80,
  },
});