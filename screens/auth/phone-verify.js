import React, { useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../../lib/db/firebase";
import { CommonActions } from "@react-navigation/native";

export default function SignInScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Focus states
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const [fontsLoaded] = useFonts({
    Regular: require("../../assets/fonts/regular.ttf"),
    Medium: require("../../assets/fonts/medium.ttf"),
    Bold: require("../../assets/fonts/bold.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignIn = async () => {
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
        setMessage("Please enter your password");
        return;
      }

      setLoading(true);

      // Sign in with email and password
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      setMessage("Signed in successfully!");

      // Navigate to home screen
      setTimeout(() => {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "Home" }],
          })
        );
      }, 500);
    } catch (err) {
      console.error("Firebase auth error:", err);

      let errorMessage = "An error occurred during sign in.";
      if (err.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address.";
      } else if (err.code === "auth/wrong-password") {
        errorMessage = "Incorrect password. Please try again.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      } else if (err.code === "auth/user-disabled") {
        errorMessage = "This account has been disabled.";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later.";
      } else if (err.code === "auth/invalid-credential") {
        errorMessage =
          "Invalid email or password. Please check your credentials.";
      }

      Alert.alert("Sign In Error", errorMessage);
      setMessage(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Reset Password", "Please enter your email address first.");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Reset Password", "Please enter a valid email address.");
      return;
    }

    try {
      setResetLoading(true);

      await sendPasswordResetEmail(auth, email.trim());

      Alert.alert(
        "Reset Password",
        "Password reset email sent! Check your inbox and follow the instructions to reset your password."
      );
    } catch (err) {
      console.error("Password reset error:", err);

      let errorMessage = "An error occurred while sending reset email.";
      if (err.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      }

      Alert.alert("Reset Password Error", errorMessage);
    } finally {
      setResetLoading(false);
    }
  };

  const navigateToSignUp = () => {
    navigation.navigate("signup");
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
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() =>
                navigation.reset({
                  index: 0,
                  routes: [{ name: "Home" }],
                })
              }
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.headerText}>Welcome back</Text>
            <Text style={styles.subHeaderText}>Sign in to your account</Text>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View
                style={[
                  styles.inputContainer,
                  isEmailFocused && styles.focusedInput,
                ]}
              >
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setIsEmailFocused(true)}
                  onBlur={() => setIsEmailFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Enter your email"
                  placeholderTextColor="#aaa"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View
                style={[
                  styles.passwordContainer,
                  isPasswordFocused && styles.focusedInput,
                ]}
              >
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  secureTextEntry={!showPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#aaa"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={handleForgotPassword}
            disabled={resetLoading}
          >
            {resetLoading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            )}
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[
              styles.signInButton,
              loading ? styles.disabledButton : null,
            ]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.signInButtonText}>Sign In</Text>
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

          {/* Sign Up Link */}
          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <TouchableOpacity onPress={navigateToSignUp}>
              <Text style={styles.signUpLink}>Sign Up</Text>
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
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },

  titleContainer: {
    marginBottom: 40,
    marginTop: 20,
  },
  headerText: {
    fontSize: 28,
    color: "#000",
    fontFamily: "Bold",
    marginBottom: 8,
  },
  subHeaderText: {
    fontSize: 16,
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
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Regular",
    color: "#333",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 15,
    fontSize: 16,
    fontFamily: "Regular",
    color: "#333",
  },
  eyeButton: {
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  // Focus state style
  focusedInput: {
    borderColor: "#000",
    borderWidth: 2,
  },
  forgotPasswordButton: {
    alignSelf: "flex-end",
    marginBottom: 30,
    paddingVertical: 5,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#000",
    fontFamily: "Medium",
    textDecorationLine: "underline",
  },
  signInButton: {
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
  signInButtonText: {
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
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  signUpText: {
    fontSize: 14,
    color: "#666",
    fontFamily: "Regular",
  },
  signUpLink: {
    fontSize: 14,
    color: "#000",
    fontFamily: "Medium",
    textDecorationLine: "underline",
  },
});
