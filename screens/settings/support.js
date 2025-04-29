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
  Switch,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  Ionicons,
  MaterialIcons,
  FontAwesome5,
  Feather,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { auth, firestore } from "../../lib/db/firebase";
import { getAuth, signOut } from "firebase/auth";
import { collection, addDoc, query, where, getDocs, orderBy } from "firebase/firestore";

export default function Support({ navigation }) {
  const [fontsLoaded] = useFonts({
    Regular: require("../../assets/fonts/regular.ttf"),
    Medium: require("../../assets/fonts/medium.ttf"),
    Bold: require("../../assets/fonts/bold.ttf"),
  });

  const user = auth.currentUser;
  const usernumber = user?.phoneNumber?.replace(/^(\+91)(\d+)/, "$1-$2") || "";

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [createIssueModalVisible, setCreateIssueModalVisible] = useState(false);
  const [viewIssuesModalVisible, setViewIssuesModalVisible] = useState(false);
  const [issueSubject, setIssueSubject] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [issueCategory, setIssueCategory] = useState("General");
  const [userIssues, setUserIssues] = useState([]);
  const [loading, setLoading] = useState(false);

  const issueCategories = [
    "General",
    "Account",
    "Technical",
    "Billing",
    "Feature Request",
  ];

  // Fetch user issues from Firestore
  const fetchUserIssues = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const issuesRef = collection(firestore, "supportIssues");
      const q = query(
        issuesRef, 
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      const issues = [];
      querySnapshot.forEach((doc) => {
        issues.push({ id: doc.id, ...doc.data() });
      });
      
      setUserIssues(issues);
    } catch (error) {
      console.error("Error fetching issues:", error);
      Alert.alert("Error", "Failed to load your support tickets");
    } finally {
      setLoading(false);
    }
  };

  // Submit new issue to Firestore
  const handleSubmitIssue = async () => {
    if (!issueSubject.trim() || !issueDescription.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const issueData = {
        userId: user.uid,
        userPhone: user.phoneNumber,
        userName: user.displayName,
        subject: issueSubject,
        description: issueDescription,
        category: issueCategory,
        status: "Open",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDoc(collection(firestore, "supportIssues"), issueData);
      
      Alert.alert(
        "Success",
        "Your support ticket has been submitted successfully",
        [
          {
            text: "OK",
            onPress: () => {
              setIssueSubject("");
              setIssueDescription("");
              setIssueCategory("General");
              setCreateIssueModalVisible(false);
              fetchUserIssues(); // Refresh the issues list
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error submitting issue:", error);
      Alert.alert("Error", "Failed to submit your support ticket");
    } finally {
      setLoading(false);
    }
  };

  // Toggle handlers
  const toggleNotifications = () =>
    setNotificationsEnabled(!notificationsEnabled);
  const toggleDarkMode = () => setDarkModeEnabled(!darkModeEnabled);
  
  useEffect(() => {
    if (user) {
      fetchUserIssues();
    }
  }, [user]);

  if (!fontsLoaded) {
    return null;
  }

  const auths = getAuth();

  const handleLogout = async () => {
    try {
      await signOut(auths);
      console.log("User signed out!");
      navigation.replace("GetStarted");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Issue status badge component
  const StatusBadge = ({ status }) => {
    let bgColor = "#e0e0e0";
    let textColor = "#333";
    
    switch (status) {
      case "Open":
        bgColor = "#ffecb3";
        textColor = "#e65100";
        break;
      case "In Progress":
        bgColor = "#bbdefb";
        textColor = "#0d47a1";
        break;
      case "Resolved":
        bgColor = "#c8e6c9";
        textColor = "#1b5e20";
        break;
      case "Closed":
        bgColor = "#d7ccc8";
        textColor = "#3e2723";
        break;
    }
    
    return (
      <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
        <Text style={[styles.statusText, { color: textColor }]}>{status}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header with back button */}
      <View style={styles.header}>
        <View style={styles.headerRight} />
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Info Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: 'https://img.freepik.com/premium-vector/art-illustration_890735-11.jpg?ga=GA1.1.2127828126.1743705572&semt=ais_hybrid&w=740' }}
              style={styles.profileImage}
              defaultSource={require("../../assets/icon.png")}
            />
          </View>

          <Text style={styles.profileName}>{user.displayName}</Text>
          <Text style={styles.profileEmail}>{usernumber}</Text>
        </View>

        {/* Account Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("EditUserProfile")}
          >
            <View style={styles.menuIconContainer}>
              <Feather name="user" size={20} color="#333" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemText}>Personal Information</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Support</Text>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => setCreateIssueModalVisible(true)}
          >
            <View style={styles.menuIconContainer}>
              <MaterialIcons name="add-circle-outline" size={20} color="#333" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemText}>Create Support Ticket</Text>
              <Text style={styles.menuItemSubtext}>Report an issue or request help</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              fetchUserIssues();
              setViewIssuesModalVisible(true);
            }}
          >
            <View style={styles.menuIconContainer}>
              <MaterialIcons name="list-alt" size={20} color="#333" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemText}>My Support Tickets</Text>
              <Text style={styles.menuItemSubtext}>{userIssues.length} active tickets</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <MaterialIcons name="chat-bubble-outline" size={20} color="#333" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemText}>Live Chat Support</Text>
              <Text style={styles.menuItemSubtext}>Available 9AM - 6PM</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <FontAwesome5 name="question-circle" size={20} color="#333" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemText}>FAQs</Text>
              <Text style={styles.menuItemSubtext}>Common questions and answers</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <MaterialIcons name="info-outline" size={20} color="#333" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemText}>About</Text>
              <Text style={styles.menuItemSubtext}>Version 1.0.0</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>

        <View style={styles.logoutsectio}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleLogout}
          >
            <View style={styles.menuIconContainer}>
              <Feather name="log-out" size={20} color="#ff3b30" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.logoutText}>Log Out</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Create Issue Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={createIssueModalVisible}
        onRequestClose={() => setCreateIssueModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Support Ticket</Text>
              <TouchableOpacity
                onPress={() => setCreateIssueModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Issue Category</Text>
              <View style={styles.categoryContainer}>
                {issueCategories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      issueCategory === category && styles.categoryButtonActive,
                    ]}
                    onPress={() => setIssueCategory(category)}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        issueCategory === category && styles.categoryButtonTextActive,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Subject</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Briefly describe your issue"
                value={issueSubject}
                onChangeText={setIssueSubject}
                maxLength={100}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                placeholder="Provide details about your issue"
                value={issueDescription}
                onChangeText={setIssueDescription}
                multiline={true}
                numberOfLines={5}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmitIssue}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? "Submitting..." : "Submit Ticket"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* View Issues Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={viewIssuesModalVisible}
        onRequestClose={() => setViewIssuesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>My Support Tickets</Text>
              <TouchableOpacity
                onPress={() => setViewIssuesModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {loading ? (
                <Text style={styles.loadingText}>Loading your tickets...</Text>
              ) : userIssues.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="support" size={48} color="#ccc" />
                  <Text style={styles.emptyStateText}>No support tickets yet</Text>
                  <Text style={styles.emptyStateSubtext}>
                    When you create a support ticket, it will appear here
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyStateButton}
                    onPress={() => {
                      setViewIssuesModalVisible(false);
                      setTimeout(() => setCreateIssueModalVisible(true), 300);
                    }}
                  >
                    <Text style={styles.emptyStateButtonText}>Create a Ticket</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                userIssues.map((issue) => (
                  <View key={issue.id} style={styles.issueCard}>
                    <View style={styles.issueCardHeader}>
                      <View>
                        <Text style={styles.issueCardCategory}>{issue.category}</Text>
                        <Text style={styles.issueCardTitle}>{issue.subject}</Text>
                      </View>
                      <StatusBadge status={issue.status} />
                    </View>
                    <Text style={styles.issueCardDescription}>{issue.description}</Text>
                    <View style={styles.issueCardFooter}>
                      <Text style={styles.issueCardDate}>
                        {issue.createdAt.toDate().toLocaleDateString()}
                      </Text>
                      <TouchableOpacity style={styles.viewDetailsButton}>
                        <Text style={styles.viewDetailsText}>View Details</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  headerRight: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 30,
    borderBottomWidth: 8,
    borderBottomColor: "#f5f5f5",
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f0f0f0",
  },
  profileName: {
    fontSize: 22,
    fontFamily: "Bold",
    color: "#000",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    fontFamily: "Regular",
    color: "#777",
    marginBottom: 20,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 8,
    borderBottomColor: "#f5f5f5",
  },
  logoutsectio: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 8,
    borderBottomColor: "#fff",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Bold",
    color: "#000",
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: "Regular",
    color: "#333",
  },
  menuItemSubtext: {
    fontSize: 14,
    fontFamily: "Regular",
    color: "#777",
    marginTop: 2,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: "Medium",
    color: "#ff3b30",
  },
  bottomSpacing: {
    height: 40,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Bold",
    color: "#000",
  },
  closeButton: {
    padding: 5,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: "Medium",
    color: "#333",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Regular",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  textAreaInput: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  categoryButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  categoryButtonActive: {
    backgroundColor: "#2d6cdf",
    borderColor: "#2d6cdf",
  },
  categoryButtonText: {
    fontSize: 14,
    fontFamily: "Medium",
    color: "#333",
  },
  categoryButtonTextActive: {
    color: "#fff",
  },
  submitButton: {
    backgroundColor: "#2d6cdf",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: "Bold",
    color: "#fff",
  },

  // Issue card styles
  issueCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  issueCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  issueCardCategory: {
    fontSize: 12,
    fontFamily: "Medium",
    color: "#2d6cdf",
    marginBottom: 4,
  },
  issueCardTitle: {
    fontSize: 16,
    fontFamily: "Bold",
    color: "#333",
    marginRight: 10,
  },
  issueCardDescription: {
    fontSize: 14,
    fontFamily: "Regular",
    color: "#555",
    marginBottom: 10,
  },
  issueCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
  },
  issueCardDate: {
    fontSize: 12,
    fontFamily: "Regular",
    color: "#777",
  },
  viewDetailsButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: "#e8f0fe",
  },
  viewDetailsText: {
    fontSize: 12,
    fontFamily: "Medium",
    color: "#2d6cdf",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Medium",
  },
  
  // Empty state
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: "Bold",
    color: "#333",
    marginTop: 15,
    marginBottom: 5,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: "Regular",
    color: "#777",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  emptyStateButton: {
    backgroundColor: "#2d6cdf",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontFamily: "Medium",
    color: "#fff",
  },
  loadingText: {
    textAlign: "center",
    fontSize: 16,
    fontFamily: "Regular",
    color: "#777",
    padding: 30,
  },
});