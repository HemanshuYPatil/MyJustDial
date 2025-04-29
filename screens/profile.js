import React, { useState } from "react";
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
import { auth } from "../lib/db/firebase";
import { getAuth, signOut } from "firebase/auth";
import { useLanguage } from "../context/languagecontext";

export default function ProfileScreen({ navigation }) {
  const [fontsLoaded] = useFonts({
    Regular: require("../assets/fonts/regular.ttf"),
    Medium: require("../assets/fonts/medium.ttf"),
    Bold: require("../assets/fonts/bold.ttf"),
  });

  const user = auth.currentUser;
  const usernumber = user.phoneNumber.replace(/^(\+91)(\d+)/, "$1-$2");

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  // Toggle handlers
  const toggleNotifications = () =>
    setNotificationsEnabled(!notificationsEnabled);
  const toggleDarkMode = () => setDarkModeEnabled(!darkModeEnabled);
  if (!fontsLoaded) {
    return null;
  }

  const auths = getAuth(); // If you use modular SDK (which you should)

  const handleLogout = async () => {
    try {
      await signOut(auths);
      console.log("User signed out!");
      // Optionally navigate the user to the login screen
      navigation.replace("GetStarted");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header with back button */}
      <View style={styles.header}>
        <View style={styles.headerRight} />

        {/* <Text style={styles.headerText}>Account Details</Text> */}

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
              source={{ uri: 'https://img.freepik.com/premium-vector/art-illustration_890735-11.jpg?ga=GA1.1.2127828126.1743705572&semt=ais_hybrid&w=740' }}
              style={styles.profileImage}
              defaultSource={require("../assets/icon.png")}
            />
            {/* <TouchableOpacity style={styles.editImageButton}>
              <Feather name="edit-2" size={16} color="#fff" />
            </TouchableOpacity> */}
          </View>

          <Text style={styles.profileName}>{user.displayName}</Text>
          <Text style={styles.profileEmail}>{usernumber}</Text>

          {/* <TouchableOpacity style={styles.editProfileButton} onPress={() => navigation.navigate("EditUserProfile")}>
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity> */}
        </View>

        {/* Account Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("EditUserProfile")}
          >
            <View style={styles.menuIconContainer}>
              <Feather name="user" size={20} color="#333" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemText}>Personal Information</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Preferences Section */}
        {/* <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.toggleItem}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="notifications-outline" size={20} color="#333" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemText}>Notifications</Text>
            </View>
            <Switch
              trackColor={{ false: "#e0e0e0", true: "#2d6cdf" }}
              thumbColor="#fff"
              ios_backgroundColor="#e0e0e0"
              onValueChange={toggleNotifications}
              value={notificationsEnabled}
            />
          </View>
          
          <View style={styles.toggleItem}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="moon-outline" size={20} color="#333" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemText}>Dark Mode</Text>
            </View>
            <Switch
              trackColor={{ false: "#e0e0e0", true: "#2d6cdf" }}
              thumbColor="#fff"
              ios_backgroundColor="#e0e0e0"
              onValueChange={toggleDarkMode}
              value={darkModeEnabled}
            />
          </View>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("Language")}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="language-outline" size={20} color="#333" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemText}>Language</Text>
              <Text style={styles.menuItemSubtext}>English</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        </View> */}

        {/* Support Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Support</Text>

         

          {/* <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("Support")}>
            <View style={styles.menuIconContainer}>
              <MaterialIcons
                name="chat-bubble-outline"
                size={20}
                color="#333"
              />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemText}>Customer Support</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity> */}

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("Developer")}>
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
              <Text style={styles.menuItemSubtext}>Version 1.0.0</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>

        <View style={styles.logoutsectio}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              handleLogout;
            }}
          >
            <View style={styles.menuIconContainer}>
              <Feather name="log-out" size={20} color="#ff3b30" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.logoutText}>Log Out</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>
        {/* Logout Button */}

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
    marginBottom: 20,
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
