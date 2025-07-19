import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  Switch,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  Ionicons,
  MaterialIcons,
  FontAwesome5,
  Feather,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { auth, db } from "../lib/db/firebase";
import { getAuth, signOut } from "firebase/auth";
import { useLanguage } from "../context/languagecontext";
import Constants from "expo-constants";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { useFocusEffect } from "@react-navigation/native";
import { getuserphone } from "../lib/query/user";

export default function ProfileScreen({ navigation }) {
  const [fontsLoaded] = useFonts({
    Regular: require("../assets/fonts/regular.ttf"),
    Medium: require("../assets/fonts/medium.ttf"),
    Bold: require("../assets/fonts/bold.ttf"),
  });

  const user = auth.currentUser;
  const isGuest = !user; // Check if user is logged in

  const [phoneNumber, setPhoneNumber] = useState(null);

  const [currentUser, setCurrentUser] = useState(auth.currentUser);
useEffect(() => {
  const fetchPhone = async () => {
    if (user?.uid) {
      const phone = await getuserphone(user.uid);
      setPhoneNumber(phone);
    }
  };
  fetchPhone();
}, [user]);

useFocusEffect(
  React.useCallback(() => {
    const refreshUser = async () => {
      try {
        await auth.currentUser.reload(); // Refresh user data from Firebase
        setCurrentUser(auth.currentUser); // Update local state
      } catch (err) {
        console.log("Error refreshing user:", err);
      }
    };
    refreshUser();
  }, [])
);

  // Guest user data
  const guestUserData = {
    displayName: "Guest User",
    email: "guest@example.com",
    profileImage:
      "https://img.freepik.com/premium-vector/art-illustration_890735-11.jpg?ga=GA1.1.2127828126.1743705572&semt=ais_hybrid&w=740",
  };

  // Use authenticated user data or guest data
  const profileData = isGuest
    ? guestUserData
    : {
        displayName: user.displayName || "User",
        email: user.email || user.phoneNumber || "No email",
        profileImage:
          currentUser.photoURL ||
          "https://img.freepik.com/premium-vector/art-illustration_890735-11.jpg?ga=GA1.1.2127828126.1743705572&semt=ais_hybrid&w=740",
      };

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [phoneVisible, setPhoneVisible] = useState(false);


  useEffect(() => {
    const fetchVisibility = async () => {
      if (!isGuest) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setPhoneVisible(!!userDoc.data().phonenumbervisible);
        }
      }
    };
    fetchVisibility();
  }, []);

  const togglePhoneVisibility = async () => {
    const newValue = !phoneVisible;
    setPhoneVisible(newValue);

    if (!isGuest) {
      try {
        await updateDoc(doc(db, "users", user.uid), {
          phonenumbervisible: newValue,
        });
      } catch (error) {
        console.error("Failed to update phone visibility:", error);
        Alert.alert("Error", "Could not update phone visibility.");
      }
    }
  };

  const handleLogout = async () => {
    if (isGuest) {
      // For guest users, just navigate to login
      Alert.alert(
        "Guest Session",
        "You are currently using the app as a guest. Would you like to sign in for a personalized experience?",
        [
          {
            text: "Continue as Guest",
            style: "cancel",
          },
          {
            text: "Sign In",
            onPress: () => navigation.replace("login"),
          },
        ]
      );
    } else {
      // For authenticated users, sign out
      try {
        console.log("User signed out!");
        const auths = getAuth();
        await signOut(auths);
        navigation.replace("login");
      } catch (error) {
        console.error("Error signing out:", error);
        Alert.alert("Error", "Failed to sign out. Please try again.");
      }
    }
  };

  const handleEditProfile = () => {
    if (isGuest) {
      Alert.alert(
        "Sign In Required",
        "Please sign in to edit your profile information.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Sign In",
            onPress: () => navigation.navigate("login"),
          },
        ]
      );
    } else {
      navigation.navigate("EditUserProfile");
    }
  };

  const handleRestrictedFeature = (featureName) => {
    if (isGuest) {
      Alert.alert(
        "Sign In Required",
        `Please sign in to access ${featureName}.`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Sign In",
            onPress: () => navigation.navigate("login"),
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      /* Header */
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerText}>Profile</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Info Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: profileData.profileImage }}
              style={styles.profileImage}
              defaultSource={require("../assets/icon.png")}
            />
            {isGuest && (
              <View style={styles.guestBadge}>
                <Text style={styles.guestBadgeText}>Guest</Text>
              </View>
            )}
          </View>

          <Text style={styles.profileName}>{profileData.displayName}</Text>
          <Text style={styles.profileEmail}>{profileData.email}</Text>
          <Text style={styles.profilePhone}>+91-{phoneNumber}</Text>

          {isGuest && (
            <TouchableOpacity
              style={styles.signInButton}
              onPress={() => navigation.navigate("login")}
            >
              <Text style={styles.signInButtonText}>
                Sign In for Full Access
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Account Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity
            style={[styles.menuItem, isGuest && styles.disabledMenuItem]}
            onPress={handleEditProfile}
          >
            <View style={styles.menuIconContainer}>
              <Feather
                name="user"
                size={20}
                color={isGuest ? "#ccc" : "#333"}
              />
            </View>
            <View style={styles.menuTextContainer}>
              <Text
                style={[styles.menuItemText, isGuest && styles.disabledText]}
              >
                Edit Profile
              </Text>
              {isGuest && (
                <Text style={styles.menuItemSubtext}>Sign in required</Text>
              )}
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          {/* <TouchableOpacity
            style={[styles.menuItem, isGuest && styles.disabledMenuItem]}
            onPress={handleEditProfile}
          >
            <View style={styles.menuIconContainer}>
              <Feather
                name="user"
                size={20}
                color={isGuest ? "#ccc" : "#333"}
              />
            </View>
            <View style={styles.menuTextContainer}>
              <Text
                style={[styles.menuItemText, isGuest && styles.disabledText]}
              >
                Phone Visibility
              </Text>
              {isGuest && (
                <Text style={styles.menuItemSubtext}>Sign in required</Text>
              )}
            </View>
            {!isGuest && (
              <Switch
                value={phoneVisible}
                onValueChange={togglePhoneVisibility}
                thumbColor={phoneVisible ? "#2d6cdf" : "#ccc"}
              />
            )}
          </TouchableOpacity> */}
        </View>

        {/* Support Section */}
        {/* <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Support</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("Developer")}
          >
            <View style={styles.menuIconContainer}>
              <FontAwesome5 name="user-alt" size={20} color="#333" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemText}>Developer Team</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <MaterialIcons name="info-outline" size={20} color="#333" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemText}>About</Text>
              {/* <Text style={styles.menuItemSubtext}>Version {appVersion}</Text> */}
            {/* </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>  */}

        {/* Logout/Sign In Section */}
        <View style={styles.logoutsectio}>
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <View style={styles.menuIconContainer}>
              <Feather
                name={isGuest ? "log-in" : "log-out"}
                size={20}
                color={isGuest ? "#2d6cdf" : "#ff3b30"}
              />
            </View>
            <View style={styles.menuTextContainer}>
              <Text
                style={[styles.logoutText, isGuest && { color: "#2d6cdf" }]}
              >
                {isGuest ? "Sign In" : "Log Out"}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    fontFamily: "Regular",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 40 : 10,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    fontSize: 20,
    fontFamily: "Bold",
    color: "#000",
  },
  headerRight: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 30,
    borderBottomWidth: 8,
    borderBottomColor: "#f5f5f5",
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f0f0f0",
  },
  guestBadge: {
    position: "absolute",
    bottom: -5,
    right: -5,
    backgroundColor: "#ff9500",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#fff",
  },
  guestBadgeText: {
    fontSize: 10,
    fontFamily: "Bold",
    color: "#fff",
  },
  editImageButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2d6cdf",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  profileName: {
    fontSize: 22,
    fontFamily: "Bold",
    color: "#000",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    fontFamily: "Regular",
    color: "#777",
    marginBottom:8,
  },
  profilePhone: {
    fontSize: 16,
    fontFamily: "Regular",
    color: "#777",
    marginBottom: 20,
  },
  signInButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    backgroundColor: "#2d6cdf",
  },
  signInButtonText: {
    fontSize: 16,
    fontFamily: "Medium",
    color: "#fff",
  },
  editProfileButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
    backgroundColor: "#f5f5f5",
  },
  editProfileText: {
    fontSize: 16,
    fontFamily: "Medium",
    color: "#333",
  },
  sectionContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 8,
    borderBottomColor: "#f5f5f5",
  },
  logoutsectio: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 8,
    borderBottomColor: "#fff",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Bold",
    color: "#000",
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  disabledMenuItem: {
    opacity: 0.6,
  },
  toggleItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: "Regular",
    color: "#333",
  },
  disabledText: {
    color: "#ccc",
  },
  menuItemSubtext: {
    fontSize: 14,
    fontFamily: "Regular",
    color: "#777",
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#f8f8f8",
  },
  logoutText: {
    fontSize: 16,
    fontFamily: "Medium",
    color: "#ff3b30",
    marginLeft: 10,
  },
  bottomSpacing: {
    height: 40,
  },
});
