import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from 'expo-splash-screen';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { PhoneAuthProvider } from "firebase/auth";
import { auth } from "../../lib/db/firebase";

// Keep the splash screen visible while we fetch resources
// SplashScreen.preventAutoHideAsync();

const  firebaseConfig = {
  apiKey: "AIzaSyCV1y35Yn5kd1h-S1ZsPPUpGdYEnT-Z7HQ",
  authDomain: "parcelo-e9635.firebaseapp.com",
  databaseURL: "https://parcelo-e9635-default-rtdb.firebaseio.com",
  projectId: "parcelo-e9635",
  storageBucket: "parcelo-e9635.firebasestorage.app",
  messagingSenderId: "718354714847",
  appId: "1:718354714847:web:4c3e308da5e8967b47996a",
  measurementId: "G-78S7YPE5MC",
};


export default function SignUpScreen({ navigation }) {
  const [phoneNumber, setPhoneNumber] = useState("+91 ");
  const [selectedCountry, setSelectedCountry] = useState({
    code: "+91",
    flag: "🇮🇳",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  const recaptchaVerifier = React.useRef(null);
  
  const [fontsLoaded] = useFonts({
    Regular: require("../../assets/fonts/regular.ttf"),
    Medium: require("../../assets/fonts/medium.ttf"),
    Bold: require("../../assets/fonts/bold.ttf"),
  });

  useEffect(() => {
    // Hide splash screen when fonts are loaded
    const hideSplash = async () => {
      if (fontsLoaded) {
        await SplashScreen.hideAsync();
      }
    };
    
    hideSplash();
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  const validatePhoneNumber = (number) => {
    // Basic validation - remove spaces and check if it has a valid format
    const cleanNumber = number.replace(/\s+/g, '');
    return /^\+[1-9]\d{1,14}$/.test(cleanNumber);
  };

  const sendVerification = async () => {
    try {
      // Validate phone number before proceeding
      if (!validatePhoneNumber(phoneNumber)) {
        setMessage("Please enter a valid phone number");
        return;
      }

      setLoading(true);
      
      // Make sure recaptchaVerifier is available
      if (!recaptchaVerifier.current) {
        setMessage("reCAPTCHA not loaded. Please try again.");
        setLoading(false);
        return;
      }

      // Clean the phone number by removing spaces
      const cleanPhoneNumber = phoneNumber.replace(/\s+/g, '');
      
      const phoneProvider = new PhoneAuthProvider(auth);
      const verificationId = await phoneProvider.verifyPhoneNumber(
        cleanPhoneNumber,
        recaptchaVerifier.current
      );
      
      setMessage("Verification code has been sent!");
      
      // Navigate to verification screen with necessary params
      navigation.navigate("Verify", {
        verificationId,
        phoneNumber: cleanPhoneNumber,
      });
    } catch (err) {
      console.error("Firebase phone auth error:", err);
      
      let errorMessage = "An error occurred during verification.";
      if (err.code === 'auth/invalid-phone-number') {
        errorMessage = "The phone number format is incorrect.";
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = "Too many attempts. Please try again later.";
      } else if (err.code === 'auth/captcha-check-failed') {
        errorMessage = "reCAPTCHA verification failed. Please try again.";
      }
      
      Alert.alert("Authentication Error", errorMessage);
      setMessage(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Firebase RecaptchaVerifier - invisible but needed for phone auth */}
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={firebaseConfig}
        attemptInvisibleVerification={true}
      />
      
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
            <Text style={styles.headerText}>What's your phone number?</Text>
          </View>

          {/* Phone Input Section */}
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.countrySelector}>
              <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.phoneInput}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoFocus
              placeholder="+91 98765 43210"
            />
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              loading ? styles.disabledButton : null
            ]}
            onPress={sendVerification}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.continueButtonText}>Continue</Text>
            )}
          </TouchableOpacity>

          {message ? (
            <Text style={[
              styles.messageText,
              message.includes("Error") ? styles.errorMessage : styles.successMessage
            ]}>
              {message}
            </Text>
          ) : null}
          
          {/* Privacy Policy */}
          <View style={styles.policyContainer}>
            <Text style={styles.policyText}>
              By continuing, you agree to our{" "}
            </Text>
            <TouchableOpacity>
              <Text style={styles.policyLink}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.policyText}> and </Text>
            <TouchableOpacity>
              <Text style={styles.policyLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
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
  disabledButton: {
    backgroundColor: "#666",
  },
  continueButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Regular",
  },
  messageText: {
    textAlign: "center",
    marginVertical: 10,
    fontFamily: "Regular",
    fontSize: 14,
  },
  errorMessage: {
    color: "#d32f2f",
  },
  successMessage: {
    color: "#388e3c",
  },
  policyContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: "auto",
    paddingTop: 20,
    justifyContent: "center",
  },
  policyText: {
    fontSize: 14,
    color: "#777",
    fontFamily: "Regular",
  },
  policyLink: {
    fontSize: 14,
    color: "#000",
    textDecorationLine: "underline",
    fontFamily: "Medium",
  },
});