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
} from "react-native";
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useFonts } from "expo-font";
import * as Location from "expo-location";
import DateTimePicker from "@react-native-community/datetimepicker";
import { createTrip } from "../lib/query/trip";
import { auth, db } from "../lib/db/firebase";
import { getphonenumbervisible } from "../lib/query/user";

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

const VEHICLE_TYPES = [
  { id: "any", name: "Any", icon: "any" },
  { id: "walk", name: "Walk In", icon: "walk" },
  { id: "car", name: "Car", icon: "car" },
  { id: "bike", name: "Bike", icon: "bicycle" },
  { id: "auto", name: "Auto", icon: "rickshaw" },
  { id: "bus", name: "Bus", icon: "bus" },
  { id: "truck", name: "Truck", icon: "truck" },
  { id: "public", name: "Public Transport", icon: "globe" },
  { id: "other", name: "Others", icon: "globe" },
];

export default function TripCreationScreen({ navigation, route }) {
  // Location states
  const [pickupQuery, setPickupQuery] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");
  const [pickupCoordinates, setPickupCoordinates] = useState({});
  const [destinationCoordinates, setDestinationCoordinates] = useState({});
  const [manualLocation, setManualLocation] = useState(null);
  const [userCity, setUserCity] = useState("");
const [additionalInfo, setAdditionalInfo] = useState("");
  // UI states
  const [activeInput, setActiveInput] = useState("pickup");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [nearbyLocations, setNearbyLocations] = useState([]);
  const [searchByCity, setSearchByCity] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSearchDrawer, setShowSearchDrawer] = useState(false);

  // Date and time states
  const [departureDate, setDepartureDate] = useState(new Date());
  const [departureTime, setDepartureTime] = useState(new Date());
  const [arrivalTime, setArrivalTime] = useState(
    new Date(Date.now() + 60 * 60 * 1000)
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDepartTimePicker, setShowDepartTimePicker] = useState(false);
  const [showArrivalTimePicker, setShowArrivalTimePicker] = useState(false);

  // Trip creation stateds
  const [loading, setloading] = useState(false);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [vehicleType, setVehicleType] = useState("any");

  // Animation values
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const suggestionAnim = useRef(new Animated.Value(0)).current;
  const sheetHeight = useState(new Animated.Value(0))[0];

  const [searchQuery, setSearchQuery] = useState("");
  const [searchInputRef, setSearchInputRef] = useState(null);

  const user = auth.currentUser;
  const [visible, setVisible] = useState(false);

  useEffect(async () => {
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
      Animated.timing(sheetHeight, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    if (!searchByCity) {
      getUserLocation();
    }

    const numb = await getphonenumbervisible(user.uid);
    setVisible(numb);
  }, []);

  useEffect(() => {
    // Check if we received location data from route params
    if (route?.params?.selectedLocation) {
      const { selectedLocation } = route.params;
      const inputType = selectedLocation.inputType || activeInput;

      if (inputType === "pickup") {
        setPickupQuery(selectedLocation.address);
        setPickupCoordinates(selectedLocation.coordinates);
        setManualLocation({ name: selectedLocation.address });
      } else {
        setDestinationQuery(selectedLocation.address);
        setDestinationCoordinates(selectedLocation.coordinates);
      }

      navigation.setParams({ selectedLocation: undefined });
    }
  }, [route?.params?.selectedLocation]);

  useEffect(() => {
    const searchDelay = setTimeout(() => {
      if (searchQuery.length > 2) {
        if (searchByCity) {
          searchCities(searchQuery);
        } else {
          fetchLocationSuggestions(searchQuery);
        }
        showSuggestionsDrawer(true);
      } else if (searchQuery.length === 0) {
        if (searchByCity) {
          setSearchResults([]);
        } else {
          setSearchResults(nearbyLocations);
        }
        if (showSearchDrawer) {
          showSuggestionsDrawer(true);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(searchDelay);
  }, [searchQuery, searchByCity, nearbyLocations, showSearchDrawer]);

  const handleInputPress = (inputType) => {
    setActiveInput(inputType);
    setShowSearchDrawer(true);

    const currentQuery =
      inputType === "pickup" ? pickupQuery : destinationQuery;
    setSearchQuery(currentQuery);

    if (currentQuery.length === 0) {
      if (searchByCity) {
        setSearchResults([]);
      } else {
        setSearchResults(nearbyLocations);
      }
    }

    showSuggestionsDrawer(true);

    setTimeout(() => {
      if (searchInputRef) {
        searchInputRef.focus();
      }
    }, 300);
  };

  const showSuggestionsDrawer = (show) => {
    setShowSuggestions(show);
    setShowSearchDrawer(show);
    Animated.timing(suggestionAnim, {
      toValue: show ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const searchCities = (query) => {
    // Implement your city search logic here
    // This is just a placeholder
    const filteredCities = [];
    setSearchResults(filteredCities);
  };

  const getUserLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setIsLoadingLocation(false);
        return;
      }

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
        setManualLocation({ name: address });
      } else {
        setPickupCoordinates({ latitude, longitude });
        setManualLocation({ name: "Current Location" });
      }
    } catch (error) {
      console.error("Error getting current location:", error);
      setPickupQuery("Current Location");
      setManualLocation({ name: "Current Location" });
    } finally {
      setIsLoadingLocation(false);
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

  const closeSearchDrawer = () => {
    setShowSearchDrawer(false);
    setSearchQuery("");
    Keyboard.dismiss();
  };

  const handleLocationSelect = async (location) => {
    Keyboard.dismiss();
    showSuggestionsDrawer(false);
    setSearchQuery("");

    const details = await fetchPlaceDetails(location.id);
    if (!details) return;

    if (activeInput === "pickup") {
      setPickupQuery(location.address);
      setPickupCoordinates({ latitude: details.lat, longitude: details.lng });
      setManualLocation({ name: location.address });
      setActiveInput("destination");
    } else {
      setDestinationQuery(location.address);
      setDestinationCoordinates({
        latitude: details.lat,
        longitude: details.lng,
      });
    }
    setSearchResults([]);
  };

  const handleClearInput = (inputType) => {
    if (inputType === "pickup") {
      setPickupQuery("");
      setPickupCoordinates({});
      setManualLocation(null);
    } else {
      setDestinationQuery("");
      setDestinationCoordinates({});
    }
    showSuggestionsDrawer(false);
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDepartureDate(selectedDate);
    }
  };

  const onDepartureTimeChange = (event, selectedTime) => {
    setShowDepartTimePicker(false);
    if (selectedTime) {
      setDepartureTime(selectedTime);
    }
  };

  const onArrivalTimeChange = (event, selectedTime) => {
    setShowArrivalTimePicker(false);
    if (selectedTime) {
      setArrivalTime(selectedTime);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (time) => {
    return time.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleCreateTrip = async () => {
    if (!user?.uid) {
      navigation.navigate("login");
      return;
    }

    if (
      !user?.uid ||
      !pickupCoordinates.latitude ||
      !pickupCoordinates.longitude ||
      !destinationCoordinates.latitude ||
      !destinationCoordinates.longitude ||
      !departureDate ||
      !departureTime ||
      !vehicleType
    ) {
      console.warn("Missing trip fields.");
      return;
    }

    try {
      setloading(true);

      const combinedDepartureDateTime = new Date(departureDate);
      combinedDepartureDateTime.setHours(
        departureTime.getHours(),
        departureTime.getMinutes(),
        0
      );

      const combinedArrivalDateTime = new Date(departureDate);
      combinedArrivalDateTime.setHours(
        arrivalTime.getHours(),
        arrivalTime.getMinutes(),
        0
      );

      const tripId = await createTrip({
        userId: user.uid,
        startLocation: pickupCoordinates,
        endLocation: destinationCoordinates,
        departureTime: combinedDepartureDateTime.toISOString(),
        startlocationName: pickupQuery,
        endlocationName: destinationQuery,
        tripDate: departureDate.toISOString(),
        tripType: vehicleType,
        phonevisible: visible,
        additionalInfo: additionalInfo,
      });

      console.log("🎉 Trip created successfully:", tripId);
      setloading(false);
      navigation.navigate("Movements", {
        screen: "TripDetails",
        params: { tripId },
      });
    } catch (error) {
      console.error("Error during trip creation:", error);
    } finally {
      setloading(false);
    }
  };

  const [fontsLoaded] = useFonts({
    Regular: require("../assets/fonts/regular.ttf"),
    Medium: require("../assets/fonts/medium.ttf"),
    Bold: require("../assets/fonts/bold.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: opacityAnim }]}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.openDrawer?.()}
          >
            {/* Menu icon can be added here */}
          </TouchableOpacity>

          <View style={styles.headerLocationContainer}>
            <View style={styles.locationRow}>
              <View style={[styles.locationDot, styles.originDot]} />
              <Text style={styles.locationText} numberOfLines={1}>
                Movement Creation
              </Text>
            </View>
            {/* <View style={styles.locationRow}>
              <View style={[styles.locationDot, styles.destinationDot]} />
              <Text style={styles.locationText} numberOfLines={1}>
                {destinationQuery || "To"}
              </Text>
            </View> */}
          </View>
        </Animated.View>

        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              {
                opacity: opacityAnim,
                transform: [{ translateY: slideUpAnim }],
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.inputWrapper,
                activeInput === "pickup" && styles.activeInputWrapper,
              ]}
              onPress={() => handleInputPress("pickup")}
            >
              <View style={styles.routePointWrapper}>
                <View style={styles.originPoint} />
              </View>
              <View style={styles.inputContent}>
                <Text
                  style={[
                    styles.inputText,
                    !pickupQuery && styles.placeholderText,
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {pickupQuery || "From"}
                </Text>
              </View>
              {pickupQuery && (
                <TouchableOpacity onPress={() => handleClearInput("pickup")}>
                  <Ionicons name="close-circle" size={22} color="#333" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {/* Destination Input */}
            <TouchableOpacity
              style={[styles.inputWrapper, activeInput === "destination"]}
              onPress={() => handleInputPress("destination")}
            >
              <View style={styles.routePointWrapper}>
                <View style={styles.destinationPoint} />
              </View>
              <View style={styles.inputContent}>
                <Text
                  style={[
                    styles.inputText,
                    !destinationQuery && styles.placeholderText,
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {destinationQuery || "To"}
                </Text>
              </View>
              {destinationQuery && (
                <TouchableOpacity
                  onPress={() => handleClearInput("destination")}
                >
                  <Ionicons name="close-circle" size={22} color="#333" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Date and Time Selection */}
          <Animated.View
            style={[
              styles.dateTimeSection,
              {
                opacity: opacityAnim,
                transform: [{ translateY: slideUpAnim }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.dateTimeItem}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={styles.dateTimeIconContainer}>
                <MaterialCommunityIcons
                  name="calendar"
                  size={20}
                  color="#0070E0"
                />
              </View>
              <View style={styles.dateTimeContent}>
                <Text style={styles.dateTimeLabel}>DATE</Text>
                <Text style={styles.dateTimeValue}>
                  {formatDate(departureDate)}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#888" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateTimeItem}
              onPress={() => setShowDepartTimePicker(true)}
            >
              <View style={styles.dateTimeIconContainer}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={20}
                  color="#0070E0"
                />
              </View>
              <View style={styles.dateTimeContent}>
                <Text style={styles.dateTimeLabel}>DEPARTURE TIME</Text>
                <Text style={styles.dateTimeValue}>
                  {formatTime(departureTime)}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#888" />
            </TouchableOpacity>

            {/* Vehicle Type Selection */}
            <TouchableOpacity
              style={styles.dateTimeItem}
              onPress={() => setShowVehicleSelector(true)}
            >
              <View style={styles.dateTimeIconContainer}>
                <MaterialCommunityIcons name="car" size={20} color="#0070E0" />
              </View>
              <View style={styles.dateTimeContent}>
                <Text style={styles.dateTimeLabel}>MOVEMENT TYPE</Text>
                <Text style={styles.dateTimeValue}>
                  {VEHICLE_TYPES.find((v) => v.id === vehicleType)?.name ||
                    "Any"}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#888" />
            </TouchableOpacity>
          </Animated.View>


<Animated.View
  style={[
    styles.additionalInfoSection,
    {
      opacity: opacityAnim,
      transform: [{ translateY: slideUpAnim }],
    },
  ]}
>
  <TextInput
    style={styles.additionalInfoInput}
    placeholder="Additional information (optional)"
    placeholderTextColor={COLORS.textLight}
    multiline={true}
    numberOfLines={4}
    value={additionalInfo}
    onChangeText={setAdditionalInfo}
  />
</Animated.View>


          

          {/* Create Trip Button */}
          <Animated.View
            style={[
              styles.buttonContainer,
              {
                opacity: opacityAnim,
                transform: [{ translateY: slideUpAnim }],
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.createTripButton,
                (loading || !pickupQuery || !destinationQuery) &&
                  styles.createTripButtonDisabled,
              ]}
              onPress={handleCreateTrip}
              disabled={loading || !pickupQuery || !destinationQuery}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.createTripButtonText}>Post Movement</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>

        {/* Vehicle Picker Modal */}
        {showVehicleSelector && (
          <View style={styles.vehicleSelectorModal}>
            <View style={styles.vehicleSelectorContainer}>
              <View style={styles.vehicleSelectorHeader}>
                <Text style={styles.vehicleSelectorTitle}>MOVEMENT TYPE</Text>
                <TouchableOpacity onPress={() => setShowVehicleSelector(false)}>
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.vehicleList}>
                {VEHICLE_TYPES.map((vehicle) => (
                  <TouchableOpacity
                    key={vehicle.id}
                    style={[
                      styles.vehicleItem,
                      vehicleType === vehicle.id && styles.selectedVehicleItem,
                    ]}
                    onPress={() => {
                      setVehicleType(vehicle.id);
                      setShowVehicleSelector(false);
                    }}
                  >
                    <MaterialCommunityIcons
                      name={vehicle.icon}
                      size={24}
                      color={
                        vehicleType === vehicle.id
                          ? COLORS.primary
                          : COLORS.text
                      }
                      style={styles.vehicleIcon}
                    />
                    <Text
                      style={[
                        styles.vehicleName,
                        vehicleType === vehicle.id &&
                          styles.selectedVehicleName,
                      ]}
                    >
                      {vehicle.name}
                    </Text>
                    {vehicleType === vehicle.id && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={COLORS.primary}
                        style={styles.vehicleCheck}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Search Suggestions Overlay */}
        {showSearchDrawer && (
          <Animated.View
            style={[
              styles.suggestionsOverlay,
              {
                opacity: suggestionAnim,
                transform: [
                  {
                    translateY: suggestionAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [height, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.suggestionsHeader}>
              <TouchableOpacity
                onPress={closeSearchDrawer}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.suggestionsTitle}>
                {activeInput === "pickup"
                  ? "Select Location"
                  : "Select Destination"}
              </Text>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputWrapper}>
                <Ionicons
                  name="search"
                  size={20}
                  color={COLORS.textSecondary}
                  style={styles.searchIcon}
                />
                <TextInput
                  ref={setSearchInputRef}
                  style={styles.searchInput}
                  placeholder={
                    searchByCity ? "Search cities..." : "Search locations..."
                  }
                  placeholderTextColor={COLORS.textLight}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus={true}
                  returnKeyType="search"
                  onSubmitEditing={() => {
                    if (searchQuery.trim()) {
                      if (searchByCity) {
                        searchCities(searchQuery);
                      } else {
                        fetchLocationSuggestions(searchQuery);
                      }
                    }
                  }}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery("")}
                    style={styles.clearSearchButton}
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Search Results */}
            <ScrollView
              style={styles.suggestionsList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Searching locations...</Text>
                </View>
              ) : searchResults.length === 0 && searchQuery.length > 2 ? (
                <View style={styles.noResultsContainer}>
                  <Ionicons name="search" size={40} color={COLORS.textLight} />
                  <Text style={styles.noResultsText}>No locations found</Text>
                  <Text style={styles.noResultsSubtext}>
                    Try searching with different keywords
                  </Text>
                </View>
              ) : (
                <>
                  {searchQuery.length === 0 && (
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>
                        {searchByCity ? "Popular Cities" : "Nearby Locations"}
                      </Text>
                    </View>
                  )}

                  {searchResults.map((item, index) => (
                    <TouchableOpacity
                      key={`${item.id}-${index}`}
                      style={styles.suggestionItem}
                      onPress={() => handleLocationSelect(item)}
                    >
                      <View style={styles.suggestionIcon}>
                        {item.type === "nearby" ? (
                          <MaterialCommunityIcons
                            name="map-marker-radius"
                            size={20}
                            color={COLORS.secondary}
                          />
                        ) : item.type === "city" ? (
                          <MaterialIcons
                            name="location-city"
                            size={20}
                            color={COLORS.primary}
                          />
                        ) : (
                          <Ionicons
                            name="location-outline"
                            size={20}
                            color={COLORS.textSecondary}
                          />
                        )}
                      </View>
                      <View style={styles.suggestionContent}>
                        <Text style={styles.suggestionTitle}>{item.title}</Text>
                        <Text
                          style={styles.suggestionAddress}
                          numberOfLines={2}
                        >
                          {item.address}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={COLORS.textLight}
                      />
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
          </Animated.View>
        )}

        {/* Date Time Pickers */}
        {showDatePicker && (
          <DateTimePicker
            value={departureDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        {showDepartTimePicker && (
          <DateTimePicker
            value={departureTime}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onDepartureTimeChange}
          />
        )}

        {showArrivalTimePicker && (
          <DateTimePicker
            value={arrivalTime}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onArrivalTimeChange}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    fontFamily: "Regular",
    paddingTop: Platform.OS === "android" ? 0 : 0,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 20,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === "android" ? 40 : 10,
  },
  headerLocationContainer: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 16,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  locationIcon: {
    marginRight: 4,
  },
  locationText: {
    fontSize: 14,
    fontFamily: "Regular",
    color: COLORS.textSecondary,
    maxWidth: "80%",
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Bold",
    color: COLORS.text,
  },
  profileButton: {
    padding: 4,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modeToggleContainer: {
    marginBottom: 20,
  },
  modeToggleWrapper: {
    flexDirection: "row",
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    padding: 2,
    position: "relative",
  },
  modeToggleSlider: {
    position: "absolute",
    top: 2,
    width: width / 2 - 16,
    height: 44,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  modeToggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  activeModeButton: {
    // Additional styling if needed
  },
  modeToggleText: {
    fontSize: 14,
    fontFamily: "Medium",
    color: COLORS.textSecondary,
  },
  activeModeText: {
    color: "#fff",
  },
  searchModeContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  routeContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 19,
    paddingHorizontal: 15,
    borderRadius: 12,
    backgroundColor: COLORS.inputBg,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  activeInput: {
    backgroundColor: COLORS.inputActiveBg,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  routePointWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  routePointOutline: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  originPoint: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#087708",
  },
  destinationPoint: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
  },
  verticalLine: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.border,
    marginLeft: 30,
    marginVertical: 4,
  },
  inputContent: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: "Medium",
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  inputText: {
    fontSize: 16,
    fontFamily: "Regular",
    color: COLORS.text,
  },
  placeholderText: {
    color: COLORS.textLight,
  },
  locationButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 8,
  },
  dateTimeSection: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  dateTimeItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dateTimeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  dateTimeContent: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: 12,
    fontFamily: "Medium",
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  dateTimeValue: {
    fontSize: 16,
    fontFamily: "Medium",
    color: COLORS.text,
  },
  buttonContainer: {
    marginBottom: 5,
  },
  createTripButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    bottom: 10
  },
  createTripButtonDisabled: {
    backgroundColor: COLORS.textLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  createTripButtonText: {
    fontSize: 16,
    fontFamily: "Bold",
    color: "#fff",
  },
  suggestionsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
    zIndex: 1000,
  },
  suggestionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeButton: {
    marginRight: 16,
  },
  suggestionsTitle: {
    fontSize: 18,
    fontFamily: "Medium",
    color: COLORS.text,
  },
  suggestionsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: "Regular",
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  suggestionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.inputBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 16,
    fontFamily: "Medium",
    color: COLORS.text,
    marginBottom: 4,
  },
  suggestionAddress: {
    fontSize: 14,
    fontFamily: "Regular",
    color: COLORS.textSecondary,
  },
  distanceText: {
    fontSize: 12,
    fontFamily: "Regular",
    color: COLORS.textLight,
    marginTop: 2,
  },
  tripBadge: {
    backgroundColor: COLORS.success,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tripBadgeText: {
    fontSize: 12,
    fontFamily: "Medium",
    color: "#fff",
  },
  searchContainer: {
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Regular",
    color: COLORS.text,
    padding: 0,
  },
  clearSearchButton: {
    marginLeft: 8,
    padding: 4,
  },
  sectionHeader: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Medium",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  noResultsContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  noResultsText: {
    fontSize: 18,
    fontFamily: "Medium",
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    fontFamily: "Regular",
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  nearbyTripsContainer: {
    marginTop: 24,
    // paddingHorizontal: 20,
  },
  nearbyTripsHeader: {
    marginBottom: 16,
  },
  nearbyTripsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "Bold",
  },
  nearbyTripsSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontFamily: "Regular",
  },
  // nearbyTripsList: {
  //   maxHeight: 400,
  // },
  nearbyTripItem: {
    flexDirection: "row",
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  tripRouteContainer: {
    alignItems: "center",
    marginRight: 12,
  },
  tripStartPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  tripRouteLine: {
    width: 2,
    height: 30,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  tripEndPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
  },
  tripDetailsContainer: {
    flex: 1,
    marginRight: 12,
  },
  tripLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  tripLocationText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    fontFamily: "Medium",
    flex: 1,
  },
  tripMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  tripTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  tripTimeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
    fontFamily: "Regular",
  },
  tripDistanceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  tripDistanceText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
    fontFamily: "Regular",
  },
  tripFullAddress: {
    fontSize: 12,
    color: COLORS.textLight,
    fontFamily: "Regular",
  },
  tripActionContainer: {
    alignItems: "center",
  },
  tripStatusBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  tripStatusText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "600",
    fontFamily: "Medium",
  },
  loadingMoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: "Regular",
  },
  noTripsContainer: {
    alignItems: "center",
    padding: 32,
  },
  noTripsText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: 12,
    fontFamily: "Medium",
  },

  noTripsSubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
    fontFamily: "Regular",
  },

  locationDisplay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  locationText: {
    fontSize: 18,
    fontFamily: "Bold",
    color: COLORS.text,
    maxWidth: "80%",
  },
  locationChevron: {
    marginLeft: 4,
  },

  vehiclePickerModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    zIndex: 2000,
  },
  vehiclePickerContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
  },
  vehiclePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  vehiclePickerTitle: {
    fontSize: 18,
    fontFamily: "Medium",
    color: COLORS.text,
  },
  vehiclePicker: {
    height: 180,
  },
  vehicleTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  vehicleTypeText: {
    fontSize: 16,
    fontFamily: "Medium",
    color: COLORS.text,
  },

  vehicleSelectorModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
  },
  vehicleSelectorContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "80%",
    maxHeight: "60%",
    padding: 20,
  },
  vehicleSelectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 10,
  },
  vehicleSelectorTitle: {
    fontSize: 18,
    fontFamily: "Medium",
    color: COLORS.text,
  },
  vehicleList: {
    width: "100%",
  },
  vehicleItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  selectedVehicleItem: {
    backgroundColor: "#EDF1FC",
  },
  vehicleIcon: {
    marginRight: 16,
  },
  vehicleName: {
    fontSize: 16,
    fontFamily: "Regular",
    color: COLORS.text,
    flex: 1,
  },
  selectedVehicleName: {
    fontFamily: "Medium",
    color: COLORS.primary,
  },
  vehicleCheck: {
    marginLeft: 8,
  },

  additionalInfoSection: {
  backgroundColor: COLORS.cardBg,
  borderRadius: 16,
  padding: 16,
  marginBottom: 20,
  shadowColor: COLORS.shadow,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 3,
},
additionalInfoInput: {
  fontSize: 16,
  fontFamily: "Regular",
  color: COLORS.text,
  minHeight: 100,
  textAlignVertical: 'top',
  padding: 12,
  backgroundColor: COLORS.inputBg,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: COLORS.border,
},

});
