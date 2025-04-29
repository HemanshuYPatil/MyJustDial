import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Animated,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  PanResponder,
} from "react-native";
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  Feather,
} from "@expo/vector-icons";
import { useFonts } from "expo-font";
import * as Location from "expo-location";
import { auth, geofirestore, firebase } from "../lib/db/firebase";
import { fetchNearbyTripsForUser } from "../lib/query/trip";
import { getusername } from "../lib/query/user";
import { LinearGradient } from "expo-linear-gradient";
const { width, height } = Dimensions.get("window");

const COLORS = {
  primary: "#000", // Modern blue as primary brand color
  primaryDark: "#000",
  secondary: "#FF6B6B", // Warm accent color
  background: "#FFFFFF",
  cardBg: "#FFFFFF",
  inputBg: "#F8F9FC",
  inputActiveBg: "#EDF1FC",
  text: "#1A2138", // Dark blue-gray for text
  textSecondary: "#5D6B98",
  textLight: "#8F9BB3",
  border: "#E4E9F2",
  success: "#00E096",
  warning: "#FFAA00",
  error: "#FF3D71",
  shadow: "rgba(32, 40, 97, 0.08)",
};

export default function DestinationSearchScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [pickupQuery, setPickupQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [activeInput, setActiveInput] = useState("destination");
  const [district, setDistrict] = useState("");
  const [pickupCoordinates, setPickupCoordinates] = useState({});
  const [destinationCoordinates, setDestinationCoordinates] = useState({});
  const [currentLocation, setCurrentLocation] = useState(null);
  const [nearbyLocations, setNearbyLocations] = useState([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Animation values
  const slideUpAnim = useState(new Animated.Value(50))[0];
  const opacityAnim = useState(new Animated.Value(0))[0];
  const drawerAnim = useRef(new Animated.Value(0)).current;
  const searchButtonAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeInAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const [fontsLoaded] = useFonts({
    Regular: require("../assets/fonts/regular.ttf"),
    Medium: require("../assets/fonts/medium.ttf"),
    Bold: require("../assets/fonts/bold.ttf"),
  });
  const user = auth.currentUser;

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setKeyboardVisible(true);
        animateSearchButton(1);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
        animateSearchButton(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Animate search button
  const animateSearchButton = (toValue) => {
    Animated.spring(searchButtonAnim, {
      toValue,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
  };

  // Show/hide suggestion drawer
  const toggleDrawer = (visible) => {
    Animated.timing(drawerAnim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setDrawerVisible(visible);
  };

  // Initialize animations on mount
  useEffect(() => {
    // Sequence of animations for a more polished entry
    Animated.sequence([
      Animated.timing(fadeInAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.spring(slideUpAnim, {
          toValue: 0,
          friction: 8,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(bounceAnim, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    getUserLocation();
  }, []);

  const shakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    if (currentLocation) {
      loadNearbyLocations();
      setIsLoadingLocation(false);
    }
  }, [currentLocation]);

  useEffect(() => {
    const searchDelay = setTimeout(() => {
      const currentQuery = activeInput === "pickup" ? pickupQuery : searchQuery;

      if (currentQuery.length > 2) {
        fetchLocationSuggestions(currentQuery);
        toggleDrawer(true);
      } else if (currentQuery.length === 0 && nearbyLocations.length > 0) {
        // Show nearby locations when query is empty
        setSearchResults(nearbyLocations);
        toggleDrawer(false);
      } else {
        setSearchResults([]);
        toggleDrawer(false);
      }
    }, 500);

    return () => clearTimeout(searchDelay);
  }, [pickupQuery, searchQuery, activeInput, nearbyLocations]);

  // Get precise user location using Google Maps API
  const getUserLocation = async () => {
    setIsLoadingLocation(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      console.warn("Permission to access location was denied");
      setIsLoadingLocation(false);
      return null;
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      const { latitude, longitude } = location.coords;
      setCurrentLocation({ latitude, longitude });

      // Use reverse geocoding to get current address
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=AIzaSyDkw5Q09G-FzQC0tw9IZAu_9q3-dL8QDIg`
      );

      const data = await response.json();

      if (data.status === "OK" && data.results.length > 0) {
        const address = data.results[0].formatted_address;
        setPickupQuery(address);
        setPickupCoordinates({ latitude, longitude });
      } else {
        setPickupQuery("Current Location");
        setPickupCoordinates({ latitude, longitude });
      }
    } catch (error) {
      console.error("Error getting current location:", error);
      setPickupQuery("Current Location");
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Load nearby locations from trips
  const loadNearbyLocations = async () => {
    try {
      const nearbyTrips = await fetchNearbyTrips(currentLocation, 5); // 5km radius

      // Create a map to store unique trip locations
      const locationsMap = new Map();

      nearbyTrips.forEach((trip) => {
        // Create a unique ID for this trip
        const tripKey = trip.id;

        // Only add each trip once, instead of adding start and end locations as separate entries
        if (!locationsMap.has(tripKey)) {
          locationsMap.set(tripKey, {
            id: tripKey,
            title: `${trip.startlocationName.split(",")[0]} → ${
              trip.endlocationName.split(",")[0]
            }`,
            address: `${trip.startlocationName} to ${trip.endlocationName}`,
            type: "nearby",
            // Store both coordinates
            startLat: trip.startLocation.latitude,
            startLng: trip.startLocation.longitude,
            endLat: trip.endLocation.latitude,
            endLng: trip.endLocation.longitude,
            // Calculate distance from current location to trip's start point
            distance: calculateDistance(
              currentLocation.latitude,
              currentLocation.longitude,
              trip.startLocation.latitude,
              trip.startLocation.longitude
            ),
            userId: trip.userId,
            tripId: trip.id,
            startl: trip.startlocationName.split(",")[0],
            endl: trip.endlocationName.split(",")[0],
          });
        }
      });

      // Convert map values to array and sort by distance
      const uniqueLocations = Array.from(locationsMap.values()).sort(
        (a, b) => a.distance - b.distance
      );

      setNearbyLocations(uniqueLocations);

      // If no current search query, show nearby locations
      if (
        (activeInput === "pickup" && pickupQuery.length === 0) ||
        (activeInput === "destination" && searchQuery.length === 0)
      ) {
        setSearchResults(uniqueLocations);
      }
    } catch (error) {
      console.error("Error loading nearby locations:", error);
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

  // Fetch nearby trips function
  const fetchNearbyTrips = async (currentLocation, radius = 1) => {
    if (!currentLocation) return [];

    try {
      const geoCollection = geofirestore.collection("trips");

      const query = geoCollection.near({
        center: new firebase.firestore.GeoPoint(
          currentLocation.latitude,
          currentLocation.longitude
        ),
        radius: radius, // in kilometers
      });

      const snapshot = await query.get();

      const trips = [];
      snapshot.forEach((doc) => {
        trips.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return trips;
    } catch (error) {
      console.error("Error fetching nearby trips:", error);
      return [];
    }
  };

  // Add fetch location suggestions
  const fetchLocationSuggestions = async (query) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          query
        )}&key=AIzaSyDkw5Q09G-FzQC0tw9IZAu_9q3-dL8QDIg&components=country:in`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== "OK") {
        console.warn("Google Places returned status:", data.status);

        // If Google Places fails, filter nearby locations based on query
        const filteredNearby = nearbyLocations.filter(
          (location) =>
            location.title.toLowerCase().includes(query.toLowerCase()) ||
            location.address.toLowerCase().includes(query.toLowerCase())
        );

        setSearchResults(filteredNearby);
        setIsLoading(false);
        return;
      }

      const googleResults = data.predictions.map((item) => ({
        id: item.place_id,
        title: item.structured_formatting.main_text,
        address: item.description,
        type: "place",
        lat: null,
        lng: null,
      }));

      // Filter nearby locations based on query
      const filteredNearby = nearbyLocations.filter(
        (location) =>
          location.title.toLowerCase().includes(query.toLowerCase()) ||
          location.address.toLowerCase().includes(query.toLowerCase())
      );

      // Combine both results, putting nearby results first
      const combinedResults = [...filteredNearby, ...googleResults].slice(
        0,
        15
      ); // Limit results

      setSearchResults(combinedResults);
    } catch (error) {
      console.error("Error fetching location suggestions:", error);

      // If API fails, still show filtered nearby locations
      const filteredNearby = nearbyLocations.filter(
        (location) =>
          location.title.toLowerCase().includes(query.toLowerCase()) ||
          location.address.toLowerCase().includes(query.toLowerCase())
      );

      setSearchResults(filteredNearby);
    } finally {
      setIsLoading(false);
    }
  };

  // Add fetchPlaceDetails function
  const fetchPlaceDetails = async (placeId) => {
    try {
      // For nearby locations that already have coordinates, return those directly
      const nearbyLocation = nearbyLocations.find((loc) => loc.id === placeId);
      if (nearbyLocation && nearbyLocation.lat && nearbyLocation.lng) {
        return {
          lat: nearbyLocation.lat,
          lng: nearbyLocation.lng,
          name: nearbyLocation.title,
          address: nearbyLocation.address,
        };
      }

      // For Google Place IDs, fetch from API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=AIzaSyDkw5Q09G-FzQC0tw9IZAu_9q3-dL8QDIg`
      );
      const data = await response.json();

      if (data.status === "OK") {
        const location = data.result.geometry.location;
        const name = data.result.name;
        const address = data.result.formatted_address;

        console.log("Coordinates:", location.lat, location.lng);
        console.log("Place Name:", name);
        console.log("Address:", address);

        return {
          lat: location.lat,
          lng: location.lng,
          name,
          address,
        };
      } else {
        console.warn("Failed to fetch place details:", data.status);
        return null;
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
      return null;
    }
  };

  const handlenearbylocationselect = async (location) => {
    // Close keyboard and drawer
    Keyboard.dismiss();
    toggleDrawer(false);

    // Navigate to next screen
    navigation.navigate("TripUserDetails", {
      userId: location.userId,
      pickupLocation: location.startl,
      destinationLocation: location.endl,
      tripId: location.tripId,
    });
    console.log("Selected nearby location:", location);
  };

  // Update handleLocationSelect function
  const handleLocationSelect = async (location) => {
    console.log("Selected location:", location);

    // Close keyboard and drawer
    Keyboard.dismiss();
    toggleDrawer(false);

    // If location is already from our nearby locations with coordinates
    if (location.type === "nearby" && location.lat && location.lng) {
      if (activeInput === "pickup") {
        setPickupQuery(location.address);
        setPickupCoordinates({
          latitude: location.lat,
          longitude: location.lng,
        });
        setActiveInput("destination");
      } else {
        setSearchQuery(location.address);
        setDestinationCoordinates({
          latitude: location.lat,
          longitude: location.lng,
        });
      }
      setSearchResults([]);
      return;
    }
    toggleDrawer(false);

    // Otherwise fetch details from Google Places
    const details = await fetchPlaceDetails(location.id);

    if (!details) return;

    if (activeInput === "pickup") {
      setPickupQuery(location.address);
      setPickupCoordinates({
        latitude: details.lat,
        longitude: details.lng,
      });
      setActiveInput("destination");
    } else {
      setSearchQuery(location.address);
      setDestinationCoordinates({
        latitude: details.lat,
        longitude: details.lng,
      });
    }
    toggleDrawer(false);

    setSearchResults([]);
  };

  const handleClearDestination = () => {
    setSearchQuery("");
    if (nearbyLocations.length > 0) {
      setSearchResults(nearbyLocations);
    }
    toggleDrawer(false);
  };

  const handleClearPickUp = () => {
    setPickupQuery("");
    if (nearbyLocations.length > 0) {
      setSearchResults(nearbyLocations);
    }
    toggleDrawer(false);
  };

  const handleSearchButton = () => {
    // Validate inputs
    if (!pickupQuery || !searchQuery) {
      alert("Please enter both pickup and destination locations");
      return;
    }

    // Log for now, later will navigate to results screen
    console.log("Search requested:", {
      pickup: pickupQuery,
      destination: searchQuery,
      pickupCoordinates,
      destinationCoordinates,
    });

    // Navigate to search results screen
    navigation.navigate("SearchResults", {
      pickup: pickupQuery,
      destination: searchQuery,
      pickupCoordinates,
      destinationCoordinates,
    });
  };

  if (!fontsLoaded) {
    return null;
  }

  // Calculate drawer height based on number of results
  const drawerHeight = Math.min(
    height * 0.7, // Max 70% of screen height
    Math.max(
      height * 0.35, // Min 35% of screen height
      searchResults.length * 80 + 80 // 80px per item + padding
    )
  );

  // Update renderSearchResults function
  const renderSearchResults = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Finding locations...</Text>
        </View>
      );
    }

    const currentQuery = activeInput === "pickup" ? pickupQuery : searchQuery;

    if (
      searchResults.length === 0 &&
      currentQuery.length === 0 &&
      nearbyLocations.length === 0
    ) {
      return (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIconContainer}>
            <Ionicons name="search" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyStateText}>Enter a location to search</Text>
          <Text style={styles.emptyStateSubText}>
            We'll find the best routes for you
          </Text>
        </View>
      );
    }

    if (searchResults.length === 0 && currentQuery.length > 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIconContainer}>
            <Ionicons name="alert-circle-outline" size={40} color={COLORS.warning} />
          </View>
          <Text style={styles.emptyStateText}>No results found</Text>
          <Text style={styles.emptyStateSubText}>
            Try a different search term or explore nearby options
          </Text>
        </View>
      );
    }

    // Split results into nearby and Google Places results
    const nearbyResults = searchResults.filter((loc) => loc.type === "nearby");
    const googleResults = searchResults.filter((loc) => loc.type === "place");

    return (
      <>
        {/* Show nearby locations section if available */}
        {/* {nearbyResults.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <MaterialCommunityIcons name="account-group" size={18} color={COLORS.secondary} />
                <Text style={styles.sectionTitle}>Nearby Users</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Share rides with others heading the same way
              </Text>
            </View>

            {nearbyResults.map((location) => (
              <LocationItem
                key={location.id}
                title={location.title}
                address={location.address}
                distance={
                  location.distance ? `${location.distance.toFixed(1)} km` : ""
                }
                rating={0}
                isOpen={true}
                isFavorite={false}
                onPress={() => handlenearbylocationselect(location)}
                isNearby={true}
                id={location.userId}
              />
            ))}
          </>
        )} */}

        {/* Show Google Places results if available */}
        {googleResults.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="navigate" size={18} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Suggested Locations</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Popular destinations nearby
              </Text>
            </View>

            {googleResults.map((location) => (
              <LocationItem
                key={location.id}
                title={location.title}
                address={location.address}
                distance=""
                rating={0}
                isOpen={true}
                isFavorite={false}
                onPress={() => handleLocationSelect(location)}
              />
            ))}
          </>
        )}
      </>
    );
  };


  const searchBtnTranslateY = searchButtonAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });

  // Bounce effect for the search button
  const searchBtnScale = bounceAnim.interpolate({
    inputRange: [0, 0.4, 0.8, 1],
    outputRange: [0.8, 1.1, 0.9, 1],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        {/* Enhanced Header with gradient background */}
        <Animated.View
          style={[styles.headerContainer, { opacity: fadeInAnim }]}
        >
          <LinearGradient
            colors={[COLORS.background, "#F8F9FC"]}
            style={styles.headerGradient}
          >
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={22} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.headerText}>Where To?</Text>
              <View style={{ width: 40 }} />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Main content container - keeps inputs centered vertically */}
        <View style={{ flex: 1, justifyContent: "center" }}>
          {/* Route Input Container with enhanced visuals */}
          <Animated.View
            style={[
              styles.routeLineContainer,
              {
                transform: [
                  { translateY: slideUpAnim },
                  { translateX: shakeAnim },
                ],
                opacity: opacityAnim,
              },
            ]}
          >
            {/* Pick-up Location */}
            <View
              style={[
                styles.pickupContainer,
                // activeInput === "pickup" && styles.activeInputContainer,
              ]}
            >
              <View style={styles.routePointWrapper}>
                <View style={styles.routePointOutline}>
                  <View style={styles.originPoint} />
                </View>
              </View>
              <View style={styles.pickupInputContainer}>
                <Text style={styles.pickupLabel}>PICK-UP</Text>
                <TextInput
                  style={styles.pickupInput}
                  value={pickupQuery}
                  onChangeText={(text) => setPickupQuery(text)}
                  placeholder="Where are you now?"
                  placeholderTextColor={COLORS.textLight}
                  onFocus={() => {
                    // // setActiveInput("pickup");
                    // if (pickupQuery.length > 2) {
                    //   toggleDrawer(true);
                    // }
                  }}
                  editable={!isLoadingLocation}
                />
              </View>
              {isLoadingLocation ? (
                <ActivityIndicator
                  size="small"
                  color={COLORS.primary}
                  style={styles.locationLoader}
                />
              ) : pickupQuery.length > 0 ? (
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClearPickUp}
                >
                  <Ionicons name="close-circle" size={22} color={COLORS.text} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.locationButton}
                  onPress={getUserLocation}
                >
                  <Ionicons name="locate" size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </View>

            {/* Vertical Line */}
            <View style={styles.verticalLine} />

            {/* Destination Input */}
            <View
              style={[
                styles.destinationContainer,
                activeInput === "destination" && styles.activeInputContainer,
              ]}
            >
              <View style={styles.routePointWrapper}>
                <View style={styles.destinationPoint} />
              </View>
              <View style={styles.destinationInputContainer}>
                <Text style={styles.destinationLabel}>DESTINATION</Text>
                <TextInput
                  style={styles.destinationInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Where are you going?"
                  placeholderTextColor={COLORS.textLight}
                  onFocus={() => {
                    setActiveInput("destination");
                    if (searchQuery.length > 2) {
                      toggleDrawer(true);
                    }
                  }}
                />
              </View>
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClearDestination}
                >
                  <Ionicons name="close-circle" size={22} color={COLORS.text} />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>

          {/* Enhanced Search Button with gradient and animation */}
          <View style={styles.searchButtonContainer}>
            <Animated.View
              style={{
                transform: [
                  { translateY: searchBtnTranslateY },
                  { scale: searchBtnScale },
                ],
                opacity: opacityAnim,
                width: "100%",
              }}
            >
              <TouchableOpacity
                style={[
                  styles.searchButton,
                  (!pickupQuery || !searchQuery) && styles.searchButtonDisabled,
                ]}
                onPress={handleSearchButton}
                disabled={!pickupQuery || !searchQuery}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    !pickupQuery || !searchQuery
                      ? ["#AAAAAA", "#888888"]
                      : [COLORS.primary, COLORS.primaryDark]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.searchButtonGradient}
                >
                  <Text style={styles.searchButtonText}>Find Routes</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>

        {/* Enhanced Suggestions Drawer with gesture handling */}
        {drawerVisible && (
          <Animated.View
            style={[
              styles.drawer,
              {
                height: drawerHeight,
                transform: [
                  {
                    translateY: drawerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [drawerHeight, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View {...PanResponder.panHandlers}>
              <View style={styles.drawerHandle} />
              <View style={styles.drawerHeader}>
                <Text style={styles.drawerTitle}>
                  {activeInput === "pickup"
                    ? "Pickup Locations"
                    : "Destinations"}
                </Text>
                <TouchableOpacity
                  style={styles.closeDrawerButton}
                  onPress={() => toggleDrawer(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView
              contentContainerStyle={styles.drawerContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {renderSearchResults()}
            </ScrollView>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Location Item Component
const LocationItem = ({
  title,
  address,
  distance,
  rating,
  isOpen,
  isFavorite,
  onPress,
  isNearby,
  id,
}) => {
  const [username, setUsername] = useState("");
  const itemScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isNearby && id) {
      fetchUsername(id);
    }
  }, [isNearby, id]);

  const fetchUsername = async (userId) => {
    try {
      const name = await getusername(userId);
      setUsername(name);
    } catch (error) {
      console.error("Error fetching username:", error);
    }
  };

  const handlePressIn = () => {
    Animated.spring(itemScaleAnim, {
      toValue: 0.97,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(itemScaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.locationItemWrapper,
        { transform: [{ scale: itemScaleAnim }] },
      ]}
    >
      <TouchableOpacity
        style={styles.locationItem}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.locationIconContainer,
            { backgroundColor: isNearby ? COLORS.secondary : COLORS.primary },
          ]}
        >
          {isNearby ? (
            <MaterialCommunityIcons
              name="account-group"
              size={20}
              color="#fff"
            />
          ) : (
            <Ionicons name="location" size={20} color="#fff" />
          )}
        </View>
        <View style={styles.locationDetails}>
          <Text style={styles.locationTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.locationAddress} numberOfLines={1}>
            {address}
          </Text>
          {isNearby && username && (
            <View style={styles.userContainer}>
              <Feather name="user" size={12} color={COLORS.primary} />
              <Text style={styles.locationUser}>{username}</Text>
            </View>
          )}
        </View>
        {distance ? (
          <View style={styles.locationMetaContainer}>
            <Feather
              name="navigation"
              size={12}
              color={COLORS.primary}
              style={styles.distanceIcon}
            />
            <Text style={styles.locationDistance}>{distance}</Text>
          </View>
        ) : (
          <MaterialIcons
            name="chevron-right"
            size={24}
            color={COLORS.textLight}
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    fontFamily: "Regular",
  },
  loadingScreen: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    width: '100%',
    overflow: 'hidden',
    paddingTop: Platform.OS === 'android' ? 40 : 10,
  },
  headerGradient: {
    paddingBottom: 15,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerText: {
    fontSize: 20,
    fontFamily: "Bold",
    color: COLORS.text,
    letterSpacing: 0.2,
  },

  // Main route input container
  routeLineContainer: {
    marginHorizontal: 20,
    marginVertical: 16,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(228, 233, 242, 0.5)',
  },

  // Pickup location input
  pickupContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  activeInputContainer: {
    backgroundColor: COLORS.inputActiveBg,
    borderRadius: 12,
  },
  routePointWrapper: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  routePointOutline: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  originPoint: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },

  // Vertical line connecting origin and destination
  verticalLine: {
    width: 2,
    height: 24,
    backgroundColor: COLORS.primary,
    marginLeft: 18,
  },

  // Destination input
  destinationContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  destinationPoint: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: COLORS.secondary,
  },

  // Input containers
  pickupInputContainer: {
    flex: 1,
    marginRight: 10,
  },
  destinationInputContainer: {
    flex: 1,
    marginRight: 10,
  },

  // Labels
  pickupLabel: {
    fontSize: 11,
    fontFamily: "Bold",
    color: COLORS.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  destinationLabel: {
    fontSize: 11,
    fontFamily: "Bold",
    color: COLORS.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.5,
  },

  // Text inputs
  pickupInput: {
    fontSize: 16,
    fontFamily: "Medium",
    color: COLORS.text,
    padding: 0,
    height: 24,
  },
  destinationInput: {
    fontSize: 16,
    fontFamily: "Medium",
    color: COLORS.text,
    padding: 0,
    height: 24,
  },

  // Action buttons
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.inputBg,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  locationButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  locationLoader: {
    width: 34,
    height: 34,
  },

  // Search button
  searchButtonContainer: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  searchButton: {
    overflow: 'hidden',
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  searchButtonGradient: {
    paddingVertical: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  searchButtonDisabled: {
    opacity: 0.8,
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Bold",
    marginRight: 10,
    letterSpacing: 0.5,
  },

  // Location results drawer
  drawer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomWidth: 0,
  },
  drawerHandle: {
    width: 40,
    height: 5,
    borderRadius: 4,
    backgroundColor: "#D9E0EE",
    alignSelf: "center",
    marginTop: 12,
  },
  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  drawerTitle: {
    fontSize: 18,
    fontFamily: "Bold",
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  closeDrawerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.inputBg,
    justifyContent: "center",
    alignItems: "center",
  },
  drawerContent: {
    padding: 20,
    paddingTop: 10,
  },

  // Section headers
  sectionHeader: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 14,
    marginTop: 8,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Bold",
    color: COLORS.text,
    marginLeft: 6,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: "Regular",
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Enhanced Location items
  locationItemWrapper: {
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: COLORS.cardBg,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  locationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  locationDetails: {
    flex: 1,
    marginRight: 8,
  },
  locationTitle: {
    fontSize: 16,
    fontFamily: "Medium",
    color: COLORS.text,
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 13,
    fontFamily: "Regular",
    color: COLORS.textSecondary,
  },
  userContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  locationUser: {
    fontSize: 12,
    fontFamily: "Medium",
    color: COLORS.primary,
    marginLeft: 4,
  },
  locationMetaContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.inputBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  distanceIcon: {
    marginRight: 4,
  },
  locationDistance: {
    fontSize: 12,
    fontFamily: "Medium",
    color: COLORS.primary,
  },
  
  // Loading states
  loadingContainer: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Medium",
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  
  // Empty states
  emptyStateContainer: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.inputBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: "Bold",
    color: COLORS.text,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateSubText: {
    fontSize: 14,
    fontFamily: "Regular",
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});