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
  Switch,
} from "react-native";
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  Feather,
} from "@expo/vector-icons";
import { useFonts } from "expo-font";
import * as Location from "expo-location";
import { auth, geofirestore, GeoPoint } from "../lib/db/firebase";
import { fetchNearbyTripsForUser } from "../lib/query/trip";
import { getusername } from "../lib/query/user";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

const COLORS = {
  primary: "#000",
  primaryDark: "#000",
  secondary: "#FF6B6B",
  background: "#FFFFFF",
  cardBg: "#FFFFFF",
  inputBg: "#F8F9FC",
  inputActiveBg: "#EDF1FC",
  text: "#1A2138",
  textSecondary: "#5D6B98",
  textLight: "#8F9BB3",
  border: "#E4E9F2",
  success: "#00E096",
  warning: "#FFAA00",
  error: "#FF3D71",
  shadow: "rgba(32, 40, 97, 0.08)",
};

// Popular cities data
const POPULAR_CITIES = [
  { id: 1, name: "Mumbai", state: "Maharashtra" },
  { id: 2, name: "Delhi", state: "Delhi" },
  { id: 3, name: "Bangalore", state: "Karnataka" },
  { id: 4, name: "Chennai", state: "Tamil Nadu" },
  { id: 5, name: "Hyderabad", state: "Telangana" },
  { id: 6, name: "Pune", state: "Maharashtra" },
  { id: 7, name: "Kolkata", state: "West Bengal" },
  { id: 8, name: "Ahmedabad", state: "Gujarat" },
];

