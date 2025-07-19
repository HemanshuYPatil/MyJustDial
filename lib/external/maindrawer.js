import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  Modal,
  Alert,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../db/firebase";

const { width: screenWidth } = Dimensions.get("window");
const DRAWER_WIDTH = screenWidth * 0.85;

// Custom Drawer Component
const CustomDrawer = ({ isVisible, onClose, children }) => {
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0.4,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -DRAWER_WIDTH,
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
  }, [isVisible]);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.drawerContainer}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <TouchableOpacity
            style={styles.overlayTouch}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>
        <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

// Drawer Content for Logged-in Users
const LoggedInDrawerContent = ({ onClose, navigation, user, onLogout }) => {
  const menuItems = [
    // { id: 1, title: 'Home', icon: 'home-outline', screen: 'Home', category: 'main' },
    // { id: 2, title: 'My Rides', icon: 'car-outline', screen: 'MyRides', category: 'main' },
    {
      id: 1,
      title: "Profile",
      icon: "person-outline",
      screen: "Profile",
      category: "main",
    },

    {
      id: 2,
      title: "Developer Team",
      icon: "code-outline",
      screen: "Developer",
      category: "main",
    },
    // { id: 5, title: 'Ride History', icon: 'time-outline', screen: 'RideHistory', category: 'main' },
    {
      id: 6,
      title: "Favorites",
      icon: "heart-outline",
      screen: "Fav",
      category: "main",
    },
    // { id: 7, title: 'Rewards', icon: 'gift-outline', screen: 'Rewards', category: 'account' },
    // { id: 8, title: 'Settings', icon: 'settings-outline', screen: 'Settings', category: 'other' },
    // { id: 9, title: 'Help & Support', icon: 'help-circle-outline', screen: 'Support', category: 'other' },
  ];

  const handleMenuPress = (item) => {
    onClose();
    if (navigation && item.screen) {
      navigation.navigate(item.screen);
    }
    console.log("Menu item pressed:", item.title);
  };

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => {
            onClose();
            onLogout();
          },
        },
      ],
      {
        userInterfaceStyle: "light",
      }
    );
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const renderMenuSection = (items, sectionTitle) => (
    <View style={styles.menuSection}>
      {sectionTitle && <Text style={styles.sectionTitle}>{sectionTitle}</Text>}
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.menuItem}
          onPress={() => handleMenuPress(item)}
          activeOpacity={0.6}
        >
          <View style={styles.menuItemContent}>
            <View style={styles.menuIconContainer}>
              <Ionicons name={item.icon} size={22} color="#1a1a1a" />
            </View>
            <Text style={styles.menuItemText}>{item.title}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999999" />
        </TouchableOpacity>
      ))}
    </View>
  );

  const mainItems = menuItems.filter((item) => item.category === "main");
  const accountItems = menuItems.filter((item) => item.category === "account");
  const otherItems = menuItems.filter((item) => item.category === "other");

  return (
    <View style={styles.drawerContent}>
      {/* Header */}
      <View style={styles.drawerHeader}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={28} color="#1a1a1a" />
        </TouchableOpacity>

        <View style={styles.profileSection}>
          <View style={styles.profileAvatar}>
            {user?.photoURL ? (
              <Image
                source={{ uri: user.photoURL }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>
                {getInitials(user?.displayName || user?.email)}
              </Text>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.displayName || user?.email?.split("@")[0] || "User"}
            </Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            {user?.emailVerified && (
              <View style={styles.verifiedBadge}>
                <View style={styles.verifiedDot} />
                <Text style={styles.verifiedText}>Verified Account</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {renderMenuSection(mainItems)}
        {/* {renderMenuSection(accountItems, 'Account')}
        {renderMenuSection(otherItems, 'Support')} */}
      </View>

      {/* Footer */}
      <View style={styles.drawerFooter}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={22} color="#ff4757" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
        <Text style={styles.footerVersion}>Version 2.1.0</Text>
      </View>
    </View>
  );
};

// Drawer Content for Guest Users
const GuestDrawerContent = ({ onClose, navigation, onLogin, onSignUp }) => {
  const guestMenuItems = [
    {
      id: 1,
      title: "Profile",
      icon: "person",
      screen: "Home",
      route: "Profile",
    },
    // { id: 2, title: 'How it Works', icon: 'information-circle-outline', screen: 'HowItWorks' },
    // { id: 3, title: 'Pricing', icon: 'pricetag-outline', screen: 'Pricing' },
    {
      id: 2,
      title: "Developer Team",
      icon: "code-outline",
      screen: "Developer",
      category: "team",
      route: "Developer",
    },
    {
      id: 6,
      title: "Favorites",
      icon: "heart-outline",
      route: "Fav",
      category: "main",
    },
    // { id: 5, title: 'Cities', icon: 'location-outline', screen: 'Cities' },
    // { id: 6, title: 'Help', icon: 'help-circle-outline', screen: 'Help' },
  ];

  const handleMenuPress = (item) => {
    onClose();
    if (navigation && item.screen) {
      navigation.navigate(item.route);
    }
    console.log("Guest menu item pressed:", item.title);
  };

  const handleLogin = () => {
    onClose();
    if (onLogin) {
      onLogin();
    } else if (navigation) {
      navigation.navigate("login");
    }
  };

  const handleSignUp = () => {
    onClose();
    if (onSignUp) {
      onSignUp();
    } else if (navigation) {
      navigation.navigate("signup");
    }
  };

  return (
    <View style={styles.drawerContent}>
      {/* Header */}
      <View style={styles.drawerHeader}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={28} color="#1a1a1a" />
        </TouchableOpacity>

        <View style={styles.guestWelcome}>
          <View style={styles.guestAvatar}>
            <Ionicons name="person-outline" size={32} color="#999999" />
          </View>
          <View style={styles.guestInfo}>
            <Text style={styles.guestTitle}>Welcome</Text>
            <Text style={styles.guestSubtitle}>
              Sign in to unlock all features
            </Text>
          </View>
        </View>

        {/* Auth Buttons */}
        <View style={styles.authButtonsContainer}>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signUpButton}
            onPress={handleSignUp}
            activeOpacity={0.8}
          >
            <Text style={styles.signUpButtonText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        <View style={styles.menuSection}>
          {guestMenuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => handleMenuPress(item)}
              activeOpacity={0.6}
            >
              <View style={styles.menuItemContent}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name={item.icon} size={22} color="#1a1a1a" />
                </View>
                <Text style={styles.menuItemText}>{item.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#999999" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Footer */}
      {/* <View style={styles.drawerFooter}>
        <View style={styles.guestFooterInfo}>
          <Text style={styles.footerText}>Get the mobile app</Text>
          <View style={styles.appLinksContainer}>
            <TouchableOpacity style={styles.appLink} activeOpacity={0.7}>
              <Ionicons name="logo-apple" size={18} color="#1a1a1a" />
              <Text style={styles.appLinkText}>iOS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.appLink} activeOpacity={0.7}>
              <Ionicons name="logo-google-playstore" size={18} color="#1a1a1a" />
              <Text style={styles.appLinkText}>Android</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View> */}
    </View>
  );
};

// Main Menu Button Component with Firebase Integration
const MenuButtonWithDrawer = ({ style, navigation, onLogin, onSignUp }) => {
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Fetch additional user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      console.log("User logged out successfully");

      // Navigate to home or login screen if needed
      if (navigation) {
        navigation.navigate("Home");
      }
    } catch (error) {
      console.error("Error logging out:", error);
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  const openDrawer = () => setIsDrawerVisible(true);
  const closeDrawer = () => setIsDrawerVisible(false);

  if (loading) {
    return (
      <TouchableOpacity style={[styles.menuButton, style]}>
        <Ionicons name="ellipsis-horizontal" size={24} color="#1a1a1a" />
      </TouchableOpacity>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.menuButton, style]}
        onPress={openDrawer}
        activeOpacity={0.7}
      >
        <Ionicons name="menu" size={24} color="#1a1a1a" />
      </TouchableOpacity>

      <CustomDrawer isVisible={isDrawerVisible} onClose={closeDrawer}>
        {user ? (
          <LoggedInDrawerContent
            onClose={closeDrawer}
            navigation={navigation}
            user={user}
            userProfile={userProfile}
            onLogout={handleLogout}
          />
        ) : (
          <GuestDrawerContent
            onClose={closeDrawer}
            navigation={navigation}
            onLogin={onLogin}
            onSignUp={onSignUp}
          />
        )}
      </CustomDrawer>
    </>
  );
};

const styles = StyleSheet.create({
  menuButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Drawer styles
  drawerContainer: {
    flex: 1,
    backgroundColor: "transparent",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000000",
  },
  overlayTouch: {
    flex: 1,
  },
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: "#ffffff",
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },

  // Drawer content styles
  drawerContent: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
  },
  drawerHeader: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 32,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  closeButton: {
    alignSelf: "flex-end",
    padding: 8,
    marginBottom: 20,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },

  // Logged-in user styles
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  profileEmail: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  verifiedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#28a745",
    marginRight: 6,
  },
  verifiedText: {
    fontSize: 12,
    color: "#28a745",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Guest user styles
  guestWelcome: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  guestAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f1f3f4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  guestInfo: {
    flex: 1,
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  guestSubtitle: {
    fontSize: 14,
    color: "#666666",
  },
  authButtonsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  loginButton: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  signUpButton: {
    flex: 1,
    backgroundColor: "transparent",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  signUpButtonText: {
    color: "#1a1a1a",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Menu styles
  menuContainer: {
    flex: 1,
    paddingTop: 8,
  },
  menuSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#999999",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginLeft: 24,
    marginBottom: 8,
    marginTop: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
    backgroundColor: "#ffffff",
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuIconContainer: {
    width: 32,
    alignItems: "center",
  },
  menuItemText: {
    fontSize: 16,
    color: "#1a1a1a",
    marginLeft: 16,
    fontWeight: "500",
    letterSpacing: 0.3,
  },

  // Footer styles
  drawerFooter: {
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: "#f8f9fa",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255, 71, 87, 0.1)",
  },
  logoutText: {
    fontSize: 16,
    color: "#ff4757",
    marginLeft: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  footerVersion: {
    fontSize: 12,
    color: "#999999",
    textAlign: "center",
    marginTop: 12,
    fontWeight: "500",
  },

  // Guest footer styles
  guestFooterInfo: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    marginBottom: 16,
    fontWeight: "500",
  },
  appLinksContainer: {
    flexDirection: "row",
    gap: 12,
  },
  appLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#f1f3f4",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  appLinkText: {
    fontSize: 14,
    color: "#1a1a1a",
    marginLeft: 8,
    fontWeight: "600",
  },
});

export default MenuButtonWithDrawer;
