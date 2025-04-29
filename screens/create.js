import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Animated,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import {
  Ionicons,
  MaterialIcons,
  Feather,
  FontAwesome,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import * as Location from "expo-location";
import DateTimePicker from '@react-native-community/datetimepicker';
import { createTrip } from "../lib/query/trip";
import { auth } from "../lib/db/firebase";
import LocationBottomDrawer from "../components/locationresult"; // Import the new component

const { width } = Dimensions.get("window");

export default function TripCreationScreen({ navigation, route }) {
  const [pickupQuery, setPickupQuery] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");

  const [pickupcoordinates, setPickupCoordinates] = useState({});
  const [destinationcoordinates, setDestinationCoordinates] = useState({});

  const [activeInput, setActiveInput] = useState("pickup");
  const [district, setDistrict] = useState("");
  const [loading, setloading] = useState(false);
  
  // New state for date and time pickers
  const [departureDate, setDepartureDate] = useState(new Date());
  const [departureTime, setDepartureTime] = useState(new Date());
  const [arrivalTime, setArrivalTime] = useState(new Date(Date.now() + 60 * 60 * 1000)); // Default 1 hour later
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDepartTimePicker, setShowDepartTimePicker] = useState(false);
  const [showArrivalTimePicker, setShowArrivalTimePicker] = useState(false);
  
  // Bottom drawer state
  const [showSearchDrawer, setShowSearchDrawer] = useState(false);
  
  const slideUpAnim = useState(new Animated.Value(50))[0];
  const opacityAnim = useState(new Animated.Value(0))[0];
  const sheetHeight = useState(new Animated.Value(0))[0];
  
  const user = auth.currentUser;

  useEffect(() => {
    // Check if we received location data from the location drawer
    if (route.params?.selectedLocation) {
      const { selectedLocation } = route.params;
      
      // Determine which input to update based on the inputType
      const inputType = selectedLocation.inputType || activeInput;
      
      if (inputType === "pickup") {
        setPickupQuery(selectedLocation.address);
        setPickupCoordinates(selectedLocation.coordinates);
      } else {
        setDestinationQuery(selectedLocation.address);
        setDestinationCoordinates(selectedLocation.coordinates);
      }
      
      // Clear the parameter to prevent reapplying on further renders
      navigation.setParams({ selectedLocation: undefined });
    }
  }, [route.params?.selectedLocation]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(sheetHeight, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Get user's district on component mount
  }, []);

  const handleLocationSelect = (selectedLocation) => {
    if (selectedLocation.inputType === "pickup") {
      setPickupQuery(selectedLocation.address);
      setPickupCoordinates(selectedLocation.coordinates);
      // Optionally switch focus to destination after selecting pickup
      setActiveInput("destination");
    } else {
      setDestinationQuery(selectedLocation.address);
      setDestinationCoordinates(selectedLocation.coordinates);
    }
  };

  const handleClearInput = () => {
    if (activeInput === "pickup") {
      setPickupQuery("");
      setPickupCoordinates({});
    } else {
      setDestinationQuery("");
      setDestinationCoordinates({});
    }
  };

  // Date and time handlers
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

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Format time for display
  const formatTime = (time) => {
    return time.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleCreateTrip = async () => {
    if (
      !user?.uid ||
      !pickupcoordinates.latitude ||
      !pickupcoordinates.longitude ||
      !destinationcoordinates.latitude ||
      !destinationcoordinates.longitude
    ) {
      console.warn("Missing trip fields.");
      return;
    }

    try {
      setloading(true);
      
      // Combine date and departure time
      const combinedDepartureDateTime = new Date(departureDate);
      combinedDepartureDateTime.setHours(
        departureTime.getHours(),
        departureTime.getMinutes(),
        0
      );

      // Combine date and arrival time
      const combinedArrivalDateTime = new Date(departureDate);
      combinedArrivalDateTime.setHours(
        arrivalTime.getHours(),
        arrivalTime.getMinutes(),
        0
      );

      const tripId = await createTrip({
        userId: user.uid,
        startLocation: pickupcoordinates,
        endLocation: destinationcoordinates,
        departureTime: combinedDepartureDateTime.toISOString(),
        // arrivalTime: combinedArrivalDateTime.toISOString(),
        startlocationName: pickupQuery,
        endlocationName: destinationQuery,
        tripDate: departureDate.toISOString(),
      });

      console.log("🎉 Trip created successfully:", tripId);
      setloading(false);
      // Navigate or show success message
      navigation.goBack();
    } catch (error) {
      console.error("Error during trip creation:", error);
    } finally {
      setloading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        {/* Header with handle */}
        <View style={styles.headerContainer}>
          <View style={styles.handle} />
          <Text style={styles.headerTitle}>Create Trip</Text>
        </View>

        {/* Route Line Connector */}
        <Animated.View
          style={[
            styles.routeLineContainer,
            {
              transform: [{ translateY: slideUpAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.pickupContainer,
              activeInput === "pickup" && styles.activeInputContainer,
            ]}
            onPress={() => { 
              setActiveInput("pickup");
              setShowSearchDrawer(true);
            }}
          >
            <View style={styles.routePointWrapper}>
              <View style={styles.routePointOutline}>
                <View style={styles.originPoint} />
              </View>
            </View>
            <View style={styles.pickupInputContainer} activeOpacity={0.8}>
              <Text style={styles.pickupLabel}>PICK-UP</Text>
              <Text 
                style={[
                  styles.pickupInput, 
                  !pickupQuery && styles.placeholderText
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {pickupQuery || "Where are you now?"}
              </Text>
            </View>
            {pickupQuery.length > 0 && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setPickupQuery("");
                  setPickupCoordinates({});
                }}
              >
                <Ionicons name="close-circle" size={22} color="#333" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <View style={styles.verticalLine} />

          <TouchableOpacity
            style={[
              styles.destinationContainer,
              activeInput === "destination" && styles.activeInputContainer,
            ]}
            onPress={() => { 
              setActiveInput("destination");
              setShowSearchDrawer(true);
            }}
          >
            <View style={styles.routePointWrapper}>
              <View style={styles.destinationPoint} />
            </View>
            <View style={styles.destinationInputContainer} activeOpacity={0.8}>
              <Text style={styles.destinationLabel}>DESTINATION</Text>
              <Text 
                style={[
                  styles.destinationInput, 
                  !destinationQuery && styles.placeholderText
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {destinationQuery || "Where are you going?"}
              </Text>
            </View>
            {destinationQuery.length > 0 && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setDestinationQuery("");
                  setDestinationCoordinates({});
                }}
              >
                <Ionicons name="close-circle" size={22} color="#333" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Date and Time Selection Section */}
        <View style={styles.dateTimeSection}>
          {/* Date Selector */}
          <TouchableOpacity 
            style={styles.dateTimeItem}
            onPress={() => setShowDatePicker(true)}
          >
            <View style={styles.dateTimeIconContainer}>
              <MaterialCommunityIcons name="calendar" size={20} color="#0070E0" />
            </View>
            <View style={styles.dateTimeContent}>
              <Text style={styles.dateTimeLabel}>DATE</Text>
              <Text style={styles.dateTimeValue}>{formatDate(departureDate)}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#888" />
          </TouchableOpacity>

          {/* Departure Time Selector */}
          <TouchableOpacity 
            style={styles.dateTimeItem}
            onPress={() => setShowDepartTimePicker(true)}
          >
            <View style={styles.dateTimeIconContainer}>
              <MaterialCommunityIcons name="clock-outline" size={20} color="#0070E0" />
            </View>
            <View style={styles.dateTimeContent}>
              <Text style={styles.dateTimeLabel}>DEPARTURE TIME</Text>
              <Text style={styles.dateTimeValue}>{formatTime(departureTime)}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#888" />
          </TouchableOpacity>

          {/* Arrival Time Selector */}
          {/* <TouchableOpacity 
            style={styles.dateTimeItem}
            onPress={() => setShowArrivalTimePicker(true)}
          >
            <View style={styles.dateTimeIconContainer}>
              <MaterialCommunityIcons name="clock-check-outline" size={20} color="#0070E0" />
            </View>
            <View style={styles.dateTimeContent}>
              <Text style={styles.dateTimeLabel}>ARRIVAL TIME</Text>
              <Text style={styles.dateTimeValue}>{formatTime(arrivalTime)}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#888" />
          </TouchableOpacity> */}
        </View>

        {/* Create Trip Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.createTripButton}
            onPress={handleCreateTrip}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.createTripButtonText}>Create Trip</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Date and Time Pickers (Modals) */}
        {showDatePicker && (
          <DateTimePicker
            value={departureDate}
            mode="date"
            display="default"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}
        
        {showDepartTimePicker && (
          <DateTimePicker
            value={departureTime}
            mode="time"
            display="default"
            onChange={onDepartureTimeChange}
          />
        )}
        
        {showArrivalTimePicker && (
          <DateTimePicker
            value={arrivalTime}
            mode="time"
            display="default"
            onChange={onArrivalTimeChange}
          />
        )}

        {/* Location Bottom Drawer */}
        <LocationBottomDrawer
          visible={showSearchDrawer}
          onClose={() => setShowSearchDrawer(false)}
          onLocationSelect={handleLocationSelect}
          inputType={activeInput}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  headerContainer: {
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ddd",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Bold",
    fontWeight: "600",
    color: "#000",
  },
  routeLineContainer: {
    marginVertical: 16,
    marginHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    position: "relative",
  },
  routePointWrapper: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    left: 8,
    top: 0,
    bottom: 0,
    zIndex: 10,
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
    backgroundColor: "#0070E0",
  },
  destinationPoint: {
    width: 12,
    height: 12,
    backgroundColor: "#000",
    borderRadius: 3,
    transform: [{ rotate: "45deg" }],
  },
  verticalLine: {
    position: "absolute",
    left: 23,
    top: 70,
    bottom: 30,
    width: 1.5,
    backgroundColor: "#ddd",
  },
  pickupContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingLeft: 46,
    paddingRight: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  destinationContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingLeft: 46,
    paddingRight: 16,
    paddingVertical: 14,
  },
  activeInputContainer: {
    backgroundColor: "#f0f9ff",
  },
  pickupInputContainer: {
    flex: 1,
    justifyContent: "center",
  },
  pickupLabel: {
    fontSize: 10,
    fontFamily: "Regular",
    fontWeight: "600",
    color: "#888",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  placeholderText: {
    color: "#aaa",
  },
  pickupInput: {
    fontSize: 16,
    fontFamily: "Regular",
    fontWeight: "500",
    color: "#000",
    padding: 0,
  },
  destinationInputContainer: {
    flex: 1,
    justifyContent: "center",
  },
  destinationLabel: {
    fontSize: 10,
    fontFamily: "Regular",
    fontWeight: "600",
    color: "#888",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  destinationInput: {
    fontSize: 16,
    fontFamily: "Regular",
    fontWeight: "500",
    color: "#000",
    padding: 0,
  },
  closeButton: {
    padding: 8,
    marginLeft: 8,
  },
  
  // Date and Time Section Styles
  dateTimeSection: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  dateTimeItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  dateTimeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,112,224,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  dateTimeContent: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: 10,
    fontFamily: "Regular",
    fontWeight: "600",
    color: "#888",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  dateTimeValue: {
    fontSize: 16,
    fontFamily: "Regular",
    fontWeight: "500",
    color: "#000",
  },
  
  // Button Styles
  buttonContainer: {
    margin: 20,
    marginTop: 30,
  },
  createTripButton: {
    backgroundColor: "#000",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  createTripButtonText: {
    fontSize: 16,
    fontFamily: "Regular",
    fontWeight: "600",
    color: "#FFF",
  },
});