import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Platform,
  Keyboard,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { PhoneAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "../../lib/db/firebase";
// import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";

export default function VerificationCodeScreen({ navigation, route }) {
  const { number, verificationId } = route.params;
  const DIGIT_COUNT = 6;

  const phoneNumber = route?.params?.phoneNumber || "063633 26210";

  const [timeLeft, setTimeLeft] = useState(60);

  const [code, setCode] = useState(Array(DIGIT_COUNT).fill(""));

  const [verfication, setverification] = useState(verificationId);
  const [canResend, setCanResend] = useState(true);
  const recaptchaVerifier = useRef(null);
  const inputRefs = useRef([]);

  // State to track if the Next button is enabled
  const [isNextEnabled, setIsNextEnabled] = useState(false);

  const [fontsLoaded] = useFonts({
    Regular: require("../../assets/fonts/regular.ttf"),
    Medium: require("../../assets/fonts/medium.ttf"),
    Bold: require("../../assets/fonts/bold.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  useEffect(() => {
    inputRefs.current = Array(DIGIT_COUNT)
      .fill()
      .map((_, i) => inputRefs.current[i] || React.createRef());
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft]);

  const formatTime = () => {
    const seconds = timeLeft % 60;
    return `(0:${seconds < 10 ? "0" + seconds : seconds})`;
  };

  const confirmCode = async () => {
    try {
      const codeString = code.join("");
      const credential = PhoneAuthProvider.credential(
        verificationId,
        codeString
      );
      const userCredential = await signInWithCredential(auth, credential);
      const isNew = userCredential._tokenResponse.isNewUser;

      if (isNew) {
        navigation.navigate("NewSignUp");
      } else {
        navigation.navigate("Home");
      }
    } catch (err) {
      let errorMessage = "An error occurred during verification.";
      if (err.code === 'auth/invalid-verification-code') {
        errorMessage = "Invalid verification code. Please try again.";
      } else if (err.code === 'auth/code-expired') {
        errorMessage = "Verification code has expired. Please request a new one.";
      }
      console.log("Error", errorMessage);
      // You might want to show this error to the user
    }
  };

  const resendCode = async () => {
    if (!canResend) return;

    try {
      setCanResend(false);

      const phoneProvider = new PhoneAuthProvider(auth);
      const newVerificationId = await phoneProvider.verifyPhoneNumber(
        phoneNumber,
        recaptchaVerifier.current
      );

      setverification(newVerificationId);
      console.log("Verification code resent successfully.");
      code.fill("");
      setTimeLeft(60);
    } catch (err) {
      console.log("Resend error:", err.message);
    } finally {
      setCanResend(true);
    }
  };
  const handleCodeChange = (text, index) => {
    if (text.length > 1) {
      const pastedText = text.split("").slice(0, DIGIT_COUNT);
      const newCode = [...code];

      pastedText.forEach((digit, i) => {
        if (index + i < DIGIT_COUNT) {
          newCode[index + i] = digit;
        }
      });

      setCode(newCode);

      const nextIndex = Math.min(index + pastedText.length, DIGIT_COUNT - 1);
      inputRefs.current[nextIndex]?.focus();
    } else {
      const newCode = [...code];
      newCode[index] = text;
      setCode(newCode);

      if (text !== "" && index < DIGIT_COUNT - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }

    const updatedCode = [...code];
    updatedCode[index] = text;
    setIsNextEnabled(updatedCode.every((digit) => digit !== ""));
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && index > 0 && code[index] === "") {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
    
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>
          Enter the {DIGIT_COUNT}-digit code sent to you at
        </Text>
        <Text style={styles.phoneText}>{phoneNumber}.</Text>
      </View>

      {/* Code Input Boxes */}
      <View style={styles.codeContainer}>
        {Array(DIGIT_COUNT)
          .fill()
          .map((_, index) => (
            <TextInput
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              style={styles.codeInput}
              value={code[index]}
              onChangeText={(text) => handleCodeChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={DIGIT_COUNT}
              selectTextOnFocus
            />
          ))}
      </View>

      {/* Resend Code Button */}
      <TouchableOpacity
        style={styles.resendButton}
        disabled={timeLeft > 0}
        onPress={resendCode}
      >
        <Text
          style={[
            styles.resendText,
            timeLeft > 0 ? styles.resendTextDisabled : {},
          ]}
        >
          I haven't received a code {timeLeft > 0 ? formatTime() : ""}
        </Text>
      </TouchableOpacity>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.nextButton,
            isNextEnabled ? styles.nextButtonEnabled : {},
          ]}
          disabled={!isNextEnabled}
          onPress={() => {
            confirmCode();
          }}
        >
          <Text
            style={[
              styles.nextButtonText,
              isNextEnabled ? styles.nextButtonTextEnabled : {},
            ]}
          >
            Next
          </Text>
          <Ionicons
            name="arrow-forward"
            size={20}
            color={isNextEnabled ? "#000" : "#ccc"}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 40 : 20,
  },
  headerContainer: {
    marginBottom: 30,
    marginTop: 20,
  },
  headerText: {
    fontSize: 22,
    color: "#000",
    fontFamily: "Medium",
  },
  phoneText: {
    fontSize: 24,
    color: "#000",
    marginTop: 4,
    fontFamily: "Bold",
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  codeInput: {
    width: 50,
    height: 60,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    fontSize: 24,
    textAlign: "center",
    fontFamily: "Regular",
  },
  resendButton: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    backgroundColor: "#f0f0f0",
  },
  resendText: {
    fontSize: 16,
    color: "#000",
    fontFamily: "Regular",
  },
  resendTextDisabled: {
    color: "#999",
  },
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 40,
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 30,
    backgroundColor: "#f0f0f0",
  },
  nextButtonEnabled: {
    backgroundColor: "#f0f0f0",
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: "Regular",
    color: "#ccc",
    marginRight: 8,
  },
  nextButtonTextEnabled: {
    color: "#000",
  },
});
