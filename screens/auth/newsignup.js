import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Platform,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
// import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import {
  PhoneAuthProvider,
  signInWithCredential,
  updateProfile,
} from "firebase/auth";
import { auth, db } from "../../lib/db/firebase";
import { doc, setDoc } from "firebase/firestore";

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function NewSignUp({ navigation }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState({
    code: "+91",
    flag: "🇮🇳",
  });
  const [fontsLoaded] = useFonts({
    Regular: require("../../assets/fonts/regular.ttf"),
    Medium: require("../../assets/fonts/medium.ttf"),
    Bold: require("../../assets/fonts/bold.ttf"),
  });
  const [expoPushToken, setExpoPushToken] = useState('');
  const recaptchaVerifier = useRef(null);
  const [verificationId, setVerificationId] = useState(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const user = auth.currentUser;

  if (!fontsLoaded) {
    return null;
  }

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) setExpoPushToken(token);
    });
  }, []);

  const handlenavigation = async () => {
    if (phoneNumber.length != 0) {
      setUserDisplayName(phoneNumber);
      return;
    }
  };

  const setUserDisplayName = async (name) => {
    try {
      const user = auth.currentUser;

      if (user) {
        await updateProfile(user, {
          displayName: name,
        });

        

        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name: name,
          phone: user.phoneNumber,
          notificationId: expoPushToken,
          createdAt: new Date().toISOString(),
        });


        navigation.reset({
          index: 0,
          routes: [{ name: "Home" }],
        });
      } else {
        console.log("🚫 No user is currently signed in.");
      }
    } catch (error) {
      console.error("❌ Failed to update display name:", error);
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" hidden={false} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Text */}
          <View style={styles.headerContainer}>
            <Text style={styles.headerText}>What's your Name?</Text>
          </View>

          {/* Phone Input Section */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.phoneInput}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Full Name"
              autoFocus
            />
          </View>

          {/* <FirebaseRecaptchaVerifierModal
            ref={recaptchaVerifier}
            firebaseConfig={auth.app.options}
          /> */}

          {/* Continue Button */}
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handlenavigation}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.continueButtonText}>Continue</Text>
            )}
          </TouchableOpacity>

          {message ? <Text style={{ marginTop: 20 }}>{message}</Text> : null}
          {/* Privacy Policy */}
          {/* <View style={styles.policyContainer}>
            <Text style={styles.policyText}>
              This site is protected by reCAPTCHA and the Google{" "}
            </Text>
            <TouchableOpacity>
              <Text style={styles.policyLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.policyText}> and </Text>
            <TouchableOpacity>
              <Text style={styles.policyLink}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.policyText}> apply.</Text>
          </View> */}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 40 : 20,
    paddingBottom: 20,
  },
  headerContainer: {
    marginBottom: 30,
    marginTop: 20,
  },
  headerText: {
    fontSize: 24,
    // fontWeight: "bold",
    color: "#000",
    fontFamily: "Bold",
  },
  inputContainer: {
    flexDirection: "row",
    marginBottom: 20,
  },
  countrySelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginRight: 10,
  },
  countryFlag: {
    fontSize: 20,
    marginRight: 6,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Regular",
  },
  continueButton: {
    backgroundColor: "#000",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  continueButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Regular",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e0e0e0",
  },
  dividerText: {
    marginHorizontal: 10,
    color: "#777",
    fontSize: 14,
  },
  socialButtonsContainer: {
    marginBottom: 20,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 30,
    paddingVertical: 14,
    marginBottom: 12,
  },
  socialIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  termsText: {
    fontSize: 14,
    color: "#777",
    lineHeight: 20,
    marginBottom: 40,
  },
  policyContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: "auto",
    paddingTop: 20,
  },
  policyText: {
    fontSize: 14,
    color: "#777",
  },
  policyLink: {
    fontSize: 14,
    color: "#000",
    textDecorationLine: "underline",
  },
});

 async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

    if (!projectId) {
      console.warn('Project ID not found in constants.');
      return;
    }

    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log('Expo Push Token:', token);
    return token.toString();
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
}