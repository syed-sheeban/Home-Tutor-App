import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import { Colors } from "../constants/Colors";

export default function AuthSuccessModal({
  visible,
  title,
  message,
  buttonLabel = "Continue",
  onClose,
}) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(140)} style={styles.backdrop}>
        <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="checkmark" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity style={styles.button} onPress={onClose} activeOpacity={0.86}>
            <Text style={styles.buttonText}>{buttonLabel}</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.68)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 390,
    borderRadius: 28,
    backgroundColor: Colors.surface,
    padding: 26,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.borderMid,
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 28,
    elevation: 10,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(20,184,166,0.28)",
    backgroundColor: "rgba(20,184,166,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    color: Colors.text,
    fontSize: 23,
    lineHeight: 28,
    fontWeight: "900",
    textAlign: "center",
  },
  message: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "700",
    marginTop: 9,
    textAlign: "center",
  },
  button: {
    width: "100%",
    borderRadius: 15,
    backgroundColor: Colors.primary,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "900",
  },
});
