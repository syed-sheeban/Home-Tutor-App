import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  Badge,
  EmptyState,
  SectionCard,
  dashboardColors,
  getStatusTone,
} from "./dashboard-kit";
import PremiumFeedbackModal from "./premium-feedback-modal";
import {
  paymentApi,
  sharePaymentReceipt,
  startNativeCheckout,
} from "../services/paymentService";

const PAYABLE_STATUSES = new Set([
  "ACCEPTED",
  "SCHEDULE_PROPOSED",
  "CHANGES_REQUESTED",
  "PENDING_PAYMENT",
  "CONFIRMED",
]);

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function StudentPayments({ bookings = [], onChanged }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [sharingId, setSharingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const loadHistory = useCallback(async () => {
    try {
      const result = await paymentApi.history({ limit: 50 });
      setHistory(result?.items || []);
    } catch (error) {
      setFeedback({
        type: "error",
        title: "Payment History",
        message:
          error?.response?.data?.message ||
          "Could not load your payment history.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const payableBookings = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          Number(booking.fee) > 0 &&
          booking.paymentStatus !== "PAID" &&
          PAYABLE_STATUSES.has(String(booking.status || "").toUpperCase()),
      ),
    [bookings],
  );

  const pay = async (booking) => {
    setBusyId(booking.id);
    try {
      const result = await startNativeCheckout(booking.id);
      setFeedback({
        type: "success",
        title: "Payment Successful",
        message: `Receipt ${result.payment?.receiptNumber || ""} is ready. Your booking is confirmed.`,
      });
      await Promise.all([loadHistory(), onChanged?.()]);
    } catch (error) {
      setFeedback({
        type: error.isCancelled ? "warning" : "error",
        title: error.isCancelled ? "Payment Cancelled" : "Payment Failed",
        message: error.message,
      });
      await loadHistory();
    } finally {
      setBusyId(null);
    }
  };

  const shareReceipt = async (payment) => {
    setSharingId(payment.id);
    try {
      await sharePaymentReceipt(payment.id, payment.receiptNumber);
    } catch (error) {
      setFeedback({
        type: "error",
        title: "Receipt",
        message: error?.response?.data?.message || error.message,
      });
    } finally {
      setSharingId(null);
    }
  };

  return (
    <>
      <SectionCard
        title="Ready to Pay"
        eyebrow="Booking Fees"
        icon="card-outline"
      >
        {payableBookings.length ? (
          payableBookings.map((booking) => (
            <View key={booking.id} style={styles.paymentCard}>
              <View style={styles.paymentTop}>
                <View style={styles.paymentIcon}>
                  <Ionicons
                    name="school-outline"
                    size={19}
                    color={dashboardColors.primary}
                  />
                </View>
                <View style={styles.paymentCopy}>
                  <Text style={styles.paymentTitle}>
                    {booking.subject || "Tutor booking"}
                  </Text>
                  <Text style={styles.paymentSubtitle}>
                    {booking.tutor?.user?.fullName || "Tutor"}
                  </Text>
                </View>
                <Text style={styles.amount}>
                  {formatCurrency(booking.fee)}
                </Text>
              </View>
              <View style={styles.paymentMeta}>
                <Badge
                  label={String(booking.status || "Accepted").replaceAll("_", " ")}
                  tone="warning"
                />
                <Text style={styles.paymentDate}>
                  Requested {formatDate(booking.createdAt)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => pay(booking)}
                disabled={busyId === booking.id}
                activeOpacity={0.84}
              >
                {busyId === booking.id ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="lock-closed-outline" size={17} color="#ffffff" />
                    <Text style={styles.primaryButtonText}>Pay Securely</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <EmptyState label="No accepted booking is waiting for payment." />
        )}
      </SectionCard>

      <SectionCard
        title="Payment History"
        eyebrow="Receipts"
        icon="receipt-outline"
      >
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={dashboardColors.primary} />
            <Text style={styles.loadingText}>Loading payments...</Text>
          </View>
        ) : history.length ? (
          history.map((payment) => {
            const canRetry = ["FAILED", "CANCELLED"].includes(payment.status);
            const isPaid = payment.status === "PAID";
            return (
              <View key={payment.id} style={styles.historyRow}>
                <View style={styles.historyHeader}>
                  <View style={styles.historyCopy}>
                    <Text style={styles.historyTitle}>
                      {payment.booking?.subject || "Tutor payment"}
                    </Text>
                    <Text style={styles.historySubtitle}>
                      {payment.tutor?.user?.fullName || "Tutor"} ·{" "}
                      {payment.receiptNumber}
                    </Text>
                  </View>
                  <Text style={styles.historyAmount}>
                    {formatCurrency(payment.amount)}
                  </Text>
                </View>
                <View style={styles.historyMeta}>
                  <Badge
                    label={payment.status}
                    tone={getStatusTone(payment.status)}
                  />
                  <Text style={styles.paymentDate}>
                    {formatDate(payment.paidAt || payment.createdAt)}
                  </Text>
                </View>
                {(isPaid || canRetry) && (
                  <View style={styles.inlineActions}>
                    {isPaid && (
                      <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => shareReceipt(payment)}
                        disabled={sharingId === payment.id}
                        activeOpacity={0.84}
                      >
                        {sharingId === payment.id ? (
                          <ActivityIndicator color="#0f766e" />
                        ) : (
                          <>
                            <Ionicons
                              name="share-outline"
                              size={16}
                              color="#0f766e"
                            />
                            <Text style={styles.secondaryButtonText}>
                              Share Receipt
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                    {canRetry && (
                      <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => pay({ id: payment.bookingId })}
                        disabled={busyId === payment.bookingId}
                        activeOpacity={0.84}
                      >
                        <Ionicons name="refresh-outline" size={16} color="#ffffff" />
                        <Text style={styles.retryButtonText}>Retry</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <EmptyState label="Your completed and attempted payments will appear here." />
        )}
      </SectionCard>

      <PremiumFeedbackModal
        visible={!!feedback}
        type={feedback?.type}
        title={feedback?.title}
        message={feedback?.message}
        onClose={() => setFeedback(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  paymentCard: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    padding: 14,
    marginBottom: 10,
  },
  paymentTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#ccfbf1",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentCopy: { flex: 1, minWidth: 0 },
  paymentTitle: { color: "#020617", fontSize: 14, fontWeight: "900" },
  paymentSubtitle: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  amount: { color: "#020617", fontSize: 17, fontWeight: "900" },
  paymentMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 12,
  },
  paymentDate: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "right",
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: "#0f766e",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 13,
  },
  primaryButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "900" },
  loading: {
    minHeight: 82,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: { color: "#64748b", fontSize: 12, fontWeight: "800" },
  historyRow: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    padding: 13,
    marginBottom: 9,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  historyCopy: { flex: 1, minWidth: 0 },
  historyTitle: { color: "#020617", fontSize: 13, fontWeight: "900" },
  historySubtitle: {
    color: "#64748b",
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "700",
    marginTop: 3,
  },
  historyAmount: { color: "#0f766e", fontSize: 14, fontWeight: "900" },
  historyMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 10,
  },
  inlineActions: { flexDirection: "row", gap: 8, marginTop: 11 },
  secondaryButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#99f6e4",
    backgroundColor: "#f0fdfa",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 9,
  },
  secondaryButtonText: { color: "#0f766e", fontSize: 11, fontWeight: "900" },
  retryButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: "#0f172a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 9,
  },
  retryButtonText: { color: "#ffffff", fontSize: 11, fontWeight: "900" },
});
