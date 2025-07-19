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
import * as SplashScreen from "expo-splash-screen";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/db/firebase";
import { Ionicons } from "@expo/vector-icons";
// Keep the splash screen visible while we fetch resources
// SplashScreen.preventAutoHideAsync();

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Focus states for each input
  const [focusedField, setFocusedField] = useState(null);

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

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    // At least 6 characters
    return password.length >= 6;
  };

  const handleSignUp = async () => {
    try {
      // Clear previous messages
      setMessage("");

      // Validate inputs
      if (!email.trim()) {
        setMessage("Please enter your email address");
        return;
      }

      if (!validateEmail(email)) {
        setMessage("Please enter a valid email address");
        return;
      }

      if (!password) {
        setMessage("Please enter a password");
        return;
      }

      if (!validatePassword(password)) {
        setMessage("Password must be at least 6 characters long");
        return;
      }

      if (password !== confirmPassword) {
        setMessage("Passwords do not match");
        return;
      }

      setLoading(true);

      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      setMessage("Account created successfully!");

      // Check if user is new (they should be since we just created the account)
      const isNew = userCredential._tokenResponse?.isNewUser ?? true;

      // Navigate based on user status
      if (isNew) {
        navigation.navigate("NewSignUp", { phone });
      } else {
        navigation.navigate("Home");
      }
    } catch (err) {
      console.error("Firebase auth error:", err);

      let errorMessage = "An error occurred during sign up.";
      if (err.code === "auth/email-already-in-use") {
        errorMessage =
          "This email is already registered. Try signing in instead.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      } else if (err.code === "auth/weak-password") {
        errorMessage =
          "Password is too weak. Please choose a stronger password.";
      } else if (err.code === "auth/operation-not-allowed") {
        errorMessage = "Email/password accounts are not enabled.";
      }

      Alert.alert("Sign Up Error", errorMessage);
      setMessage(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const navigateToSignIn = () => {
    navigation.navigate("login");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Text */}
          <View style={styles.headerContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerText}>Create your account</Text>
            <Text style={styles.subHeaderText}>Sign up to get started</Text>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View
                style={[
                  styles.inputContainer,
                  focusedField === "email" && styles.focusedInputContainer,
                ]}
              >
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Enter your email"
                  placeholderTextColor="#aaa"
                />
              </View>
            </View>

            {/* Phone Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View
                style={[
                  styles.inputContainer,
                  focusedField === "phone" && styles.focusedInputContainer,
                ]}
              >
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  onFocus={() => setFocusedField("phone")}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="+91 1234567890"
                  placeholderTextColor="#aaa"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View
                style={[
                  styles.inputContainer,
                  focusedField === "password" && styles.focusedInputContainer,
                ]}
              >
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry
                  placeholder="Enter your password"
                  placeholderTextColor="#aaa"
                />
              </View>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View
                style={[
                  styles.inputContainer,
                  focusedField === "confirmPassword" &&
                    styles.focusedInputContainer,
                ]}
              >
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocusedField("confirmPassword")}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry
                  placeholder="Confirm your password"
                  placeholderTextColor="#aaa"
                />
              </View>
            </View>
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[
              styles.signUpButton,
              loading ? styles.disabledButton : null,
            ]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.signUpButtonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          {message ? (
            <Text
              style={[
                styles.messageText,
                message.includes("Error")
                  ? styles.errorMessage
                  : styles.successMessage,
              ]}
            >
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
    fontFamily: "Regular",
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 40 : 20,
    paddingBottom: 40,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12, // You can use marginLeft instead of gap if unsupported
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
    marginBottom: 20,
  },
  headerText: {
    fontSize: 24,
    color: "#000",
    fontFamily: "Bold",
    marginBottom: 4,
  },
  subHeaderText: {
    fontSize: 14,
    color: "#666",
    fontFamily: "Regular",
  },
  formContainer: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: "Medium",
    color: "#333",
    marginBottom: 8,
  },
  inputContainer: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 15,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  focusedInputContainer: {
    borderColor: "#000",
    borderWidth: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Regular",
    color: "#333",
  },
  signUpButton: {
    backgroundColor: "#000",
    borderRadius: 12,
    height: 55,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: "#666",
  },
  signUpButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Bold",
  },
  messageText: {
    textAlign: "center",
    marginVertical: 15,
    fontFamily: "Regular",
    fontSize: 14,
    paddingHorizontal: 20,
  },
  errorMessage: {
    color: "#d32f2f",
  },
  successMessage: {
    color: "#388e3c",
  },
  signInContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 30,
  },
  signInText: {
    fontSize: 14,
    color: "#666",
    fontFamily: "Regular",
  },
  signInLink: {
    fontSize: 14,
    color: "#000",
    fontFamily: "Medium",
    textDecorationLine: "underline",
  },
  policyContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: "auto",
    paddingTop: 20,
    justifyContent: "center",
  },
  policyText: {
    fontSize: 12,
    color: "#777",
    fontFamily: "Regular",
  },
  policyLink: {
    fontSize: 12,
    color: "#000",
    textDecorationLine: "underline",
    fontFamily: "Medium",
  },
});
