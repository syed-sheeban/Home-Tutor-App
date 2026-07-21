import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  Badge,
  EmptyState,
  SectionCard,
  StatGrid,
  getStatusTone,
} from "./dashboard-kit";
import PremiumFeedbackModal from "./premium-feedback-modal";
import { walletApi } from "../services/paymentService";

const EMPTY_FORM = {
  amount: "",
  accountHolderName: "",
  bankAccountNumber: "",
  ifscCode: "",
};

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

export default function TutorWallet({ onChanged }) {
  const [wallet, setWallet] = useState(null);
  const [config, setConfig] = useState({ minWithdrawAmount: 500 });
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [feedback, setFeedback] = useState(null);

  const loadWallet = useCallback(async () => {
    try {
      const [walletResult, transactionResult, withdrawalResult] =
        await Promise.all([
          walletApi.get(),
          walletApi.transactions({ limit: 50 }),
          walletApi.withdrawals({ limit: 50 }),
        ]);

      setWallet(walletResult?.wallet || null);
      setConfig(walletResult?.config || { minWithdrawAmount: 500 });
      setTransactions(transactionResult?.items || []);
      setWithdrawals(withdrawalResult?.items || []);
    } catch (error) {
      setFeedback({
        type: "error",
        title: "Tutor Wallet",
        message:
          error?.response?.data?.message ||
          "Could not load your wallet right now.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const stats = useMemo(
    () => [
      {
        label: "Available Balance",
        value: formatCurrency(wallet?.balance),
        icon: "wallet-outline",
      },
      {
        label: "Withdrawable",
        value: formatCurrency(wallet?.withdrawable),
        icon: "cash-outline",
      },
      {
        label: "Total Earned",
        value: formatCurrency(wallet?.totalEarned),
        icon: "trending-up-outline",
      },
      {
        label: "Withdrawn",
        value: formatCurrency(wallet?.totalWithdrawn),
        icon: "arrow-up-circle-outline",
      },
    ],
    [wallet],
  );

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validateWithdrawal = () => {
    const amount = Math.round(Number(form.amount));
    const minimum = Number(config.minWithdrawAmount) || 500;
    if (!Number.isFinite(amount) || amount < minimum) {
      return `Enter an amount of at least ${formatCurrency(minimum)}.`;
    }
    if (amount > Number(wallet?.withdrawable || 0)) {
      return `You can withdraw at most ${formatCurrency(wallet?.withdrawable)}.`;
    }
    if (!form.accountHolderName.trim()) {
      return "Enter the bank account holder name.";
    }
    if (!/^\d{9,18}$/.test(form.bankAccountNumber.trim())) {
      return "Enter a valid 9 to 18 digit bank account number.";
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifscCode.trim().toUpperCase())) {
      return "Enter a valid 11 character IFSC code.";
    }
    return "";
  };

  const submitWithdrawal = async () => {
    const validationMessage = validateWithdrawal();
    if (validationMessage) {
      setFeedback({
        type: "error",
        title: "Withdrawal Details",
        message: validationMessage,
      });
      return;
    }

    setWithdrawBusy(true);
    try {
      await walletApi.withdraw({
        amount: Math.round(Number(form.amount)),
        accountHolderName: form.accountHolderName.trim(),
        bankAccountNumber: form.bankAccountNumber.trim(),
        ifscCode: form.ifscCode.trim().toUpperCase(),
      });
      setWithdrawOpen(false);
      setForm(EMPTY_FORM);
      setFeedback({
        type: "success",
        title: "Withdrawal Requested",
        message: "Your request is now waiting for administrator review.",
      });
      await Promise.all([loadWallet(), onChanged?.()]);
    } catch (error) {
      setFeedback({
        type: "error",
        title: "Withdrawal Failed",
        message:
          error?.response?.data?.message ||
          "Could not submit the withdrawal request.",
      });
    } finally {
      setWithdrawBusy(false);
    }
  };

  if (loading) {
    return (
      <SectionCard title="Tutor Wallet" eyebrow="Earnings" icon="wallet-outline">
        <View style={styles.loading}>
          <ActivityIndicator color="#0f766e" />
          <Text style={styles.loadingText}>Loading wallet...</Text>
        </View>
      </SectionCard>
    );
  }

  return (
    <>
      <StatGrid stats={stats} />

      <SectionCard
        title="Withdraw Earnings"
        eyebrow="Bank Transfer"
        icon="cash-outline"
      >
        <View style={styles.withdrawSummary}>
          <View style={styles.withdrawSummaryCopy}>
            <Text style={styles.withdrawSummaryLabel}>Available to withdraw</Text>
            <Text style={styles.withdrawSummaryAmount}>
              {formatCurrency(wallet?.withdrawable)}
            </Text>
            <Text style={styles.withdrawSummaryHint}>
              Minimum request {formatCurrency(config.minWithdrawAmount)}
            </Text>
          </View>
          <Ionicons name="business-outline" size={28} color="#0f766e" />
        </View>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            Number(wallet?.withdrawable || 0) <
              Number(config.minWithdrawAmount || 500) && styles.disabledButton,
          ]}
          onPress={() => setWithdrawOpen(true)}
          disabled={
            Number(wallet?.withdrawable || 0) <
            Number(config.minWithdrawAmount || 500)
          }
          activeOpacity={0.84}
        >
          <Ionicons name="arrow-up-circle-outline" size={18} color="#ffffff" />
          <Text style={styles.primaryButtonText}>Request Withdrawal</Text>
        </TouchableOpacity>
      </SectionCard>

      <SectionCard
        title="Wallet Transactions"
        eyebrow="Ledger"
        icon="swap-vertical-outline"
      >
        {transactions.length ? (
          transactions.map((transaction) => {
            const credit = transaction.transactionType === "CREDIT";
            return (
              <View key={transaction.id} style={styles.row}>
                <View
                  style={[
                    styles.rowIcon,
                    !credit && styles.rowIconDebit,
                  ]}
                >
                  <Ionicons
                    name={credit ? "arrow-down-outline" : "arrow-up-outline"}
                    size={17}
                    color={credit ? "#0f766e" : "#be123c"}
                  />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>
                    {transaction.description ||
                      (credit ? "Payment received" : "Withdrawal")}
                  </Text>
                  <Text style={styles.rowSubtitle}>
                    Balance {formatCurrency(transaction.balanceAfter)} ·{" "}
                    {formatDate(transaction.createdAt)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.rowAmount,
                    !credit && styles.rowAmountDebit,
                  ]}
                >
                  {credit ? "+" : "-"}
                  {formatCurrency(transaction.amount)}
                </Text>
              </View>
            );
          })
        ) : (
          <EmptyState label="Verified payments will appear in your wallet ledger." />
        )}
      </SectionCard>

      <SectionCard
        title="Withdrawal History"
        eyebrow="Transfers"
        icon="time-outline"
      >
        {withdrawals.length ? (
          withdrawals.map((withdrawal) => (
            <View key={withdrawal.id} style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons name="business-outline" size={17} color="#0f766e" />
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>
                  {formatCurrency(withdrawal.amount)} to{" "}
                  {withdrawal.bankAccountNumber}
                </Text>
                <Text style={styles.rowSubtitle}>
                  {withdrawal.ifscCode} · {formatDate(withdrawal.requestedAt)}
                </Text>
                {!!withdrawal.adminRemarks && (
                  <Text style={styles.remarks}>{withdrawal.adminRemarks}</Text>
                )}
              </View>
              <Badge
                label={withdrawal.status}
                tone={getStatusTone(withdrawal.status)}
              />
            </View>
          ))
        ) : (
          <EmptyState label="Your withdrawal requests will appear here." />
        )}
      </SectionCard>

      <WithdrawalModal
        visible={withdrawOpen}
        form={form}
        busy={withdrawBusy}
        withdrawable={wallet?.withdrawable}
        minimum={config.minWithdrawAmount}
        onChange={updateForm}
        onSubmit={submitWithdrawal}
        onClose={() => setWithdrawOpen(false)}
      />

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

function WithdrawalModal({
  visible,
  form,
  busy,
  withdrawable,
  minimum,
  onChange,
  onSubmit,
  onClose,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.modal}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.modalEyebrow}>Bank Transfer</Text>
            <Text style={styles.modalTitle}>Request Withdrawal</Text>
            <Text style={styles.modalText}>
              Withdrawable {formatCurrency(withdrawable)} · Minimum{" "}
              {formatCurrency(minimum)}
            </Text>
            <TextInput
              style={styles.input}
              value={form.amount}
              onChangeText={(value) => onChange("amount", value)}
              keyboardType="number-pad"
              placeholder="Amount"
              placeholderTextColor="#94a3b8"
            />
            <TextInput
              style={styles.input}
              value={form.accountHolderName}
              onChangeText={(value) => onChange("accountHolderName", value)}
              placeholder="Account holder name"
              placeholderTextColor="#94a3b8"
              autoCapitalize="words"
            />
            <TextInput
              style={styles.input}
              value={form.bankAccountNumber}
              onChangeText={(value) =>
                onChange("bankAccountNumber", value.replace(/\D/g, ""))
              }
              keyboardType="number-pad"
              placeholder="Bank account number"
              placeholderTextColor="#94a3b8"
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              value={form.ifscCode}
              onChangeText={(value) =>
                onChange("ifscCode", value.toUpperCase().replace(/\s/g, ""))
              }
              placeholder="IFSC code"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
              maxLength={11}
            />
            <TouchableOpacity
              style={styles.modalPrimary}
              onPress={onSubmit}
              disabled={busy}
              activeOpacity={0.84}
            >
              {busy ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.modalPrimaryText}>Submit Request</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={onClose}
              disabled={busy}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  loading: {
    minHeight: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  loadingText: { color: "#64748b", fontSize: 12, fontWeight: "800" },
  withdrawSummary: {
    minHeight: 104,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#99f6e4",
    backgroundColor: "#f0fdfa",
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  withdrawSummaryCopy: { flex: 1 },
  withdrawSummaryLabel: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "800",
  },
  withdrawSummaryAmount: {
    color: "#020617",
    fontSize: 25,
    fontWeight: "900",
    marginTop: 3,
  },
  withdrawSummaryHint: {
    color: "#0f766e",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 4,
  },
  primaryButton: {
    minHeight: 45,
    borderRadius: 8,
    backgroundColor: "#0f766e",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 11,
  },
  disabledButton: { backgroundColor: "#94a3b8" },
  primaryButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "900" },
  row: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    padding: 12,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#ccfbf1",
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconDebit: { backgroundColor: "#ffe4e6" },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: {
    color: "#020617",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
  },
  rowSubtitle: {
    color: "#64748b",
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "700",
    marginTop: 3,
  },
  remarks: {
    color: "#92400e",
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "800",
    marginTop: 3,
  },
  rowAmount: { color: "#0f766e", fontSize: 12, fontWeight: "900" },
  rowAmountDebit: { color: "#be123c" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.72)",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    maxHeight: "88%",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    padding: 20,
  },
  modalEyebrow: {
    color: "#0f766e",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  modalTitle: {
    color: "#020617",
    fontSize: 23,
    fontWeight: "900",
    marginTop: 3,
  },
  modalText: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 6,
    marginBottom: 15,
  },
  input: {
    minHeight: 47,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    color: "#020617",
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  modalPrimary: {
    minHeight: 47,
    borderRadius: 8,
    backgroundColor: "#0f766e",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 3,
  },
  modalPrimaryText: { color: "#ffffff", fontSize: 13, fontWeight: "900" },
  modalCancel: { minHeight: 42, alignItems: "center", justifyContent: "center" },
  modalCancelText: { color: "#64748b", fontSize: 12, fontWeight: "900" },
});
