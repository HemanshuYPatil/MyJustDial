import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Platform,
  Image,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  collection, 
  addDoc, 
  serverTimestamp, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  getDoc,
  arrayRemove
} from "firebase/firestore";
import { auth, db } from "../lib/db/firebase";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
// import LottieView from "lottie-react-native";
import { getRequestsByUserId, getusername, getUserProfileImage } from "../lib/query/user";

const SwipeableNotification = ({ item, onAccept, onReject }) => {
  const translateX = new Animated.Value(0);
  const swipeThreshold = -100;
  
  const renderActionButtons = () => {
    if (item.status === "pending") {
      return (
        <Animated.View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onReject(item.id);
            }}
          >
            <Ionicons name="close-circle" size={22} color="#e76f51" />
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onAccept(item);
            }}
          >
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    } else {
      return (
        <View style={styles.statusContainer}>
          <LinearGradient
            colors={
              item.status === "accepted" 
                ? ["#2a9d8f", "#264653"] 
                : ["#e76f51", "#f4a261"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.statusGradient}
          >
            <Ionicons 
              name={item.status === "accepted" ? "checkmark-circle" : "close-circle"} 
              size={20} 
              color="#fff" 
            />
            <Text style={styles.statusText}>
              {item.status === "accepted" ? "Request Accepted" : "Request Rejected"}
            </Text>
          </LinearGradient>
          {item.status === "accepted" && (
            <TouchableOpacity style={styles.chatButton}>
              <Ionicons name="chatbubble-ellipses" size={18} color="#2a9d8f" />
              <Text style={styles.chatButtonText}>Open Chat</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
  };

  return (
    <Animated.View 
      style={[
        styles.notificationCard,
        {
          transform: [{ translateX }],
          shadowOpacity: item.status === "pending" ? 0.15 : 0.08,
        }
      ]}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.senderContainer}>
          {item.profileImage ? (
            <Image source={{ uri: item.profileImage }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarContainer, {backgroundColor: getAvatarColor(item.sender)}]}>
              <Text style={styles.avatarText}>
                {item.sender.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View>
            <Text style={styles.senderName}>{item.sender}</Text>
            <View style={styles.timeContainer}>
              <Ionicons name="time-outline" size={12} color="#777" />
              <Text style={styles.timeText}>{formatTime(item.time)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.priceTagContainer}>
          <View style={styles.priceTag}>
            <FontAwesome5 name="rupee-sign" size={12} color="#000" style={styles.currencyIcon} />
            <Text style={styles.priceText}>{item.price.replace("₹", "")}</Text>
          </View>
          <View style={[styles.statusBadge, getStatusBadgeStyle(item.status)]}>
            <Text style={styles.statusBadgeText}>{item.status}</Text>
          </View>
        </View>
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.routeHeader}>
          <Ionicons name="map-outline" size={14} color="#666" />
          <Text style={styles.routeText}>Pickup and Destination</Text>
        </View>
        <View style={styles.locationWrapper}>
          <View style={styles.iconColumn}>
            <MaterialIcons name="radio-button-on" size={18} color="#2a9d8f" />
            <View style={styles.dottedLine} />
            <MaterialIcons name="location-on" size={18} color="#e76f51" />
          </View>
          <View style={styles.textColumn}>
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationLabel}>PICKUP</Text>
              <Text style={styles.locationText}>{item.location}</Text>
            </View>
            <View style={styles.locationDivider} />
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationLabel}>DESTINATION</Text>
              <Text style={styles.locationText}>{item.destination}</Text>
            </View>
          </View>
        </View>
      </View>

      {renderActionButtons()}
    </Animated.View>
  );
};

// Helper functions
const getAvatarColor = (name) => {
  const colors = ["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"];
  const charCode = name.charCodeAt(0) || 0;
  return colors[charCode % colors.length];
};

const formatTime = (timestamp) => {
  if (!timestamp) return "";
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
};

const getStatusBadgeStyle = (status) => {
  switch (status) {
    case "pending":
      return { backgroundColor: "#ffb70330", borderColor: "#ffb703" };
    case "accepted":
      return { backgroundColor: "#2a9d8f30", borderColor: "#2a9d8f" };
    case "rejected":
      return { backgroundColor: "#e76f5130", borderColor: "#e76f51" };
    default:
      return { backgroundColor: "#f5f5f5", borderColor: "#ccc" };
  }
};

export default function NotificationScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [emptyAnimation] = useState(new Animated.Value(0));

  const [fontsLoaded] = useFonts({
    Regular: require("../assets/fonts/regular.ttf"),
    Medium: require("../assets/fonts/medium.ttf"),
    Bold: require("../assets/fonts/bold.ttf"),
  });

  const user = auth.currentUser;

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      
      // Real-time listener for trip requests
      const tripsRef = collection(db, "trips");
      const q = query(
        tripsRef,
        where("userId", "==", user?.uid),
        orderBy("createdAt", "desc")
      );
      
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const notificationData = [];
        
        for (const tripDoc of snapshot.docs) {
          const tripData = tripDoc.data();
          
          if (tripData.requests && tripData.requests.length > 0) {
            for (const request of tripData.requests) {
              try {
                const username = await getusername(request.userId);
                // Use a proper function to get the profile image
                let profileImage;
                try {
                  profileImage = await getUserProfileImage(request.userId);
                } catch (err) {
                  profileImage = 'https://img.freepik.com/premium-vector/men-icon-trendy-avatar-character-cheerful-happy-people-flat-vector-illustration-round-frame-male-portraits-group-team-adorable-guys-isolated-white-background_275421-286.jpg?ga=GA1.1.2127828126.1743705572&semt=ais_hybrid&w=740';
                }
                
                notificationData.push({
                  id: `${tripDoc.id}-${request.userId}-${request.timestamp}`,
                  tripId: tripDoc.id,
                  sender: username || "User",
                  profileImage: profileImage,
                  type: "parcel",
                  status: request.status,
                  time: request.timestamp,
                  location: request.pickupLocation || "Unknown Location",
                  destination: request.destinationLocation || "Unknown Destination",
                  price: tripData.price || "₹100",
                  userId: request.userId,
                  requestData: request, // Store the original request data for updates
                });
              } catch (err) {
                console.error("Error processing request:", err);
              }
            }
          }
        }
        
        notificationData.sort((a, b) => new Date(b.time) - new Date(a.time));
        setNotifications(notificationData);
        setLoading(false);
        setRefreshing(false);
        
        // Animate empty state if there are no notifications
        if (notificationData.length === 0) {
          Animated.timing(emptyAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }).start();
        }
      });
      
      // Return unsubscribe function directly
      return () => unsubscribe();
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setLoading(false);
      setRefreshing(false);
      // Return empty function in case of error
      return () => {};
    }
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      const unsubscribeFunc = fetchNotifications();
      return unsubscribeFunc;
    }, [fetchNotifications])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const handleAccept = async (notification) => {
    try {
      // Get the trip document first
      const tripDocRef = doc(db, "trips", notification.tripId);
      const tripDoc = await getDoc(tripDocRef);
      
      if (!tripDoc.exists()) {
        console.error("Trip document not found");
        return;
      }
      
      const tripData = tripDoc.data();
      const updatedRequests = tripData.requests.map(req => {
        // Find the specific request and update its status
        if (req.userId === notification.userId) {
          return {...req, status: "accepted"};
        }
        return req;
      });
      
      // Update the trip document with the updated requests array
      await updateDoc(tripDocRef, {
        requests: updatedRequests
      });
  
      // Create new chat
      const chatDocRef = await addDoc(collection(db, "chats"), {
        participants: [user.uid, notification.userId],
        tripId: notification.tripId,
        createdAt: serverTimestamp(),
        lastMessage: {
          text: "Trip request accepted!",
          sentBy: user.uid,
          timestamp: serverTimestamp(),
        },
        unreadCount: {
          [notification.userId]: 1,
          [user.uid]: 0,
        }
      });
  
      console.log("Chat created:", chatDocRef.id);
      
      // Update local state
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id
            ? { ...item, status: "accepted" }
            : item
        )
      );
      
      // Optional: Navigate to chat
      // navigation.navigate("Chat", { chatId: chatDocRef.id });
    } catch (error) {
      console.error("Error accepting request:", error);
    }
  };

  const handleReject = async (id) => {
    try {
      const notification = notifications.find(item => item.id === id);
      if (!notification) return;
      
      // Get the trip document first
      const tripDocRef = doc(db, "trips", notification.tripId);
      const tripDoc = await getDoc(tripDocRef);
      
      if (!tripDoc.exists()) {
        console.error("Trip document not found");
        return;
      }
      
      const tripData = tripDoc.data();
      const updatedRequests = tripData.requests.map(req => {
        // Find the specific request and update its status
        if (req.userId === notification.userId) {
          return {...req, status: "rejected"};
        }
        return req;
      });
      
      // Update the trip document with the updated requests array
      await updateDoc(tripDocRef, {
        requests: updatedRequests
      });
      
      // Update local state
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: "rejected" }
            : item
        )
      );
    } catch (error) {
      console.error("Error rejecting request:", error);
    }
  };

  const renderEmptyState = () => (
    <Animated.View 
      style={[
        styles.emptyState,
        {
          opacity: emptyAnimation,
          transform: [
            { 
              translateY: emptyAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              })
            }
          ]
        }
      ]}
    >
      {/* <LottieView
        source={require('../assets/animations/empty-notifications.json')}
        autoPlay
        loop
        style={styles.emptyAnimation}
      /> */}
      <Text style={styles.emptyStateTitle}>No Notifications</Text>
      <Text style={styles.emptyStateText}>
        You don't have any notifications yet. When you receive trip requests, they will appear here.
      </Text>
    </Animated.View>
  );

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Notifications</Text>
        <TouchableOpacity style={styles.optionsButton}>
          <Ionicons name="ellipsis-vertical" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SwipeableNotification
              item={item}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          )}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={<View style={styles.bottomSpacing} />}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#000"
              colors={["#000", "#2a9d8f"]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff" 
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 40 : 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 4,
  },
  headerText: { 
    fontSize: 18, 
    fontFamily: "Bold", 
    color: "#000" 
  },
  optionsButton: {
    padding: 4,
  },
  listContainer: {
    paddingTop: 12,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: "Medium",
    color: "#666",
  },
  notificationCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: "#f5f5f5",
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  senderContainer: { 
    flexDirection: "row", 
    alignItems: "center" 
  },
  avatarContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
  },
  avatarText: { 
    color: "#fff", 
    fontSize: 18, 
    fontFamily: "Bold" 
  },
  senderName: { 
    fontSize: 16, 
    fontFamily: "Bold", 
    color: "#000",
    marginBottom: 2,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    fontSize: 12,
    fontFamily: "Regular",
    color: "#777",
    marginLeft: 4,
  },
  priceTagContainer: {
    alignItems: "flex-end",
  },
  priceTag: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  currencyIcon: {
    marginRight: 2,
  },
  priceText: { 
    fontSize: 15, 
    fontFamily: "Bold", 
    color: "#000" 
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: "Medium",
    textTransform: "capitalize",
  },
  detailsContainer: {
    backgroundColor: "#fafafa",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  routeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  routeText: {
    fontSize: 12,
    fontFamily: "Medium",
    color: "#666",
    marginLeft: 6,
    textTransform: "uppercase",
  },
  locationWrapper: { 
    flexDirection: "row", 
    alignItems: "flex-start" 
  },
  iconColumn: { 
    alignItems: "center", 
    width: 24, 
    marginRight: 12,
    paddingTop: 4,
  },
  dottedLine: {
    width: 1,
    height: 30,
    backgroundColor: "#ccc",
    marginVertical: 6,
  },
  textColumn: { 
    flex: 1, 
    justifyContent: "space-between" 
  },
  locationTextContainer: {
    paddingVertical: 2,
  },
  locationLabel: {
    fontSize: 10,
    fontFamily: "Medium",
    color: "#666",
    marginBottom: 2,
  },
  locationText: {
    fontSize: 14,
    fontFamily: "Medium",
    color: "#333",
  },
  locationDivider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 10,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  acceptButton: { 
    backgroundColor: "#000", 
    marginLeft: 8 
  },
  rejectButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginRight: 8,
  },
  acceptButtonText: { 
    color: "#fff", 
    fontSize: 15, 
    fontFamily: "Bold",
    marginLeft: 6,
  },
  rejectButtonText: { 
    color: "#333", 
    fontSize: 15, 
    fontFamily: "Medium",
    marginLeft: 6,
  },
  statusContainer: {
    marginTop: 4,
  },
  statusGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
  },
  statusText: { 
    fontSize: 15, 
    fontFamily: "Bold", 
    color: "#fff",
    marginLeft: 8,
  },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    paddingVertical: 8,
  },
  chatButtonText: {
    fontSize: 14,
    fontFamily: "Medium",
    color: "#2a9d8f",
    marginLeft: 6,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 30,
  },
  emptyAnimation: {
    width: 180,
    height: 180,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: "Bold",
    color: "#333",
    marginBottom: 8,
    marginTop: 10,
  },
  emptyStateText: {
    fontSize: 15,
    fontFamily: "Regular",
    color: "#777",
    textAlign: "center",
    lineHeight: 22,
  },
  bottomSpacing: { 
    height: 80,
  },
});