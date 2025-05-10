import React, { useRef, useState, useEffect } from "react";
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
import { PhoneAuthProvider, signInWithCredential, RecaptchaVerifier } from "firebase/auth";
import { auth } from "../../lib/db/firebase";

export default function SignUpScreen({ navigation }) {
  const [phoneNumber, setPhoneNumber] = useState("+91 ");
  const [selectedCountry, setSelectedCountry] = useState({
    code: "+91",
    flag: "🇮🇳",
  });
  const [fontsLoaded] = useFonts({
    Regular: require("../../assets/fonts/regular.ttf"),
    Medium: require("../../assets/fonts/medium.ttf"),
    Bold: require("../../assets/fonts/bold.ttf"),
  });

  const recaptchaVerifier = useRef(null);
  const [verificationId, setVerificationId] = useState(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize reCAPTCHA
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'normal',
      'callback': (response) => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
      },
      'expired-callback': () => {
        // Response expired. Ask user to solve reCAPTCHA again.
      }
    });
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  const sendVerification = async () => {
    try {
      setLoading(true);
      const phoneProvider = new PhoneAuthProvider(auth);
      const id = await phoneProvider.verifyPhoneNumber(
        phoneNumber,
        window.recaptchaVerifier
      );
      setVerificationId(id);
      setMessage("Verification code has been sent.");
      navigation.navigate("Verify", {
        verificationId: id,
        phoneNumber: phoneNumber,
      });
    } catch (err) {
      let errorMessage = "An error occurred during verification.";
      if (err.code === 'auth/invalid-phone-number') {
        errorMessage = "The phone number format is incorrect.";
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = "Too many attempts. Please try again later.";
      }
      setMessage(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
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
            <Text style={styles.headerText}>What's your phone number?</Text>
          </View>

          {/* Phone Input Section */}
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.countrySelector}>
              <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
              {/* <Ionicons name="chevron-down" size={16} color="#000" /> */}
            </TouchableOpacity>

            <TextInput
              style={styles.phoneInput}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoFocus
            />
          </View>

         

          {/* Continue Button */}
          <TouchableOpacity
            style={styles.continueButton}
            onPress={sendVerification}
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

      {/* Add this div for reCAPTCHA */}
      <div id="recaptcha-container"></div>
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
