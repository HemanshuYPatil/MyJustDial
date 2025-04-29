import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Animated,
  Dimensions,
  Alert,
  Platform,
  Image,
} from "react-native";
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  FontAwesome5,
  Feather,
} from "@expo/vector-icons";
import { auth, geofirestore, firebase } from "../lib/db/firebase";
import { getusername } from "../lib/query/user";
import { BlurView } from "expo-blur";
import { useFonts } from "expo-font";

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width - 40;

export default function RiderSearchResultsScreen({ route, navigation }) {
  const { pickup, destination, pickupCoordinates, destinationCoordinates } =
    route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [sortOption, setSortOption] = useState("distance"); // distance, rating, time
  const [filterVisible, setFilterVisible] = useState(false);

  // Animation values
  const scrollY = new Animated.Value(0);
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0.95],
    extrapolate: "clamp",
  });

  // Card animation
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

  // Load custom fonts
  const [fontsLoaded] = useFonts({
    Regular: require("../assets/fonts/regular.ttf"),
    Medium: require("../assets/fonts/medium.ttf"),
    Bold: require("../assets/fonts/bold.ttf"),
  });

  // Initial setup
  useEffect(() => {
    fetchNearbyUsers();
  }, []);

  // Effect for sorting when option changes
  useEffect(() => {
    if (nearbyUsers.length > 0) {
      let sortedUsers = [...nearbyUsers];

      if (sortOption === "distance") {
        sortedUsers.sort((a, b) => a.distance - b.distance);
      } else if (sortOption === "rating") {
        sortedUsers.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
      } else if (sortOption === "time") {
        sortedUsers.sort((a, b) => b.timestamp - a.timestamp);
      }

      setNearbyUsers(sortedUsers);
    }
  }, [sortOption]);

  // Effect to select first user when nearby users change
  useEffect(() => {
    if (nearbyUsers.length > 0 && !selectedUser) {
      setSelectedUser(nearbyUsers[0]);

      // Animate cards appearance
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
    }
  }, [nearbyUsers]);

  // Fetch nearby users
  const fetchNearbyUsers = async () => {
    setIsLoading(true);

    try {
      // Get reference point (pickup location)
      const center = new firebase.firestore.GeoPoint(
        pickupCoordinates.latitude,
        pickupCoordinates.longitude
      );

      // Query trips within 3km of pickup point
      const geoCollection = geofirestore.collection("trips");
      const query = geoCollection.near({
        center,
        radius: 3, // 3km radius
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
        // Check if routes are similar
        const tripDestination = tripData.endLocation;
        const isSimilarDestination = isLocationNearby(
          destinationCoordinates.latitude,
          destinationCoordinates.longitude,
          tripDestination.latitude,
          tripDestination.longitude,
          2 // 2km threshold for similar destination
        );

        if (isSimilarDestination) {
          processedUserIds.add(tripData.userId);

          // Add to user data
          const userData = {
            id: tripData.userId,
            tripId: doc.id,
            startLocation:
              tripData.startlocationName?.split(",")[0] || "Location",
            endLocation:
              tripData.endlocationName?.split(",")[0] || "Destination",
            startCoords: tripData.startLocation,
            endCoords: tripData.endLocation,
            timestamp: tripData.timestamp || Date.now(),
            distance: calculateDistance(
              pickupCoordinates.latitude,
              pickupCoordinates.longitude,
              tripData.startLocation.latitude,
              tripData.startLocation.longitude
            ),
            rating: (Math.random() * 2 + 3).toFixed(1), // Mock rating between 3.0-5.0
            rides: Math.floor(Math.random() * 50) + 1, // Mock number of rides
            avatarColor: getRandomColor(),
            verified: Math.random() > 0.3, // Random verification status for UI enhancement
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
        }
      });

      // Wait for all username fetches to complete
      await Promise.all(userPromises);

      // Sort by distance
      usersData.sort((a, b) => a.distance - b.distance);

      setNearbyUsers(usersData);

      if (usersData.length > 0) {
        setSelectedUser(usersData[0]);
      }
    } catch (error) {
      console.error("Error fetching nearby users:", error);
      Alert.alert("Error", "Failed to fetch nearby users. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate random pastel color for avatars
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

  // Check if two locations are nearby (within threshold km)
  const isLocationNearby = (lat1, lon1, lat2, lon2, threshold) => {
    const distance = calculateDistance(lat1, lon1, lat2, lon2);
    return distance <= threshold;
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

  // Format date from timestamp
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };


  // Add these functions to your component or utils file
const formatDepartureDate = (dateString) => {
  if (!dateString) return 'Not specified';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid date';
  
  // Format as "Mon, Apr 28, 2025"
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const formatDepartureTime = (timeString) => {
  if (!timeString) return 'Not specified';
  
  // If timeString is a Date object or ISO string
  if (timeString instanceof Date || (typeof timeString === 'string' && !timeString.match(/^\d{1,2}:\d{2}$/))) {
    const date = new Date(timeString);
    if (isNaN(date.getTime())) return 'Invalid time';
    
    // Format as "10:30 AM"
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
  
  // If timeString is already formatted as "HH:MM"
  return timeString;
};

  // Handle user selection
  const handleUserSelect = (user) => {
    setSelectedUser(user);
    console.log(user);
  };

  // Handle contact user
  const handleContactUser = (user) => {
    if (!user) return;

    navigation.navigate("TripUserDetails", {
      userId: user.id,
      pickupLocation: user.startLocation,
      destinationLocation: user.endLocation,
      tripId: user.tripId,
      username: user.username,
    });
  };

  // Set sort option
  const handleSort = (option) => {
    setSortOption(option);
    setFilterVisible(false);
  };

  if (!fontsLoaded) {
    return null;
  }

  // Render user item in the list
  const renderUserItem = ({ item }) => {
    const isSelected = selectedUser && selectedUser.id === item.id;
    return (
      <UserCard
        item={item}
        isSelected={isSelected}
        onSelect={handleUserSelect}
        onContact={handleContactUser}
      />
    );
  };

  const UserCard = ({ item, isSelected, onSelect, onContact }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, []);

    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <TouchableOpacity
          style={[styles.card, isSelected && styles.cardSelected]}
          onPress={() => onSelect(item)}
          activeOpacity={0.95}
        >
          {/* Card content — same as before */}
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.avatarSection}>
              {item.userId ? (
                <Image
                  source={{
                    uri: "https://img.freepik.com/premium-vector/men-icon-trendy-avatar-character-cheerful-happy-people-flat-vector-illustration-round-frame-male-portraits-group-team-adorable-guys-isolated-white-background_275421-286.jpg",
                  }}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: item.avatarColor || "#ccc" },
                  ]}
                >
                  <Text style={styles.avatarText}>
                    {item.username?.charAt(0) || "U"}
                  </Text>
                </View>
              )}
              {item.verified && (
                <View style={styles.verifiedBadge}>
                  <MaterialIcons name="verified" size={18} color="#4D7EFF" />
                </View>
              )}
            </View>

            <View style={styles.userInfo}>
              <View style={styles.usernameLine}>
                <Text style={styles.userName}>{item.username}</Text>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.ratingText}>{item.rating || "N/A"}</Text>
                </View>
              </View>

              <View style={styles.rideInfoLine}>
                <View style={styles.badgeContainer}>
                  <Text style={styles.rideCount}>{item.rides} rides</Text>
                </View>
                <Text style={styles.rideDate}>
                  {console.log(item.createdAt)}
                  {formatDate(item.createdAt)}
                </Text>
              </View>
            </View>
          </View>

          {/* Route Info */}
          <View style={styles.routeInfoContainer}>
            <View style={styles.routeIcon}>
              <View style={styles.originDot} />
              <View style={styles.routeLine} />
              <View style={styles.destinationDot} />
            </View>

            <View style={styles.routeDetails}>
              <View style={styles.locationRow}>
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.startLocation}
                </Text>
                <View style={styles.locationChip}>
                  <Text style={styles.locationChipText}>PICK-UP</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.locationRow}>
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.endLocation}
                </Text>
                <View style={styles.locationChip}>
                  <Text style={styles.locationChipText}>DROP-OFF</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.routeInfoContainer}>
            <View style={styles.departureIconContainer}>
              <Ionicons name="time-outline" size={20} color="#555" />
            </View>
            <View style={styles.departureDetails}>
              <View style={styles.departureRow}>
                <Text style={styles.departureLabel}>Departure Date:</Text>
                <Text style={styles.departureValue}>
                  {formatDepartureDate(item.departure)}
                </Text>
              </View>
              <View style={styles.departureRow}>
                <Text style={styles.departureLabel}>Departure Time:</Text>
                <Text style={styles.departureValue}>
                  {formatDepartureTime(item.departure)}
                </Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.distanceContainer}>
              <Ionicons name="location-outline" size={16} color="#555" />
              <Text style={styles.distanceText}>
                {item.distance?.toFixed(1)} km away
              </Text>
            </View>

            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => onContact(item)}
              activeOpacity={0.8}
            >
              <Text style={styles.contactButtonText}>Book Now</Text>
              <Ionicons name="chevron-forward" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Render filter options menu
  const renderFilterMenu = () => {
    if (!filterVisible) return null;

    return (
      <BlurView intensity={90} style={styles.filterMenu}>
        <TouchableOpacity
          style={[
            styles.filterOption,
            sortOption === "distance" && styles.filterOptionSelected,
          ]}
          onPress={() => handleSort("distance")}
        >
          <Ionicons
            name="location-outline"
            size={20}
            color={sortOption === "distance" ? "#000" : "#555"}
          />
          <Text
            style={[
              styles.filterText,
              sortOption === "distance" && styles.filterTextSelected,
            ]}
          >
            Distance
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterOption,
            sortOption === "rating" && styles.filterOptionSelected,
          ]}
          onPress={() => handleSort("rating")}
        >
          <Ionicons
            name="star-outline"
            size={20}
            color={sortOption === "rating" ? "#000" : "#555"}
          />
          <Text
            style={[
              styles.filterText,
              sortOption === "rating" && styles.filterTextSelected,
            ]}
          >
            Rating
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterOption,
            sortOption === "time" && styles.filterOptionSelected,
          ]}
          onPress={() => handleSort("time")}
        >
          <Ionicons
            name="time-outline"
            size={20}
            color={sortOption === "time" ? "#000" : "#555"}
          />
          <Text
            style={[
              styles.filterText,
              sortOption === "time" && styles.filterTextSelected,
            ]}
          >
            Recent
          </Text>
        </TouchableOpacity>
      </BlurView>
    );
  };

  const Header = ({ navigation, pickup, destination, headerOpacity }) => {
    return (
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Nearby Riders</Text>
          <View style={styles.headerRouteContainer}>
            <Text style={styles.headerRouteText} numberOfLines={1}>
              {pickup.split(",")[0]} → {destination.split(",")[0]}
            </Text>
          </View>
          {!isLoading && (
            <Text style={styles.headerCount}>
              {nearbyUsers.length}{" "}
              {nearbyUsers.length === 1 ? "person" : "people"} found
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterVisible(!filterVisible)}
        >
          <Feather name="sliders" size={20} color="#000" />
        </TouchableOpacity>
      </Animated.View>
    );
  };
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {/* Header */}
      {/* <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Nearby Riders</Text>
          {!isLoading && (
            <Text style={styles.headerCount}>
              {nearbyUsers.length}{" "}
              {nearbyUsers.length === 1 ? "person" : "people"} found
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterVisible(!filterVisible)}
        >
          <Feather name="sliders" size={20} color="#000" />
        </TouchableOpacity>
      </Animated.View> */}
      // Replace the existing header section in the return statement with this
      code:
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Nearby Riders</Text>
          <View style={styles.headerRouteContainer}>
            <Text style={styles.headerRouteText} numberOfLines={1}>
              {pickup.split(",")[0]} → {destination.split(",")[0]}
            </Text>
          </View>
          {/* {!isLoading && (
            <Text style={styles.headerCount}>
              {nearbyUsers.length}{" "}
              {nearbyUsers.length === 1 ? "person" : "people"} found
            </Text>
          )} */}
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          // onPress={() => setFilterVisible(!filterVisible)}
        >
          {/* <Feather name="sliders" size={20} color="#000" /> */}
        </TouchableOpacity>
      </Animated.View>
      {/* Loading/Empty State */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Finding nearby riders...</Text>
        </View>
      ) : nearbyUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="account-search-outline"
            size={70}
            color="#999"
          />
          <Text style={styles.emptyText}>No riders found</Text>
          <Text style={styles.emptySubtext}>
            Try adjusting your route or search radius
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchNearbyUsers}
          >
            <Text style={styles.retryButtonText}>Retry Search</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.FlatList
          data={nearbyUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    marginTop: 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Bold",
    color: "#000",
  },
  headerCount: {
    fontSize: 13,
    fontFamily: "Regular",
    color: "#666",
    marginTop: 2,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  filterMenu: {
    position: "absolute",
    top: 70,
    right: 16,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 14,
    padding: 8,
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  filterOptionSelected: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  filterText: {
    fontSize: 15,
    fontFamily: "Medium",
    color: "#555",
    marginLeft: 10,
  },
  filterTextSelected: {
    color: "#000",
    fontFamily: "Bold",
  },
  routeCardContainer: {
    margin: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
  },
  routeWrapper: {
    position: "relative",
    paddingLeft: 30,
    height: 90,
  },
  tripIdContainer: {
    alignSelf: "flex-start",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 8,
    marginLeft: 30,
  },
  tripIdText: {
    fontSize: 12,
    fontFamily: "Medium",
    color: "#666",
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
    backgroundColor: "rgba(0,0,0,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  originPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#000",
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
  routeTextContainerMain: {
    paddingLeft: 10,
  },
  locationContainer: {
    marginBottom: 6,
  },
  locationLabelMain: {
    fontSize: 10,
    fontFamily: "Regular",
    fontWeight: "600",
    color: "#888",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  locationTextMain: {
    fontSize: 16,
    fontFamily: "Medium",
    color: "#000",
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 50,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: "Medium",
    color: "#555",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 50,
    paddingHorizontal: 24,
  },
  emptyText: {
    marginTop: 24,
    fontSize: 20,
    fontFamily: "Bold",
    color: "#333",
  },
  emptySubtext: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: "Regular",
    color: "#777",
    textAlign: "center",
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: "#000",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#FFF",
    fontFamily: "Bold",
    fontSize: 16,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    marginTop: 10,
  },
  cardSelected: {
    // borderColor: "#000",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  avatarSection: {
    position: "relative",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
    borderWidth: 3,
    borderColor: "#fff",
  },
  avatarText: {
    color: "#FFF",
    fontFamily: "Bold",
    fontSize: 22,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  usernameLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userName: {
    fontSize: 18,
    fontFamily: "Bold",
    color: "#000",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: "Bold",
    color: "#333",
    marginLeft: 4,
  },
  rideInfoLine: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    justifyContent: "space-between",
  },
  badgeContainer: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rideCount: {
    fontSize: 13,
    fontFamily: "Medium",
    color: "#555",
  },
  rideDate: {
    fontSize: 13,
    fontFamily: "Regular",
    color: "#888",
  },
  routeInfoContainer: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  routeIcon: {
    width: 20,
    alignItems: "center",
    marginRight: 14,
  },
  originDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4D7EFF",
    borderWidth: 2,
    borderColor: "rgba(77, 126, 255, 0.3)",
  },
  routeLine: {
    width: 2,
    height: 30,
    backgroundColor: "#ddd",
    marginVertical: 6,
  },
  destinationDot: {
    width: 12,
    height: 12,
    backgroundColor: "#FF5A5A",
    borderRadius: 3,
    transform: [{ rotate: "45deg" }],
  },
  routeDetails: {
    flex: 1,
  },
  locationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationText: {
    fontSize: 15,
    fontFamily: "Medium",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  locationChip: {
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  locationChipText: {
    fontSize: 10,
    fontFamily: "Bold",
    color: "#555",
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 15,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  distanceText: {
    fontSize: 14,
    fontFamily: "Medium",
    color: "#555",
    marginLeft: 6,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    shadowColor: "#4D7EFF",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  contactButtonText: {
    color: "#FFF",
    fontFamily: "Bold",
    fontSize: 15,
    marginRight: 4,
  },

  headerTitleContainer: {
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Bold",
    color: "#000",
  },
  headerCount: {
    fontSize: 13,
    fontFamily: "Regular",
    color: "#666",
    marginTop: 2,
  },
  headerRouteContainer: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 4,
    maxWidth: width - 140,
  },
  headerRouteText: {
    fontSize: 13,
    fontFamily: "Medium",
    color: "#555",
    textAlign: "center",
  },
departureContainer: {
  flexDirection: 'row',
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#EFEFEF',
},
departureIconContainer: {
  width: 24,
  alignItems: 'center',
  marginRight: 12,
  paddingTop: 2,
},
departureDetails: {
  flex: 1,
},
departureRow: {
  flexDirection: 'row',
  marginBottom: 4,
  alignItems: 'center',
},
departureLabel: {
  fontSize: 14,
  fontWeight: '600',
  color: '#555',
  width: 110,
},
departureValue: {
  fontSize: 14,
  color: '#333',
  fontWeight: '500',
},
});
