import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Animated,
  Platform,
} from "react-native";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../lib/db/firebase";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { color } from "react-native-elements/dist/helpers";
import { updateDoc } from "firebase/firestore";

const { width } = Dimensions.get("window");

export default function TripDetailScreen({ route, navigation }) {
  const { tripId } = route.params;
  const [trip, setTrip] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapVisible, setMapVisible] = useState(false);
  const user = auth.currentUser;

  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  const [fontsLoaded] = useFonts({
    Regular: require("../../assets/fonts/regular.ttf"),
    Medium: require("../../assets/fonts/medium.ttf"),
    Bold: require("../../assets/fonts/bold.ttf"),
  });

  const handleUpdateStatus = async (newStatus) => {
    if (!tripId) return;

    try {
      const tripRef = doc(db, "trips", tripId);
      await updateDoc(tripRef, {
        status: newStatus,
      });

      // Locally update state for instant UI feedback
      setTrip((prev) => ({ ...prev, status: newStatus }));
    } catch (error) {
      console.error("Error updating trip status:", error);
    }
  };

  useEffect(() => {
    const fetchTripDetails = async () => {
      setLoading(true);
      try {
        const tripRef = doc(db, "trips", tripId);
        const tripDoc = await getDoc(tripRef);

        if (tripDoc.exists()) {
          const tripData = { id: tripDoc.id, ...tripDoc.data() };
          setTrip(tripData);

          // Fetch user profile
          const userRef = doc(db, "users", tripData.userId);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          }

          // Start animations
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ]).start();
        } else {
          console.warn("Trip not found for tripId:", tripId);
        }
      } catch (error) {
        console.error("Error fetching trip details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTripDetails();
  }, [tripId]);

  const formatDate = (dateString) => {
    if (!dateString) return "Not specified";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return "Not specified";
    const time = new Date(timeString);
    if (isNaN(time.getTime())) return "Invalid Time";

    return time.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
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

  const getTripTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "car":
        return <Ionicons name="car" size={18} color="#0070E0" />;
      case "walk":
        return <Ionicons name="walk" size={18} color="#0070E0" />;
      case "bus":
        return <Ionicons name="bus" size={18} color="#0070E0" />;
      case "bike":
        return <Ionicons name="bicycle" size={18} color="#0070E0" />;
      case "train":
        return <Ionicons name="train" size={18} color="#0070E0" />;
      default:
        return null;
    }
  };

  const toggleMapVisibility = () => {
    setMapVisible(!mapVisible);
  };

  const renderMap = () => {
    if (!mapVisible || !trip?.startLocation || !trip?.endLocation) return null;

    const startCoords = {
      latitude: trip.startLocation.latitude,
      longitude: trip.startLocation.longitude,
    };

    const endCoords = {
      latitude: trip.endLocation.latitude,
      longitude: trip.endLocation.longitude,
    };

    return (
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: (startCoords.latitude + endCoords.latitude) / 2,
            longitude: (startCoords.longitude + endCoords.longitude) / 2,
            latitudeDelta:
              Math.abs(startCoords.latitude - endCoords.latitude) * 1.5,
            longitudeDelta:
              Math.abs(startCoords.longitude - endCoords.longitude) * 1.5,
          }}
        >
          <Marker
            coordinate={startCoords}
            title="Pickup Location"
            description={trip.startlocationName}
          />
          <Marker
            coordinate={endCoords}
            title="Drop-off Location"
            description={trip.endlocationName}
          />
        </MapView>
      </View>
    );
  };

  if (!fontsLoaded || loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={60} color="#F44336" />
          <Text style={styles.errorText}>Trip not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>Back to Trips</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" hidden={false} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Movement Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Section */}
        <Animated.View
          style={[
            styles.profileContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.avatarContainer}>
            {userProfile?.photoURL ? (
              <Image
                source={{ uri: userProfile.photoURL }}
                style={styles.avatar}
              />
            ) : (
              <Image
                source={{
                  uri: "https://img.freepik.com/premium-vector/men-icon-trendy-avatar-character-cheerful-happy-people-flat-vector-illustration-round-frame-male-portraits-group-team-adorable-guys-isolated-white-background_275421-286.jpg",
                }}
                style={styles.avatar}
              />
            )}
          </View>

          <View style={styles.userInfoContainer}>
            <Text style={styles.userName}>
              {userProfile?.displayName ||
                userProfile?.name ||
                "Movement Owner"}
            </Text>

            {userProfile.phonenumbervisible === true && (
              <Text style={styles.phonetext}>
                +91-{userProfile?.phoneNumber || ""}
              </Text>
            )}

            <View style={styles.badgeContainer}>
              <FontAwesome5 name="shield-alt" size={12} color="#fff" />
              <Text style={styles.badgeText}>Verified User</Text>
            </View>
          </View>

          {/* Status Badge */}
          {/* <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trip.status) }]}>
            <Text style={styles.statusText}>{trip.status}</Text>
          </View> */}

          {/* Trip ID */}
        </Animated.View>

        {/* Route Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionTitle}>Movement Route</Text>
          </View>

          <View style={styles.routeContainer}>
            <View style={styles.routePointWrapper}>
              <View style={styles.routePointOutline}>
                <View style={styles.originPoint} />
              </View>
            </View>

            <View style={styles.verticalLine} />

            <View style={[styles.routePointWrapper, { top: 80 }]}>
              <View style={styles.destinationPoint} />
            </View>

            <View style={styles.routeTextContainer}>
              <View style={styles.locationContainer}>
                <Text style={styles.locationLabel}>PICK-UP</Text>
                <Text style={styles.locationText} numberOfLines={1}>
                  {trip.startlocationName || "Unknown location"}
                </Text>
              </View>
              <View style={[styles.locationContainer, { marginTop: 15 }]}>
                <Text style={styles.locationLabel}>DESTINATION</Text>
                <Text style={styles.locationText} numberOfLines={1}>
                  {trip.endlocationName || "Unknown destination"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Route Map</Text>

          <View
            style={{
              height: 300,
              borderRadius: 12,
              overflow: "hidden",
              marginTop: 16,
            }}
          >
            <MapView
              style={{ flex: 1 }}
              initialRegion={{
                latitude: trip.startLocation?.latitude || 20.5937,
                longitude: trip.startLocation?.longitude || 78.9629,
                latitudeDelta: 1.2,
                longitudeDelta: 1.2,
              }}
              showsUserLocation={true}
              scrollEnabled={true}
              zoomEnabled={true}
              pitchEnabled={true}
              rotateEnabled={true}
            >
              {/* Pickup Marker */}
              {trip.startLocation && (
                <Marker
                  coordinate={trip.startLocation}
                  title="Pickup"
                  description={trip.startlocationName}
                  pinColor="#0070E0"
                />
              )}

              {/* Destination Marker */}
              {trip.endLocation && (
                <Marker
                  coordinate={trip.endLocation}
                  title="Destination"
                  description={trip.endlocationName}
                  pinColor="#000"
                />
              )}

              {/* Polyline connecting pickup and destination */}
              {trip.startLocation && trip.endLocation && (
                <Polyline
                  coordinates={[trip.startLocation, trip.endLocation]}
                  strokeColor="#0070E0"
                  strokeWidth={4}
                  lineDashPattern={[2, 4]}
                />
              )}
            </MapView>
          </View>
        </View>
        {/* Trip Information */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Movement Information</Text>
          <View style={styles.tripInfoGrid}>
            <View style={styles.tripInfoItem}>
              <View style={styles.tripInfoIconContainer}>
                {getTripTypeIcon(trip.tripType)}
              </View>
              <View style={styles.tripInfoTextContainer}>
                <Text style={styles.tripInfoLabel}>Trip Type</Text>
                <Text style={styles.tripInfoValue}>
                  {trip.tripType || "N/A"}
                </Text>
              </View>
            </View>

            <View style={styles.tripInfoItem}>
              <View style={styles.tripInfoIconContainer}>
                <Ionicons name="calendar" size={18} color="#0070E0" />
              </View>
              <View style={styles.tripInfoTextContainer}>
                <Text style={styles.tripInfoLabel}>Date</Text>
                <Text style={styles.tripInfoValue}>
                  {formatDate(trip.departureTime)}
                </Text>
              </View>
            </View>

            <View style={styles.tripInfoItem}>
              <View style={styles.tripInfoIconContainer}>
                <Ionicons name="time" size={18} color="#0070E0" />
              </View>
              <View style={styles.tripInfoTextContainer}>
                <Text style={styles.tripInfoLabel}>Time</Text>
                <Text style={styles.tripInfoValue}>
                  {formatTime(trip.departureTime)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Notes Section */}
        {trip.notes && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{trip.notes}</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Buttons */}
      {trip.userId === user.uid && (
        <View style={styles.buttonContainer}>
          {trip.status === "active" && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => handleUpdateStatus("cancelled")}
              >
                <Text style={styles.buttonText}>Cancel </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton]}
                onPress={() => handleUpdateStatus("completed")}
              >
                <Text style={[styles.buttonText, { color: "#fff" }]}>
                  Complete 
                </Text>
              </TouchableOpacity>
            </>
          )}

          {trip.status === "completed" && (
            <TouchableOpacity style={[styles.actionButton, styles.bookButton]}>
              <Text style={[styles.buttonText, { color: "#fff" }]}>
                Book Similar Movement
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontFamily: "Bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 30,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingTop: Platform.OS === "android" ? 40 : 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Bold",
    color: "#000",
  },
  scrollContainer: {
    flex: 1,
  },
  profileContainer: {
    alignItems: "center",
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: "#f0f0f0",
  },
  userInfoContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontFamily: "Bold",
    color: "#000",
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgb(0, 0, 0)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Medium",
    color: "#fff",
    marginLeft: 4,
  },
  statusBadge: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 16,
    fontFamily: "Bold",
    color: "#fff",
    textTransform: "capitalize",
  },
  idContainer: {
    alignItems: "center",
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
  sectionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sectionHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Bold",
    color: "#000",
  },
  routeContainer: {
    position: "relative",
    paddingLeft: 30,
    height: 120,
  },
  routePointWrapper: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 20,
    alignItems: "center",
  },
  routePointOutline: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(0,112,224,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  originPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0070E0",
  },
  verticalLine: {
    position: "absolute",
    left: 10,
    top: 16,
    bottom: 40,
    width: 1.5,
    backgroundColor: "#ddd",
  },
  destinationPoint: {
    width: 12,
    height: 12,
    backgroundColor: "#000",
    borderRadius: 3,
    transform: [{ rotate: "45deg" }],
  },
  routeTextContainer: {
    paddingLeft: 10,
  },
  locationContainer: {
    marginBottom: 16,
  },
  locationLabel: {
    fontSize: 10,
    fontFamily: "Regular",
    fontWeight: "600",
    color: "#888",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  locationText: {
    fontSize: 16,
    fontFamily: "Medium",
    color: "#000",
  },
  tripInfoGrid: {
    marginTop: 16,
  },
  tripInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  tripInfoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(0,112,224,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  tripInfoTextContainer: {
    flex: 1,
  },
  tripInfoLabel: {
    fontSize: 12,
    fontFamily: "Regular",
    color: "#666",
    marginBottom: 2,
  },
  tripInfoValue: {
    fontSize: 16,
    fontFamily: "Medium",
    color: "#000",
  },
  phonetext: {
    fontSize: 16,

    color: "#000",
    marginBottom: 8,
  },
  viewMapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    marginTop: 10,
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
  notesText: {
    fontSize: 16,
    fontFamily: "Regular",
    color: "#444",
    lineHeight: 24,
    marginTop: 8,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
    marginRight: 10,
  },
  completeButton: {
    backgroundColor: "#000",
    marginLeft: 10,
  },
  bookButton: {
    backgroundColor: "#000",
  },
  buttonText: {
    fontSize: 16,
    fontFamily: "Bold",
  },
});
