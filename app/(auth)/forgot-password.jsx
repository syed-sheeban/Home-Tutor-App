import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fieldError, setFieldError] = useState("");

  const handleReset = () => {
    setFieldError("");
    if (!email.trim()) {
      setFieldError("Email address is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    // Simulate API call to send reset password link
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 1500);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Back Button */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={Colors.text} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Feather name="key" size={32} color={Colors.primary} />
          </View>

          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            {"Enter the email address associated with your account, and we'll email you instructions to reset your password."}
          </Text>

          {submitted ? (
            <View style={styles.successPanel}>
              <View style={styles.successHeader}>
                <Feather name="check-circle" size={20} color={Colors.success} />
                <Text style={styles.successTitle}>Instructions Sent</Text>
              </View>
              <Text style={styles.successText}>
                We have sent password reset instructions to <Text style={styles.boldEmail}>{email}</Text> if it exists in our system.
              </Text>
              <Pressable style={styles.doneButton} onPress={() => router.replace("/(auth)/login")}>
                <Text style={styles.doneButtonText}>Back to Sign In</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={[styles.inputWrapper, fieldError ? styles.inputWrapperError : null]}>
                  <Feather name="mail" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor={Colors.inactive}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setFieldError("");
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {fieldError ? <Text style={styles.fieldErrorText}>{fieldError}</Text> : null}
              </View>

              <Pressable style={styles.submitButton} onPress={handleReset} disabled={isSubmitting}>
                {isSubmitting ? (
                  <ActivityIndicator color={Colors.primary} size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Send Reset Link</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderColor: Colors.border,
    borderWidth: 1,
  },
  content: {
    paddingHorizontal: 24,
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 20,
  },
  title: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  form: {
    width: "100%",
  },
  formGroup: {
    marginBottom: 24,
    width: "100%",
  },
  label: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 12,
  },
  inputWrapperError: {
    borderColor: Colors.danger,
    backgroundColor: "#FDF2F2",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
    height: "100%",
  },
  fieldErrorText: {
    color: Colors.danger,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: Colors.accent,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginTop: 10,
  },
  submitButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: "900",
  },
  successPanel: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    alignItems: "center",
  },
  successHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  successTitle: {
    color: Colors.success,
    fontSize: 16,
    fontWeight: "900",
  },
  successText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 24,
  },
  boldEmail: {
    color: Colors.text,
    fontWeight: "800",
  },
  doneButton: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    borderWidth: 1,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  doneButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
});
