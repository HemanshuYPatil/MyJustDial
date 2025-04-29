import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Image,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import AsyncStorage from "@react-native-async-storage/async-storage";

// List of available languages
const languages = [
  { id: "en", name: "English", nativeName: "English", flag: require("../../assets/splash.png") },
  { id: "hi", name: "Hindi", nativeName: "हिन्दी", flag: require("../../assets/splash.png") },
  { id: "es", name: "Spanish", nativeName: "Español", flag: require("../../assets/splash.png") },
  { id: "fr", name: "French", nativeName: "Français", flag: require("../../assets/splash.png") },
  { id: "de", name: "German", nativeName: "Deutsch", flag: require("../../assets/splash.png") },
  { id: "zh", name: "Chinese", nativeName: "中文", flag: require("../../assets/splash.png") },
  { id: "ja", name: "Japanese", nativeName: "日本語", flag: require("../../assets/splash.png") },
  { id: "ar", name: "Arabic", nativeName: "العربية", flag: require("../../assets/splash.png") },
//   { id: "pt", name: "Portuguese", nativeName: "Português", flag: require("../assets/flags/portugal.png") },
//   { id: "ru", name: "Russian", nativeName: "Русский", flag: require("../assets/flags/russia.png") },
];

export default function LanguageScreen({ navigation }) {
  const [fontsLoaded] = useFonts({
    Regular: require("../../assets/fonts/regular.ttf"),
    Medium: require("../../assets/fonts/medium.ttf"),
    Bold: require("../../assets/fonts/bold.ttf"),
  });

  const [selectedLanguage, setSelectedLanguage] = useState("en");

  // Load the current language when the component mounts
  useEffect(() => {
    const loadSelectedLanguage = async () => {
      try {
        const storedLanguage = await AsyncStorage.getItem("appLanguage");
        if (storedLanguage) {
          setSelectedLanguage(storedLanguage);
        }
      } catch (error) {
        console.error("Error loading language:", error);
      }
    };

    loadSelectedLanguage();
  }, []);

  // Save the selected language and apply it
  const changeLanguage = async (langId) => {
    try {
      setSelectedLanguage(langId);
      await AsyncStorage.setItem("appLanguage", langId);
      
      // Here you would update your app's translations/i18n context
      // For example, if using i18next:
      // i18n.changeLanguage(langId);
      
      console.log(`Language changed to: ${langId}`);
    } catch (error) {
      console.error("Error saving language:", error);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  // Render each language item
  const renderLanguageItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.languageItem,
        selectedLanguage === item.id && styles.selectedLanguageItem,
      ]}
      onPress={() => changeLanguage(item.id)}
    >
      <View style={styles.languageFlag}>
        <Image source={item.flag} style={styles.flagImage} />
      </View>
      <View style={styles.languageInfo}>
        <Text style={styles.languageName}>{item.name}</Text>
        <Text style={styles.languageNativeName}>{item.nativeName}</Text>
      </View>
      {selectedLanguage === item.id && (
        <View style={styles.checkIconContainer}>
          <Ionicons name="checkmark-circle" size={24} color="#2d6cdf" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Language</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Search bar (optional) */}
      {/* <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#777" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search languages"
          placeholderTextColor="#999"
        />
      </View> */}

      {/* Language description */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Select your preferred language for the app. All content will be displayed in the selected language.
        </Text>
      </View>

      {/* Language list */}
      <FlatList
        data={languages}
        renderItem={renderLanguageItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />

      {/* Apply button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.applyButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.applyButtonText}>Apply</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    fontFamily: "Regular",
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 15,
    height: 50,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    fontFamily: "Regular",
    color: "#333",
  },
  infoContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoText: {
    fontSize: 14,
    fontFamily: "Regular",
    color: "#777",
    lineHeight: 20,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 80,
  },
  languageItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  selectedLanguageItem: {
    backgroundColor: "#f5f9ff",
  },
  languageFlag: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  flagImage: {
    width: 40,
    height: 40,
    resizeMode: "cover",
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontFamily: "Medium",
    color: "#333",
  },
  languageNativeName: {
    fontSize: 14,
    fontFamily: "Regular",
    color: "#777",
    marginTop: 2,
  },
  checkIconContainer: {
    marginLeft: 10,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  applyButton: {
    backgroundColor: "#2d6cdf",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  applyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Medium",
  },
});