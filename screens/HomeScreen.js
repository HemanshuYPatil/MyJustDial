import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  Ionicons,
  MaterialIcons,
  Feather,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { WarningModalManager } from "../components/model";
import * as Location from "expo-location";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db, geocollection, geofirestore } from "../lib/db/firebase";
import * as Notifications from "expo-notifications";
import * as MediaLibrary from "expo-media-library";
import { Camera } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  withTiming,
} from "react-native-reanimated";
import { NearbyRidersSection } from "../components/nearbyuser";

const { width, height } = Dimensions.get("window");
const HEADER_MAX_HEIGHT = 200;
const HEADER_MIN_HEIGHT = Platform.OS === "ios" ? 120 : 115;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

// Helper function to map weather codes to icons - moved outside component
const getWeatherIcon = (weatherId) => {
  if (weatherId >= 200 && weatherId < 300) return "weather-lightning-rainy";
  if (weatherId >= 300 && weatherId < 600) return "weather-pouring";
  if (weatherId >= 600 && weatherId < 700) return "weather-snowy";
  if (weatherId >= 700 && weatherId < 800) return "weather-fog";
  if (weatherId === 800) return "weather-sunny";
  if (weatherId > 800) return "weather-cloudy";
  return "weather-sunny";
};

export default function HomeScreen({ navigation }) {
  // All useState hooks are grouped at the top
  const [permissionsGranted, setPermissionsGranted] = useState({
    camera: false,
    mediaLibrary: false,
    notifications: false,
  });
  const [weatherData, setWeatherData] = useState({
    temp: "Loading...",
    condition: "Loading...",
    icon: "weather-sunny",
  });
  const [currentLocation, setCurrentLocation] = useState("Loading location...");

  // useSharedValue hook for animation
  const scrollY = useSharedValue(0);

  // useFonts hook must be called in every render path consistently
  const [fontsLoaded] = useFonts({
    Regular: require("../assets/fonts/regular.ttf"),
    Medium: require("../assets/fonts/medium.ttf"),
    Bold: require("../assets/fonts/bold.ttf"),
    SemiBold: require("../assets/fonts/bold.ttf"),
  });

  // Derived values and non-hook constants/calculations
  const user = auth.currentUser;
  const isNight = new Date().getHours() > 18 || new Date().getHours() < 6;
  const weatherGradient = isNight
    ? ["#1A237E", "#283593"]
    : ["#1E88E5", "#42A5F5"];

  // All useAnimatedStyle hooks
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: interpolate(
        scrollY.value,
        [0, HEADER_SCROLL_DISTANCE],
        [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
        Extrapolate.CLAMP
      ),
    };
  });

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
  const formatDate = (dateString) => {
    if (!dateString) return "Recent";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get random color for avatar
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

  const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
  };

  const headerContentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        scrollY.value,
        [0, HEADER_SCROLL_DISTANCE * 0.6],
        [1, 0],
        Extrapolate.CLAMP
      ),
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [0, HEADER_SCROLL_DISTANCE],
            [0, -20],
            Extrapolate.CLAMP
          ),
        },
      ],
    };
  });

  const compactHeaderStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        scrollY.value,
        [HEADER_SCROLL_DISTANCE * 0.5, HEADER_SCROLL_DISTANCE],
        [0, 1],
        Extrapolate.CLAMP
      ),
    };
  });

  // Scroll handler
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Helper functions defined before useEffect
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const fetchWeatherData = async (latitude, longitude) => {
    try {
      const API_KEY = "44f5213b563c9cf6f20453043502aa68";

      if (!API_KEY || API_KEY === "YOUR_OPENWEATHER_API_KEY") {
        console.warn("Weather API key is missing. Using fallback data.");
        setWeatherData({
          temp: "24°C",
          condition: "Clear",
          icon: "weather-sunny",
        });
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Weather API request failed with status: ${response.status}`
        );
      }

      const data = await response.json();

      if (data.main && data.weather && data.weather.length > 0) {
        setWeatherData({
          temp: `${Math.round(data.main.temp)}°C`,
          condition: data.weather[0].main,
          icon: getWeatherIcon(data.weather[0].id),
        });
      } else {
        throw new Error("Invalid weather data structure");
      }
    } catch (error) {
      console.error("Error fetching weather:", error);
      setWeatherData({
        temp: "24°C",
        condition: "Weather unavailable",
        icon: "weather-sunny",
      });
    }
  };

  const registerPushToken = async () => {
    if (!auth.currentUser) return;

    // Create Android notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#000000",
      });
    }

    // Request notification permissions
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return;

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const currentToken = tokenData.data;

    // Update token in database if changed
    const userDocRef = doc(db, "users", auth.currentUser.uid);
    const userSnapshot = await getDoc(userDocRef);

    if (userSnapshot.exists()) {
      const userData = userSnapshot.data();
      const savedToken = userData?.notificationId;

      if (savedToken !== currentToken) {
        await updateDoc(userDocRef, {
          notificationId: currentToken,
        });
      }
    }
  };

  const updateUserLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setCurrentLocation("Location permission denied");
        return;
      }

      // Get current location
      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Get address from coordinates
      const addressResponse = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      if (addressResponse.length > 0) {
        const address = addressResponse[0];
        const locationName = `${address.name || address.street || ""} ${
          address.city || ""
        }`.trim();
        setCurrentLocation(locationName || "Current Location");
      } else {
        setCurrentLocation("Current Location");
      }

      // Update weather with new location
      await fetchWeatherData(latitude, longitude);

      // Update location in Firebase if user is logged in
      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          location: {
            latitude,
            longitude,
            updatedAt: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      console.error("Error updating location:", error);
      setCurrentLocation("Unable to get location");
      setWeatherData({
        temp: "--°C",
        condition: "Weather unavailable",
        icon: "weather-sunny",
      });
    }
  };

  // useEffect hooks should come after all other hooks
  useEffect(() => {
    const checkAndRequestPermissions = async () => {
      try {
        // Camera permissions
        let cameraStatus = await Camera.getCameraPermissionsAsync();
        if (cameraStatus.status !== "granted") {
          cameraStatus = await Camera.requestCameraPermissionsAsync();
        }

        // Media library permissions
        let mediaStatus = await MediaLibrary.getPermissionsAsync();
        if (mediaStatus.status !== "granted") {
          mediaStatus = await MediaLibrary.requestPermissionsAsync();
        }

        // Notification permissions
        let notificationStatus = await Notifications.getPermissionsAsync();
        if (notificationStatus.status !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          notificationStatus.status = status;
        }

        setPermissionsGranted({
          camera: cameraStatus.status === "granted",
          mediaLibrary: mediaStatus.status === "granted",
          notifications: notificationStatus.status === "granted",
        });
      } catch (error) {
        console.error("Error checking/requesting permissions:", error);
      }
    };

    checkAndRequestPermissions();
    registerPushToken();
    updateUserLocation();
  }, []);

  // Early return moved after all hooks are defined
  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <WarningModalManager />
      <StatusBar style="light" />

      {/* Animated Header */}
      <Animated.View style={[styles.header, headerAnimatedStyle]}>
        <LinearGradient
          colors={["#000000", "#333333"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.headerGradient}
        >
          
          {/* Weather & Location Info - shown when not scrolled */}
          <Animated.View
            style={[styles.headerContent, headerContentAnimatedStyle]}
          >
            <View style={styles.locationInfo}>
              <View style={styles.weatherWidget}>
                <View style={styles.weatherIconContainer}>
                  <MaterialCommunityIcons
                    name="weather-sunny"
                    size={24}
                    color="#FFF"
                  />
                  <Text style={styles.weatherTemp}>{weatherData.temp}</Text>
                </View>
                <Text style={styles.locationText}>
                  <Feather name="map-pin" size={12} color="#FFF" />{" "}
                  {currentLocation}
                </Text>
              </View>

              <View>
                <Text style={styles.greetingText}>{getGreeting()}</Text>
                <Text style={styles.usernameText}>
                  {user?.displayName?.split(" ")[0]}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Compact Header (appears when scrolling) */}
          <Animated.View style={[styles.compactHeader, compactHeaderStyle]}>
            <Text style={styles.compactTitle}>
              Hello, {user?.displayName?.split(" ")[0]}
            </Text>
            <View style={styles.compactActions}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => navigation.navigate("Notifications")}
              >
                <Ionicons name="notifications-outline" size={24} color="#000" />
                {/* <View
                  style={[
                    styles.notificationBadge,
                    { backgroundColor: "#E53935" },
                  ]}
                /> */}
              </TouchableOpacity>

              
            </View>
          </Animated.View>
        </LinearGradient>
      </Animated.View>

      <AnimatedScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: HEADER_MIN_HEIGHT + 20,
            paddingBottom: 20,
          },
        ]}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => navigation.navigate("Search")}
          >
            <Feather name="search" size={20} color="#666" />
            <Text style={styles.searchText}>Where to?</Text>
          </TouchableOpacity>
        </View>

        {/* New Feature Banner */}
        <View style={styles.newFeatureBanner}>
          <View style={styles.featureBadge}>
            <Text style={styles.featureBadgeText}>NEW</Text>
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Split Fare Payment</Text>
            <Text style={styles.featureDescription}>
              Now you can easily split ride costs with friends
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("Search")}
            >
              <View style={styles.actionIconContainer}>
                <View style={[styles.actionIcon, styles.rideIcon]}>
                  <MaterialIcons name="location-on" size={22} color="#fff" />
                </View>
                <Text style={styles.actionText}>Book a ride</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("Create")}
            >
              <View style={styles.actionIconContainer}>
                <View style={[styles.actionIcon, styles.createIcon]}>
                  <Feather name="plus" size={22} color="#fff" />
                </View>
                <Text style={styles.actionText}>Create trip</Text>
              </View>
            </TouchableOpacity>

            {/* <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("History")}
            >
              <View style={styles.actionIconContainer}>
                <View style={[styles.actionIcon, styles.historyIcon]}>
                  <Feather name="clock" size={20} color="#fff" />
                </View>
                <Text style={styles.actionText}>History</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("Payments")}
            >
              <View style={styles.actionIconContainer}>
                <View style={[styles.actionIcon, styles.paymentIcon]}>
                  <FontAwesome5 name="wallet" size={18} color="#fff" />
                </View>
                <Text style={styles.actionText}>Payments</Text>
              </View>
            </TouchableOpacity> */}
          </View>
        </View>

        {/* Active Trip Card */}
        {/* <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <MaterialCommunityIcons
                name="car-hatchback"
                size={20}
                color="#000"
                style={styles.sectionIcon}
              />
              <Text style={styles.sectionTitle}>Current Trip</Text>
            </View>
            <TouchableOpacity style={styles.sectionActionButton}>
              <Text style={styles.sectionAction}>Details</Text>
              <Feather name="chevron-right" size={16} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={styles.tripCard}>
            <View style={styles.tripHeader}>
              <View style={styles.tripStatusContainer}>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>In Progress</Text>
                </View>
                <Text style={styles.tripId}>#RT-4829</Text>
              </View>
              <View style={styles.arrivalContainer}>
                <MaterialIcons
                  name="access-time"
                  size={16}
                  color="#2E7D32"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.arrivalTime}>Arrives in 15 min</Text>
              </View>
            </View>

            <View style={styles.tripRoute}>
              <View style={styles.routeTracker}>
                <View style={styles.startDot} />
                <View style={styles.routeLine} />
                <View style={styles.endDot} />
              </View>

              <View style={styles.routeDetails}>
                <View style={styles.locationPoint}>
                  <View style={styles.locationTextContainer}>
                    <Text style={styles.locationLabel}>Pickup</Text>
                    <Text style={styles.locationName}>Current Location</Text>
                    <Text style={styles.locationAddress}>15 Thompson Ave.</Text>
                  </View>
                  <Text style={styles.locationTime}>12:45 PM</Text>
                </View>

                <View style={styles.locationPoint}>
                  <View style={styles.locationTextContainer}>
                    <Text style={styles.locationLabel}>Destination</Text>
                    <Text style={styles.locationName}>Ikeja City Mall</Text>
                    <Text style={styles.locationAddress}>
                      Obafemi Awolowo Way
                    </Text>
                  </View>
                  <Text style={styles.locationTime}>1:05 PM</Text>
                </View>
              </View>
            </View>

            <View style={styles.driverInfo}>
              <View style={styles.driverProfile}>
                <View style={styles.driverAvatarContainer}>
                  <View style={styles.driverAvatar}>
                    <Text style={styles.driverInitial}>J</Text>
                  </View>
                  <View style={styles.driverOnlineStatus} />
                </View>
                <View style={styles.driverDetails}>
                  <Text style={styles.driverName}>John Doe</Text>
                  <View style={styles.driverRatingContainer}>
                    <Ionicons name="star" size={14} color="#FFB300" />
                    <Text style={styles.driverRating}>4.8</Text>
                    <Text style={styles.driverTrips}>• 120 trips</Text>
                  </View>
                </View>
              </View>

              <View style={styles.carInfo}>
                <MaterialIcons
                  name="directions-car"
                  size={16}
                  color="#555"
                  style={{ marginRight: 8 }}
                />
                <View>
                  <Text style={styles.carModel}>
                    Toyota Camry •{" "}
                    <Text style={styles.carPlate}>KJA 555 LG</Text>
                  </Text>
                  <Text style={styles.carColor}>Black • 2021</Text>
                </View>
              </View>
            </View>

            <View style={styles.tripActions}>
              <TouchableOpacity style={styles.tripAction}>
                <Feather name="message-circle" size={18} color="#000" />
                <Text style={styles.tripActionText}>Message</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.tripAction}>
                <Feather name="phone" size={18} color="#000" />
                <Text style={styles.tripActionText}>Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tripAction, styles.cancelAction]}
              >
                <Feather name="x" size={18} color="#E53935" />
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View> */}

        {/* Promo Banner */}
        {/* <View style={styles.bannerContainer}>
          <LinearGradient
            colors={["#000000", "#333333"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.banner}
          >
            <View style={styles.bannerContent}>
              <View>
                <Text style={styles.bannerHeading}>50% OFF</Text>
                <Text style={styles.bannerSubheading}>Your first ride</Text>
                <View style={styles.promoCodeContainer}>
                  <View style={styles.promoCode}>
                    <Text style={styles.promoText}>WELCOME</Text>
                  </View>
                  <TouchableOpacity style={styles.copyButton}>
                    <MaterialIcons name="content-copy" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.bannerImageContainer}>
                <MaterialIcons name="local-taxi" size={48} color="#fff" />
                <View style={styles.bannerTagline}>
                  <Text style={styles.bannerTaglineText}>
                    Limited time offer
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View> */}

        {/* Safety Feature Banner */}
        <View style={styles.safetyBannerContainer}>
          <LinearGradient
            colors={["#0D47A1", "#1976D2"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.safetyBanner}
          >
            <View style={styles.safetyContent}>
              <View style={styles.safetyIcon}>
                <MaterialIcons name="verified-user" size={28} color="#fff" />
              </View>

              <View style={styles.safetyTextContent}>
                <Text style={styles.safetyTitle}>Safety Features</Text>
                <Text style={styles.safetyDescription}>
                  We've added new safety features for your peace of mind
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

          {/* Recent Locations */}
          {/* <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <MaterialIcons
                  name="person"
                  size={20}
                  color="#000"
                  style={styles.sectionIcon}
                />
                <Text style={styles.sectionTitle}>Nearby Riders</Text>
              </View>
              <TouchableOpacity style={styles.sectionActionButton}>
                <Text style={styles.sectionAction}>See All</Text>
                <Feather name="chevron-right" size={16} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.recentsList}>
              <TouchableOpacity style={styles.recentItem}>
                <View style={styles.recentIcon}>
                  <Feather name="map-pin" size={18} color="#666" />
                </View>
                <View style={styles.recentDetails}>
                  <Text style={styles.recentName}>Infinity House</Text>
                  <Text style={styles.recentAddress}>
                    30 Ilupeju Byepass, Onipanu
                  </Text>
                </View>
                <TouchableOpacity style={styles.favoriteButton}>
                  <Feather name="arrow-right" size={20} color="#ccc" />
                </TouchableOpacity>
              </TouchableOpacity>

              <View style={styles.itemDivider} />

              <TouchableOpacity style={styles.recentItem}>
                <View style={styles.recentIcon}>
                  <Feather name="map-pin" size={18} color="#666" />
                </View>
                <View style={styles.recentDetails}>
                  <Text style={styles.recentName}>Keystone Bank</Text>
                  <Text style={styles.recentAddress}>
                    224 Ikorodu-Ososun Rd, Palmgrove
                  </Text>
                </View>
                <TouchableOpacity style={styles.favoriteButton}>
                  <Feather name="arrow-right" size={20} color="#ccc" />
                </TouchableOpacity>
              </TouchableOpacity>

              <View style={styles.itemDivider} />

              <TouchableOpacity style={styles.recentItem}>
                <View style={styles.recentIcon}>
                  <Feather name="map-pin" size={18} color="#666" />
                </View>
                <View style={styles.recentDetails}>
                  <Text style={styles.recentName}>Radisson Blu Hotel</Text>
                  <Text style={styles.recentAddress}>
                    38/40 Isaac John St, Ikeja GRA
                  </Text>
                </View>
                <TouchableOpacity style={styles.favoriteButton}>
                  <Feather name="arrow-right" size={20} color="#ccc" />
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          </View> */}

          <NearbyRidersSection
            navigation={navigation}
          />

          {/* Bottom Space for Navigation */}
          {/* <View style={styles.bottomSpace} /> */}
        </AnimatedScrollView>
      </SafeAreaView>
    );
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#f7f7f7",
    },
    scrollContent: {
      paddingBottom: 10,
    },

    // Animated Header
    header: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      overflow: "hidden",
    },
    headerGradient: {
      flex: 1,
      paddingTop: Platform.OS === "android" ? 40 : 20,
    },
    headerContent: {
      paddingHorizontal: 20,
      flex: 1,
      justifyContent: "flex-end",
      paddingBottom: 20,
    },
    locationInfo: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
    weatherWidget: {
      alignItems: "flex-start",
    },
    weatherIconContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 6,
    },
    weatherTemp: {
      fontSize: 16,
      fontFamily: "Bold",
      color: "#FFF",
      marginLeft: 6,
    },
    locationText: {
      fontSize: 12,
      fontFamily: "Regular",
      color: "#FFF",
      opacity: 0.8,
    },
    compactHeader: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: Platform.OS === "android" ? 40 : 20,
      height: Platform.OS === "ios" ? 30 : 110,
    },
    compactTitle: {
      fontSize: 18,
      fontFamily: "Bold",
      color: "#FFF",
    },
    compactActions: {
      flexDirection: "row",
      alignItems: "center",
    },

    // Search Bar
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      marginBottom: 24,
      // marginTop: 20,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#fff",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 12,
      flex: 1,
      marginRight: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    searchText: {
      fontSize: 16,
      fontFamily: "Regular",
      color: "#666",
      marginLeft: 12,
    },
    filterButton: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: "#000",
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },

    // App Bar
    appBarContainer: {
      paddingTop: Platform.OS === "android" ? 40 : 0,
      paddingBottom: 20,
      zIndex: 5,
    },
    appBar: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      paddingHorizontal: 20,
      height: 60,
    },
    greetingText: {
      fontSize: 14,
      fontFamily: "Regular",
      color: "#FFFFFF",
      opacity: 0.9,
    },
    usernameText: {
      fontSize: 20,
      fontFamily: "Bold",
      color: "#FFFFFF",
      marginTop: 4,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#f7f7f7",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
      position: "relative",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    notificationBadge: {
      position: "absolute",
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#E53935",
      top: 10,
      right: 10,
    },
    profileButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#000",
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    profileButtonText: {
      fontSize: 16,
      fontFamily: "Bold",
      color: "#fff",
    },

    // Search Bar
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      marginTop: 100,
      marginBottom: 24,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#fff",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 12,
      flex: 1,
      marginRight: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    searchText: {
      fontSize: 16,
      fontFamily: "Regular",
      color: "#666",
      marginLeft: 12,
    },
    filterButton: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: "#000",
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },

    // New Feature Banner
    newFeatureBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#f0f9ff",
      borderRadius: 16,
      padding: 16,
      marginHorizontal: 20,
      marginBottom: 24,
      shadowColor: "#1976D2",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
      borderWidth: 1,
      borderColor: "#e1f5fe",
    },
    featureBadge: {
      backgroundColor: "#0D47A1",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      marginRight: 12,
    },
    featureBadgeText: {
      fontSize: 10,
      fontFamily: "Bold",
      color: "#FFF",
    },
    featureContent: {
      flex: 1,
    },
    featureTitle: {
      fontSize: 16,
      fontFamily: "Bold",
      color: "#000",
      marginBottom: 2,
    },
    featureDescription: {
      fontSize: 12,
      fontFamily: "Regular",
      color: "#666",
    },
    featureButton: {
      backgroundColor: "#1976D2",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    featureButtonText: {
      fontSize: 12,
      fontFamily: "Medium",
      color: "#FFF",
    },

    // Quick Actions
    quickActionsContainer: {
      paddingHorizontal: 20,
      marginBottom: 32,
    },
    quickActionsTitle: {
      fontSize: 16,
      fontFamily: "",
      color: "#000",
      marginBottom: 16,
      fontFamily: "Medium",
    },
    quickActions: {
      flexDirection: "row",
      justifyContent: "start",
      gap: 20,
    },
    actionButton: {
      width: (width - 60) / 4,
    },
    actionIconContainer: {
      alignItems: "center",
    },
    actionIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    rideIcon: {
      backgroundColor: "#1E88E5",
    },
    createIcon: {
      backgroundColor: "#43A047",
    },
    historyIcon: {
      backgroundColor: "#FB8C00",
    },
    paymentIcon: {
      backgroundColor: "#7B1FA2",
    },
    actionText: {
      fontSize: 12,
      fontFamily: "Medium",
      color: "#333",
      textAlign: "center",
    },

    // Section Containers
    sectionContainer: {
      marginHorizontal: 20,
      marginBottom: 24,
      backgroundColor: "#fff",
      borderRadius: 16,
      padding: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    sectionTitleContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    sectionIcon: {
      marginRight: 8,
    },
    sectionTitle: {
      fontSize: 16,
      fontFamily: "Medium",
      color: "#000",
    },
    sectionActionButton: {
      flexDirection: "row",
      alignItems: "center",
    },
    sectionAction: {
      fontSize: 12,
      fontFamily: "Medium",
      color: "#000",
      marginRight: 4,
    },

    // Trip Card
    tripCard: {
      backgroundColor: "#fff",
      borderRadius: 12,
    },
    tripHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    tripStatusContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    statusBadge: {
      backgroundColor: "#E8F5E9",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      marginRight: 8,
    },
    statusText: {
      fontSize: 10,
      fontFamily: "Medium",
      color: "#2E7D32",
    },
    tripId: {
      fontSize: 12,
      fontFamily: "Regular",
      color: "#666",
    },
    arrivalContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    arrivalTime: {
      fontSize: 12,
      fontFamily: "Medium",
      color: "#2E7D32",
    },

    // Trip Route
    tripRoute: {
      flexDirection: "row",
      paddingVertical: 16,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: "#f0f0f0",
    },
    routeTracker: {
      width: 16,
      alignItems: "center",
      marginRight: 12,
    },
    startDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: "#1E88E5",
    },
    routeLine: {
      width: 2,
      height: 40,
      backgroundColor: "#E0E0E0",
      marginVertical: 4,
    },
    endDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: "#E53935",
    },
    routeDetails: {
      flex: 1,
    },
    locationPoint: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    locationPoint: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    locationTextContainer: {
      flex: 1,
    },
    locationLabel: {
      fontSize: 10,
      fontFamily: "Medium",

      color: "#999",
      marginBottom: 2,
    },
    locationName: {
      fontSize: 14,
      fontFamily: "Medium",

      color: "#000",
      marginBottom: 2,
    },
    locationAddress: {
      fontSize: 12,
      fontFamily: "Regular",
      color: "#666",
    },
    locationTime: {
      fontSize: 12,
      fontFamily: "Medium",
      color: "#333",
      marginLeft: 8,
    },

    // Driver Info
    driverInfo: {
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderColor: "#f0f0f0",
    },
    driverProfile: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    driverAvatarContainer: {
      position: "relative",
      marginRight: 12,
    },
    driverAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#E1F5FE",
      justifyContent: "center",
      alignItems: "center",
    },
    driverInitial: {
      fontSize: 16,
      fontFamily: "Bold",
      color: "#0288D1",
    },
    driverOnlineStatus: {
      position: "absolute",
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: "#43A047",
      borderWidth: 1,
      borderColor: "#fff",
      bottom: 0,
      right: 0,
    },
    driverDetails: {
      flex: 1,
    },
    driverName: {
      fontSize: 14,
      fontFamily: "",
      color: "#000",
      marginBottom: 2,
    },
    driverRatingContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    driverRating: {
      fontSize: 12,
      fontFamily: "Medium",
      color: "#333",
      marginLeft: 4,
      marginRight: 4,
    },
    driverTrips: {
      fontSize: 12,
      fontFamily: "Regular",
      color: "#666",
    },
    carInfo: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 4,
    },
    carModel: {
      fontSize: 12,
      fontFamily: "Medium",
      color: "#333",
    },
    carPlate: {
      fontFamily: "",
    },
    carColor: {
      fontSize: 12,
      fontFamily: "Regular",
      color: "#666",
      marginTop: 2,
    },

    // Trip Actions
    tripActions: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingTop: 16,
    },
    tripAction: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: "#f5f5f5",
      flex: 1,
      marginHorizontal: 4,
    },
    tripActionText: {
      fontSize: 12,
      fontFamily: "Medium",
      color: "#000",
      marginLeft: 6,
    },
    cancelAction: {
      backgroundColor: "#FFEBEE",
    },
    cancelText: {
      fontSize: 12,
      fontFamily: "Medium",
      color: "#E53935",
      marginLeft: 6,
    },

    // Promo Banner
    bannerContainer: {
      paddingHorizontal: 20,
      marginBottom: 24,
    },
    banner: {
      borderRadius: 16,
      overflow: "hidden",
    },
    bannerContent: {
      flexDirection: "row",
      justifyContent: "space-between",
      padding: 20,
    },
    bannerHeading: {
      fontSize: 24,
      fontFamily: "Bold",
      color: "#FFF",
      marginBottom: 4,
    },
    bannerSubheading: {
      fontSize: 14,
      fontFamily: "Regular",
      color: "#FFF",
      opacity: 0.9,
      marginBottom: 12,
    },
    promoCodeContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    promoCode: {
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    promoText: {
      fontSize: 12,
      fontFamily: "Bold",
      color: "#FFF",
    },
    copyButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      justifyContent: "center",
      alignItems: "center",
      marginLeft: 8,
    },
    bannerImageContainer: {
      position: "relative",
      justifyContent: "center",
    },
    bannerTagline: {
      backgroundColor: "#E53935",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      position: "absolute",
      bottom: -6,
      right: -6,
    },
    bannerTaglineText: {
      fontSize: 10,
      fontFamily: "Medium",
      color: "#FFF",
    },

    // Safety Banner
    safetyBannerContainer: {
      paddingHorizontal: 20,
      marginBottom: 24,
    },
    safetyBanner: {
      borderRadius: 16,
      overflow: "hidden",
    },
    safetyContent: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
    },
    safetyIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
    },
    safetyTextContent: {
      flex: 1,
    },
    safetyTitle: {
      fontSize: 16,
      fontFamily: "Bold",
      color: "#FFF",
      marginBottom: 4,
    },
    safetyDescription: {
      fontSize: 12,
      fontFamily: "Regular",
      color: "#FFF",
      opacity: 0.9,
    },
    safetyButton: {
      backgroundColor: "#FFF",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      marginLeft: 12,
    },
    safetyButtonText: {
      fontSize: 12,
      fontFamily: "Medium",
      color: "#0D47A1",
    },

    // Recent Places
    recentsList: {
      backgroundColor: "#fff",
      borderRadius: 12,
    },
    recentItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
    },
    recentIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "#f5f5f5",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    recentDetails: {
      flex: 1,
    },
    recentName: {
      fontSize: 14,
      fontFamily: "Medium",
      color: "#000",
      marginBottom: 2,
    },
    recentAddress: {
      fontSize: 12,
      fontFamily: "Regular",
      color: "#666",
    },
    favoriteButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
    },
    itemDivider: {
      height: 1,
      backgroundColor: "#f0f0f0",
      marginVertical: 2,
    },

    // Bottom Space
    bottomSpace: {
      height: 80,
    },
  });
