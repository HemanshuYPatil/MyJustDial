// import React, { useState, useEffect, useRef } from "react";
// import {
//   StyleSheet,
//   Text,
//   View,
//   SafeAreaView,
//   TouchableOpacity,
//   ScrollView,
//   Image,
//   TextInput,
//   KeyboardAvoidingView,
//   Platform,
//   Dimensions,
//   Animated,
//   ActivityIndicator,
//   Keyboard,
// } from "react-native";
// import { StatusBar } from "expo-status-bar";
// import {
//   Ionicons,
//   MaterialIcons,
//   FontAwesome5,
//   Feather,
// } from "@expo/vector-icons";
// import { useFonts } from "expo-font";
// import * as ImagePicker from "expo-image-picker";
// import {
//   collection,
//   query,
//   where,
//   addDoc,
//   orderBy,
//   onSnapshot,
//   serverTimestamp,
//   doc,
//   updateDoc,
//   getDoc,
//   getDocs,
//   increment as firestoreIncrement,
// } from "firebase/firestore";
// import { ref, uploadBytes, getDownloadURL, getStorage, uploadBytesResumable } from "firebase/storage";
// import { auth, db, storage } from "../../../lib/db/firebase";
// import * as FileSystem from 'expo-file-system';

// const { width } = Dimensions.get("window");

// export default function ChatDetailScreen({ route, navigation }) {
//   const { chatId, name, otherUserId, tripId } = route.params;
//   const [message, setMessage] = useState("");
//   const [messages, setMessages] = useState([]);
//   const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
//   const [isTyping, setIsTyping] = useState(false);
//   const [typingTimeout, setTypingTimeout] = useState(null);
//   const [otherUserData, setOtherUserData] = useState(null);
//   const [uploading, setUploading] = useState(false);
//   const [keyboardVisible, setKeyboardVisible] = useState(false);
//   const scrollViewRef = useRef(null);
//   const attachmentAnimation = useRef(new Animated.Value(0)).current;
//   const inputRef = useRef(null);
//   const user = auth.currentUser;

//   const [fontsLoaded] = useFonts({
//     Regular: require("../../../assets/fonts/regular.ttf"),
//     Medium: require("../../../assets/fonts/medium.ttf"),
//     Bold: require("../../../assets/fonts/bold.ttf"),
//   });

//   // Handle keyboard visibility
//   useEffect(() => {
//     const keyboardDidShowListener = Keyboard.addListener(
//       "keyboardDidShow",
//       () => {
//         setKeyboardVisible(true);
//         setShowAttachmentOptions(false);
//         scrollToBottom();
//       }
//     );
//     const keyboardDidHideListener = Keyboard.addListener(
//       "keyboardDidHide",
//       () => {
//         setKeyboardVisible(false);
//       }
//     );

//     return () => {
//       keyboardDidShowListener.remove();
//       keyboardDidHideListener.remove();
//     };
//   }, []);

//   // Fetch other user data
//   useEffect(() => {
//     const fetchOtherUserData = async () => {
//       try {
//         const userDoc = await getDoc(doc(db, "users", otherUserId));
//         if (userDoc.exists()) {
//           setOtherUserData(userDoc.data());
//         }
//       } catch (error) {
//         console.error("Error fetching user data:", error);
//       }
//     };

//     fetchOtherUserData();
//   }, [otherUserId]);

//   // Fetch messages from Firestore
//   useEffect(() => {
//     if (!user || !chatId) return;

//     // Reset unread count for current user
//     const updateUnreadCount = async () => {
//       try {
//         const chatRef = doc(db, "chats", chatId);
//         await updateDoc(chatRef, {
//           [`unreadCount.${user.uid}`]: 0,
//         });
//       } catch (error) {
//         console.error("Error resetting unread count:", error);
//       }
//     };

//     updateUnreadCount();

//     // Listen for typing indicator
//     const typingRef = collection(db, "typing");
//     const typingQuery = query(
//       typingRef,
//       where("chatId", "==", chatId),
//       where("userId", "==", otherUserId)
//     );

//     const typingUnsubscribe = onSnapshot(typingQuery, (snapshot) => {
//       if (!snapshot.empty) {
//         const typingData = snapshot.docs[0].data();
//         setIsTyping(typingData.isTyping);
//       } else {
//         setIsTyping(false);
//       }
//     });

//     // Listen for messages
//     const messagesRef = collection(db, "messages");
//     const q = query(
//       messagesRef,
//       where("chatId", "==", chatId),
//       orderBy("timestamp", "asc")
//     );

//     const unsubscribe = onSnapshot(q, (snapshot) => {
//       const messagesList = snapshot.docs.map((doc) => {
//         const data = doc.data();
//         return {
//           id: doc.id,
//           ...data,
//           timestamp: data.timestamp?.toDate() || new Date(),
//           sender: data.senderId === user.uid ? "user" : "other",
//           status: data.status || "sent",
//         };
//       });

//       setMessages(messagesList);

//       // Mark messages as read
//       messagesList.forEach(async (msg) => {
//         if (msg.sender === "other" && msg.status !== "read") {
//           const messageRef = doc(db, "messages", msg.id);
//           await updateDoc(messageRef, { status: "read" });
//         }
//       });

//       // Scroll to bottom when messages change
//       setTimeout(scrollToBottom, 100);
//     });

//     return () => {
//       unsubscribe();
//       typingUnsubscribe();
//       if (typingTimeout) {
//         clearTimeout(typingTimeout);
//       }
//     };
//   }, [chatId, user, otherUserId]);

//   // Auto scroll to bottom when new messages arrive
//   const scrollToBottom = () => {
//     if (scrollViewRef.current) {
//       scrollViewRef.current.scrollToEnd({ animated: true });
//     }
//   };

