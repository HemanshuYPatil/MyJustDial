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
  Alert,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../lib/db/firebase";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

const { width } = Dimensions.get("window");

export default function TripDetailScreen({ route, navigation }) {
  const { tripId } = route.params;
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapVisible, setMapVisible] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    fetchTripDetails();
  }, [tripId]);

  const fetchTripDetails = async () => {
    setLoading(true);
    try {
      const tripRef = doc(db, "trips", tripId);
      const tripDoc = await getDoc(tripRef);
      
      if (tripDoc.exists()) {
        setTrip({ id: tripDoc.id, ...tripDoc.data() });
      } else {
        Alert.alert("Error", "Trip not found");
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error fetching trip details:", error);
      Alert.alert("Error", "Failed to load trip details");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTrip = async () => {
    Alert.alert(
      "Cancel Trip",
      "Are you sure you want to cancel this trip?",
      [
        { text: "No", style: "cancel" },
        { 
          text: "Yes", 
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const tripRef = doc(db, "trips", tripId);
              await updateDoc(tripRef, {
                status: "cancelled",
                cancelledAt: new Date().toISOString(),
              });
              
              // Refresh trip data
              fetchTripDetails();
              Alert.alert("Success", "Trip has been cancelled");
            } catch (error) {
              console.error("Error cancelling trip:", error);
              Alert.alert("Error", "Failed to cancel trip");
              setLoading(false);
            }
          }
        },
      ]
    );
  };

  const handleCompleteTrip = async () => {
    Alert.alert(
      "Complete Trip",
      "Confirm that you have completed this trip?",
      [
        { text: "No", style: "cancel" },
        { 
          text: "Yes", 
          onPress: async () => {
            try {
              setLoading(true);
              const tripRef = doc(db, "trips", tripId);
              await updateDoc(tripRef, {
                status: "completed",
                completedAt: new Date().toISOString(),
              });
              
              // Refresh trip data
              fetchTripDetails();
              Alert.alert("Success", "Trip has been marked as completed");
            } catch (error) {
              console.error("Error completing trip:", error);
              Alert.alert("Error", "Failed to complete trip");
              setLoading(false);
            }
          }
        },
      ]
    );
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

  const getStatusColor = (status) => {
    switch(status) {
      case "active":
        return "#4CAF50";
      case "completed":
        return "#2196F3";
      case "cancelled":
        return "#F44336";
      default:
        return "#9E9E9E";
    }
  };

  const renderActionButton = () => {
    if (!trip) return null;
    
    switch(trip.status) {
      case "active":
        return (
          <View style={styles.actionButtonContainer}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleCancelTrip}
            >
              <Text style={styles.cancelButtonText}>Cancel Trip</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.completeButton}
              onPress={handleCompleteTrip}
            >
              <Text style={styles.completeButtonText}>Complete Trip</Text>
            </TouchableOpacity>
          </View>
        );
      case "completed":
        return (
          <TouchableOpacity 
            style={styles.bookSimilarButton}
            onPress={() => navigation.navigate("Home", { 
              startLocation: trip.startLocation,
              endLocation: trip.endLocation,
            })}
          >
            <Text style={styles.bookSimilarButtonText}>Book Similar Trip</Text>
          </TouchableOpacity>
        );
      case "cancelled":
        return (
          <TouchableOpacity 
            style={styles.bookSimilarButton}
            onPress={() => navigation.navigate("Home")}
          >
            <Text style={styles.bookSimilarButtonText}>Book New Trip</Text>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" hidden={false} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        
        <Text style={styles.headerText}>Trip Details</Text>
        
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading trip details...</Text>
        </View>
      ) : trip ? (
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Status Badge */}
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trip.status) }]}>
              <Text style={styles.statusText}>{trip.status}</Text>
            </View>
          </View>
          
          {/* Trip ID */}
          <View style={styles.idContainer}>
            <Text style={styles.idLabel}>Trip ID</Text>
            <Text style={styles.idValue}>{trip.id}</Text>
          </View>
          
          {/* Created Date */}
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <MaterialIcons name="date-range" size={20} color="#555" />
              <Text style={styles.infoCardTitle}>Trip Booked</Text>
            </View>
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardText}>{formatDate(trip.createdAt)} at {formatTime(trip.createdAt)}</Text>
            </View>
          </View>
          
          {/* Locations Card */}
          <View style={styles.locationsCard}>
            <View style={styles.locationHeader}>
              <MaterialIcons name="location-on" size={20} color="#555" />
              <Text style={styles.locationHeaderText}>Trip Route</Text>
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
                  <Text style={styles.locationText}>{trip.startlocationName || "Unknown location"}</Text>
                </View>
                
                <View style={styles.locationItem}>
                  <Text style={styles.locationLabel}>To</Text>
                  <Text style={styles.locationText}>{trip.endlocationName || "Unknown destination"}</Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.viewMapButton}
              onPress={() => setMapVisible(!mapVisible)}
            >
              <Text style={styles.viewMapText}>{mapVisible ? "Hide Map" : "View Map"}</Text>
              <MaterialIcons name={mapVisible ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={20} color="#000" />
            </TouchableOpacity>
            
            {mapVisible && trip.startLocation && trip.endLocation && (
              <View style={styles.mapContainer}>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={{
                    latitude: trip.startLocation.latitude,
                    longitude: trip.startLocation.longitude,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                  }}
                >
                  <Marker
                    coordinate={{
                      latitude: trip.startLocation.latitude,
                      longitude: trip.startLocation.longitude,
                    }}
                    pinColor="#4CAF50"
                    title="Start Location"
                  />
                  <Marker
                    coordinate={{
                      latitude: trip.endLocation.latitude,
                      longitude: trip.endLocation.longitude,
                    }}
                    pinColor="#F44336"
                    title="End Location"
                  />
                </MapView>
              </View>
            )}
          </View>
          
          {/* Trip Details Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <MaterialIcons name="info" size={20} color="#555" />
              <Text style={styles.infoCardTitle}>Trip Details</Text>
            </View>
            
            <View style={styles.infoCardContent}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Departure Date:</Text>
                <Text style={styles.detailValue}>{formatDate(trip.departureTime)}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Departure Time:</Text>
                <Text style={styles.detailValue}>{formatTime(trip.departureTime)}</Text>
              </View>
              
              {trip.availableForDelivery && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Delivery:</Text>
                  <Text style={styles.detailValue}>Available for delivery</Text>
                </View>
              )}
              
              {trip.status === "completed" && trip.completedAt && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Completed:</Text>
                  <Text style={styles.detailValue}>{formatDate(trip.completedAt)} at {formatTime(trip.completedAt)}</Text>
                </View>
              )}
              
              {trip.status === "cancelled" && trip.cancelledAt && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Cancelled:</Text>
                  <Text style={styles.detailValue}>{formatDate(trip.cancelledAt)} at {formatTime(trip.cancelledAt)}</Text>
                </View>
              )}
            </View>
          </View>
          
          {/* Notes Card */}
          {trip.notes && (
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <MaterialIcons name="note" size={20} color="#555" />
                <Text style={styles.infoCardTitle}>Notes</Text>
              </View>
              <View style={styles.infoCardContent}>
                <Text style={styles.notesText}>{trip.notes}</Text>
              </View>
            </View>
          )}
          
          {/* Action Buttons */}
          {renderActionButton()}
          
          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      ) : (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={60} color="#F44336" />
          <Text style={styles.errorText}>Trip not found</Text>
          <TouchableOpacity 
            style={styles.backToTripsButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backToTripsText}>Back to My Trips</Text>
          </TouchableOpacity>
        </View>
      )}
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 16,
    fontFamily: "Regular",
    color: "#333",
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontFamily: "Bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
  },
  backToTripsButton: {
    backgroundColor: "#000",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    marginTop: 20,
  },
  backToTripsText: {
    fontSize: 16,
    fontFamily: "Bold",
    color: "#fff",
  },
  statusContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontFamily: "Bold",
    color: "#fff",
    textTransform: "capitalize",
  },
  idContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  idLabel: {
    fontSize: 12,
    fontFamily: "Regular",
    color: "#777",
  },
  idValue: {
    fontSize: 16,
    fontFamily: "Bold",
    color: "#000",
    marginTop: 4,
  },
  infoCard: {
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
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoCardTitle: {
    fontSize: 16,
    fontFamily: "Bold",
    color: "#000",
    marginLeft: 8,
  },
  infoCardContent: {
    paddingLeft: 28,
  },
  infoCardText: {
    fontSize: 15,
    fontFamily: "Regular",
    color: "#333",
  },
  locationsCard: {
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
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  locationHeaderText: {
    fontSize: 16,
    fontFamily: "Bold",
    color: "#000",
    marginLeft: 8,
  },
  tripLocations: {
    flexDirection: "row",
    marginBottom: 16,
  },
  locationLine: {
    width: 24,
    alignItems: "center",
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
    marginLeft: 12,
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
    fontSize: 15,
    fontFamily: "Medium",
    color: "#000",
  },
  viewMapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  viewMapText: {
    fontSize: 14,
    fontFamily: "Medium",
    color: "#000",
    marginRight: 4,
  },
  mapContainer: {
    height: 200,
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: "Regular",
    color: "#777",
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: "Medium",
    color: "#333",
    flex: 2,
    textAlign: "right",
  },
  notesText: {
    fontSize: 14,
    fontFamily: "Regular",
    color: "#333",
    lineHeight: 20,
  },
  actionButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
    marginRight: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: "Bold",
    color: "#F44336",
  },
  completeButton: {
    flex: 1,
    backgroundColor: "#000",
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
    marginLeft: 10,
  },
  completeButtonText: {
    fontSize: 16,
    fontFamily: "Bold",
    color: "#fff",
  },
  bookSimilarButton: {
    backgroundColor: "#000",
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  bookSimilarButtonText: {
    fontSize: 16,
    fontFamily: "Bold",
    color: "#fff",
  },
  bottomSpacing: {
    height: 40,
  },
});