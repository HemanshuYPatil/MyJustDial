import React from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  Linking,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  Ionicons,
  MaterialIcons,
  FontAwesome,
  Feather,
  AntDesign,
} from "@expo/vector-icons";

export default function DeveloperDetailsScreen({ navigation }) {
  // Developer data
  const developers = [
    {
      id: 1,
      name: "Hemanshu Patil",
      role: "Full Stack Developer",
      bio: "Full-stack developer with 4+ years of experience specializing in React Native and Firebase. Passionate about creating seamless mobile experiences.",
      avatarUrl: "https://img.freepik.com/premium-vector/programming-concept-with-cartoon-people-flat-design-web-man-coding-engineering-software-creating-scripts-algorithms-vector-illustration-social-media-banner-marketing-material_9209-15330.jpg?w=826",
      skills: ["React Native", "Firebase", "JavaScript", "UI/UX"],
      email: "hemanshuypatil@gmail.com",
      github: "https://github.com/HemanshuYPatil",
      linkedin: "linkedin.com/in/alexjohnson",
      phone: "+1-234-567-8901",
    },
    {
      id: 2,
      name: "Atharva Patil",
      role: "Technical Lead",
      bio: "Technical Lead with 5+ years of experience in application logic development and testing. Expert in building scalable systems, ensuring code quality, and leading end-to-end technical execution.",
      avatarUrl: "https://img.freepik.com/premium-vector/programming-concept-with-cartoon-people-flat-design-web-man-coding-engineering-software-creating-scripts-algorithms-vector-illustration-social-media-banner-marketing-material_9209-15330.jpg?w=826",
      skills: ["UI Design","Animation", "Prototyping"],
      email: "atharvapatil15092005@gmail.com",
      github: "github.com/atharvapatil",
      linkedin: "linkedin.com/in/sarahchen",
      phone: "+1-987-654-3210",
    },
  ];

  // Handle contact actions
  const handleContact = (type, value) => {
    switch (type) {
      case "email":
        Linking.openURL(`mailto:${value}`);
        break;
      case "github":
        Linking.openURL(`https://${value}`);
        break;
      case "linkedin":
        Linking.openURL(`https://${value}`);
        break;
      case "phone":
        Linking.openURL(`tel:${value}`);
        break;
      default:
        break;
    }
  };

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

        <Text style={styles.headerText}>Team</Text>

        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageDescription}>
          Meet our talented development team who brought this app to life
        </Text>

        {/* Developer Cards */}
        {developers.map((developer) => (
          <View key={developer.id} style={styles.developerCard}>
            <View style={styles.profileSection}>
              <View style={styles.profileImageContainer}>
                <Image
                  source={{ uri: developer.avatarUrl }}
                  style={styles.profileImage}
                  defaultSource={require("../../assets/icon.png")}
                />
              </View>

              <Text style={styles.profileName}>{developer.name}</Text>
              <Text style={styles.profileRole}>{developer.role}</Text>
              
              <Text style={styles.profileBio}>{developer.bio}</Text>
            </View>

            {/* Skills Section */}
            <View style={styles.skillsSection}>
              <Text style={styles.sectionTitle}>Skills</Text>
              <View style={styles.skillsContainer}>
                {developer.skills.map((skill, index) => (
                  <View key={index} style={styles.skillBadge}>
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Contact Section */}
            <View style={styles.contactSection}>
              <Text style={styles.sectionTitle}>Contact</Text>
              
              <TouchableOpacity 
                style={styles.contactItem}
                onPress={() => handleContact("email", developer.email)}
              >
                <View style={styles.contactIconContainer}>
                  <MaterialIcons name="email" size={20} color="#333" />
                </View>
                <Text style={styles.contactText}>{developer.email}</Text>
              </TouchableOpacity>

              
              <TouchableOpacity 
                style={styles.contactItem}
                onPress={() => handleContact("github", developer.github)}
              >
                <View style={styles.contactIconContainer}>
                  <AntDesign name="github" size={20} color="#333" />
                </View>
                <Text style={styles.contactText}>{developer.github}</Text>
              </TouchableOpacity>

            
            </View>

            {/* Social Media Links */}
        
          </View>
        ))}


        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
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
    paddingHorizontal: 20,
  },
  pageDescription: {
    fontSize: 16,
    fontFamily: "Regular",
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  developerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileSection: {
    alignItems: "center",
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  profileImageContainer: {
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f0f0f0",
  },
  profileName: {
    fontSize: 22,
    fontFamily: "Bold",
    color: "#000",
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 16,
    fontFamily: "Medium",
    color: "#2d6cdf",
    marginBottom: 16,
  },
  profileBio: {
    fontSize: 16,
    fontFamily: "Regular",
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
  },
  skillsSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Bold",
    color: "#000",
    marginBottom: 16,
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  skillBadge: {
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
  },
  skillText: {
    fontSize: 14,
    fontFamily: "Medium",
    color: "#333",
  },
  contactSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  contactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  contactText: {
    fontSize: 15,
    fontFamily: "Regular",
    color: "#333",
    flex: 1,
  },
  socialLinks: {
    flexDirection: "row",
    justifyContent: "center",
    paddingTop: 20,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 10,
  },
  supportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2d6cdf",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginVertical: 20,
  },
  supportButtonText: {
    fontSize: 16,
    fontFamily: "Medium",
    color: "#fff",
    marginRight: 8,
  },
  bottomSpacing: {
    height: 40,
  },
});