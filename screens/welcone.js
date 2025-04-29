import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  Dimensions,
  StatusBar as RNStatusBar,
  ActivityIndicator,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFonts } from "expo-font";
import { Video, ResizeMode } from "expo-av";
import * as Device from "expo-device";
import GetStartModel from "../components/startmodel";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/db/firebase";

const { width, height } = Dimensions.get("window");
const SCREEN_HEIGHT = height;
const STATUS_BAR_HEIGHT =
  Platform.OS === "ios" ? 50 : RNStatusBar.currentHeight || 0;

export default function GetStartedScreen({ navigation }) {
  const videoRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [useStaticBackground, setUseStaticBackground] = useState(false);
  const [model, setmodel] = useState(false);
  const [fontsLoaded] = useFonts({
    Regular: require("../assets/fonts/regular.ttf"),
    Medium: require("../assets/fonts/medium.ttf"),
    Bold: require("../assets/fonts/bold.ttf"),
  });

  useEffect(() => {
    const checkDeviceCapability = async () => {
      const deviceType = await Device.getDeviceTypeAsync();
      const isLowEndDevice =
        (Platform.OS === "android" && Platform.Version < 24) ||
        deviceType !== Device.DeviceType.PHONE;

      setUseStaticBackground(isLowEndDevice);
    };

    checkDeviceCapability();
  }, []);

  useEffect(() => {
    if (videoRef.current && !useStaticBackground) {
      setTimeout(() => {
        videoRef.current.playAsync();
      }, 300);
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.unloadAsync();
      }
    };
  }, [useStaticBackground]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
       
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      }  
    });

    return () => unsubscribe();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  const handleGetStarted = () => {
    setmodel(true);
  };

  const handleSignIn = () => {
    navigation.navigate("SignIn");
  };

  const renderBackground = () => {
    if (useStaticBackground || videoError) {
      return (
        <Image
          source={require("../assets/icon.png")}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
      );
    }

    return (
      <>
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

        <Video
          source={require("../assets/test.mp4")}
          style={styles.backgroundVideo}
          shouldPlay
          isLooping
          resizeMode="cover"
          isMuted
        />
      </>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      <GetStartModel isVisible={model} onClose={() => setmodel(false)}  navigation={navigation}/>

      {renderBackground()}

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

          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>Parcelo</Text>
            <Text style={styles.tagline}>Your destination, your journey</Text>
          </View>

          {/* <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>Our Features</Text>

            <View style={styles.menuItem}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="flash" size={20} color="#fff" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuItemText}>Fast Pickups</Text>
                <Text style={styles.menuItemSubtext}>
                  Get picked up within minutes
                </Text>
              </View>
            </View>

            <View style={styles.menuItem}>
              <View style={styles.menuIconContainer}>
                <MaterialIcons name="verified" size={20} color="#fff" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuItemText}>Trusted Drivers</Text>
                <Text style={styles.menuItemSubtext}>
                  All drivers are verified and trained
                </Text>
              </View>
            </View>

            <View style={styles.menuItem}>
              <View style={styles.menuIconContainer}>
                <FontAwesome5 name="shield-alt" size={20} color="#fff" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuItemText}>Safe Rides</Text>
                <Text style={styles.menuItemSubtext}>
                  Safety is our top priority
                </Text>
              </View>
            </View>
          </View> */}

          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.getStartedButton}
              onPress={handleGetStarted}
            >
              <Text style={styles.getStartedText}>Get Started</Text>
            </TouchableOpacity>

           

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
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    zIndex: 0,
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: width,
    height: SCREEN_HEIGHT,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    zIndex: 1,
  },
  gradient: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  contentContainer: {
    flex: 1,
    paddingBottom: 0, // Ensuring no extra padding at the bottom
    justifyContent: "space-between", // Making sure content is at the top and bottom
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
    paddingVertical: 70,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Bold",
    color: "#fff",
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
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
    marginTop: "auto", // Ensures it stays at the bottom without excess space
  },
  getStartedButton: {
    backgroundColor: "#000",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  getStartedText: {
    fontSize: 16,
    fontFamily: "Bold",
    color: "#fff",
  },
  signInContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  accountText: {
    fontSize: 16,
    fontFamily: "Regular",
    color: "#fff",
    opacity: 0.9,
  },
  signInText: {
    fontSize: 18,
    fontFamily: "Bold",
    color: "#fff",
    marginLeft: 6,
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