export default function DestinationSearchScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [pickupQuery, setPickupQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [activeInput, setActiveInput] = useState("destination");
  const [pickupCoordinates, setPickupCoordinates] = useState({});
  const [destinationCoordinates, setDestinationCoordinates] = useState({});
  const [currentLocation, setCurrentLocation] = useState(null);
  const [nearbyLocations, setNearbyLocations] = useState([]);
  const [searchByCity, setSearchByCity] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Animation values
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const suggestionAnim = useRef(new Animated.Value(0)).current;

  const [fontsLoaded] = useFonts({
    Regular: require("../assets/fonts/regular.ttf"),
    Medium: require("../assets/fonts/medium.ttf"),
    Bold: require("../assets/fonts/bold.ttf"),
  });

  const user = auth.currentUser;

  useEffect(() => {
    // Initial animations
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideUpAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    getUserLocation();
  }, []);

  useEffect(() => {
    if (currentLocation) {
      loadNearbyLocations();
    }
  }, [currentLocation]);

  useEffect(() => {
    const searchDelay = setTimeout(() => {
      const currentQuery = activeInput === "pickup" ? pickupQuery : searchQuery;

      if (currentQuery.length > 2) {
        if (searchByCity) {
          searchCities(currentQuery);
        } else {
          fetchLocationSuggestions(currentQuery);
        }
        showSuggestionsDrawer(true);
      } else if (currentQuery.length === 0) {
        if (searchByCity) {
          setSearchResults(
            POPULAR_CITIES.map((city) => ({
              id: city.id,
              title: city.name,
              address: `${city.name}, ${city.state}`,
              type: "city",
            }))
          );
        } else {
          setSearchResults(nearbyLocations);
        }
        showSuggestionsDrawer(false);
      } else {
        setSearchResults([]);
        showSuggestionsDrawer(false);
      }
    }, 300);

    return () => clearTimeout(searchDelay);
  }, [pickupQuery, searchQuery, activeInput, searchByCity, nearbyLocations]);

  const showSuggestionsDrawer = (show) => {
    setShowSuggestions(show);
    Animated.timing(suggestionAnim, {
      toValue: show ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const searchCities = (query) => {
    
    const filteredCities = POPULAR_CITIES.filter(
      (city) =>
        city.name.toLowerCase().includes(query.toLowerCase()) ||
        city.state.toLowerCase().includes(query.toLowerCase())
    ).map((city) => ({
      id: city.id,
      title: city.name,
      address: `${city.name}, ${city.state}`,
      type: "city",
    }));

    setSearchResults(filteredCities);
  };

  const getUserLocation = async () => {
    setIsLoadingLocation(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setIsLoadingLocation(false);
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      setCurrentLocation({ latitude, longitude });

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

  const loadNearbyLocations = async () => {
    try {
      const nearbyTrips = await fetchNearbyTrips(currentLocation, 5);
      const locationsMap = new Map();

      nearbyTrips.forEach((trip) => {
        const tripKey = trip.id;
        if (!locationsMap.has(tripKey)) {
          locationsMap.set(tripKey, {
            id: tripKey,
            title: `${trip.startlocationName.split(",")[0]} → ${
              trip.endlocationName.split(",")[0]
            }`,
            address: `${trip.startlocationName} to ${trip.endlocationName}`,
            type: "nearby",
            startLat: trip.startLocation.latitude,
            startLng: trip.startLocation.longitude,
            endLat: trip.endLocation.latitude,
            endLng: trip.endLocation.longitude,
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

      const uniqueLocations = Array.from(locationsMap.values()).sort(
        (a, b) => a.distance - b.distance
      );

      setNearbyLocations(uniqueLocations);
    } catch (error) {
      console.error("Error loading nearby locations:", error);
    }
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
    return R * c;
  };

  const deg2rad = (deg) => deg * (Math.PI / 180);

  const fetchNearbyTrips = async (currentLocation, radius = 1) => {
    if (!currentLocation) return [];

    try {
      const geoCollection = geofirestore.collection("trips");
      const query = geoCollection.near({
        center: new GeoPoint(
          currentLocation.latitude,
          currentLocation.longitude
        ),
        radius: radius,
      });

      const snapshot = await query.get();
      const trips = [];
      snapshot.forEach((doc) => {
        trips.push({ id: doc.id, ...doc.data() });
      });

      return trips;
    } catch (error) {
      console.error("Error fetching nearby trips:", error);
      return [];
    }
  };

  const fetchLocationSuggestions = async (query) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          query
        )}&key=AIzaSyDkw5Q09G-FzQC0tw9IZAu_9q3-dL8QDIg&components=country:in`
      );

      const data = await response.json();

      if (data.status === "OK") {
        const googleResults = data.predictions.map((item) => ({
          id: item.place_id,
          title: item.structured_formatting.main_text,
          address: item.description,
          type: "place",
        }));

        const filteredNearby = nearbyLocations.filter(
          (location) =>
            location.title.toLowerCase().includes(query.toLowerCase()) ||
            location.address.toLowerCase().includes(query.toLowerCase())
        );

        setSearchResults([...filteredNearby, ...googleResults].slice(0, 10));
      }
    } catch (error) {
      console.error("Error fetching location suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlaceDetails = async (placeId) => {
    try {
      const nearbyLocation = nearbyLocations.find((loc) => loc.id === placeId);
      if (
        nearbyLocation &&
        nearbyLocation.startLat &&
        nearbyLocation.startLng
      ) {
        return {
          lat: nearbyLocation.startLat,
          lng: nearbyLocation.startLng,
          name: nearbyLocation.title,
          address: nearbyLocation.address,
        };
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=AIzaSyDkw5Q09G-FzQC0tw9IZAu_9q3-dL8QDIg`
      );
      const data = await response.json();

      if (data.status === "OK") {
        const location = data.result.geometry.location;
        return {
          lat: location.lat,
          lng: location.lng,
          name: data.result.name,
          address: data.result.formatted_address,
        };
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
    }
    return null;
  };

  const handleLocationSelect = async (location) => {
    Keyboard.dismiss();
    showSuggestionsDrawer(false);

    if (location.type === "nearby") {
      navigation.navigate("TripUserDetails", {
        userId: location.userId,
        pickupLocation: location.startl,
        destinationLocation: location.endl,
        tripId: location.tripId,
      });
      return;
    }

    if (location.type === "city") {
      if (activeInput === "pickup") {
        setPickupQuery(location.address);
      } else {
        setSearchQuery(location.address);
      }
      setSearchResults([]);
      return;
    }

    const details = await fetchPlaceDetails(location.id);
    if (!details) return;

    if (activeInput === "pickup") {
      setPickupQuery(location.address);
      setPickupCoordinates({ latitude: details.lat, longitude: details.lng });
      setActiveInput("destination");
    } else {
      setSearchQuery(location.address);
      setDestinationCoordinates({
        latitude: details.lat,
        longitude: details.lng,
      });
    }
    setSearchResults([]);
  };

  const handleSearchButton = () => {
    if (!pickupQuery || !searchQuery) {
      alert("Please enter both pickup and destination locations");
      return;
    }

    navigation.navigate("SearchResults", {
      pickup: pickupQuery,
      destination: searchQuery,
      pickupCoordinates,
      destinationCoordinates,
    });
  };

  const clearInput = (inputType) => {
    if (inputType === "pickup") {
      setPickupQuery("");
    } else {
      setSearchQuery("");
    }
    showSuggestionsDrawer(false);
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: opacityAnim }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Where To?</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        {/* Search Mode Toggle */}
        <Animated.View
          style={[
            styles.searchModeContainer,
            {
              opacity: opacityAnim,
              transform: [{ translateY: slideUpAnim }],
            },
          ]}
        >
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Search by City</Text>
            <Switch
              value={searchByCity}
              onValueChange={setSearchByCity}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={searchByCity ? "#fff" : "#fff"}
              ios_backgroundColor={COLORS.border}
            />
          </View>
          <Text style={styles.toggleDescription}>
            {searchByCity
              ? "Find trips between cities"
              : "Find specific locations"}
          </Text>
        </Animated.View>

        {/* Input Container */}
        <Animated.View
          style={[
            styles.inputContainer,
            {
              opacity: opacityAnim,
              transform: [{ translateY: slideUpAnim }],
            },
          ]}
        >
          {/* Pickup Input */}
          <View style={styles.inputWrapper}>
            <View style={styles.inputIconContainer}>
              <View style={styles.pickupIcon} />
            </View>
            <View style={styles.inputContent}>
              <Text style={styles.inputLabel}>FROM</Text>
              <TextInput
                style={styles.textInput}
                value={pickupQuery}
                onChangeText={setPickupQuery}
                placeholder="Pick-up location"
                placeholderTextColor={COLORS.textLight}
                onFocus={() => setActiveInput("pickup")}
              />
            </View>
            {isLoadingLocation ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : pickupQuery ? (
              <TouchableOpacity onPress={() => clearInput("pickup")}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={COLORS.textLight}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={getUserLocation}
                style={styles.locationButton}
              >
                <Ionicons name="locate" size={16} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {/* Connector Line */}
          <View style={styles.connectorLine} />

          {/* Destination Input */}
          <View
            style={[
              styles.inputWrapper,
              activeInput === "destination" && styles.activeInput,
            ]}
          >
            <View style={styles.inputIconContainer}>
              <View style={styles.destinationIcon} />
            </View>
            <View style={styles.inputContent}>
              <Text style={styles.inputLabel}>TO</Text>
              <TextInput
                style={styles.textInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Destination"
                placeholderTextColor={COLORS.textLight}
                onFocus={() => setActiveInput("destination")}
              />
            </View>
            {searchQuery && (
              <TouchableOpacity onPress={() => clearInput("destination")}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={COLORS.textLight}
                />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Search Button */}
        <Animated.View
          style={[
            styles.searchButtonContainer,
            {
              opacity: opacityAnim,
              transform: [{ translateY: slideUpAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.searchButton,
              (!pickupQuery || !searchQuery) && styles.searchButtonDisabled,
            ]}
            onPress={handleSearchButton}
            disabled={!pickupQuery || !searchQuery}
          >
            <Text style={styles.searchButtonText}>Find Routes</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </Animated.View>

        {/* Suggestions */}
        {(showSuggestions ||
          (!showSuggestions && searchResults.length > 0)) && (
          <Animated.View
            style={[
              styles.suggestionsContainer,
              {
                opacity: suggestionAnim,
                transform: [
                  {
                    translateY: suggestionAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <ScrollView
              style={styles.suggestionsList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Searching...</Text>
                </View>
              ) : (
                <>
                  {searchByCity && searchResults.length === 0 && (
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Popular Cities</Text>
                    </View>
                  )}
                  {!searchByCity && nearbyLocations.length > 0 && (
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Nearby Trips</Text>
                    </View>
                  )}
                  {searchResults.map((item) => (
                    <LocationItem
                      key={item.id}
                      location={item}
                      onPress={() => handleLocationSelect(item)}
                    />
                  ))}
                </>
              )}
            </ScrollView>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const LocationItem = ({ location, onPress }) => {
  const getIcon = () => {
    switch (location.type) {
      case "city":
        return <MaterialCommunityIcons name="city" size={20} color="#fff" />;
      case "nearby":
        return (
          <MaterialCommunityIcons name="account-group" size={20} color="#fff" />
        );
      default:
        return <Ionicons name="location" size={20} color="#fff" />;
    }
  };

  const getIconBg = () => {
    switch (location.type) {
      case "city":
        return COLORS.warning;
      case "nearby":
        return COLORS.secondary;
      default:
        return COLORS.primary;
    }
  };

  return (
    <TouchableOpacity style={styles.locationItem} onPress={onPress}>
      <View style={[styles.locationIcon, { backgroundColor: getIconBg() }]}>
        {getIcon()}
      </View>
      <View style={styles.locationDetails}>
        <Text style={styles.locationTitle} numberOfLines={1}>
          {location.title}
        </Text>
        <Text style={styles.locationAddress} numberOfLines={1}>
          {location.address}
        </Text>
        {location.distance && (
          <Text style={styles.locationDistance}>
            {location.distance.toFixed(1)} km away
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    // paddingTop: Platform.OS === "android" ? 50 : 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.inputBg,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Bold",
    color: COLORS.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchModeContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 16,
    fontFamily: "Medium",
    color: COLORS.text,
  },
  toggleDescription: {
    fontSize: 14,
    fontFamily: "Regular",
    color: COLORS.textSecondary,
  },
  inputContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  activeInput: {
    backgroundColor: COLORS.inputActiveBg,
    borderRadius: 8,
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
  inputIconContainer: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  pickupIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  destinationIcon: {
    width: 12,
    height: 12,
    backgroundColor: COLORS.secondary,
  },
  connectorLine: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.border,
    marginLeft: 16,
    marginVertical: 4,
  },
  inputContent: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: "Bold",
    color: COLORS.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  textInput: {
    fontSize: 16,
    fontFamily: "Medium",
    color: COLORS.text,
    padding: 0,
  },
  locationButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  searchButtonContainer: {
    marginBottom: 20,
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  searchButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Bold",
    marginRight: 8,
  },
  suggestionsContainer: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  suggestionsList: {
    flex: 1,
    padding: 16,
  },
  sectionHeader: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Bold",
    color: COLORS.text,
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  locationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  locationDetails: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontFamily: "Medium",
    color: COLORS.text,
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 14,
    fontFamily: "Regular",
    color: COLORS.textSecondary,
  },
  locationDistance: {
    fontSize: 12,
    fontFamily: "Medium",
    color: COLORS.primary,
    marginTop: 2,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Medium",
    color: COLORS.textSecondary,
    marginTop: 12,
  },
});
