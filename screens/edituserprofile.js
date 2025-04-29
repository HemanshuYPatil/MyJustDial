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
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  Ionicons,
  MaterialIcons,
  Feather,
} from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { auth, storage, db } from "../lib/db/firebase";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc, getDoc } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";

export default function EditProfileScreen({ navigation }) {
  const [fontsLoaded] = useFonts({
    Regular: require("../assets/fonts/regular.ttf"),
    Medium: require("../assets/fonts/medium.ttf"),
    Bold: require("../assets/fonts/bold.ttf"),
  });

  const user = auth.currentUser;
  
  // State variables
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber?.replace(/^(\+91)(\d+)/, '$1-$2') || "");
  const [email, setEmail] = useState(user?.email || "");
  const [bio, setBio] = useState("");
  const [address, setAddress] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [imageUri, setImageUri] = useState(user?.photoURL || null);
  const [loading, setLoading] = useState(false);
  const [loadingUserData, setLoadingUserData] = useState(true);

  // Fetch additional user data from Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setBio(userData.bio || "");
          setAddress(userData.address || "");
        }
        
        setLoadingUserData(false);
      } catch (error) {
        console.error("Error fetching user data:", error);
        setLoadingUserData(false);
      }
    };

    fetchUserData();
  }, []);

  // Image picker function
  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert("Permission Required", "You need to grant permission to access your photos");
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled) {
        setProfileImage(result.assets[0]);
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image");
    }
  };

  // Upload image to Firebase Storage
  const uploadImage = async () => {
    if (!profileImage) return null;
    
    const filename = `profile_${user.uid}_${Date.now()}`;
    const storageRef = ref(storage, `profile_images/${filename}`);
    
    try {
      // Convert image to blob
      const response = await fetch(profileImage.uri);
      const blob = await response.blob();
      
      // Upload to Firebase Storage
      await uploadBytes(storageRef, blob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      return null;
    }
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    setLoading(true);
    
    try {
      let photoURL = user.photoURL;
      
      // Upload new image if selected
      if (profileImage) {
        const uploadedImageUrl = await uploadImage();
        if (uploadedImageUrl) {
          photoURL = uploadedImageUrl;
        }
      }
      
      // Update profile in Firebase Auth
      await updateProfile(user, {
        displayName: displayName,
        photoURL: photoURL,
      });
      
      // Update additional info in Firestore
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, {
        displayName: displayName,
        phoneNumber: user.phoneNumber,
        email: email || null,
        bio: bio,
        address: address,
        photoURL: photoURL,
        updatedAt: new Date(),
      }, { merge: true });
      
      Alert.alert(
        "Success",
        "Profile updated successfully",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded || loadingUserData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.headerText}>Edit Profile</Text>

        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Image Section */}
          <View style={styles.profileImageSection}>
            <View style={styles.profileImageContainer}>
              {imageUri ? (
                <Image 
                  source={{ uri: imageUri }}
                  style={styles.profileImage}
                  defaultSource={require('../assets/icon.png')}
                />
              ) : (
                <Image 
                  source={require('../assets/icon.png')}
                  style={styles.profileImage}
                  defaultSource={require('../assets/icon.png')}
                />
              )}
              <TouchableOpacity style={styles.editImageButton} onPress={pickImage}>
                <Feather name="edit-2" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.imageHelperText}>Tap to change profile picture</Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#aaa"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { color: "#888" }]}
                  value={phoneNumber}
                  editable={false}
                  placeholder="Phone number cannot be changed"
                  placeholderTextColor="#aaa"
                />
              </View>
              <Text style={styles.inputHelperText}>Phone number cannot be changed</Text>
            </View>

        
          </View>

          {/* Save Button */}
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSaveProfile}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
          
          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 40 : 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    fontSize: 20,
    fontFamily: "Bold",
    color: "#000",
  },
  headerRight: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileImageSection: {
    alignItems: "center",
    paddingVertical: 30,
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 10,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f0f0f0",
  },
  editImageButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2d6cdf",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  imageHelperText: {
    fontSize: 14,
    fontFamily: "Regular",
    color: "#777",
    marginTop: 5,
  },
  formContainer: {
    paddingHorizontal: 20,
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
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Regular",
    color: "#333",
  },
  inputHelperText: {
    fontSize: 12,
    fontFamily: "Regular",
    color: "#888",
    marginTop: 5,
    marginLeft: 5,
  },
  saveButton: {
    backgroundColor: "#000",
    borderRadius: 12,
    height: 55,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 20,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: "Bold",
    color: "#fff",
  },
  bottomSpacing: {
    height: 40,
  },
});