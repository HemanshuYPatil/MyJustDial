import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Platform,
  TextInput,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  Ionicons,
  MaterialIcons,
  FontAwesome5,
  Feather,
} from "@expo/vector-icons";
import { useFonts } from "expo-font";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
  doc,
} from "firebase/firestore";
import { auth, db } from "../../../lib/db/firebase";

const { width } = Dimensions.get("window");

export default function ChatListScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [chats, setChats] = useState([]);
  const [filteredChats, setFilteredChats] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [userData, setUserData] = useState({});
  const user = auth.currentUser;

  const [fontsLoaded] = useFonts({
    Regular: require("../../../assets/fonts/regular.ttf"),
    Medium: require("../../../assets/fonts/medium.ttf"),
    Bold: require("../../../assets/fonts/bold.ttf"),
  });

  // Fetch user profiles for the participants
  const fetchUserData = async (userId) => {
    if (userData[userId]) return userData[userId];

    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const newUserData = {
          ...userData,
          [userId]: userDoc.data(),
        };
        setUserData(newUserData);
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  };

  // Fetch chats from Firestore
  useEffect(() => {
    if (!user) return;

    const userId = user.uid;
    const chatsRef = collection(db, "chats");
    const q = query(
      chatsRef,
      where("participants", "array-contains", userId),
      orderBy("lastMessage.timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatsList = [];

      for (const docSnapshot of snapshot.docs) {
        const chatData = docSnapshot.data();

        // Find the other participant (not the current user)
        const otherParticipantId = chatData.participants.find(
          (participantId) => participantId !== userId
        );

        // Fetch other user's profile data
        const otherUserData = await fetchUserData(otherParticipantId);

        // Get unread count for current user
        const unreadCount = chatData.unreadCount?.[userId] || 0;

        chatsList.push({
          id: docSnapshot.id,
          name: otherUserData?.name || "Unknown User",
          lastMessage: chatData.lastMessage?.text || "",
          timestamp: chatData.lastMessage?.timestamp?.toDate() || new Date(),
          unread: unreadCount,
          avatar: otherUserData?.avatar || null,
          isActive: otherUserData?.isActive || false,
          type: chatData.tripId ? "trip" : "support",
          otherUserId: otherParticipantId,
          tripId: chatData.tripId || null,
        });
      }

      setChats(chatsList);
      setFilteredChats(chatsList);
    });

    return () => unsubscribe();
  }, [user]);

  // Filter chats based on search query
  useEffect(() => {
    if (!searchQuery) {
      setFilteredChats(chats);
      return;
    }

    const filtered = chats.filter(
      (chat) =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setFilteredChats(filtered);
  }, [searchQuery, chats]);

  if (!fontsLoaded) {
    return null;
  }

  const renderAvatar = (chat) => {
    if (chat.avatar) {
      return <Image source={{ uri: chat.avatar }} style={styles.avatar} />;
    } else {
      // Default icon for chats without avatar
      return (
        <Image
          source={{
            uri: "https://img.freepik.com/premium-vector/men-icon-trendy-avatar-character-cheerful-happy-people-flat-vector-illustration-round-frame-male-portraits-group-team-adorable-guys-isolated-white-background_275421-286.jpg",
          }}
          style={[styles.avatar, styles.defaultAvatar]}
          resizeMode="cover"
        />
      );
    }
  };

  const getRelativeTime = (timestamp) => {
    if (!(timestamp instanceof Date)) {
      return "";
    }

    const now = new Date();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) {
      return "Just now";
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return timestamp.toLocaleDateString();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" hidden={false} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headertext}>Messages</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <View style={styles.searchInput}>
            <Ionicons name="search" size={20} color="#777" />
            <TextInput
              style={styles.searchTextInput}
              placeholder="Search messages"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#777" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Chat List */}
      <ScrollView
        style={styles.chatListContainer}
        showsVerticalScrollIndicator={false}
      >
        {filteredChats.length > 0 ? (
          filteredChats.map((chat) => (
            <TouchableOpacity
              key={chat.id}
              style={styles.chatItem}
              onPress={() => {
                navigation.navigate("ChatDetail", {
                  chatId: chat.id,
                  name: chat.name,
                  otherUserId: chat.otherUserId,
                  tripId: chat.tripId,
                });
              }}
            >
              <View style={styles.avatarContainer}>
                {renderAvatar(chat)}
                {chat.isActive && <View style={styles.activeIndicator} />}
              </View>

              <View style={styles.chatDetails}>
                <View style={styles.chatHeader}>
                  <Text style={styles.chatName}>{chat.name}</Text>
                  <Text style={styles.timestamp}>
                    {getRelativeTime(chat.timestamp)}
                  </Text>
                </View>

                <View style={styles.chatFooter}>
                  <Text
                    style={[
                      styles.lastMessage,
                      chat.unread > 0 && styles.unreadMessage,
                    ]}
                    numberOfLines={1}
                  >
                    {chat.lastMessage}
                  </Text>

                  {chat.unread > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadCount}>{chat.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Feather name="message-circle" size={60} color="#ccc" />
            <Text style={styles.emptyStateText}>No messages found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery
                ? "Try a different search term"
                : "Your messages will appear here"}
            </Text>
          </View>
        )}

        {/* Add some spacing at the bottom */}
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 40 : 10,
    paddingBottom: 10,
  },
  headertext: {
    flex: 1,
    fontSize: 25,
    fontFamily: "Bold",
    justifyContent: "center",
    color: "#000",
    marginLeft: 8,
    alignItems: "center",
    marginTop: 5,
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  searchInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Regular",
    color: "#333",
    marginLeft: 10,
    paddingVertical: 0,
  },
  chatListContainer: {
    flex: 1,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#f0f0f0",
  },
  defaultAvatar: {
    backgroundColor: "#2d6cdf",
    justifyContent: "center",
    alignItems: "center",
  },
  activeIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "#fff",
    position: "absolute",
    bottom: 2,
    right: 2,
  },
  chatDetails: {
    flex: 1,
    justifyContent: "center",
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  chatName: {
    fontSize: 16,
    fontFamily: "Bold",
    color: "#000",
  },
  timestamp: {
    fontSize: 12,
    fontFamily: "Regular",
    color: "#999",
  },
  chatFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Regular",
    color: "#777",
  },
  unreadMessage: {
    fontFamily: "Medium",
    color: "#333",
  },
  unreadBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#2d6cdf",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  unreadCount: {
    fontSize: 12,
    fontFamily: "Bold",
    color: "#fff",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: "Bold",
    color: "#333",
    marginTop: 20,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: "Regular",
    color: "#777",
    textAlign: "center",
    marginTop: 8,
  },
  newChatButton: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#2d6cdf",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  bottomSpacing: {
    height: 80,
  },
});
