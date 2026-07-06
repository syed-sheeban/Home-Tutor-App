import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const palette = {
  success: { bg: "#ecfdf5", border: "#99f6e4", icon: "#0f766e", name: "checkmark-circle-outline" },
  error: { bg: "#fff1f2", border: "#fecdd3", icon: "#be123c", name: "alert-circle-outline" },
  warning: { bg: "#fffbeb", border: "#fde68a", icon: "#b45309", name: "time-outline" },
  info: { bg: "#eff6ff", border: "#bfdbfe", icon: "#1d4ed8", name: "sparkles-outline" },
};

export default function PremiumFeedbackModal({
  visible,
  type = "info",
  title,
  message,
  icon,
  actions,
  onClose,
}) {
  const tone = palette[type] || palette.info;
  const modalActions = actions?.length ? actions : [{ label: "Done", primary: true }];

  const handleAction = (action) => {
    if (action.keepOpen) {
      action.onPress?.();
      return;
    }
    onClose?.();
    action.onPress?.();
  };

  return (
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: tone.bg, borderColor: tone.border }]}>
            <Ionicons name={icon || tone.name} size={34} color={tone.icon} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}
          <View style={styles.actions}>
            {modalActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={[styles.action, action.primary && styles.primaryAction, action.danger && styles.dangerAction]}
                onPress={() => handleAction(action)}
                activeOpacity={0.86}
              >
                <Text style={[styles.actionText, action.primary && styles.primaryText, action.danger && styles.dangerText]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.70)",
    justifyContent: "center",
    padding: 22,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 28,
    elevation: 12,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { color: "#020617", fontSize: 23, lineHeight: 28, fontWeight: "900", textAlign: "center" },
  message: { color: "#475569", fontSize: 14, lineHeight: 22, fontWeight: "700", textAlign: "center", marginTop: 9 },
  actions: { width: "100%", gap: 10, marginTop: 22 },
  action: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  primaryAction: { borderColor: "#0f172a", backgroundColor: "#0f172a" },
  dangerAction: { borderColor: "#fecdd3", backgroundColor: "#fff1f2" },
  actionText: { color: "#020617", fontSize: 14, fontWeight: "900" },
  primaryText: { color: "#ffffff" },
  dangerText: { color: "#be123c" },
});
