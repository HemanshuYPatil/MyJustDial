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
  ActivityIndicator,
  KeyboardAvoidingView,
  Animated,
  Dimensions,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useFonts } from "expo-font";

const { height } = Dimensions.get("window");

export default function LocationBottomDrawer({ 
  visible, 
  onClose, 
  onLocationSelect,
  inputType = "pickup"
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [nearbyStations, setNearbyStations] = useState([]);
  
  // Animation values
  const bottomSheetPos = useRef(new Animated.Value(height)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;


 const [fontsLoaded] = useFonts({
    Regular: require("../assets/fonts/regular.ttf"),
    Medium: require("../assets/fonts/medium.ttf"),
    Bold: require("../assets/fonts/bold.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }
  useEffect(() => {
    if (visible) {
      // Show drawer when visible changes to true
      Animated.parallel([
        Animated.timing(bottomSheetPos, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Request location permissions and get nearby places
      // getNearbyStations();
    } else {
      // Hide drawer when visible changes to false
      Animated.parallel([
        Animated.timing(bottomSheetPos, {
          toValue: height,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  useEffect(() => {
    const searchDelay = setTimeout(() => {
      if (searchQuery.length > 2) {
        fetchLocationSuggestions(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(searchDelay);
  }, [searchQuery]);

  // Pan responder for swipe-down to close
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 20;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          bottomSheetPos.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > height * 0.2) {
          onClose();
        } else {
          Animated.spring(bottomSheetPos, {
            toValue: 0,
            tension: 100,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const getNearbyStations = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      console.warn("Permission to access location was denied");
      return;
    }

    try {
      setIsLoading(true);
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Use Google Places API to get nearby train stations
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=5000&type=train_station&key=AIzaSyDkw5Q09G-FzQC0tw9IZAu_9q3-dL8QDIg`
      );

      const data = await response.json();

      if (data.status === "OK" && data.results.length > 0) {
        const stations = data.results.slice(0, 5).map((place) => ({
          id: place.place_id,
          name: place.name,
          location: place.vicinity,
          type: "nearby",
        }));

        setNearbyStations(stations);
      }
    } catch (error) {
      console.error("Error getting nearby stations:", error);
    } finally {
      setIsLoading(false);
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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== "OK") {
        console.warn("Google Places returned status:", data.status);
        setSearchResults([]);
        return;
      }

      const formattedResults = data.predictions.map((item) => ({
        id: item.place_id,
        name: item.structured_formatting.main_text,
        location: item.structured_formatting.secondary_text || "India",
        type: "search",
      }));

      setSearchResults(formattedResults);
    } catch (error) {
      console.error("Error fetching location suggestions:", error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSelect = async (location) => {
    try {
      const details = await fetchPlaceDetails(location.id);
      if (details) {
        onLocationSelect({
          name: location.name,
          address: `${location.name}, ${location.location}`,
          coordinates: {
            latitude: details.lat,
            longitude: details.lng,
          },
          inputType: inputType,
        });
        setSearchQuery("");
        onClose();
      }
    } catch (error) {
      console.error("Error getting place details:", error);
    }
  };

  const fetchPlaceDetails = async (placeId) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=AIzaSyDkw5Q09G-FzQC0tw9IZAu_9q3-dL8QDIg`
      );
      const data = await response.json();

      if (data.status === "OK") {
        const location = data.result.geometry.location;
        const name = data.result.name;
        const address = data.result.formatted_address;

        return {
          lat: location.lat,
          lng: location.lng,
          name,
          address,
        };
      } else {
        console.warn("Failed to fetch place details:", data.status);
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
    }
  };

  const renderStationIcon = (type) => {
    if (type === "nearby") {
      return (
        <View style={styles.stationIcon}>
          <Ionicons name="location-outline" size={22} color="#555" />
        </View>
      );
    } else if (type === "popular") {
      return (
        <View style={styles.stationIcon}>
          <Ionicons name="star-outline" size={22} color="#555" />
        </View>
      );
    } else {
      return (
        <View style={styles.stationIcon}>
          <Ionicons name="time-outline" size={22} color="#555" />
        </View>
      );
    }
  };

  const renderStationItem = (station) => (
    <TouchableOpacity
      key={station.id}
      style={styles.stationItem}
      onPress={() => handleLocationSelect(station)}
    >
      {renderStationIcon(station.type)}
      <View style={styles.stationDetails}>
        <Text style={styles.stationName}>{station.name}</Text>
        <Text style={styles.stationLocation}>{station.location}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (searchQuery.length > 0) {
      if (isLoading) {
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Searching places...</Text>
          </View>
        );
      }

      if (searchResults.length === 0) {
        return (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No places found</Text>
          </View>
        );
      }

      return (
        <View style={styles.resultsContainer}>
          {searchResults.map(renderStationItem)}
        </View>
      );
    }

    // return (
    //   <>
    //     {/* Nearby Stations */}
    //     <View style={styles.sectionContainer}>
    //       <Text style={styles.sectionTitle}>Nearby Places</Text>
    //       {nearbyStations.length > 0 ? (
    //         nearbyStations.map(renderStationItem)
    //       ) : (
    //         <View style={styles.loadingContainer}>
    //           <ActivityIndicator size="small" color="#4CAF50" />
    //           <Text style={styles.loadingText}>Finding nearby places...</Text>
    //         </View>
    //       )}
    //     </View>
    //   </>
    // );
  };

  if (!visible) return null;

  return (
    <>
      {/* Semi-transparent overlay */}
      <Animated.View 
        style={[
          styles.overlay,
          { opacity: overlayOpacity }
        ]}
        onTouchEnd={onClose}
      />
      
      {/* Bottom sheet */}
      <Animated.View 
        style={[
          styles.container,
          { transform: [{ translateY: bottomSheetPos }] }
        ]}
        {...panResponder.panHandlers}
      >
        <SafeAreaView style={styles.safeArea}>
          <StatusBar style="dark" hidden={false} />

          {/* Handle indicator */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onClose}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>

            <View style={styles.searchInputContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder={inputType === "pickup" ? "Search pickup location..." : "Search destination..."}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#888"
                autoFocus={true}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setSearchQuery("")}
                >
                  <Ionicons name="close-circle" size={18} color="#888" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Content */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
          >
            <ScrollView
              style={styles.scrollView}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {renderContent()}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 1000,
  },
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '95%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 1001,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  safeArea: {
    flex: 1,
  },
  handleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#e0e0e0',
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    marginRight: 10,
    padding: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#000",
    borderRadius: 50,
    paddingHorizontal: 15,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    height: "100%",
    paddingVertical: 8,
    fontFamily: "Regular",
  },
  clearButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  sectionContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  stationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  stationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  stationDetails: {
    flex: 1,
  },
  stationName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 2,
    fontFamily: "Medium",
  },
  stationLocation: {
    fontSize: 14,
    color: "#666",fontFamily: "Regular",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
    fontFamily: "Regular",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    fontFamily: "Regular",
  },
  resultsContainer: {
    marginTop: 8,
  },
});