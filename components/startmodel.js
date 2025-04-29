import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { AntDesign } from "@expo/vector-icons";
import { useFonts } from "expo-font";

const GetStartModel = ({ isVisible, onClose,navigation }) => {
  const [fontsLoaded] = useFonts({
    Regular: require("../assets/fonts/regular.ttf"),
    Medium: require("../assets/fonts/medium.ttf"),
    Bold: require("../assets/fonts/bold.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }
  
// 
  const handleskip = () => {
    onClose();
    navigation.navigate("Home");
  }

  const handlesignup = () => {
    onClose();
    navigation.navigate("signup");
  }

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <AntDesign name="close" size={24} color="black" />
          </TouchableOpacity>
          
          <Text style={styles.modalTitle}>Get Started</Text>
          <Text style={styles.modalText}>
            Sign up or continue as a guest to use the app
          </Text>
          
          <TouchableOpacity style={styles.signUpButton} onPress={handlesignup}>
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>
          
          {/* <TouchableOpacity style={styles.skipButton} onPress={handleskip}>
            <Text style={styles.skipButtonText}>Skip & Continue</Text>
          </TouchableOpacity> */}
        </View>
      </View>
    </Modal>
  );
};

// Shows modal once per app session
export const WarningModalManager = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    if (!hasShown) {
      setModalVisible(true);
      setHasShown(true);
    }
  }, [hasShown]);

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  return <GetStartModel isVisible={modalVisible} onClose={handleCloseModal} />;
};

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    width: width,
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    position: "absolute",
    right: 15,
    top: 15,
    padding: 5,
    zIndex: 1,
  },
  modalTitle: {
    marginTop: 10,
    marginBottom: 8,
    textAlign: "center",
    fontSize: 22,
    fontFamily: "Bold",
  },
  signUpButton: {
    backgroundColor: "black",
    borderRadius: 8,
    padding: 15,
    elevation: 2,
    marginTop: 20,
    width: "100%",
  },
  skipButton: {
    backgroundColor: "transparent",
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
    width: "100%",
  },
  buttonText: {
    color: "white",
    fontWeight: "500",
    textAlign: "center",
    fontSize: 16,
    fontFamily: "Medium",
  },
  skipButtonText: {
    color: "black",
    fontWeight: "500",
    textAlign: "center",
    fontSize: 16,
    fontFamily: "Medium",
  },
  modalText: {
    marginBottom: 10,
    textAlign: "center",
    fontSize: 16,
    fontFamily: "Regular",
    color: "#666",
  },
});

export default GetStartModel;