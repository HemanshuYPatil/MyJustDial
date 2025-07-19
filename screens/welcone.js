import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Platform,
  Dimensions,
  StatusBar as RNStatusBar,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useFonts } from "expo-font";
import LottieView from "lottie-react-native";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/db/firebase";
import GetStartModel from "../components/startmodel";

const { width, height } = Dimensions.get("window");
const SCREEN_HEIGHT = height;

export default function SplashScreens({ navigation }) {
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [model, setModel] = useState(false);
  const [fontsLoaded] = useFonts({
    Regular: require("../assets/fonts/regular.ttf"),
    Medium: require("../assets/fonts/medium.ttf"),
    Bold: require("../assets/fonts/bold.ttf"),
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigation.reset({
          index: 0,
          routes: [{ name: "Home" }],
        });
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: "Home" }],
      });
    }, 4000); // 4 seconds delay

    return () => clearTimeout(timer);
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  const handleGetStarted = () => {
    setModel(true);
  };

  // Splash Screen Content
  if (isLoading) {
    return (
      <View style={styles.container}>
      <StatusBar style="light" />
      <Image
        source={require("../assets/splash-screens.jpg")}
        style={styles.fullScreenImage}
        resizeMode="cover"
      />
    </View>
    );
  }

  // Main Get Started Screen
  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Background Animation */}
      <LottieView
        source={require("../assets/logo.json")}
        autoPlay
        loop
        style={styles.backgroundAnimation}
        resizeMode="cover"
      />

      <LinearGradient
        colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.8)"]}
        style={styles.gradient}
      >
        <View style={styles.contentContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerRight} />
            <View style={styles.headerRight} />
          </View>

          {/* Logo with Animation */}
          <View style={styles.logoContainer}>
            <LottieView
              source={require("../assets/logo.json")}
              autoPlay
              loop
              style={styles.iconAnimation}
            />
            <Text style={styles.logoText}>MyJustDial</Text>
            <Text style={styles.tagline}>Your destination, your journey</Text>
          </View>

          {/* Features Section with Animated Icons */}
          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>Discover Amazing Features</Text>

            <View style={styles.menuItem}>
              <View style={styles.menuIconContainer}>
                <LottieView
                  source={require("../assets/logo.json")}
                  autoPlay
                  loop
                  style={styles.menuIconAnimation}
                />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuItemText}>Find Local Services</Text>
                <Text style={styles.menuItemSubtext}>
                  Discover services near you
                </Text>
              </View>
            </View>

            <View style={styles.menuItem}>
              <View style={styles.menuIconContainer}>
                <LottieView
                  source={require("../assets/logo.json")}
                  autoPlay
                  loop
                  style={styles.menuIconAnimation}
                />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuItemText}>Easy Booking</Text>
                <Text style={styles.menuItemSubtext}>
                  Book services instantly
                </Text>
              </View>
            </View>

            <View style={styles.menuItem}>
              <View style={styles.menuIconContainer}>
                <LottieView
                  source={require("../assets/logo.json")}
                  autoPlay
                  loop
                  style={styles.menuIconAnimation}
                />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuItemText}>24/7 Support</Text>
                <Text style={styles.menuItemSubtext}>We're here to help</Text>
              </View>
            </View>
          </View>

          {/* Actions Container */}
          <View style={styles.actionsContainer}>
            {/* Terms Text */}
            <Text style={styles.termsText}>
              By continuing, you agree to our{" "}
              <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  // Splash Screen Styles
  splashContainer: {
    flex: 1,
    backgroundColor: "#F89230",
  },
  splashGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  splashContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoAnimation: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },

  splashLogoText: {
    fontSize: 42,
    fontFamily: "Bold",
    color: "#000",
    textAlign: "center",
    marginBottom: 10,
  },
  splashTagline: {
    fontSize: 18,
    fontFamily: "Regular",
    color: "#000",
    opacity: 0.9,
    textAlign: "center",
    marginBottom: 40,
  },
  loadingAnimation: {
    width: 80,
    height: 80,
  },

  // Main Screen Styles
  container: {
    flex: 1,
    backgroundColor: "#F89230",
    justifyContent: "center",
    alignItems: 'center'
  },
  backgroundAnimation: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: width,
    height: SCREEN_HEIGHT,
    zIndex: 0,
  },
  gradient: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  contentContainer: {
    flex: 1,
    paddingBottom: 0,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 40 : 10,
    paddingBottom: 10,
  },
  headerRight: {
    width: 40,
  },
  logoContainer: {
    alignItems: "center",
    paddingVertical: 30,
  },
  iconAnimation: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  fullScreenImage: {
    width: 300,
    height: 300,
  },
  logoText: {
    fontSize: 36,
    fontFamily: "Bold",
    color: "#fff",
    textAlign: "center",
  },
  tagline: {
    fontSize: 16,
    fontFamily: "Regular",
    color: "#fff",
    opacity: 0.9,
    marginTop: 6,
  },
  featuresSection: {
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Bold",
    color: "#fff",
    marginBottom: 20,
    textAlign: "center",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  menuIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuIconAnimation: {
    width: 30,
    height: 30,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: "Medium",
    color: "#fff",
  },
  menuItemSubtext: {
    fontSize: 14,
    fontFamily: "Regular",
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginTop: "auto",
  },
  getStartedButton: {
    backgroundColor: "#667eea",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  getStartedText: {
    fontSize: 16,
    fontFamily: "Bold",
    color: "#fff",
    marginRight: 10,
  },
  buttonAnimation: {
    width: 24,
    height: 24,
  },
  termsText: {
    fontSize: 12,
    fontFamily: "Regular",
    color: "#fff",
    opacity: 0.7,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  termsLink: {
    fontFamily: "Medium",
    textDecorationLine: "underline",
  },
});

// Example Lottie JSON files you'll need to add to your assets/animations/ folder:
/*
Required Lottie animation files:
1. logo-animation.json - Main logo animation for splash screen
2. loading-animation.json - Loading spinner animation
3. background-animation.json - Background ambient animation
4. icon-animation.json - Small icon animation for main screen
5. location-icon.json - Location/map icon animation
6. booking-icon.json - Booking/calendar icon animation
7. support-icon.json - Support/help icon animation
8. arrow-right.json - Arrow animation for button

You can get these from:
- LottieFiles.com (free animations)
- Create custom animations in After Effects
- Use online Lottie generators
*/
