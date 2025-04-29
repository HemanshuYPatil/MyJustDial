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
  Platform,
  Dimensions,
  ActivityIndicator,
  Animated,
} from "react-native";
import {
  Ionicons,
  MaterialIcons,
  FontAwesome5,
  Feather,
} from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { getUserProfile } from "../../lib/query/user";
import { sendMatchRequest } from "../../lib/query/trip";
import { auth } from "../../lib/db/firebase";
import { sendnotificationother, sendPushNotification } from "../../lib/external/notification";

const { width } = Dimensions.get("window");

export default function UserDetailsScreen({ route, navigation }) {
  const { userId, pickupLocation, destinationLocation, tripId } = route.params;
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requestSent, setRequestSent] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const user = auth.currentUser;
  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  
  const [fontsLoaded] = useFonts({
    Regular: require("../../assets/fonts/regular.ttf"),
    Medium: require("../../assets/fonts/medium.ttf"),
    Bold: require("../../assets/fonts/bold.ttf"),
  });

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setIsLoading(true);
        // Fetch user details from the database
        const userProfileData = await getUserProfile(userId);
        setUserProfile(userProfileData);
        
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
          })
        ]).start();
      } catch (error) {
        console.error("Error fetching user details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserDetails();
  }, [userId]);

  const handleSendRequest = async () => {
    try {
      setButtonLoading(true);
  
      // Call API to send match request with tripId
      await sendMatchRequest(tripId,user?.uid, {
        pickupLocation,
        destinationLocation,
        tripId,
      });
      
      await sendPushNotification("Request Sent", "You Have Successfully sent a request to "+ userProfile.name );
      await sendnotificationother(userProfile.notificationId, "New Match Request", "You have a new match request from " + user?.displayName);
  
      setRequestSent(true);
    } catch (error) {
      console.error("Error sending match request:", error);
    } finally {
      setButtonLoading(false);
    }
  };
  

  if (!fontsLoaded) {
    return null;
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        {/* <Text style={styles.loadingText}>Loading user details...</Text> */}
      </SafeAreaView>
    );
  }

  // Placeholder user data if API fails
  const userData = userProfile || {
    name: "John Doe",
    photoURL: null,
    rating: 4.8,
    trips: 132,
    bio: "Software engineer, daily commuter to downtown. Often travels with light luggage.",
    preferredMusic: "Jazz, Classical",
    joinedDate: "March 2023",
    languages: ["English", "Spanish"],
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
          <Ionicons name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Details</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            styles.profileContainer,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }] 
            }
          ]}
        >
          {/* User Avatar */}
          <View style={styles.avatarContainer}>
            {userData.photoURL ? (
              <Image 
                source={{ uri: userData.photoURL }} 
                style={styles.avatar} 
              />
            ) : (
              <Image 
              source={{ uri:'https://img.freepik.com/premium-vector/men-icon-trendy-avatar-character-cheerful-happy-people-flat-vector-illustration-round-frame-male-portraits-group-team-adorable-guys-isolated-white-background_275421-286.jpg?ga=GA1.1.2127828126.1743705572&semt=ais_hybrid&w=740' }} 
              style={styles.avatar} 
            />
            )}
          </View>
          
          {/* User name and badge */}
          <View style={styles.userInfoContainer}>
            <Text style={styles.userName}>{userData.name}</Text>
            <View style={styles.badgeContainer}>
              <FontAwesome5 name="shield-alt" size={12} color="#fff" />
              <Text style={styles.badgeText}>Verified User</Text>
            </View>
          </View>
        </Animated.View>
        
        {/* Trip Info Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionTitle}>Trip Details</Text>
            <View style={styles.tripIdContainer}>
              <Text style={styles.tripIdText}>Trip #{tripId?.substring(0, 8) || "N/A"}</Text>
            </View>
          </View>
          
          <View style={styles.routeContainer}>
            {/* Origin Point */}
            <View style={styles.routePointWrapper}>
              <View style={styles.routePointOutline}>
                <View style={styles.originPoint} />
              </View>
            </View>
            
            {/* Vertical Line */}
            <View style={styles.verticalLine} />
            
            {/* Destination Point */}
            <View style={[styles.routePointWrapper, { top: 80 }]}>
              <View style={styles.destinationPoint} />
            </View>
            
            {/* Route Text */}
            <View style={styles.routeTextContainer}>
              <View style={styles.locationContainer}>
                <Text style={styles.locationLabel}>PICK-UP</Text>
                <Text style={styles.locationText} numberOfLines={1}>
                  {pickupLocation || "Current Location"}
                </Text>
              </View>
              
              <View style={[styles.locationContainer, { marginTop: 15 }]}>
                <Text style={styles.locationLabel}>DESTINATION</Text>
                <Text style={styles.locationText} numberOfLines={1}>
                  {destinationLocation || ""}
                </Text>
              </View>
            </View>
          </View>
        </View>
        
      
        <View style={{ height: 100 }} />
      </ScrollView>
      
      {/* Fixed Send Request Button */}
      <View style={styles.buttonContainer}>
        {requestSent ? (
          <TouchableOpacity 
            style={styles.requestSentButton}
            disabled={true}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Request Sent</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.sendRequestButton}
            onPress={handleSendRequest}
            disabled={buttonLoading}
          >
            {buttonLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <FontAwesome5 name="handshake" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Send Match Request</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: "Regular",
    color: "#666",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
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
    paddingVertical: 24,
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
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#0070E0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#f0f0f0",
  },
  avatarInitial: {
    fontSize: 42,
    fontFamily: "Bold",
    color: "#fff",
  },
  userInfoContainer: {
    alignItems: "center",
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
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Medium",
    color: "#fff",
    marginLeft: 4,
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
  tripIdContainer: {
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  tripIdText: {
    fontSize: 12,
    fontFamily: "Medium",
    color: "#666",
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
  bioText: {
    fontSize: 16,
    fontFamily: "Regular",
    color: "#444",
    lineHeight: 24,
  },
  statsContainer: {
    flexDirection: "row",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Bold",
    color: "#000",
  },
  statLabel: {
    fontSize: 14,
    fontFamily: "Regular",
    color: "#666",
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: "60%",
    backgroundColor: "#f0f0f0",
    alignSelf: "center",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  preferenceItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  preferenceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(0,112,224,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  preferenceTextContainer: {
    flex: 1,
  },
  preferenceLabel: {
    fontSize: 14,
    fontFamily: "Regular",
    color: "#666",
    marginBottom: 2,
  },
  preferenceValue: {
    fontSize: 16,
    fontFamily: "Medium",
    color: "#000",
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
  },
  sendRequestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
    borderRadius: 12,
    paddingVertical: 16,
    elevation: 2,
    shadowColor: "#0070E0",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  requestSentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
    borderRadius: 12,
    paddingVertical: 16,
    elevation: 2,
    shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: "Bold",
    color: "#fff",
  },
});