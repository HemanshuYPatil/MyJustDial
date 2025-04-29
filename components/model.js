import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { AntDesign, FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
const WarningModal = ({ isVisible, onClose }) => {
  const [fontsLoaded] = useFonts({
    Regular: require("../assets/fonts/regular.ttf"),
    Medium: require("../assets/fonts/medium.ttf"),
    Bold: require("../assets/fonts/bold.ttf"),
  });

  if (!fontsLoaded) {
    return null;
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
          <View style={styles.iconContainer}>
            <AntDesign name="warning" size={40} color="#000" />
          </View>

          <Text style={styles.modalTitle}>Warning</Text>
          <Text style={styles.modalText}>
            You’re responsible for your parcel. The app connects users but isn’t
            liable for any loss, damage, or fraud. Please deal with trusted
            users.
          </Text>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Ok</Text>
          </TouchableOpacity>
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

  return <WarningModal isVisible={modalVisible} onClose={handleCloseModal} />;
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
    padding: 20,
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
  modalTitle: {
    marginBottom: 15,
    textAlign: "center",
    fontSize: 20,
    fontFamily: "Bold",
  },
  cancelButton: {
    backgroundColor: "black",
    borderRadius: 8,
    padding: 12,
    elevation: 2,
    marginTop: 10,
    width: "100%",
  },
  cancelButtonText: {
    color: "white",
    fontWeight: "500",
    textAlign: "center",
    fontSize: 16,
    fontFamily: "Medium",
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center",
    fontSize: 16,
    fontFamily: "Regular",
  },
});

export default WarningModal;
