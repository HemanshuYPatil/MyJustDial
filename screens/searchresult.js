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
  Image,
} from "react-native";
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  FontAwesome5,
  Feather,
} from "@expo/vector-icons";
import { auth, geofirestore, GeoPoint } from "../lib/db/firebase";
import { getusername } from "../lib/query/user";
import { BlurView } from "expo-blur";
import { useFonts } from "expo-font";

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width - 20;

export default function RiderSearchResultsScreen({ route, navigation }) {
  const {
    pickup,
    destination,
    pickupCoordinates,
    destinationCoordinates,
    isGuest = false,
    searchResults = [],
    searchByCity = false,
    startCity,
    endCity,
    date,
  } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [sortOption, setSortOption] = useState("distance");
  const [filterVisible, setFilterVisible] = useState(false);
  const [userType, setUserType] = useState(isGuest ? "guest" : "authenticated");
  const [citySearchResults, setCitySearchResults] = useState(
    searchResults || []
  );
  const [searchError, setSearchError] = useState(null);

  const scrollY = new Animated.Value(0);
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0.95],
    extrapolate: "clamp",
  });

  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

  const [fontsLoaded] = useFonts({
    Regular: require("../assets/fonts/regular.ttf"),
    Medium: require("../assets/fonts/medium.ttf"),
    Bold: require("../assets/fonts/bold.ttf"),
  });

  useEffect(() => {
    checkAuthStatus();

    if (searchByCity) {
      handleCitySearchResults();
    } else {
      if (
        !pickupCoordinates ||
        !destinationCoordinates ||
        !pickupCoordinates.latitude ||
        !pickupCoordinates.longitude ||
        !destinationCoordinates.latitude ||
        !destinationCoordinates.longitude
      ) {
        setSearchError("Invalid location coordinates");
        setIsLoading(false);
        return;
      }
      fetchNearbyUsers();
    }
  }, []);

  const getUserDisplayName = async (tripData) => {
    try {
      const username = await getusername(tripData.userId);
      if (username) return username;
    } catch (error) {
      console.log("Failed to fetch username by ID:", error);
    }

    if (tripData.driverName) return tripData.driverName;
    if (tripData.username) return tripData.username;
    if (tripData.userDisplayName) return tripData.userDisplayName;
    if (tripData.createdBy) return tripData.createdBy;

    if (tripData.userId) {
      return `User ${tripData.userId.substring(0, 4)}`;
    }

    return "Anonymous";
  };

  const getAvatarText = (username) => {
    if (!username || username === "Anonymous") return "?";
    return username.charAt(0).toUpperCase();
  };

  const getSyncUserDisplayName = (tripData) => {
    if (tripData.driverName) return tripData.driverName;
    if (tripData.username) return tripData.username;
    if (tripData.userDisplayName) return tripData.userDisplayName;
    if (tripData.createdBy) return tripData.createdBy;
    if (tripData.userId) return `${getusername(tripData.userId)}`;
    return "Anonymous";
  };

  const handleCitySearchResults = async () => {
    setIsLoading(true);
    setSearchError(null);

    try {
      if (citySearchResults.length === 0) {
        setNearbyUsers([]);
        setIsLoading(false);
        return;
      }

      const usersData = [];
      const processedUserIds = new Set();
      const userPromises = [];

      for (const tripData of citySearchResults) {
        if (
          userType === "authenticated" &&
          auth.currentUser &&
          tripData.userId === auth.currentUser.uid
        ) {
          continue;
        }

        if (processedUserIds.has(tripData.userId)) continue;
        if (tripData.status !== "active") continue;

        processedUserIds.add(tripData.userId);

        const userData = {
          id: tripData.userId,
          tripId: tripData.id,
          startLocation:
            tripData.startlocationName?.split(",")[0] || "Location",
          endLocation: tripData.endlocationName?.split(",")[0] || "Destination",
          startCoords: tripData.startLocation,
          endCoords: tripData.endLocation,
          timestamp: tripData.timestamp || Date.now(),
          distance: 0,
          rating: (Math.random() * 2 + 3).toFixed(1),
          rides: Math.floor(Math.random() * 50) + 1,
          avatarColor: getRandomColor(),
          verified: Math.random() > 0.3,
          createdAt: tripData.createdAt,
          departure: tripData.departureTime,
          fallbackUsername: getSyncUserDisplayName(tripData),
        };

        usersData.push(userData);

        userPromises.push(
          getusername(tripData.userId)
            .then((name) => {
              userData.username = name || userData.fallbackUsername;
              return userData;
            })
            .catch((err) => {
              console.error("Error fetching username:", err);
              userData.username = userData.fallbackUsername;
              return userData;
            })
        );
      }

      await Promise.all(userPromises);

      usersData.sort((a, b) => {
        if (sortOption === "time") {
          return new Date(b.departure) - new Date(a.departure);
        } else if (sortOption === "rating") {
          return parseFloat(b.rating) - parseFloat(a.rating);
        }
        return 0;
      });

      setNearbyUsers(usersData);

      if (usersData.length > 0) {
        setSelectedUser(usersData[0]);
      }
    } catch (error) {
      console.error("Error processing city search results:", error);
      setSearchError("Failed to process search results");
    } finally {
      setIsLoading(false);
    }
  };

  const checkAuthStatus = () => {
    if (isGuest || !auth.currentUser) {
      setUserType("guest");
    } else {
      setUserType("authenticated");
    }
  };

  useEffect(() => {
    if (nearbyUsers.length > 0) {
      let sortedUsers = [...nearbyUsers];

      if (searchByCity) {
        if (sortOption === "rating") {
          sortedUsers.sort(
            (a, b) => parseFloat(b.rating) - parseFloat(a.rating)
          );
        } else if (sortOption === "time") {
          sortedUsers.sort(
            (a, b) => new Date(b.departure) - new Date(a.departure)
          );
        }
      } else {
        if (sortOption === "distance") {
          sortedUsers.sort((a, b) => a.distance - b.distance);
        } else if (sortOption === "rating") {
          sortedUsers.sort(
            (a, b) => parseFloat(b.rating) - parseFloat(a.rating)
          );
        } else if (sortOption === "time") {
          sortedUsers.sort((a, b) => b.timestamp - a.timestamp);
        }
      }

      setNearbyUsers(sortedUsers);
    }
  }, [sortOption]);

  useEffect(() => {
    if (nearbyUsers.length > 0 && !selectedUser) {
      setSelectedUser(nearbyUsers[0]);

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

  const fetchNearbyUsers = async () => {
    setIsLoading(true);
    setSearchError(null);

    try {
      const center = new GeoPoint(
        pickupCoordinates.latitude,
        pickupCoordinates.longitude
      );

      const geoCollection = geofirestore.collection("trips");
      const query = geoCollection.near({
        center,
        radius: 300000000,
      });

      const snapshot = await query.get();

      if (snapshot.empty) {
        setNearbyUsers([]);
        setIsLoading(false);
        return;
      }

      const usersData = [];
      const processedUserIds = new Set();
      const userPromises = [];

      snapshot.forEach((doc) => {
        const tripData = doc.data();

        // if (
        //   userType === "authenticated" &&
        //   auth.currentUser
        //   // tripData.userId === auth.currentUser.uid
        // ) {
        //   return;
        // }

        if (processedUserIds.has(tripData.userId)) return;
        if (tripData.status !== "active") return;

        const tripDestination = tripData.endLocation;
        const isSimilarDestination = isLocationNearby(
          destinationCoordinates.latitude,
          destinationCoordinates.longitude,
          tripDestination.latitude,
          tripDestination.longitude,
          2
        );

        if (isSimilarDestination) {
          processedUserIds.add(tripData.userId);

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
            rating: (Math.random() * 2 + 3).toFixed(1),
            tripType: tripData.tripType,
            rides: Math.floor(Math.random() * 50) + 1,
            avatarColor: getRandomColor(),
            verified: Math.random() > 0.3,
            createdAt: tripData.createdAt,
            departure: tripData.departureTime,
            fallbackUsername: getSyncUserDisplayName(tripData),
          };

          usersData.push(userData);

          userPromises.push(
            getusername(tripData.userId)
              .then((name) => {
                userData.username = name || userData.fallbackUsername;
                return userData;
              })
              .catch((err) => {
                console.error("Error fetching username:", err);
                userData.username = userData.fallbackUsername;
                return userData;
              })
          );
        }
      });

      await Promise.all(userPromises);
      usersData.sort((a, b) => a.distance - b.distance);
      setNearbyUsers(usersData);

      if (usersData.length > 0) {
        setSelectedUser(usersData[0]);
      }
    } catch (error) {
      console.error("Error fetching nearby users:", error);
      setSearchError("Failed to fetch nearby users");
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setSearchError(null);

        if (searchByCity) {
          await handleCitySearchResults();
        } else {
          if (!pickupCoordinates || !destinationCoordinates) {
            throw new Error("Invalid location coordinates");
          }
          await fetchNearbyUsers();
        }
      } catch (error) {
        console.error("Data loading error:", error);
        setSearchError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [pickupCoordinates, destinationCoordinates, searchByCity]);
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

  const isLocationNearby = (lat1, lon1, lat2, lon2, threshold) => {
    const distance = calculateDistance(lat1, lon1, lat2, lon2);
    return distance <= threshold;
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
  };

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

  const formatDepartureDate = (dateString) => {
    if (!dateString) return "Not specified";

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";

    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDepartureTime = (timeString) => {
    if (!timeString) return "Not specified";

    if (
      timeString instanceof Date ||
      (typeof timeString === "string" && !timeString.match(/^\d{1,2}:\d{2}$/))
    ) {
      const date = new Date(timeString);
      if (isNaN(date.getTime())) return "Invalid time";

      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }

    return timeString;
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
  };

  const handleContactUser = (user) => {
    if (!user) return;

    if (userType === "guest") {
      Alert.alert(
        "Sign In Required",
        "Please sign in to contact riders and book trips.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Sign In",
            onPress: () => navigation.navigate("Login"),
          },
        ]
      );
      return;
    }

    navigation.navigate("TripUserDetails", {
      userId: user.id,
      pickupLocation: user.startLocation,
      destinationLocation: user.endLocation,
      tripId: user.tripId,
      username: user.username,
    });
  };

  const getHeaderTitle = () => {
    if (searchByCity) {
      return userType === "guest" ? "Browse City Trips" : "City Trips";
    }
    return userType === "guest" ? "Browse Rides" : "Results";
  };

  const getHeaderRouteText = () => {
    if (searchByCity) {
      return `${startCity} → ${endCity}`;
    }
    return `${pickup.split(",")[0]} → ${destination.split(",")[0]}`;
  };

  const handleSort = (option) => {
    setSortOption(option);
    setFilterVisible(false);
  };

  const renderUserItem = ({ item }) => {
    const isSelected = selectedUser && selectedUser.id === item.id;
    return (
      <UserCard
        item={item}
        isSelected={isSelected}
        onSelect={handleUserSelect}
        onContact={handleContactUser}
        userType={userType}
      />
    );
  };

  const UserCard = ({ item, isSelected, onSelect, onContact, userType }) => {
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
          style={[styles.rideHistoryCard, isSelected && styles.cardSelected]}
          onPress={() => onSelect(item)}
          activeOpacity={0.95}
        >
          {userType === "guest" && (
            <View style={styles.guestBanner}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color="#FF6B35"
              />
              <Text style={styles.guestBannerText}>
                Sign in to book this ride
              </Text>
            </View>
          )}

          <View style={styles.rideHeader}>
            <View style={styles.rideTimeSection}>
              <Text style={styles.rideDate}>
                {formatDepartureDate(item.departure)}
              </Text>
              <Text style={styles.rideTime}>
                {formatDepartureTime(item.departure)}
              </Text>
            </View>

            <View style={styles.tripTypeBadge}>
              <Text style={styles.tripTypeBadgeText}>{item.tripType}</Text>
            </View>
          </View>

          <View style={styles.rideTypeSection}>
            <Text style={styles.rideType}>Shared Ride to</Text>
          </View>

          <View style={styles.rideLocationSection}>
            <View style={styles.locationTextContainer}>
              <Text style={styles.startLocation} numberOfLines={1}>
                {item.startLocation}
              </Text>
              <Text style={styles.endLocation} numberOfLines={2}>
                {item.endLocation}
              </Text>
            </View>

            <View style={styles.driverSection}>
              {item.userId ? (
                <Image
                  source={{
                    uri: "https://img.freepik.com/premium-vector/men-icon-trendy-avatar-character-cheerful-happy-people-flat-vector-illustration-round-frame-male-portraits-group-team-adorable-guys-isolated-white-background_275421-286.jpg",
                  }}
                  style={styles.driverAvatar}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.driverAvatar,
                    { backgroundColor: item.avatarColor || "#ccc" },
                  ]}
                >
                  <Text style={styles.driverAvatarText}>
                    {getAvatarText(item.username)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Status badge if cancelled */}
          {item.status === "cancelled" && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>CANCELLED</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.bookButton,
              userType === "guest" && styles.bookButtonGuest,
            ]}
            onPress={() => onContact(item)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.bookButtonText,
                userType === "guest" && styles.bookButtonTextGuest,
              ]}
            >
              {userType === "guest" ? "Sign In to Book" : "Book Now"}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    );
  };

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

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
          <View style={styles.headerRouteContainer}>
            <Text style={styles.headerRouteText} numberOfLines={1}>
              {getHeaderRouteText()}
            </Text>
          </View>
          {userType === "guest" && (
            <Text style={styles.guestHeaderText}>Sign in to book rides</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          // onPress={() => setFilterVisible(!filterVisible)}
        >
          {/* <Feather name="sliders" size={20} color="#000" /> */}
        </TouchableOpacity>
      </Animated.View>

      {/* {renderFilterMenu()} */}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Finding nearby riders...</Text>
        </View>
      ) : searchError ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={70}
            color="#FF6B35"
          />
          <Text style={styles.emptyText}>Search Error</Text>
          <Text style={styles.emptySubtext}>{searchError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={searchByCity ? handleCitySearchResults : fetchNearbyUsers}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
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
            onPress={searchByCity ? handleCitySearchResults : fetchNearbyUsers}
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

// Styles would go here, but skipped as requested

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    // marginTop: 30,
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
  guestHeaderText: {
    fontSize: 12,
    fontFamily: "Regular",
    color: "#FF6B35",
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
    borderWidth: 2,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  guestBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF5F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#FF6B35",
  },
  guestBannerText: {
    fontSize: 13,
    fontFamily: "Medium",
    color: "#FF6B35",
    marginLeft: 6,
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
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
  },
  departureIconContainer: {
    width: 24,
    alignItems: "center",
    marginRight: 12,
    paddingTop: 2,
  },
  departureDetails: {
    flex: 1,
  },
  departureRow: {
    flexDirection: "row",
    marginBottom: 4,
    alignItems: "center",
  },
  departureLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    width: 110,
  },
  departureValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
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
  contactButtonGuest: {
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#FF6B35",
  },
  contactButtonTextGuest: {
    color: "#FF6B35",
  },
  rideHistoryCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    marginTop: 15,
  },

  rideHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },

  rideTimeSection: {
    flex: 1,
  },

  rideDate: {
    fontSize: 16,
    fontFamily: "Bold",
    color: "#000",
    marginBottom: 2,
  },

  rideTime: {
    fontSize: 14,
    fontFamily: "Regular",
    color: "#666",
  },

  ridePriceSection: {
    alignItems: "flex-end",
  },

  ridePrice: {
    fontSize: 18,
    fontFamily: "Bold",
    color: "#000",
  },

  rideTypeSection: {
    marginBottom: 8,
  },

  rideType: {
    fontSize: 16,
    fontFamily: "Medium",
    color: "#000",
  },

  rideLocationSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  locationTextContainer: {
    flex: 1,
    marginRight: 12,
  },

  startLocation: {
    fontSize: 14,
    fontFamily: "Medium",
    color: "#333",
    marginBottom: 4,
  },

  endLocation: {
    fontSize: 13,
    fontFamily: "Regular",
    color: "#888",
    lineHeight: 18,
  },

  driverSection: {
    alignItems: "center",
    flexDirection: "row",
  },

  carIconContainer: {
    marginRight: 8,
  },

  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  driverAvatarText: {
    color: "#FFF",
    fontFamily: "Bold",
    fontSize: 16,
  },

  statusBadge: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 12,
  },

  statusText: {
    fontSize: 12,
    fontFamily: "Bold",
    color: "#666",
    letterSpacing: 0.5,
  },

  bookButton: {
    backgroundColor: "#000",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },

  bookButtonGuest: {
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#FF6B35",
  },

  bookButtonText: {
    color: "#FFF",
    fontFamily: "Bold",
    fontSize: 14,
  },

  bookButtonTextGuest: {
    color: "#FF6B35",
  },
  tripTypeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E0F7FA", // light cyan or use "#D1E7DD" for green
    paddingHorizontal: 13,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    marginLeft: 4,
  },

  tripTypeBadgeText: {
    fontSize: 15,
    color: "#00796B", // teal shade or "#0F5132" for green
    fontWeight: "600",
  },
});
