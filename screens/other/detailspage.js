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
  Dimensions,
  ActivityIndicator,
  Animated,
  Platform,
  Alert,
  Modal,
  TextInput,
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
import { auth, db } from "../../lib/db/firebase";
import {
  sendnotificationother,
  sendPushNotification,
} from "../../lib/external/notification";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
  query,
  where,
  getDocs,
  arrayUnion,
  increment,
  arrayRemove,
} from "firebase/firestore";
import MapView, { Marker, Polyline } from "react-native-maps";
import { Share } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

// Star Rating Component
const StarRating = ({ rating, onRatingPress, size = 20, disabled = false }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <TouchableOpacity
        key={i}
        onPress={() => !disabled && onRatingPress(i)}
        disabled={disabled}
        style={{ marginHorizontal: 2 }}
      >
        <Ionicons
          name={i <= rating ? "star" : "star-outline"}
          size={size}
          color={i <= rating ? "#FFD700" : "#E0E0E0"}
        />
      </TouchableOpacity>
    );
  }
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>{stars}</View>
  );
};

// Rating Modal Component
const RatingModal = ({ visible, onClose, onSubmit, userProfile }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Please select a rating");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(rating, comment);
      setRating(0);
      setComment("");
      onClose();
    } catch (error) {
      Alert.alert("Error", "Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Rate Your Experience</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.ratingSection}>
            <Text style={styles.ratingText}>
              How was your trip with{" "}
              {userProfile?.displayName || userProfile?.name}?
            </Text>
            <StarRating rating={rating} onRatingPress={setRating} size={40} />
          </View>

          <View style={styles.commentSection}>
            <Text style={styles.commentLabel}>Add a comment (optional)</Text>
            <TextInput
              style={styles.commentInput}
              multiline
              numberOfLines={4}
              placeholder="Share your experience..."
              value={comment}
              onChangeText={setComment}
              maxLength={200}
            />
            <Text style={styles.characterCount}>{comment.length}/200</Text>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelModalButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelModalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.submitModalButton]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitModalButtonText}>Submit Rating</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function UserDetailsScreen({ route, navigation }) {
  const { userId, pickupLocation, destinationLocation, tripId, tripData } =
    route.params;

  const insets = useSafeAreaInsets();
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchedTripData, setFetchedTripData] = useState(null);
  const [requestSent, setRequestSent] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [userRating, setUserRating] = useState(null);
  const [hasRated, setHasRated] = useState(false);
  const user = auth.currentUser;

  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const [statusUpdating, setStatusUpdating] = useState(false);

  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const [fontsLoaded] = useFonts({
    Regular: require("../../assets/fonts/regular.ttf"),
    Medium: require("../../assets/fonts/medium.ttf"),
    Bold: require("../../assets/fonts/bold.ttf"),
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        const userProfileData = await getUserProfile(userId);
        setUserProfile(userProfileData);

        if (tripId && !tripData) {
          const tripRef = doc(db, "trips", tripId);
          const tripSnap = await getDoc(tripRef);
          if (tripSnap.exists()) {
            const tripData = tripSnap.data();
            setFetchedTripData(tripData);

            // Check if current user has already rated this trip
            if (
              tripData.ratings &&
              tripData.ratings.some((r) => r.userId === user.uid)
            ) {
              setHasRated(true);
              const currentUserRating = tripData.ratings.find(
                (r) => r.userId === user.uid
              );
              setUserRating(currentUserRating);
            }
          } else {
            console.warn("Trip not found for tripId:", tripId);
          }
        }

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
          }),
        ]).start();
      } catch (error) {
        console.error("Error fetching details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      // cleanup tasks
    };
  }, [userId, tripId]);

  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (user && userId) {
        const currentUserRef = doc(db, "users", user.uid);
        const currentUserSnap = await getDoc(currentUserRef);

        if (currentUserSnap.exists()) {
          const userData = currentUserSnap.data();
          const favorites = userData.favorites || [];
          setIsFavorite(favorites.includes(tripId));
        }
      }
    };

    checkFavoriteStatus();
  }, [user, userId]);

  const toggleFavorite = async () => {
    try {
      setFavoriteLoading(true);
      const currentUserRef = doc(db, "users", user.uid);

      if (isFavorite) {
        await updateDoc(currentUserRef, {
          favorites: arrayRemove(tripId),
        });
        setIsFavorite(false);
        Alert.alert(
          "Removed from favorites",
          `Successfully Removed from favorites`
        );
      } else {
        await updateDoc(currentUserRef, {
          favorites: arrayUnion(tripId),
        });
        setIsFavorite(true);
        Alert.alert("Added to favorites", `Successfully added to favorites`);
      }
    } catch (error) {
      console.error("Error updating favorites:", error);
      Alert.alert("Error", "Failed to update favorites");
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleRatingSubmit = async (rating, comment) => {
    try {
      const tripRef = doc(db, "trips", tripId);
      const userRef = doc(db, "users", userId);

      const ratingData = {
        userId: user.uid,
        rating: rating,
        comment: comment,
        timestamp: serverTimestamp(),
        raterName: user.displayName || user.email,
      };

      // Add rating to trip
      await updateDoc(tripRef, {
        ratings: arrayUnion(ratingData),
      });

      // Update user's average rating
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      const currentRatings = userData.ratings || [];
      const newRatings = [...currentRatings, ratingData];
      const averageRating =
        newRatings.reduce((sum, r) => sum + r.rating, 0) / newRatings.length;

      await updateDoc(userRef, {
        ratings: arrayUnion(ratingData),
        averageRating: averageRating,
        totalRatings: increment(1),
      });

      // Update local state
      setHasRated(true);
      setUserRating(ratingData);

      // Update trip data
      const updatedTripData = { ...fetchedTripData };
      if (!updatedTripData.ratings) updatedTripData.ratings = [];
      updatedTripData.ratings.push(ratingData);
      setFetchedTripData(updatedTripData);

      // Send notification to trip owner
      await sendnotificationother(
        userProfile.notificationId,
        "New Rating",
        `You received a ${rating}-star rating for your trip`
      );

      Alert.alert("Success", "Rating submitted successfully!");
    } catch (error) {
      console.error("Error submitting rating:", error);
      throw error;
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      setStatusUpdating(true);
      const tripRef = doc(db, "trips", tripId);
      await updateDoc(tripRef, {
        status: newStatus,
      });
      const updatedTrip = await getDoc(tripRef);
      setFetchedTripData(updatedTrip.data());
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setStatusUpdating(false);
    }
  };

  const parseDateAndTime = (departureTime) => {
    const dateObj = new Date(departureTime);
    const date = dateObj.toISOString().split("T")[0];
    const time = dateObj.toTimeString().split(" ")[0].slice(0, 5);
    return { date, time };
  };

  const currentTripData = tripData ||
    fetchedTripData || {
      tripType: "a",
      date: new Date().toISOString().split("T")[0],
      time: "09:00",
      availableSeats: 2,
      isAvailable: true,
      pickupLocation: "N/A",
      destinationLocation: "N/A",
    };

  const [editingAdditionalInfo, setEditingAdditionalInfo] = useState(false);
  const [additionalInfoText, setAdditionalInfoText] = useState(
    currentTripData.additionalInfo || ""
  );
  const [savingAdditionalInfo, setSavingAdditionalInfo] = useState(false);

  const handleSaveAdditionalInfo = async () => {
    try {
      setSavingAdditionalInfo(true);
      const tripRef = doc(db, "trips", tripId);
      await updateDoc(tripRef, {
        additionalInfo: additionalInfoText.trim(),
      });

      // Update local state
      const updatedTripData = {
        ...fetchedTripData,
        additionalInfo: additionalInfoText.trim(),
      };
      setFetchedTripData(updatedTripData);
      setEditingAdditionalInfo(false);

      Alert.alert("Success", "Additional information updated successfully!");
    } catch (error) {
      console.error("Error updating additional info:", error);
      Alert.alert("Error", "Failed to update additional information");
    } finally {
      setSavingAdditionalInfo(false);
    }
  };
  const isOwner = currentTripData.userId === auth.currentUser.uid;
  const parsedDateTime = currentTripData.departureTime
    ? parseDateAndTime(currentTripData.departureTime)
    : { date: currentTripData.date, time: currentTripData.time };

  const normalizedTripData = {
    ...currentTripData,
    date: parsedDateTime.date,
    time: parsedDateTime.time,
    pickupLocation: currentTripData.startlocationName || pickupLocation,
    destinationLocation: currentTripData.endlocationName || destinationLocation,
    tripType: currentTripData.tripType,
    availableSeats: currentTripData.availableSeats || 2,
    isAvailable: currentTripData.status === "active",
    pickupCoordinates: currentTripData.startLocation || null,
    destinationCoordinates: currentTripData.endLocation || null,
  };

  // const handleChatPress = async () => {
  //   try {
  //     setButtonLoading(true);

  //     const chatsQuery = query(
  //       collection(db, "chats"),
  //       where("participants", "array-contains", user.uid)
  //     );

  //     const chatSnapshot = await getDocs(chatsQuery);
  //     let existingChat = null;

  //     chatSnapshot.docs.forEach((doc) => {
  //       const chatData = doc.data();
  //       if (
  //         chatData.participants.includes(userId) &&
  //         chatData.tripId === tripId
  //       ) {
  //         existingChat = { id: doc.id, ...chatData };
  //       }
  //     });

  //     let chatId;

  //     if (existingChat) {
  //       chatId = existingChat.id;
  //     } else {
  //       await handleAcceptAndCreateChat();
  //       return;
  //     }

  //     navigation.navigate("Chat");
  //   } catch (error) {
  //     console.error("Error handling chat press:", error);
  //   } finally {
  //     setButtonLoading(false);
  //   }
  // };

  const handleChatPress = async () => {
  try {
    setButtonLoading(true);

    // First check if a chat already exists for this trip
    const chatsQuery = query(
      collection(db, "chats"),
      where("tripId", "==", tripId),
      where("participants", "array-contains", user.uid)
    );

    const querySnapshot = await getDocs(chatsQuery);
    
    if (!querySnapshot.empty) {
      // Chat exists - navigate to it
      const chatDoc = querySnapshot.docs[0];
      navigation.navigate("ChatDetail", {
        chatId: chatDoc.id,
        name: userProfile?.displayName || userProfile?.name || "User",
        otherUserId: userId,
        tripId: tripId,
      });
      return;
    }

    // No existing chat - create a new one
    const chatData = {
      participants: [userId, user.uid],
      tripId: tripId,
      createdAt: serverTimestamp(),
      lastMessage: {
        text: `${user.displayName || "User"} started a chat about this trip`,
        sentBy: user.uid,
        timestamp: serverTimestamp(),
      },
      unreadCount: {
        [userId]: 1,  // Notify the other user
        [user.uid]: 0, // Current user doesn't need notification
      },
      // Track who is provider/customer if needed
      customerId: user.uid,
      providerId: userId,
      // Additional trip info for display
      tripPickup: normalizedTripData.pickupLocation,
      tripDestination: normalizedTripData.destinationLocation,
      tripDate: normalizedTripData.date,
    };

    const chatDocRef = await addDoc(collection(db, "chats"), chatData);

    // Send notification to the other user
    await sendnotificationother(
      userProfile.notificationId,
      "New Trip Chat",
      `${user.displayName || "Someone"} messaged you about a trip`
    );

    // Navigate to the new chat
    navigation.navigate("ChatDetail", {
      chatId: chatDocRef.id,
      name: userProfile?.displayName || userProfile?.name || "User",
      otherUserId: userId,
      tripId: tripId,
    });

  } catch (error) {
    console.error("Error handling chat press:", error);
    Alert.alert("Error", "Failed to start chat");
  } finally {
    setButtonLoading(false);
  }
};
  const handleAcceptAndCreateChat = async () => {
    try {
      await sendMatchRequest(tripId, user?.uid, {
        pickupLocation: normalizedTripData.pickupLocation,
        destinationLocation: normalizedTripData.destinationLocation,
        tripId,
      });

      const tripDocRef = doc(db, "trips", tripId);
      const tripDoc = await getDoc(tripDocRef);

      if (!tripDoc.exists()) {
        console.error("Trip document not found");
        return;
      }

      const tripData = tripDoc.data();
      const updatedRequests = tripData.requests
        ? tripData.requests.map((req) => {
            if (req.userId === user.uid) {
              return { ...req, status: "accepted" };
            }
            return req;
          })
        : [{ userId: user.uid, status: "accepted" }];

      await updateDoc(tripDocRef, {
        requests: updatedRequests,
      });

      const chatDocRef = await addDoc(collection(db, "chats"), {
        participants: [userId, user.uid],
        tripId: tripId,
        createdAt: serverTimestamp(),
        lastMessage: {
          text: "Trip request accepted!",
          sentBy: user.uid,
          timestamp: serverTimestamp(),
        },
        unreadCount: {
          [userId]: 1,
          [user.uid]: 0,
        },
        customerId: user.uid,
        providerId: userId,
      });

      console.log("Chat created:", chatDocRef.id);

      await sendPushNotification(
        "Chat Started",
        "You can now chat with " + userProfile.name
      );

      await sendnotificationother(
        userProfile.notificationId,
        "New Chat",
        "Chat started with " + userProfile?.displayName
      );

      navigation.reset({
        index: 0,
        routes: [{ name: "ChatLists" }],
      });
    } catch (error) {
      console.error("Error accepting request and creating chat:", error);
    }
  };

  const getTripTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "car":
        return <Ionicons name="car" size={18} color="#0070E0" />;
      case "walk":
        return <Ionicons name="walk" size={18} color="#0070E0" />;
      case "bus":
        return <Ionicons name="bus" size={18} color="#0070E0" />;
      case "bike":
        return <Ionicons name="bicycle" size={18} color="#0070E0" />;
      case "train":
        return <Ionicons name="train" size={18} color="#0070E0" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not specified";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  //   const handleShareTrip = async () => {
  //     try {
  //       const shareMessage = `🚗 Trip Details:
  // 📍 From: ${normalizedTripData.pickupLocation}
  // 📍 To: ${normalizedTripData.destinationLocation}
  // 📅 Date: ${formatDate(normalizedTripData.date)}
  // ⏰ Time: ${formatTime(normalizedTripData.time)}
  // 🚗 Type: ${normalizedTripData.tripType}
  // 👤 With: ${userProfile?.displayName || userProfile?.name}
  // ${
  //   currentTripData.additionalInfo
  //     ? `ℹ️ Note: ${currentTripData.additionalInfo}`
  //     : ""
  // }

  // Trip ID: ${tripId?.substring(0, 8)}`;

  //       const result = await Share.share({
  //         message: shareMessage,
  //         title: "Trip Details",
  //       });
  //     } catch (error) {
  //       console.error("Error sharing trip:", error);
  //       Alert.alert("Error", "Failed to share trip details");
  //     }
  //   };

  const createFirebaseDynamicLink = async (tripId) => {
    try {
      const firebaseApiKey = "AIzaSyCV1y35Yn5kd1h-S1ZsPPUpGdYEnT-Z7HQ"; // Replace this!
      const domainUriPrefix = "https://pathshare.page.link"; // Your Firebase Dynamic Link domain
      const deepLink = `https://puspendustudio.com/trip/${tripId}`; // This must match your linking setup

      const response = await fetch(
        `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${firebaseApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dynamicLinkInfo: {
              domainUriPrefix,
              link: deepLink,
              androidInfo: {
                androidPackageName: "com.hemanshupatil.parcelo", // replace
              },
            },
          }),
        }
      );

      const data = await response.json();
      return data.shortLink || deepLink; // fallback to normal URL
    } catch (error) {
      console.error("Failed to generate dynamic link:", error);
      return `https://puspendustudio.com/trip/${tripId}`;
    }
  };

  const handleShareTrip = async () => {
    try {
      const link = await createFirebaseDynamicLink(tripId);

      const shareMessage = `🚗 Trip Details:
📍 From: ${normalizedTripData.pickupLocation}
📍 To: ${normalizedTripData.destinationLocation}
📅 Date: ${formatDate(normalizedTripData.date)}
⏰ Time: ${formatTime(normalizedTripData.time)}
🚗 Type: ${normalizedTripData.tripType}
👤 With: ${userProfile?.displayName || userProfile?.name}
${
  userProfile.phonenumbervisible === true && userProfile.phoneNumber
    ? `📞 Contact: +91-${userProfile.phoneNumber}`
    : ""
}
${
  currentTripData.additionalInfo
    ? `ℹ️ Note: ${currentTripData.additionalInfo}`
    : ""
}

Trip Link: ${link}
(Trip ID: ${tripId?.substring(0, 8)})`;

      await Share.share({
        title: "Trip Details",
        message: shareMessage,
      });
    } catch (error) {
      console.error("Error sharing trip:", error);
      Alert.alert("Error", "Failed to share trip details");
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return "Not specified";
    const time = new Date(`2000-01-01T${timeString}`);
    return time.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getTripAverageRating = () => {
    if (!currentTripData.ratings || currentTripData.ratings.length === 0) {
      return 0;
    }
    const sum = currentTripData.ratings.reduce(
      (acc, rating) => acc + rating.rating,
      0
    );
    return (sum / currentTripData.ratings.length).toFixed(1);
  };

  if (!fontsLoaded || isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </SafeAreaView>
    );
  }

  const userData = userProfile || {
    name: "John Doe",
    photoURL: null,
    rating: 4.8,
    trips: 132,
    bio: "Software engineer, daily commuter.",
    preferredMusic: "Jazz",
    joinedDate: "March 2023",
    languages: ["English"],
  };

  if (!auth.currentUser) {
    return (
      <SafeAreaView
        style={[styles.container, { paddingBottom: insets.bottom }]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Movement Details</Text>

          <View style={styles.headerActions}>
            {/* <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShareTrip}
            >
              <Ionicons name="share-outline" size={22} color="#666" />
            </TouchableOpacity> */}

            {/* Favorite Button - Available to everyone */}
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={toggleFavorite}
              disabled={favoriteLoading}
            >
              {favoriteLoading ? (
                <ActivityIndicator size="small" color="#FF4081" />
              ) : (
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={22}
                  color={isFavorite ? "#FF4081" : "#666"}
                />
              )}
            </TouchableOpacity>

            {/* Rating Button - Only for non-owners */}
            {!isOwner && (
              <TouchableOpacity
                style={styles.ratingButton}
                onPress={() => setRatingModalVisible(true)}
                disabled={hasRated}
              >
                <Ionicons
                  name={hasRated ? "star" : "star-outline"}
                  size={22}
                  color={hasRated ? "#FFD700" : "#666"}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" hidden={false} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Movement Details</Text>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShareTrip}
          >
            <Ionicons name="share-outline" size={22} color="#666" />
          </TouchableOpacity>

          {/* Favorite Button - Available to everyone */}
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={toggleFavorite}
            disabled={favoriteLoading}
          >
            {favoriteLoading ? (
              <ActivityIndicator size="small" color="#FF4081" />
            ) : (
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={22}
                color={isFavorite ? "#FF4081" : "#666"}
              />
            )}
          </TouchableOpacity>

          {/* Rating Button - Only for non-owners */}
          {!isOwner && (
            <TouchableOpacity
              style={styles.ratingButton}
              onPress={() => setRatingModalVisible(true)}
              disabled={hasRated}
            >
              <Ionicons
                name={hasRated ? "star" : "star-outline"}
                size={22}
                color={hasRated ? "#FFD700" : "#666"}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {/* Trip Rating Display */}
      {currentTripData.ratings && currentTripData.ratings.length > 0 && (
        <View style={styles.tripRatingContainer}>
          <Text style={styles.tripRatingTitle}>Trip Rating</Text>
          <View style={styles.tripRatingRow}>
            <StarRating
              rating={Math.round(getTripAverageRating())}
              disabled={true}
              size={16}
            />
            <Text style={styles.tripRatingText}>
              {getTripAverageRating()} ({currentTripData.ratings.length} review
              {currentTripData.ratings.length !== 1 ? "s" : ""})
            </Text>
          </View>
        </View>
      )}
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.profileContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.avatarContainer}>
            {userData.photoURL ? (
              <Image
                source={{ uri: userData.photoURL }}
                style={styles.avatar}
              />
            ) : (
              <Image
                source={{
                  uri: "https://img.freepik.com/premium-vector/men-icon-trendy-avatar-character-cheerful-happy-people-flat-vector-illustration-round-frame-male-portraits-group-team-adorable-guys-isolated-white-background_275421-286.jpg",
                }}
                style={styles.avatar}
              />
            )}
          </View>

          <View style={styles.userInfoContainer}>
            <Text style={styles.userName}>
              {userProfile.displayName || userProfile.name || ""}
            </Text>

            {userProfile.phonenumbervisible === true && (
              <Text style={styles.phonetext}>
                +91-{userProfile?.phoneNumber || ""}
              </Text>
            )}

            <View style={styles.badgeContainer}>
              <FontAwesome5 name="shield-alt" size={12} color="#fff" />
              <Text style={styles.badgeText}>Verified User</Text>
            </View>
          </View>
        </Animated.View>

        {/* Trip Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionTitle}>Movement Details</Text>
            <View style={styles.tripIdContainer}>
              <Text style={styles.tripIdText}>
                Trip #{tripId?.substring(0, 8) || "N/A"}
              </Text>
            </View>
          </View>

          <View style={styles.routeContainer}>
            <View style={styles.routePointWrapper}>
              <View style={styles.routePointOutline}>
                <View style={styles.originPoint} />
              </View>
            </View>

            <View style={styles.verticalLine} />

            <View style={[styles.routePointWrapper, { top: 80 }]}>
              <View style={styles.destinationPoint} />
            </View>

            <View style={styles.routeTextContainer}>
              <View style={styles.locationContainer}>
                <Text style={styles.locationLabel}>PICK-UP</Text>
                <Text style={styles.locationText} numberOfLines={1}>
                  {normalizedTripData.pickupLocation}
                </Text>
              </View>
              <View style={[styles.locationContainer, { marginTop: 15 }]}>
                <Text style={styles.locationLabel}>DESTINATION</Text>
                <Text style={styles.locationText} numberOfLines={1}>
                  {normalizedTripData.destinationLocation}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Route Map</Text>

          <View
            style={{
              height: 300,
              borderRadius: 12,
              overflow: "hidden",
              marginTop: 16,
            }}
          >
            <MapView
              style={{ flex: 1 }}
              initialRegion={{
                latitude:
                  normalizedTripData.pickupCoordinates?.latitude || 20.5937,
                longitude:
                  normalizedTripData.pickupCoordinates?.longitude || 78.9629,
                latitudeDelta: 1.2,
                longitudeDelta: 1.2,
              }}
              showsUserLocation={true}
              scrollEnabled={true}
              zoomEnabled={true}
              pitchEnabled={true}
              rotateEnabled={true}
              provider="google"
            >
              {normalizedTripData.pickupCoordinates && (
                <Marker
                  coordinate={normalizedTripData.pickupCoordinates}
                  title="Pickup"
                  description={normalizedTripData.pickupLocation}
                  pinColor="#0070E0"
                />
              )}

              {normalizedTripData.destinationCoordinates && (
                <Marker
                  coordinate={normalizedTripData.destinationCoordinates}
                  title="Destination"
                  description={normalizedTripData.destinationLocation}
                  pinColor="#000"
                />
              )}

              {normalizedTripData.pickupCoordinates &&
                normalizedTripData.destinationCoordinates && (
                  <Polyline
                    coordinates={[
                      normalizedTripData.pickupCoordinates,
                      normalizedTripData.destinationCoordinates,
                    ]}
                    strokeColor="#0070E0"
                    strokeWidth={4}
                    lineDashPattern={[2, 4]}
                  />
                )}
            </MapView>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Movement Information</Text>
          <View style={styles.tripInfoGrid}>
            <View style={styles.tripInfoItem}>
              <View style={styles.tripInfoIconContainer}>
                {getTripTypeIcon(normalizedTripData.tripType)}
              </View>
              <View style={styles.tripInfoTextContainer}>
                <Text style={styles.tripInfoLabel}>Trip Type</Text>
                <Text style={styles.tripInfoValue}>
                  {normalizedTripData.tripType}
                </Text>
              </View>
            </View>

            <View style={styles.tripInfoItem}>
              <View style={styles.tripInfoIconContainer}>
                <Ionicons name="calendar" size={18} color="#0070E0" />
              </View>
              <View style={styles.tripInfoTextContainer}>
                <Text style={styles.tripInfoLabel}>Date</Text>
                <Text style={styles.tripInfoValue}>
                  {formatDate(normalizedTripData.date)}
                </Text>
              </View>
            </View>

            <View style={styles.tripInfoItem}>
              <View style={styles.tripInfoIconContainer}>
                <Ionicons name="time" size={18} color="#0070E0" />
              </View>
              <View style={styles.tripInfoTextContainer}>
                <Text style={styles.tripInfoLabel}>Time</Text>
                <Text style={styles.tripInfoValue}>
                  {formatTime(normalizedTripData.time)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Additional Info Section */}
        <View style={[styles.sectionContainer,{ bottom: insets.bottom }]}>
          <View style={styles.sectionHeaderWithAction}>
            <Text style={styles.sectionTitle}>Additional Information</Text>
            {/* {isOwner && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => {
                  setEditingAdditionalInfo(true);
                  setAdditionalInfoText(currentTripData.additionalInfo || "");
                }}
              >
                <Ionicons name="create-outline" size={18} color="#0070E0" />
                <Text style={styles.editButtonText}>
                  {currentTripData.additionalInfo ? "Edit" : "Add"}
                </Text>
              </TouchableOpacity>
            )} */}
          </View>

          {editingAdditionalInfo && isOwner ? (
            <View style={styles.editingContainer}>
              <TextInput
                style={styles.additionalInfoInput}
                multiline
                numberOfLines={4}
                placeholder="Add optional information for passengers (e.g., meet at main gate, car color, etc.)"
                value={additionalInfoText}
                onChangeText={setAdditionalInfoText}
                maxLength={300}
              />
              <Text style={styles.characterCount}>
                {additionalInfoText.length}/300
              </Text>

              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelEditButton}
                  onPress={() => {
                    setEditingAdditionalInfo(false);
                    setAdditionalInfoText(currentTripData.additionalInfo || "");
                  }}
                >
                  <Text style={styles.cancelEditText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveEditButton}
                  onPress={handleSaveAdditionalInfo}
                  disabled={savingAdditionalInfo}
                >
                  {savingAdditionalInfo ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveEditText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.additionalInfoContainer}>
              {currentTripData.additionalInfo ? (
                <Text style={styles.additionalInfoText}>
                  {currentTripData.additionalInfo}
                </Text>
              ) : (
                <Text style={styles.noAdditionalInfo}>
                  No additional information provided
                  {/* {isOwner
                    ? 'Tap "Add" to include helpful information for passengers'
                    : "No additional information provided"} */}
                </Text>
              )}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
      {normalizedTripData.userId !== auth.currentUser.uid && (
        <View style={[styles.buttonContainer, { bottom: insets.bottom }]}>
          <TouchableOpacity
            style={[
              styles.sendRequestButton,
              !normalizedTripData.isAvailable && styles.disabledButton,
            ]}
            onPress={handleChatPress}
            disabled={buttonLoading || !normalizedTripData.isAvailable}
          >
            {buttonLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="chatbubble-ellipses"
                  size={18}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.buttonText}>
                  {normalizedTripData.isAvailable
                    ? "Start Chat"
                    : "Trip Not Available"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
      {isOwner && currentTripData.status === "active" && (
        <View style={[styles.actionbtnContainer, { bottom: insets.bottom }]}>
          <TouchableOpacity
            onPress={() => handleUpdateStatus("cancelled")}
            disabled={statusUpdating}
            style={[styles.actionButton, styles.cancelButton]}
          >
            <Text style={[styles.buttonText, { color: "#000" }]}>
              {statusUpdating ? "Updating..." : "Cancel"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleUpdateStatus("completed")}
            disabled={statusUpdating}
            style={[styles.actionButton, styles.completeButton]}
          >
            <Text style={styles.buttonText}>
              {statusUpdating ? "Updating..." : "Complete"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Rating Modal */}
      <RatingModal
        visible={ratingModalVisible}
        onClose={() => setRatingModalVisible(false)}
        onSubmit={handleRatingSubmit}
        userProfile={userProfile}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 0,
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
    paddingTop: Platform.OS === "android" ? 40 : 10,
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
  phonetext: {
    fontSize: 16,

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
  tripInfoGrid: {
    marginTop: 16,
  },
  tripInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  tripInfoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(0,112,224,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  tripInfoTextContainer: {
    flex: 1,
  },
  tripInfoLabel: {
    fontSize: 12,
    fontFamily: "Regular",
    color: "#666",
    marginBottom: 2,
  },
  tripInfoValue: {
    fontSize: 16,
    fontFamily: "Medium",
    color: "#000",
  },
  availabilityContainer: {
    marginTop: 8,
    alignItems: "flex-start",
  },
  availabilityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  availabilityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  availabilityText: {
    fontSize: 14,
    fontFamily: "Medium",
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
  disabledButton: {
    backgroundColor: "#999",
    shadowColor: "#999",
  },
  buttonText: {
    fontSize: 16,
    fontFamily: "Bold",
    color: "#fff",
  },

  chatButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
    borderRadius: 12,
    paddingVertical: 16,
    elevation: 2,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 16,
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
  },
  completeButton: {
    backgroundColor: "#000",
  },
  buttonText: {
    fontSize: 16,
    fontFamily: "Bold",
    color: "#fff",
  },
  disabledButton: {
    backgroundColor: "#999",
    opacity: 0.7,
  },

  actionbtnContainer: {
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
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  ratingSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  ratingText: {
    fontSize: 16,
    fontFamily: "Regular",
    color: "#333",
    textAlign: "center",
    marginBottom: 16,
  },
  commentSection: {
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 14,
    fontFamily: "Medium",
    color: "#333",
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: "Regular",
    color: "#333",
    textAlignVertical: "top",
    minHeight: 80,
  },
  characterCount: {
    fontSize: 12,
    fontFamily: "Regular",
    color: "#666",
    textAlign: "right",
    marginTop: 4,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  cancelModalButton: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  cancelModalButtonText: {
    fontSize: 14,
    fontFamily: "Medium",
    color: "#666",
  },
  submitModalButton: {
    backgroundColor: "#0070E0",
  },
  submitModalButtonText: {
    fontSize: 14,
    fontFamily: "Medium",
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Bold",
    color: "#000",
  },
  tripRatingContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  tripRatingTitle: {
    fontSize: 14,
    fontFamily: "Medium",
    color: "#666",
    marginBottom: 4,
  },
  tripRatingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tripRatingText: {
    fontSize: 14,
    fontFamily: "Regular",
    color: "#333",
    marginLeft: 8,
  },

  // Add these to your existing styles
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  shareButton: {
    padding: 8,
    marginRight: 8,
  },
  sectionHeaderWithAction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F0F8FF",
    borderRadius: 6,
  },
  editButtonText: {
    color: "#0070E0",
    fontSize: 14,
    fontFamily: "Medium",
    marginLeft: 4,
  },
  editingContainer: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
  },
  additionalInfoInput: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: "Regular",
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    minHeight: 100,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 12,
  },
  cancelEditButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F0F0F0",
    borderRadius: 6,
  },
  saveEditButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#0070E0",
    borderRadius: 6,
    minWidth: 70,
    alignItems: "center",
  },
  cancelEditText: {
    color: "#666",
    fontSize: 14,
    fontFamily: "Medium",
  },
  saveEditText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Medium",
  },
  noAdditionalInfo: {
    color: "#999",
    fontSize: 14,
    fontFamily: "Regular",
    fontStyle: "italic",
  },
  favoriteButton: {
    padding: 8,
    marginRight: 8,
  },
});
