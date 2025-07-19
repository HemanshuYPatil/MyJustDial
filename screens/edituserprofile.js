import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Switch,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons, Feather } from "@expo/vector-icons";
import { auth, storage, db } from "../lib/db/firebase";
import { updateProfile, updateEmail } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc, setDoc } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function EditProfileScreen({ navigation }) {
  const user = auth.currentUser;
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [imageUri, setImageUri] = useState(user?.photoURL || null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [phoneVisible, setPhoneVisible] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const docRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(docRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.phoneNumber) setPhoneNumber(data.phoneNumber);
        if (data.phonenumbervisible) setPhoneVisible(data.phonenumbervisible);
      }
    };
    if (user?.uid) fetchUserData();
  }, []);

  const pickImageFromGallery = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return Alert.alert("Permission required", "Grant gallery access.");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
      setImageUri(result.assets[0].uri);
    }
  };

  const pickImageFromCamera = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) return Alert.alert("Permission required", "Grant camera access.");

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadImage = async () => {
    if (!selectedImage?.uri || !user?.uid) return null;
    const blob = await (await fetch(selectedImage.uri)).blob();
    const filename = `profile_${user.uid}_${Date.now()}.jpg`;
    const storageRef = ref(storage, `profile_images/${filename}`);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const handleSave = async () => {
    if (!user?.uid) return Alert.alert("Error", "User not authenticated.");
    setLoading(true);

    try {
      let photoURL = user.photoURL;
      if (selectedImage) {
        const uploadedURL = await uploadImage();
        if (uploadedURL) photoURL = uploadedURL;
      }

      await updateProfile(user, { displayName, photoURL });

      if (email !== user.email && email.trim() !== "") {
        try {
          await updateEmail(user, email);
        } catch (error) {
          Alert.alert("Re-authentication required", "Sign in again to update email.");
          setLoading(false);
          return;
        }
      }

      await setDoc(doc(db, "users", user.uid), {
        displayName,
        email,
        phoneNumber,
        photoURL,
        phonenumbervisible: phoneVisible,
        updatedAt: new Date(),
      }, { merge: true });

      Alert.alert("Success", "Profile updated!", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error("Update error:", error);
      Alert.alert("Error", "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <Image
              source={{ uri: imageUri }}
              style={{ width: 120, height: 120, borderRadius: 60 }}
            />
            <View style={{ flexDirection: "row", marginTop: 10 }}>
              <TouchableOpacity onPress={pickImageFromGallery} style={styles.imageButton}>
                <Feather name="image" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={pickImageFromCamera} style={styles.imageButton}>
                <Feather name="camera" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            style={styles.input}
            placeholder="Enter your name"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            style={styles.input}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
          />

          <View style={styles.visibilityContainer}>
            <Text style={styles.label}>Phone Number Visibility</Text>
            <Text style={styles.subLabel}>Show your phone number to other users</Text>
            <View style={styles.switchContainer}>
              <Switch
                value={phoneVisible}
                onValueChange={setPhoneVisible}
                thumbColor={phoneVisible ? "#2d6cdf" : "#f4f3f4"}
                trackColor={{ false: "#f0f0f0", true: "#d0ddf5" }}
              />
              <Text style={styles.switchText}>
                {phoneVisible ? "Visible" : "Hidden"}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.saveButton,{bottom: insets.bottom}]} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: Platform.OS === "android" ? 40 : 10,
  },
  backButton: {
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  label: {
    fontSize: 16,
    marginBottom: 6,
    marginTop: 10,
    color: "#333",
    fontWeight: "500",
  },
  subLabel: {
    fontSize: 14,
    color: "#777",
    marginBottom: 10,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 10,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#000",
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginTop: 10,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  imageButton: {
    backgroundColor: "#2d6cdf",
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  visibilityContainer: {
    marginTop: 15,
    marginBottom: 10,
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  switchText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#333",
  },
});