//   // Handle attachment options animation
//   useEffect(() => {
//     Animated.timing(attachmentAnimation, {
//       toValue: showAttachmentOptions ? 1 : 0,
//       duration: 300,
//       useNativeDriver: true,
//     }).start();

//     // Hide keyboard when showing attachments
//     if (showAttachmentOptions) {
//       Keyboard.dismiss();
//     }
//   }, [showAttachmentOptions]);

//   if (!fontsLoaded) {
//     return null;
//   }

//   // Update typing indicator
//   const handleTyping = async (isTyping) => {
//     if (!user || !chatId) return;

//     try {
//       const typingRef = collection(db, "typing");
//       const typingQuery = query(
//         typingRef,
//         where("chatId", "==", chatId),
//         where("userId", "==", user.uid)
//       );

//       const snapshot = await getDocs(typingQuery);

//       if (snapshot.empty) {
//         await addDoc(typingRef, {
//           chatId,
//           userId: user.uid,
//           isTyping,
//           timestamp: serverTimestamp(),
//         });
//       } else {
//         const docId = snapshot.docs[0].id;
//         await updateDoc(doc(db, "typing", docId), {
//           isTyping,
//           timestamp: serverTimestamp(),
//         });
//       }
//     } catch (error) {
//       console.error("Error updating typing status:", error);
//     }

//     if (typingTimeout) {
//       clearTimeout(typingTimeout);
//     }

//     const timeout = setTimeout(() => {
//       handleTyping(false);
//     }, 3000);

//     setTypingTimeout(timeout);
//   };

//   // Toggle attachment options
//   const toggleAttachmentOptions = () => {
//     if (showAttachmentOptions) {
//       setShowAttachmentOptions(false);
//       // Focus on the input after a slight delay
//       setTimeout(() => {
//         if (inputRef.current) {
//           inputRef.current.focus();
//         }
//       }, 300);
//     } else {
//       Keyboard.dismiss();
//       setShowAttachmentOptions(true);
//     }
//   };

//   // Send message
//   const handleSend = async () => {
//     if (message.trim() === "" || !user || !chatId) return;

//     try {
//       // Add message to Firestore
//       const messageData = {
//         text: message,
//         senderId: user.uid,
//         receiverId: otherUserId,
//         chatId,
//         timestamp: serverTimestamp(),
//         status: "sent",
//         type: "text",
//       };

//       const messageRef = await addDoc(collection(db, "messages"), messageData);

//       // Update chat with last message
//       const chatRef = doc(db, "chats", chatId);
//       await updateDoc(chatRef, {
//         lastMessage: {
//           text: message,
//           timestamp: serverTimestamp(),
//         },
//         [`unreadCount.${otherUserId}`]: firestoreIncrement(1),
//       });

//       // Clear message input
//       setMessage("");

//       // Stop typing indicator
//       if (typingTimeout) {
//         clearTimeout(typingTimeout);
//         handleTyping(false);
//       }

//       // Focus input after sending
//       if (inputRef.current) {
//         inputRef.current.focus();
//       }
//     } catch (error) {
//       console.error("Error sending message:", error);
//     }
//   };

//   // Upload and send image
//   const pickImage = async () => {
//     setShowAttachmentOptions(false);

//     try {
//       // Request permissions if needed
//       if (Platform.OS !== "web") {
//         const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
//         if (status !== "granted") {
//           alert("Sorry, we need camera roll permissions to make this work!");
//           return;
//         }
//       }

//       // Launch image picker
//       const result = await ImagePicker.launchImageLibraryAsync({
//         mediaTypes: ImagePicker.MediaTypeOptions.Images,
//         allowsEditing: true,
//         aspect: [4, 3],
//         quality: 0.8,
//       });

//       console.log("Image result:", result);

//       if (!result.canceled && result.assets && result.assets[0]) {
//         const imageUri = result.assets[0].uri;
//         console.log("Selected URI:", imageUri);

//         setUploading(true);

//         try {
//           // First, fetch the image as a blob
//           const response = await fetch(imageUri);
//           const blob = await response.blob();

//           // Get reference to storage
//           const storage = getStorage();

//           // Create a unique path for the image
//           const imagePath = `chat_images/${chatId}/${user.uid}_${Date.now()}`;
//           const storageRef = ref(storage, imagePath);

//           // Create file metadata including the content type
//           const metadata = {
//             contentType: 'image/jpeg'
//           };

//           // Start the upload task
//           const uploadTask = uploadBytesResumable(storageRef, blob, metadata);

//           // Return a promise that resolves when the upload is complete
//           await new Promise((resolve, reject) => {
//             uploadTask.on(
//               'state_changed',
//               (snapshot) => {
//                 // You could update a progress indicator here if desired
//                 const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
//                 console.log('Upload is ' + progress + '% done');
//               },
//               (error) => {
//                 // Handle unsuccessful uploads
//                 console.error("Upload failed:", error);
//                 reject(error);
//               },
//               async () => {
//                 // Upload completed successfully
//                 try {
//                   const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
//                   console.log('File available at', downloadURL);
//                   resolve(downloadURL);
//                 } catch (urlError) {
//                   reject(urlError);
//                 }
//               }
//             );
//           });

//           // Get the download URL after upload completes
//           const downloadURL = await getDownloadURL(storageRef);

//           // Create message data
//           const messageData = {
//             imageUrl: downloadURL,
//             senderId: user.uid,
//             receiverId: otherUserId,
//             chatId,
//             timestamp: serverTimestamp(),
//             status: "sent",
//             type: "image",
//           };

//           // Save the message to Firestore
//           await addDoc(collection(db, "messages"), messageData);

//           // Update the chat with the last message
//           const chatRef = doc(db, "chats", chatId);
//           await updateDoc(chatRef, {
//             lastMessage: {
//               text: "📷 Photo",
//               timestamp: serverTimestamp(),
//             },
//             [`unreadCount.${otherUserId}`]: firestoreIncrement(1),
//           });

