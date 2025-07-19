import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
  ActivityIndicator,
  Keyboard,
  Modal,
  Pressable,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  Ionicons,
  MaterialIcons,
  FontAwesome5,
  Feather,
} from "@expo/vector-icons";
import { useFonts } from "expo-font";
import * as ImagePicker from "expo-image-picker";
import {
  collection,
  query,
  where,
  addDoc,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  uploadBytesResumable,
} from "firebase/storage";
import { auth, db, storage } from "../../../lib/db/firebase";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get("window");

const quickMessages = [
  "Need a ride",
  "Need to send small item",
  "Want someone to walk along",
  "Ask for directions",
  "Need contact number",
  "Share safety alert (late night, remote area, etc.)",
];

export default function ChatDetailScreen({ route, navigation }) {
  const { chatId, name, otherUserId, tripId } = route.params;
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [otherUserData, setOtherUserData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showQuickMessages, setShowQuickMessages] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const scrollViewRef = useRef(null);
  const attachmentAnimation = useRef(new Animated.Value(0)).current;
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const typingUnsubscribeRef = useRef(null);
  
  const user = auth.currentUser;
  const insets = useSafeAreaInsets();

  const [fontsLoaded] = useFonts({
    Regular: require("../../../assets/fonts/regular.ttf"),
    Medium: require("../../../assets/fonts/medium.ttf"),
    Bold: require("../../../assets/fonts/bold.ttf"),
  });

  // Enhanced keyboard listeners with better height detection
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
        setShowAttachmentOptions(false);
        setShowQuickMessages(false);
        setTimeout(scrollToBottom, Platform.OS === 'ios' ? 100 : 200);
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Handle Android back button for gesture navigation
  useEffect(() => {
    const backHandler = () => {
      if (showAttachmentOptions || showQuickMessages) {
        setShowAttachmentOptions(false);
        setShowQuickMessages(false);
        return true; // Prevent default back action
      }
      return false; // Allow default back action
    };

    if (Platform.OS === 'android') {
      const backSubscription = navigation.addListener('beforeRemove', (e) => {
        if (backHandler()) {
          e.preventDefault();
        }
      });

      return backSubscription;
    }
  }, [navigation, showAttachmentOptions, showQuickMessages]);

  // Fetch other user data
  useEffect(() => {
    const fetchOtherUserData = async () => {
      if (!otherUserId) return;
      
      try {
        const userDoc = await getDoc(doc(db, "users", otherUserId));
        if (userDoc.exists()) {
          setOtherUserData(userDoc.data());
        } else {
          console.warn("Other user document does not exist");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError("Failed to load user data");
      }
    };

    fetchOtherUserData();
  }, [otherUserId]);

  // Messages and typing listeners
  useEffect(() => {
    if (!user || !chatId) {
      setError("Missing user or chat ID");
      setIsLoading(false);
      return;
    }

    // Typing listener
    const typingRef = collection(db, "typing");
    const typingQuery = query(
      typingRef,
      where("chatId", "==", chatId),
      where("userId", "==", otherUserId)
    );

    typingUnsubscribeRef.current = onSnapshot(
      typingQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const typingData = snapshot.docs[0].data();
          setIsTyping(typingData.isTyping || false);
        } else {
          setIsTyping(false);
        }
      },
      (error) => {
        console.error("Error listening to typing status:", error);
      }
    );

    // Messages listener
    const messagesRef = collection(db, "messages");
    const q = query(
      messagesRef,
      where("chatId", "==", chatId),
      orderBy("timestamp", "asc")
    );

    unsubscribeRef.current = onSnapshot(
      q,
      async (snapshot) => {
        try {
          const messagesList = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              timestamp: data.timestamp?.toDate() || new Date(),
              sender: data.senderId === user.uid ? "user" : "other",
              status: data.status || "sent",
            };
          });

          setMessages(messagesList);
          setIsLoading(false);

          // Update unread messages to read
          const batch = writeBatch(db);
          let hasUnreadMessages = false;

          messagesList.forEach((msg) => {
            if (
              msg.sender === "other" &&
              msg.status !== "read" &&
              (msg.type === "text" || msg.type === "image")
            ) {
              const messageRef = doc(db, "messages", msg.id);
              batch.update(messageRef, { status: "read" });
              hasUnreadMessages = true;
            }
          });

          if (hasUnreadMessages) {
            try {
              await batch.commit();
            } catch (error) {
              console.error("Error updating message status:", error);
            }
          }

          setTimeout(scrollToBottom, 100);
        } catch (error) {
          console.error("Error processing messages:", error);
          setError("Failed to load messages");
          setIsLoading(false);
        }
      },
      (error) => {
        console.error("Error listening to messages:", error);
        setError("Failed to load messages");
        setIsLoading(false);
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (typingUnsubscribeRef.current) {
        typingUnsubscribeRef.current();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [chatId, user, otherUserId]);

  const scrollToBottom = useCallback(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, []);

  // Attachment animation
  useEffect(() => {
    Animated.timing(attachmentAnimation, {
      toValue: showAttachmentOptions ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    if (showAttachmentOptions) {
      Keyboard.dismiss();
    }
  }, [showAttachmentOptions, attachmentAnimation]);

  const handleTyping = useCallback(async (isTypingNow) => {
    if (!user || !chatId) return;

    try {
      const typingRef = collection(db, "typing");
      const typingQuery = query(
        typingRef,
        where("chatId", "==", chatId),
        where("userId", "==", user.uid)
      );

      const snapshot = await getDocs(typingQuery);

      if (snapshot.empty) {
        await addDoc(typingRef, {
          chatId,
          userId: user.uid,
          isTyping: isTypingNow,
          timestamp: serverTimestamp(),
        });
      } else {
        const docId = snapshot.docs[0].id;
        await updateDoc(doc(db, "typing", docId), {
          isTyping: isTypingNow,
          timestamp: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Error updating typing status:", error);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTypingNow) {
      typingTimeoutRef.current = setTimeout(() => {
        handleTyping(false);
      }, 3000);
    }
  }, [user, chatId]);

  const toggleAttachmentOptions = useCallback(() => {
    if (showAttachmentOptions) {
      setShowAttachmentOptions(false);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 300);
    } else {
      Keyboard.dismiss();
      setShowAttachmentOptions(true);
      setShowQuickMessages(false);
    }
  }, [showAttachmentOptions]);

  const toggleQuickMessages = useCallback(() => {
    if (showQuickMessages) {
      setShowQuickMessages(false);
    } else {
      Keyboard.dismiss();
      setShowQuickMessages(true);
      setShowAttachmentOptions(false);
    }
  }, [showQuickMessages]);

  const handleQuickMessageSelect = useCallback((msg) => {
    setMessage(msg);
    setShowQuickMessages(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSend = useCallback(async () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage === "" || !user || !chatId) return;

    const tempMessage = trimmedMessage;
    setMessage("");

    try {
      const messageData = {
        text: tempMessage,
        senderId: user.uid,
        receiverId: otherUserId,
        chatId,
        timestamp: serverTimestamp(),
        status: "sent",
        type: "text",
      };

      await addDoc(collection(db, "messages"), messageData);

      const chatRef = doc(db, "chats", chatId);
      await updateDoc(chatRef, {
        lastMessage: {
          text: tempMessage,
          timestamp: serverTimestamp(),
        },
      });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        handleTyping(false);
      }

      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessage(tempMessage); // Restore message on error
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
  }, [message, user, chatId, otherUserId, handleTyping]);

  const pickImage = useCallback(async () => {
    setShowAttachmentOptions(false);

    try {
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "We need camera roll permissions to select images."
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setUploading(true);

        try {
          const response = await fetch(imageUri);
          const blob = await response.blob();

          const imagePath = `chat_images/${chatId}/${user.uid}_${Date.now()}`;
          const storageRef = ref(storage, imagePath);

          const metadata = {
            contentType: "image/jpeg",
          };

          const uploadTask = uploadBytesResumable(storageRef, blob, metadata);

          await new Promise((resolve, reject) => {
            uploadTask.on(
              "state_changed",
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log("Upload is " + progress + "% done");
              },
              (error) => {
                console.error("Upload failed:", error);
                reject(error);
              },
              async () => {
                try {
                  const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                  resolve(downloadURL);
                } catch (urlError) {
                  reject(urlError);
                }
              }
            );
          });

          const downloadURL = await getDownloadURL(storageRef);

          const messageData = {
            imageUrl: downloadURL,
            senderId: user.uid,
            receiverId: otherUserId,
            chatId,
            timestamp: serverTimestamp(),
            status: "sent",
            type: "image",
          };

          await addDoc(collection(db, "messages"), messageData);

          const chatRef = doc(db, "chats", chatId);
          await updateDoc(chatRef, {
            lastMessage: {
              text: "📷 Photo",
              timestamp: serverTimestamp(),
            },
          });
        } catch (error) {
          console.error("Error uploading image:", error);
          Alert.alert("Error", "Failed to upload image. Please try again.");
        } finally {
          setUploading(false);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      setUploading(false);
      Alert.alert("Error", "Error selecting image. Please try again.");
    }
  }, [chatId, user, otherUserId]);

  const getRelativeTime = useCallback((timestamp) => {
    if (!(timestamp instanceof Date) || isNaN(timestamp.getTime())) {
      return "";
    }

    const now = new Date();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) {
      return "Just now";
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else {
      return timestamp.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }, []);

  const renderMessage = useCallback((message, index) => {
    const isUser = message.sender === "user";

    return (
      <View
        key={`${message.id}-${index}`}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.otherMessageContainer,
        ]}
      >
        {message.type === "text" && (
          <View
            style={[
              styles.messageBubble,
              isUser ? styles.userMessageBubble : styles.otherMessageBubble,
            ]}
          >
            <Text
              style={[styles.messageText, isUser && styles.userMessageText]}
            >
              {message.text}
            </Text>
          </View>
        )}

        {message.type === "image" && (
          <View
            style={[
              styles.imageBubble,
              isUser ? styles.userMessageBubble : styles.otherMessageBubble,
            ]}
          >
            <Image
              source={{ uri: message.imageUrl }}
              style={styles.messageImage}
              resizeMode="cover"
              onError={(error) => {
                console.error("Image load error:", error);
              }}
            />
          </View>
        )}

        <View style={styles.messageFooter}>
          <Text style={[styles.timestamp, isUser && styles.userTimestamp]}>
            {getRelativeTime(message.timestamp)}
          </Text>

          {isUser && (
            <View style={styles.statusContainer}>
              {message.status === "sending" && (
                <ActivityIndicator
                  size="small"
                  color="#999"
                  style={styles.statusIcon}
                />
              )}
              {message.status === "sent" && (
                <Ionicons
                  name="checkmark"
                  size={16}
                  color="#999"
                  style={styles.statusIcon}
                />
              )}
              {message.status === "delivered" && (
                <Ionicons
                  name="checkmark-done"
                  size={16}
                  color="#999"
                  style={styles.statusIcon}
                />
              )}
              {message.status === "read" && (
                <Ionicons
                  name="checkmark-done"
                  size={16}
                  color="#000"
                  style={styles.statusIcon}
                />
              )}
            </View>
          )}
        </View>
      </View>
    );
  }, [getRelativeTime]);

  if (!fontsLoaded) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            setIsLoading(true);
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Calculate proper padding for different navigation systems
  const bottomInset = Platform.OS === 'android' 
    ? Math.max(insets.bottom, 16) // Ensure minimum padding for 3-button nav
    : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => {
            if (tripId) {
              navigation.navigate("TripDetails", { tripId });
            }
          }}
        >
          {otherUserData?.avatar ? (
            <Image
              source={{ uri: otherUserData.avatar }}
              style={styles.userAvatar}
              onError={() => console.log("Avatar load error")}
            />
          ) : (
            <View style={styles.defaultAvatarContainer}>
              <Text style={styles.defaultAvatarText}>
                {name ? name.charAt(0).toUpperCase() : "?"}
              </Text>
            </View>
          )}

          <View style={styles.userTextInfo}>
            <Text style={styles.userName}>{name || "Unknown User"}</Text>
            <Text style={styles.userStatus}>
              {otherUserData?.isActive ? "Online" : "Offline"}
            </Text>
          </View>
        </TouchableOpacity>

        {tripId && (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate("TripDetails", { tripId })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FontAwesome5 name="map-marked-alt" size={20} color="#000" />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        style={{ flex: 1 }}
      >
        {isLoading ? (
          <View style={[styles.messagesContainer, styles.centered]}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={[
              styles.messagesContent,
              { paddingBottom: keyboardVisible ? 16 : bottomInset + 16 }
            ]}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.dateDivider}>
              <Text style={styles.dateDividerText}>Today</Text>
            </View>

            {messages.map((message, index) => renderMessage(message, index))}

            {isTyping && (
              <View style={[styles.messageContainer, styles.otherMessageContainer]}>
                <View style={[styles.typingBubble, styles.otherMessageBubble]}>
                  <View style={styles.typingIndicator}>
                    <View style={[styles.typingDot, styles.typingDot1]} />
                    <View style={[styles.typingDot, styles.typingDot2]} />
                    <View style={[styles.typingDot, styles.typingDot3]} />
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {showAttachmentOptions && (
          <Animated.View
            style={[
              styles.attachmentOptions,
              {
                transform: [
                  {
                    translateY: attachmentAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [100, 0],
                    }),
                  },
                ],
                opacity: attachmentAnimation,
              },
            ]}
          >
            <TouchableOpacity style={styles.attachmentOption} onPress={pickImage}>
              <View style={styles.attachmentIcon}>
                <Ionicons name="image" size={24} color="#fff" />
              </View>
              <Text style={styles.attachmentText}>Gallery</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <Modal
          transparent={true}
          visible={showQuickMessages}
          animationType="slide"
          onRequestClose={() => setShowQuickMessages(false)}
        >
          <Pressable
            style={styles.quickMessagesModalOverlay}
            onPress={() => setShowQuickMessages(false)}
          >
            <View style={[
              styles.quickMessagesContainer,
              { paddingBottom: bottomInset }
            ]}>
              {quickMessages.map((msg, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickMessageItem}
                  onPress={() => handleQuickMessageSelect(msg)}
                >
                  <Text style={styles.quickMessageText}>{msg}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Modal>

        <View style={[
          styles.inputContainer,
          { 
            paddingBottom: Platform.OS === 'android' ? bottomInset : 0,
            marginBottom: keyboardVisible && Platform.OS === 'android' ? 0 : 0
          }
        ]}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={toggleAttachmentOptions}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showAttachmentOptions ? "close" : "add"}
              size={24}
              color="#000"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickMessageButton}
            onPress={toggleQuickMessages}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chatbubble-ellipses" size={20} color="#000" />
          </TouchableOpacity>

          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Type a message..."
              value={message}
              onChangeText={(text) => {
                setMessage(text);
                if (text.length > 0) {
                  handleTyping(true);
                } else {
                  handleTyping(false);
                }
              }}
              onFocus={() => {
                setShowAttachmentOptions(false);
                setShowQuickMessages(false);
                setTimeout(scrollToBottom, 300);
              }}
              multiline
              maxHeight={100}
              placeholderTextColor="#999"
              editable={!uploading}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={handleSend}
            />
          </View>

          {uploading ? (
            <View style={styles.sendButton}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.sendButton,
                message.trim() === "" && styles.disabledSendButton,
              ]}
              onPress={handleSend}
              disabled={message.trim() === ""}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    paddingTop: Platform.OS === "android" ? 20 : 0,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#000",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  userInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  defaultAvatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  defaultAvatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  userTextInfo: {
    marginLeft: 12,
    justifyContent: "center",
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  userStatus: {
    fontSize: 12,
    color: "#666",
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 16,
  },
  dateDivider: {
    alignItems: "center",
    marginVertical: 16,
  },
  dateDividerText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    backgroundColor: "#eaeaea",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: "80%",
  },
  userMessageContainer: {
    alignSelf: "flex-end",
  },
  otherMessageContainer: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    borderRadius: 18,
    padding: 12,
  },
  userMessageBubble: {
    backgroundColor: "#000",
  },
  otherMessageBubble: {
    backgroundColor: "#f0f0f0",
  },
  messageText: {
    fontSize: 15,
    color: "#000",
  },
  userMessageText: {
    color: "#fff",
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
    color: "#999",
    marginLeft: 4,
  },
  userTimestamp: {
    marginRight: 4,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIcon: {
    marginLeft: 2,
  },
  imageBubble: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  messageImage: {
    width: width * 0.6,
    height: width * 0.6,
  },
  typingBubble: {
    borderRadius: 18,
    padding: 12,
    minWidth: 60,
    height: 36,
    justifyContent: "center",
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#999",
    marginHorizontal: 2,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  quickMessageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 6,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  disabledSendButton: {
    backgroundColor: "#ccc",
  },
  attachmentOptions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  attachmentOption: {
    alignItems: "center",
    marginRight: 24,
  },
  attachmentIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  attachmentText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
  },
  quickMessagesModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  quickMessagesContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: height * 0.4,
  },
  quickMessageItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  quickMessageText: {
    fontSize: 16,
    color: "#000",
  },
});