//         } catch (error) {
//           console.error("Error uploading image:", error);

//           let errorMessage = "Failed to upload image. Please try again.";
//           if (error.code === 'storage/unauthorized') {
//             errorMessage = "You don't have permission to upload this image.";
//           } else if (error.code === 'storage/canceled') {
//             errorMessage = "Upload was canceled.";
//           } else if (error.code === 'storage/unknown') {
//             errorMessage = "An unknown error occurred during upload.";
//           } else if (error.message?.includes("Network request failed")) {
//             errorMessage = "Network error. Please check your connection and try again.";
//           }

//           alert(errorMessage);
//         } finally {
//           setUploading(false);
//         }
//       } else {
//         console.log("Image picking was canceled or no assets found.");
//       }
//     } catch (error) {
//       console.error("Error picking image:", error);
//       setUploading(false);
//       alert("Error selecting image. Please try again.");
//     }
//   };

//   const getRelativeTime = (timestamp) => {
//     if (!(timestamp instanceof Date)) {
//       return "";
//     }

//     const now = new Date();
//     const diffMs = now - timestamp;
//     const diffMins = Math.floor(diffMs / (1000 * 60));

//     if (diffMins < 1) {
//       return "Just now";
//     } else if (diffMins < 60) {
//       return `${diffMins}m ago`;
//     } else {
//       return timestamp.toLocaleTimeString([], {
//         hour: "2-digit",
//         minute: "2-digit",
//       });
//     }
//   };

//   const renderMessage = (message) => {
//     const isUser = message.sender === "user";

//     return (
//       <View
//         key={message.id}
//         style={[
//           styles.messageContainer,
//           isUser ? styles.userMessageContainer : styles.otherMessageContainer,
//         ]}
//       >
//         {message.type === "text" && (
//           <View
//             style={[
//               styles.messageBubble,
//               isUser ? styles.userMessageBubble : styles.otherMessageBubble,
//             ]}
//           >
//             <Text style={[styles.messageText, isUser && { color: "#fff" }]}>
//               {message.text}
//             </Text>
//           </View>
//         )}

//         {message.type === "image" && (
//           <View
//             style={[
//               styles.imageBubble,
//               isUser ? styles.userMessageBubble : styles.otherMessageBubble,
//             ]}
//           >
//             <Image
//               source={{ uri: message.imageUrl }}
//               style={styles.messageImage}
//               resizeMode="cover"
//             />
//           </View>
//         )}

//         <View style={styles.messageFooter}>
//           <Text style={[styles.timestamp, isUser && styles.userTimestamp]}>
//             {getRelativeTime(message.timestamp)}
//           </Text>

//           {isUser && (
//             <View style={styles.statusContainer}>
//               {message.status === "sending" && (
//                 <ActivityIndicator
//                   size="small"
//                   color="#999"
//                   style={styles.statusIcon}
//                 />
//               )}
//               {message.status === "sent" && (
//                 <Ionicons
//                   name="checkmark"
//                   size={16}
//                   color="#999"
//                   style={styles.statusIcon}
//                 />
//               )}
//               {message.status === "delivered" && (
//                 <Ionicons
//                   name="checkmark-done"
//                   size={16}
//                   color="#999"
//                   style={styles.statusIcon}
//                 />
//               )}
//               {message.status === "read" && (
//                 <Ionicons
//                   name="checkmark-done"
//                   size={16}
//                   color="#2d6cdf"
//                   style={styles.statusIcon}
//                 />
//               )}
//             </View>
//           )}
//         </View>
//       </View>
//     );
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar style="dark" />

//       {/* Header */}
//       <View style={styles.header}>
//         <TouchableOpacity
//           style={styles.backButton}
//           onPress={() => navigation.goBack()}
//         >
//           <Ionicons name="arrow-back" size={24} color="#000" />
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={styles.userInfo}

//         >
//           {otherUserData?.avatar ? (
//             <Image
//               source={{ uri: otherUserData.avatar }}
//               style={styles.userAvatar}
//             />
//           ) : (
//             <Image
//               source={{
//                 uri: "https://img.freepik.com/premium-vector/men-icon-trendy-avatar-character-cheerful-happy-people-flat-vector-illustration-round-frame-male-portraits-group-team-adorable-guys-isolated-white-background_275421-286.jpg",
//               }}
//               style={[styles.userAvatar, styles.defaultAvatar]}
//               resizeMode="cover"
//             />
//           )}

//           <View style={styles.userTextInfo}>
//             <Text style={styles.userName}>{name}</Text>
//             <Text style={styles.userStatus}>
//               {otherUserData?.isActive ? "Online" : "Offline"}
//             </Text>
//           </View>
//         </TouchableOpacity>

//         <View style={styles.headerActions}>
//           {tripId && (
//             <TouchableOpacity
//               style={styles.headerButton}
//               onPress={() => navigation.navigate("TripDetails", { tripId })}
//             >
//               <FontAwesome5 name="map-marked-alt" size={20} color="#000" />
//             </TouchableOpacity>
//           )}

//           <TouchableOpacity style={styles.headerButton}>
//             <MaterialIcons name="more-vert" size={24} color="#333" />
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* Messages */}
//       <ScrollView
//         ref={scrollViewRef}
//         style={styles.messagesContainer}
//         contentContainerStyle={styles.messagesContent}
//         showsVerticalScrollIndicator={false}
//       >
//         <View style={styles.dateDivider}>
//           <Text style={styles.dateDividerText}>Today</Text>
//         </View>

//         {messages.map(renderMessage)}

//         {isTyping && (
//           <View style={[styles.messageContainer, styles.otherMessageContainer]}>
//             <View style={[styles.typingBubble, styles.otherMessageBubble]}>
//               <View style={styles.typingIndicator}>
//                 <View style={[styles.typingDot, styles.typingDot1]} />
//                 <View style={[styles.typingDot, styles.typingDot2]} />
//                 <View style={[styles.typingDot, styles.typingDot3]} />
//               </View>
//             </View>
//           </View>
//         )}

//         {/* Space at the bottom */}
//         <View style={{ height: 16 }} />
//       </ScrollView>

//       {/* Attachment options */}
//       {showAttachmentOptions && (
//         <Animated.View
//           style={[
//             styles.attachmentOptions,
//             {
//               transform: [
//                 {
//                   translateY: attachmentAnimation.interpolate({
//                     inputRange: [0, 1],
//                     outputRange: [100, 0],
//                   }),
//                 },
//               ],
//               opacity: attachmentAnimation,
//             },
//           ]}
//         >
//           <TouchableOpacity style={styles.attachmentOption} onPress={pickImage}>
//             <View
//               style={[styles.attachmentIcon, { backgroundColor: "#4CAF50" }]}
//             >
//               <Ionicons name="image" size={24} color="#fff" />
//             </View>
//             <Text style={styles.attachmentText}>Gallery</Text>
//           </TouchableOpacity>

//         </Animated.View>
//       )}

//       {/* Input area */}
//       <KeyboardAvoidingView
//         behavior={Platform.OS === "ios" ? "padding" : "height"}
//         keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
//         style={styles.inputContainer}
//       >
//         <TouchableOpacity
//           style={styles.attachButton}
//           onPress={toggleAttachmentOptions}
//         >
//           <Ionicons
//             name={showAttachmentOptions ? "close" : "add"}
//             size={24}
//             color="#000"
//           />
//         </TouchableOpacity>

//         <View style={styles.inputWrapper}>
//           <TextInput
//             ref={inputRef}
//             style={styles.input}
//             placeholder="Type a message..."
//             value={message}
//             onChangeText={(text) => {
//               setMessage(text);
//               if (text.length > 0) {
//                 handleTyping(true);
//               }
//             }}
//             onFocus={() => {
//               // Hide attachment options when input is focused
//               setShowAttachmentOptions(false);
//               // Scroll to bottom after a short delay
//               setTimeout(scrollToBottom, 300);
//             }}
//             multiline
//             maxHeight={100}
//           />
//           <TouchableOpacity style={styles.emojiButton}>
//             <Ionicons name="happy-outline" size={24} color="#777" />
//           </TouchableOpacity>
//         </View>

//         {uploading ? (
//           <View style={styles.sendButton}>
//             <ActivityIndicator size="small" color="#fff" />
//           </View>
//         ) : (
//           <TouchableOpacity
//             style={[
//               styles.sendButton,
//               message.trim() === "" && styles.disabledSendButton,
//             ]}
//             onPress={handleSend}
//             disabled={message.trim() === ""}
//           >
//             <Ionicons name="send" size={20} color="#fff" />
//           </TouchableOpacity>
//         )}
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }
import React, { useState, useEffect, useRef } from "react";
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
  Linking,
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
  getDocs,
  increment as firestoreIncrement,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  getStorage,
  uploadBytesResumable,
} from "firebase/storage";
import { auth, db, storage } from "../../../lib/db/firebase";
import * as FileSystem from "expo-file-system";

const { width } = Dimensions.get("window");

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
  const [numberRequests, setNumberRequests] = useState({});
  const [phoneNumberShared, setPhoneNumberShared] = useState(false);
  const [sharedPhoneNumber, setSharedPhoneNumber] = useState(null);
  const [pendingActions, setPendingActions] = useState(new Set());
  const scrollViewRef = useRef(null);
  const attachmentAnimation = useRef(new Animated.Value(0)).current;
  const inputRef = useRef(null);
  const user = auth.currentUser;

  const [fontsLoaded] = useFonts({
    Regular: require("../../../assets/fonts/regular.ttf"),
    Medium: require("../../../assets/fonts/medium.ttf"),
    Bold: require("../../../assets/fonts/bold.ttf"),
  });

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setKeyboardVisible(true);
        setShowAttachmentOptions(false);
        scrollToBottom();
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    const fetchOtherUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", otherUserId));
        if (userDoc.exists()) {
          setOtherUserData(userDoc.data());
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchOtherUserData();
  }, [otherUserId]);

  useEffect(() => {
    const checkPhoneNumberShared = async () => {
      try {
        const phoneResponseQuery = query(
          collection(db, "messages"),
          where("chatId", "==", chatId),
          where("type", "==", "number_response")
        );

        const snapshot = await getDocs(phoneResponseQuery);
        if (!snapshot.empty) {
          let latestResponse = null;
          snapshot.forEach((doc) => {
            const data = doc.data();
            if (
              !latestResponse ||
              data.timestamp?.toDate() > latestResponse.timestamp
            ) {
              latestResponse = {
                ...data,
                timestamp: data.timestamp?.toDate(),
              };
            }
          });

          if (latestResponse && latestResponse.phoneNumber) {
            setPhoneNumberShared(true);
            setSharedPhoneNumber(latestResponse.phoneNumber);
          }
        }
      } catch (error) {
        console.error("Error checking shared phone number:", error);
      }
    };

    checkPhoneNumberShared();
  }, [chatId]);

  useEffect(() => {
    if (!user || !chatId) return;

    const updateUnreadCount = async () => {
      try {
        const chatRef = doc(db, "chats", chatId);
        await updateDoc(chatRef, {
          [`unreadCount.${user.uid}`]: 0,
        });
      } catch (error) {
        console.error("Error resetting unread count:", error);
      }
    };

    updateUnreadCount();

    const typingRef = collection(db, "typing");
    const typingQuery = query(
      typingRef,
      where("chatId", "==", chatId),
      where("userId", "==", otherUserId)
    );

    const typingUnsubscribe = onSnapshot(typingQuery, (snapshot) => {
      if (!snapshot.empty) {
        const typingData = snapshot.docs[0].data();
        setIsTyping(typingData.isTyping);
      } else {
        setIsTyping(false);
      }
    });

    const messagesRef = collection(db, "messages");
    const q = query(
      messagesRef,
      where("chatId", "==", chatId),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
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

      const requests = {};
      messagesList.forEach((msg) => {
        if (msg.type === "number_request") {
          requests[msg.requestId] = {
            status: msg.status || "pending",
            messageId: msg.id,
          };
        }

        if (msg.type === "number_response" && msg.phoneNumber) {
          setPhoneNumberShared(true);
          setSharedPhoneNumber(msg.phoneNumber);
        }
      });
      setNumberRequests(requests);

      messagesList.forEach(async (msg) => {
        if (
          msg.sender === "other" &&
          msg.status !== "read" &&
          (msg.type === "text" || msg.type === "image")
        ) {
          const messageRef = doc(db, "messages", msg.id);
          await updateDoc(messageRef, { status: "read" });
        }
      });

      setTimeout(scrollToBottom, 100);
    });

    return () => {
      unsubscribe();
      typingUnsubscribe();
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [chatId, user, otherUserId]);

  const scrollToBottom = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  };

  useEffect(() => {
    Animated.timing(attachmentAnimation, {
      toValue: showAttachmentOptions ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    if (showAttachmentOptions) {
      Keyboard.dismiss();
    }
  }, [showAttachmentOptions]);

  if (!fontsLoaded) {
    return null;
  }

  const initiatePhoneCall = () => {
    if (sharedPhoneNumber) {
      const phoneUrl = `tel:${otherUserData?.phone}`;
      Linking.canOpenURL(phoneUrl)
        .then((supported) => {
          if (supported) {
            Linking.openURL(phoneUrl);
          } else {
            alert("Phone calls are not supported on this device");
          }
        })
        .catch((error) => {
          console.error("Error initiating phone call:", error);
          alert("Failed to initiate call");
        });
    }
  };

  const sendNumberRequest = async () => {
    try {
      const requestId = `req_${Date.now()}`;

      const messageData = {
        type: "number_request",
        requestId: requestId,
        status: "pending",
        senderId: user.uid,
        receiverId: otherUserId,
        chatId,
        timestamp: serverTimestamp(),
      };

      await addDoc(collection(db, "messages"), messageData);

      const chatRef = doc(db, "chats", chatId);
      await updateDoc(chatRef, {
        lastMessage: {
          text: "Phone number requested",
          timestamp: serverTimestamp(),
        },
        [`unreadCount.${otherUserId}`]: firestoreIncrement(1),
      });

      setNumberRequests((prev) => ({
        ...prev,
        [requestId]: { status: "pending" },
      }));
    } catch (error) {
      console.error("Error sending number request:", error);
      alert("Failed to send request. Please try again.");
    }
  };

  const respondToNumberRequest = async (messageId, requestId, status) => {
    try {
      if (pendingActions.has(messageId)) {
        return;
      }

      setPendingActions((prev) => new Set(prev).add(messageId));

      const messageRef = doc(db, "messages", messageId);
      await updateDoc(messageRef, { status });

      if (status === "accepted") {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const phoneNumber = userDoc.data()?.phoneNumber || "Not available";

        setPhoneNumberShared(true);
        setSharedPhoneNumber(phoneNumber);

        const responseData = {
          type: "number_response",
          requestId: requestId,
          phoneNumber: phoneNumber,
          senderId: user.uid,
          receiverId: otherUserId,
          chatId,
          timestamp: serverTimestamp(),
          status: "sent",
        };

        await addDoc(collection(db, "messages"), responseData);
      }

      setNumberRequests((prev) => ({
        ...prev,
        [requestId]: { status, messageId },
      }));
    } catch (error) {
      console.error("Error responding to number request:", error);
      alert("Failed to respond. Please try again.");
    } finally {
      setPendingActions((prev) => {
        const updated = new Set(prev);
        updated.delete(messageId);
        return updated;
      });
    }
  };

  const handleTyping = async (isTyping) => {
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
          isTyping,
          timestamp: serverTimestamp(),
        });
      } else {
        const docId = snapshot.docs[0].id;
        await updateDoc(doc(db, "typing", docId), {
          isTyping,
          timestamp: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Error updating typing status:", error);
    }

    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    const timeout = setTimeout(() => {
      handleTyping(false);
    }, 3000);

    setTypingTimeout(timeout);
  };

  const toggleAttachmentOptions = () => {
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
    }
  };

  const handleSend = async () => {
    if (message.trim() === "" || !user || !chatId) return;

    try {
      const messageData = {
        text: message,
        senderId: user.uid,
        receiverId: otherUserId,
        chatId,
        timestamp: serverTimestamp(),
        status: "sent",
        type: "text",
      };

      const messageRef = await addDoc(collection(db, "messages"), messageData);

      const chatRef = doc(db, "chats", chatId);
      await updateDoc(chatRef, {
        lastMessage: {
          text: message,
          timestamp: serverTimestamp(),
        },
        [`unreadCount.${otherUserId}`]: firestoreIncrement(1),
      });

      setMessage("");

      if (typingTimeout) {
        clearTimeout(typingTimeout);
        handleTyping(false);
      }

      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const pickImage = async () => {
    setShowAttachmentOptions(false);

    try {
      if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          alert("Sorry, we need camera roll permissions to make this work!");
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

          const storage = getStorage();
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
                const progress =
                  (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log("Upload is " + progress + "% done");
              },
              (error) => {
                console.error("Upload failed:", error);
                reject(error);
              },
              async () => {
                try {
                  const downloadURL = await getDownloadURL(
                    uploadTask.snapshot.ref
                  );
                  console.log("File available at", downloadURL);
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
            [`unreadCount.${otherUserId}`]: firestoreIncrement(1),
          });
        } catch (error) {
          console.error("Error uploading image:", error);

          let errorMessage = "Failed to upload image. Please try again.";
          if (error.code === "storage/unauthorized") {
            errorMessage = "You don't have permission to upload this image.";
          } else if (error.code === "storage/canceled") {
            errorMessage = "Upload was canceled.";
          } else if (error.code === "storage/unknown") {
            errorMessage = "An unknown error occurred during upload.";
          } else if (error.message?.includes("Network request failed")) {
            errorMessage =
              "Network error. Please check your connection and try again.";
          }

          alert(errorMessage);
        } finally {
          setUploading(false);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      setUploading(false);
      alert("Error selecting image. Please try again.");
    }
  };

  const getRelativeTime = (timestamp) => {
    if (!(timestamp instanceof Date)) {
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
  };

  const renderMessage = (message) => {
    const isUser = message.sender === "user";

    if (message.type === "number_request") {
      if (isUser) {
        return (
          <View
            key={message.id}
            style={[styles.messageContainer, styles.systemMessageContainer]}
          >
            <View style={styles.systemMessageBubble}>
              <Text style={styles.systemMessageText}>
                {message.status === "pending"
                  ? "Waiting for user approval..."
                  : message.status === "accepted"
                  ? "Phone number request accepted"
                  : "Phone number request declined"}
              </Text>
            </View>
            <Text style={styles.timestamp}>
              {getRelativeTime(message.timestamp)}
            </Text>
          </View>
        );
      } else {
        const isPending = pendingActions.has(message.id);
        const requestStatus =
          numberRequests[message.requestId]?.status || message.status;

        return (
          <View
            key={message.id}
            style={[styles.messageContainer, styles.systemMessageContainer]}
          >
            <View style={styles.numberRequestBubble}>
              <Text style={styles.numberRequestText}>
                User requested to see your number
              </Text>
              {requestStatus === "pending" && !isPending && (
                <View style={styles.numberRequestActions}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() =>
                      respondToNumberRequest(
                        message.id,
                        message.requestId,
                        "accepted"
                      )
                    }
                  >
                    <Text style={styles.actionButtonText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() =>
                      respondToNumberRequest(
                        message.id,
                        message.requestId,
                        "rejected"
                      )
                    }
                  >
                    <Text style={styles.actionButtonText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              )}
              {(requestStatus !== "pending" || isPending) && (
                <Text style={styles.numberRequestStatus}>
                  {isPending
                    ? "Processing..."
                    : requestStatus === "accepted"
                    ? "Accepted"
                    : "Declined"}
                </Text>
              )}
            </View>
            <Text style={styles.timestamp}>
              {getRelativeTime(message.timestamp)}
            </Text>
          </View>
        );
      }
    }

    if (message.type === "number_response") {
      return (
        <View
          key={message.id}
          style={[styles.messageContainer, styles.systemMessageContainer]}
        >
          <View style={styles.numberResponseBubble}>
            <Text style={styles.numberResponseTitle}>
              Shared by {otherUserData?.name}
            </Text>
            <Text style={styles.numberResponseText}>
            {otherUserData?.phone?.replace('+91', '+91-')}
            </Text>
            <TouchableOpacity
              style={styles.callButton}
              onPress={initiatePhoneCall}
            >
              <Ionicons
                name="call"
                size={18}
                color="#fff"
                style={{ marginRight: 5 }}
              />
              <Text style={styles.callButtonText}>Call</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.timestamp}>
            {getRelativeTime(message.timestamp)}
          </Text>
        </View>
      );
    }

    return (
      <View
        key={message.id}
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
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" hidden={false} backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
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
            />
          ) : (
            <View style={styles.defaultAvatarContainer}>
              <Text style={styles.defaultAvatarText}>{name.charAt(0)}</Text>
            </View>
          )}

          <View style={styles.userTextInfo}>
            <Text style={styles.userName}>{name}</Text>
            {phoneNumberShared ? (
              <Text style={styles.userPhoneNumber}>
                {" "}
                {otherUserData?.phone?.replace("+91", "+91-")}
              </Text>
            ) : (
              <Text style={styles.userStatus}>
                {otherUserData?.isActive ? "Online" : "Offline"}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          {phoneNumberShared && (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={initiatePhoneCall}
            >
              <Ionicons name="call" size={20} color="#000" />
            </TouchableOpacity>
          )}

          {tripId && (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate("TripDetails", { tripId })}
            >
              <FontAwesome5 name="map-marked-alt" size={20} color="#000" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dateDivider}>
          <Text style={styles.dateDividerText}>Today</Text>
        </View>

        {messages.map(renderMessage)}

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

        <View style={{ height: 16 }} />
      </ScrollView>

      {!phoneNumberShared && (
        <TouchableOpacity
          style={styles.numberRequestFAB}
          onPress={sendNumberRequest}
        >
          <Ionicons
            name="call-outline"
            size={16}
            color="#fff"
            style={{ marginRight: 5 }}
          />
          <Text style={styles.numberRequestFABText}>Request Phone Number</Text>
        </TouchableOpacity>
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

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        style={styles.inputContainer}
      >
        <TouchableOpacity
          style={styles.attachButton}
          onPress={toggleAttachmentOptions}
        >
          <Ionicons
            name={showAttachmentOptions ? "close" : "add"}
            size={24}
            color="#000"
          />
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
              }
            }}
            onFocus={() => {
              setShowAttachmentOptions(false);
              setTimeout(scrollToBottom, 300);
            }}
            multiline
            maxHeight={100}
            placeholderTextColor="#999"
          />
          <TouchableOpacity style={styles.emojiButton}>
            <Ionicons name="happy-outline" size={24} color="#000" />
          </TouchableOpacity>
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
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// const styles = StyleSheet.create({
// container: {
//   flex: 1,
//   backgroundColor: "#f9f9f9",
//   fontFamily: "Regular",
// },
//   header: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#fff",
//     paddingHorizontal: 16,
//     paddingTop: Platform.OS === "android" ? 40 : 10,
//     paddingBottom: 10,
//     elevation: 2,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.1,
//     shadowRadius: 2,
//     zIndex: 100,
//   },
//   backButton: {
//     padding: 8,
//   },
//   userInfo: {
//     flex: 1,
//     flexDirection: "row",
//     alignItems: "center",
//     marginLeft: 8,
//   },
//   userAvatar: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: "#000",
//   },
//   defaultAvatar: {
//     backgroundColor: "#2d6cdf",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   userTextInfo: {
//     marginLeft: 12,
//     justifyContent: "center",
//   },
//   userName: {
//     fontSize: 16,
//     fontFamily: "Bold",
//     color: "#333",
//   },
//   userStatus: {
//     fontSize: 12,
//     fontFamily: "Regular",
//     color: "#4CAF50",
//   },
//   headerActions: {
//     flexDirection: "row",
//     alignItems: "center",
//   },
//   headerButton: {
//     padding: 8,
//     marginLeft: 4,
//   },
//   messagesContainer: {
//     flex: 1,
//     backgroundColor: "#f9f9f9",
//   },
//   messagesContent: {
//     paddingHorizontal: 16,
//     paddingTop: 16,
//   },
//   dateDivider: {
//     alignItems: "center",
//     marginVertical: 16,
//   },
//   dateDividerText: {
//     fontSize: 12,
//     fontFamily: "Medium",
//     color: "#999",
//     backgroundColor: "#eaeaea",
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 12,
//   },
//   messageContainer: {
//     marginBottom: 12,
//     maxWidth: "80%",
//   },
//   userMessageContainer: {
//     alignSelf: "flex-end",
//   },
//   otherMessageContainer: {
//     alignSelf: "flex-start",
//   },
//   messageBubble: {
//     borderRadius: 18,
//     paddingHorizontal: 16,
//     paddingVertical: 10,
//   },
//   userMessageBubble: {
//     backgroundColor: "#000",
//   },
//   otherMessageBubble: {
//     backgroundColor: "#fff",
//     borderWidth: 1,
//     borderColor: "#eaeaea",
//   },
//   messageText: {
//     fontSize: 16,
//     fontFamily: "Regular",
//     color: "#333",
//     lineHeight: 22,
//   },
//   messageFooter: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginTop: 4,
//     justifyContent: "flex-end",
//   },
//   timestamp: {
//     fontSize: 11,
//     fontFamily: "Regular",
//     color: "#999",
//     marginRight: 4,
//   },
//   userTimestamp: {
//     color: "#999",
//   },
//   statusContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//   },
//   statusIcon: {
//     marginLeft: 2,
//   },
//   imageBubble: {
//     borderRadius: 12,
//     overflow: "hidden",
//     maxWidth: 240,
//   },
//   messageImage: {
//     width: 240,
//     height: 180,
//     borderRadius: 12,
//   },
//   typingBubble: {
//     borderRadius: 18,
//     paddingHorizontal: 14,
//     paddingVertical: 12,
//     minWidth: 60,
//   },
//   typingIndicator: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     height: 20,
//   },
//   typingDot: {
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//     backgroundColor: "#777",
//     marginHorizontal: 2,
//   },
//   typingDot1: {
//     opacity: 0.4,
//     transform: [{ translateY: -4 }],
//   },
//   typingDot2: {
//     opacity: 0.7,
//     transform: [{ translateY: 0 }],
//   },
//   typingDot3: {
//     opacity: 1,
//     transform: [{ translateY: 4 }],
//   },
//   inputContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingHorizontal: 16,
//     paddingVertical: 10,
//     backgroundColor: "#fff",
//     borderTopWidth: 1,
//     borderTopColor: "#eaeaea",
//   },
//   attachButton: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: "#f5f5f5",
//     justifyContent: "center",
//     alignItems: "center",
//     marginRight: 8,
//   },
//   inputWrapper: {
//     flex: 1,
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#f5f5f5",
//     borderRadius: 24,
//     paddingHorizontal: 16,
//     minHeight: 46,
//   },
//   input: {
//     flex: 1,
//     fontSize: 16,
//     fontFamily: "Regular",
//     color: "#333",
//     maxHeight: 100,
//     padding: 8,
//   },
//   emojiButton: {
//     padding: 8,
//   },
//   sendButton: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: "#000",
//     justifyContent: "center",
//     alignItems: "center",
//     marginLeft: 8,
//   },
//   disabledSendButton: {
//     backgroundColor: "#30302E",
//   },
//   attachmentOptions: {
//     flexDirection: "row",
//     justifyContent: "space-around",
//     backgroundColor: "#fff",
//     paddingVertical: 16,
//     borderTopWidth: 1,
//     borderTopColor: "#eaeaea",
//     position: "absolute",
//     bottom: 70,
//     left: 0,
//     right: 0,
//     zIndex: 99,
//   },
//   attachmentOption: {
//     alignItems: "center",
//   },
//   attachmentIcon: {
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//     justifyContent: "center",
//     alignItems: "center",
//     marginBottom: 8,
//   },
//   attachmentText: {
//     fontSize: 12,
//     fontFamily: "Medium",
//     color: "#555",
//   },

//   //  Extra styles

//   numberRequestFAB: {
//     position: 'absolute',
//     bottom: 80,
//     alignSelf: 'center',
//     backgroundColor: '#000',
//     paddingHorizontal: 20,
//     paddingVertical: 10,
//     borderRadius: 20,
//     elevation: 5,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.3,
//     shadowRadius: 3,
//     zIndex: 1000,
//   },
//   numberRequestFABText: {
//     color: '#fff',
//     fontFamily: 'Medium',
//     fontSize: 14,
//   },  systemMessageContainer: {
//     alignSelf: 'center',
//     marginVertical: 8,
//   },
//   systemMessageBubble: {
//     backgroundColor: '#f0f0f0',
//     borderRadius: 16,
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     alignItems: 'center',
//   },
//   systemMessageText: {
//     fontFamily: 'Medium',
//     fontSize: 13,
//     color: '#666',
//   },

//   // Number request message (recipient view)
//   numberRequestBubble: {
//     backgroundColor: '#fff8e1',
//     borderRadius: 16,
//     padding: 12,
//     borderWidth: 1,
//     borderColor: '#FFE082',
//     minWidth: 200,
//   },
//   numberRequestText: {
//     fontFamily: 'Medium',
//     fontSize: 14,
//     color: '#333',
//     textAlign: 'center',
//     marginBottom: 10,
//   },
//   numberRequestActions: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginTop: 8,
//   },
//   acceptButton: {
//     backgroundColor: '#4CAF50',
//     borderRadius: 12,
//     paddingVertical: 6,
//     paddingHorizontal: 12,
//     flex: 1,
//     marginRight: 6,
//     alignItems: 'center',
//   },
//   rejectButton: {
//     backgroundColor: '#FF5252',
//     borderRadius: 12,
//     paddingVertical: 6,
//     paddingHorizontal: 12,
//     flex: 1,
//     marginLeft: 6,
//     alignItems: 'center',
//   },
//   actionButtonText: {
//     color: '#fff',
//     fontFamily: 'Medium',
//     fontSize: 12,
//   },
//   numberRequestStatus: {
//     fontFamily: 'Medium',
//     fontSize: 13,
//     textAlign: 'center',
//     marginTop: 6,
//     color: '#666',
//   },

//   // Number response message (when accepted)
//   numberResponseBubble: {
//     backgroundColor: '#e1f5fe',
//     borderRadius: 16,
//     padding: 12,
//     borderWidth: 1,
//     borderColor: '#81d4fa',
//     alignItems: 'center',
//     minWidth: 200,
//   },
//   numberResponseTitle: {
//     fontFamily: 'Bold',
//     fontSize: 14,
//     color: '#0288d1',
//     marginBottom: 6,
//   },
//   numberResponseText: {
//     fontFamily: 'Medium',
//     fontSize: 16,
//     color: '#333',
//   },
// });

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    fontFamily: "Regular",

    paddingTop: Platform.OS === "android" ? 20 : 0,
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
    fontFamily: "Bold",
  },
  userTextInfo: {
    marginLeft: 12,
    justifyContent: "center",
  },

  userName: {
    fontSize: 16,
    fontFamily: "Bold",
    color: "#000",
  },
  userStatus: {
    fontSize: 12,
    fontFamily: "Regular",
    color: "#666",
  },
  userPhoneNumber: {
    fontSize: 12,
    fontFamily: "Regular",
    color: "#666",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
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
  },
  dateDivider: {
    alignItems: "center",
    marginVertical: 16,
  },
  dateDividerText: {
    fontSize: 12,
    color: "#666",
    fontFamily: "Medium",
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
  systemMessageContainer: {
    alignSelf: "center",
    maxWidth: "90%",
  },
  systemMessageBubble: {
    backgroundColor: "#f0f0f0",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
  },
  systemMessageText: {
    fontFamily: "Regular",
    fontSize: 13,
    color: "#666",
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
    fontFamily: "Regular",
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
    fontFamily: "Regular",
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
  typingDot1: {
    animationName: "bounce",
    animationDuration: "0.6s",
    animationIterationCount: "infinite",
  },
  typingDot2: {
    animationName: "bounce",
    animationDuration: "0.6s",
    animationDelay: "0.2s",
    animationIterationCount: "infinite",
  },
  typingDot3: {
    animationName: "bounce",
    animationDuration: "0.6s",
    animationDelay: "0.4s",
    animationIterationCount: "infinite",
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
    fontFamily: "Regular",
    paddingVertical: 6,
    maxHeight: 120,
  },
  emojiButton: {
    padding: 4,
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
    fontFamily: "Medium",
    color: "#666",
  },
  numberRequestBubble: {
    backgroundColor: "#f8f8f8",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    width: "100%",
  },
  numberRequestText: {
    fontFamily: "Medium",
    fontSize: 14,
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  numberRequestActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  acceptButton: {
    backgroundColor: "#000",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    flex: 1,
    marginRight: 8,
    alignItems: "center",
  },
  rejectButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    flex: 1,
    marginLeft: 8,
    alignItems: "center",
  },
  actionButtonText: {
    fontFamily: "Medium",
    fontSize: 14,
    color: "#fff",
  },
  numberRequestStatus: {
    fontFamily: "Medium",
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
  },
  numberResponseBubble: {
    backgroundColor: "#f0f8ff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#deebf7",
    width: "100%",
    alignItems: "center",
  },
  numberResponseTitle: {
    fontFamily: "Bold",
    fontSize: 15,
    color: "#333",
    marginBottom: 8,
  },
  numberResponseText: {
    fontFamily: "Medium",
    fontSize: 16,
    color: "#333",
    marginBottom: 12,
  },
  callButton: {
    backgroundColor: "#000",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  callButtonText: {
    fontFamily: "Medium",
    fontSize: 14,
    color: "#fff",
  },
  numberRequestFAB: {
    position: "absolute",
    right: 20,
    bottom: 80,
    backgroundColor: "#000",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  numberRequestFABText: {
    fontFamily: "Medium",
    fontSize: 13,
    color: "#fff",
  },
});
