import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
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
import { adminPaymentApi } from "../services/paymentService";

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

const paymentStatuses = ["ALL", "PAID", "PENDING", "FAILED", "CANCELLED"];
const withdrawalStatuses = ["ALL", "Pending", "Completed", "Rejected"];

export default function AdminFinance({ onChanged }) {
  const [dashboard, setDashboard] = useState(null);
  const [payments, setPayments] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [tab, setTab] = useState("payments");
  const [paymentStatus, setPaymentStatus] = useState("ALL");
  const [withdrawalStatus, setWithdrawalStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState(null);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadFinance = useCallback(async () => {
    try {
      const [dashboardResult, paymentResult, withdrawalResult, ledgerResult] =
        await Promise.all([
          adminPaymentApi.dashboard({ days: 30, months: 6 }),
          adminPaymentApi.payments({
            page: 1,
            limit: 50,
            ...(paymentStatus !== "ALL" ? { status: paymentStatus } : {}),
          }),
          adminPaymentApi.withdrawals({
            page: 1,
            limit: 50,
            ...(withdrawalStatus !== "ALL"
              ? { status: withdrawalStatus }
              : {}),
          }),
          adminPaymentApi.walletTransactions({ page: 1, limit: 50 }),
        ]);

      setDashboard(dashboardResult);
      setPayments(paymentResult?.items || []);
      setWithdrawals(withdrawalResult?.items || []);
      setLedger(ledgerResult?.items || []);
    } catch (error) {
      setFeedback({
        type: "error",
        title: "Finance Dashboard",
        message:
          error?.response?.data?.message ||
          "Could not load platform payment data.",
      });
    } finally {
      setLoading(false);
    }
  }, [paymentStatus, withdrawalStatus]);

  useEffect(() => {
    loadFinance();
  }, [loadFinance]);

  const stats = dashboard?.stats || {};
  const statItems = [
      {
        label: "Total Revenue",
        value: formatCurrency(stats.totalRevenue),
        icon: "cash-outline",
      },
      {
        label: "Admin Commission",
        value: formatCurrency(stats.adminCommission),
        icon: "pie-chart-outline",
      },
      {
        label: "Tutor Earnings",
        value: formatCurrency(stats.tutorEarnings),
        icon: "wallet-outline",
      },
      {
        label: "Pending Withdrawals",
        value: formatCurrency(stats.pendingWithdrawals),
        icon: "time-outline",
      },
    ];

  const submitDecision = async () => {
    if (!decision) return;
    setDecisionBusy(true);
    try {
      if (decision.action === "approve") {
        await adminPaymentApi.approveWithdrawal(
          decision.request.id,
          decision.remarks,
        );
      } else {
        await adminPaymentApi.rejectWithdrawal(
          decision.request.id,
          decision.remarks,
        );
      }

      setDecision(null);
      setFeedback({
        type: "success",
        title:
          decision.action === "approve"
            ? "Withdrawal Approved"
            : "Withdrawal Rejected",
        message: `${formatCurrency(decision.request.amount)} request processed successfully.`,
      });
      await Promise.all([loadFinance(), onChanged?.()]);
    } catch (error) {
      setFeedback({
        type: "error",
        title: "Withdrawal Decision",
        message:
          error?.response?.data?.message ||
          "Could not process this withdrawal request.",
      });
    } finally {
      setDecisionBusy(false);
    }
  };

  if (loading) {
    return (
      <SectionCard
        title="Payments & Finance"
        eyebrow="Platform Revenue"
        icon="analytics-outline"
      >
        <View style={styles.loading}>
          <ActivityIndicator color="#0f766e" />
          <Text style={styles.loadingText}>Loading finance data...</Text>
        </View>
      </SectionCard>
    );
  }

  return (
    <>
      <StatGrid stats={statItems} />

      <SectionCard
        title="Revenue Trend"
        eyebrow="Last 6 Months"
        icon="bar-chart-outline"
      >
        <RevenueBars series={dashboard?.monthlyRevenueSeries || []} />
        <View style={styles.financeMeta}>
          <FinanceMetric label="Today" value={formatCurrency(stats.todayRevenue)} />
          <FinanceMetric label="This month" value={formatCurrency(stats.monthlyRevenue)} />
          <FinanceMetric label="Paid" value={stats.totalPayments || 0} />
        </View>
      </SectionCard>

      <SectionCard
        title="Finance Operations"
        eyebrow="Payments, Withdrawals & Ledger"
        icon="swap-horizontal-outline"
      >
        <View style={styles.tabs}>
          {[
            { id: "payments", label: "Payments", icon: "card-outline" },
            { id: "withdrawals", label: "Withdrawals", icon: "cash-outline" },
            { id: "ledger", label: "Ledger", icon: "list-outline" },
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.tab, tab === item.id && styles.tabActive]}
              onPress={() => setTab(item.id)}
              activeOpacity={0.84}
            >
              <Ionicons
                name={item.icon}
                size={15}
                color={tab === item.id ? "#ffffff" : "#475569"}
              />
              <Text
                style={[
                  styles.tabText,
                  tab === item.id && styles.tabTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === "payments" && (
          <>
            <FilterChips
              options={paymentStatuses}
              value={paymentStatus}
              onChange={setPaymentStatus}
            />
            {payments.length ? (
              payments.map((payment) => (
                <View key={payment.id} style={styles.row}>
                  <View style={styles.rowHeader}>
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle}>
                        {payment.booking?.subject || "Tutor payment"}
                      </Text>
                      <Text style={styles.rowSubtitle}>
                        {payment.student?.user?.fullName || "Student"} to{" "}
                        {payment.tutor?.user?.fullName || "Tutor"}
                      </Text>
                    </View>
                    <Text style={styles.rowAmount}>
                      {formatCurrency(payment.amount)}
                    </Text>
                  </View>
                  <View style={styles.rowMeta}>
                    <Badge
                      label={payment.status}
                      tone={getStatusTone(payment.status)}
                    />
                    <Text style={styles.rowDate}>
                      {payment.receiptNumber} ·{" "}
                      {formatDate(payment.paidAt || payment.createdAt)}
                    </Text>
                  </View>
                  {payment.status === "PAID" && (
                    <Text style={styles.splitText}>
                      Commission {formatCurrency(payment.adminCommission)} · Tutor{" "}
                      {formatCurrency(payment.tutorAmount)}
                    </Text>
                  )}
                </View>
              ))
            ) : (
              <EmptyState label="No payments match this status." />
            )}
          </>
        )}

        {tab === "withdrawals" && (
          <>
            <FilterChips
              options={withdrawalStatuses}
              value={withdrawalStatus}
              onChange={setWithdrawalStatus}
            />
            {withdrawals.length ? (
              withdrawals.map((request) => {
                const pending = request.status === "Pending";
                return (
                  <View key={request.id} style={styles.row}>
                    <View style={styles.rowHeader}>
                      <View style={styles.rowCopy}>
                        <Text style={styles.rowTitle}>
                          {request.tutor?.user?.fullName || "Tutor"}
                        </Text>
                        <Text style={styles.rowSubtitle}>
                          {request.bankAccountNumber} · {request.ifscCode}
                        </Text>
                      </View>
                      <Text style={styles.rowAmount}>
                        {formatCurrency(request.amount)}
                      </Text>
                    </View>
                    <View style={styles.rowMeta}>
                      <Badge
                        label={request.status}
                        tone={getStatusTone(request.status)}
                      />
                      <Text style={styles.rowDate}>
                        {formatDate(request.requestedAt)}
                      </Text>
                    </View>
                    {!!request.adminRemarks && (
                      <Text style={styles.splitText}>{request.adminRemarks}</Text>
                    )}
                    {pending && (
                      <View style={styles.decisionActions}>
                        <TouchableOpacity
                          style={styles.rejectButton}
                          onPress={() =>
                            setDecision({
                              action: "reject",
                              request,
                              remarks: "",
                            })
                          }
                          activeOpacity={0.84}
                        >
                          <Ionicons name="close-outline" size={17} color="#991b1b" />
                          <Text style={styles.rejectButtonText}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.approveButton}
                          onPress={() =>
                            setDecision({
                              action: "approve",
                              request,
                              remarks: "",
                            })
                          }
                          activeOpacity={0.84}
                        >
                          <Ionicons
                            name="checkmark-outline"
                            size={17}
                            color="#ffffff"
                          />
                          <Text style={styles.approveButtonText}>Approve</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            ) : (
              <EmptyState label="No withdrawals match this status." />
            )}
          </>
        )}

        {tab === "ledger" &&
          (ledger.length ? (
            ledger.map((transaction) => {
              const credit = transaction.transactionType === "CREDIT";
              return (
                <View key={transaction.id} style={styles.ledgerRow}>
                  <View
                    style={[
                      styles.ledgerIcon,
                      !credit && styles.ledgerIconDebit,
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
                      {transaction.wallet?.tutor?.user?.fullName || "Tutor"}
                    </Text>
                    <Text style={styles.rowSubtitle}>
                      {transaction.description || transaction.transactionType} ·{" "}
                      {formatDate(transaction.createdAt)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.ledgerAmount,
                      !credit && styles.ledgerAmountDebit,
                    ]}
                  >
                    {credit ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </Text>
                </View>
              );
            })
          ) : (
            <EmptyState label="Wallet transactions will appear here." />
          ))}
      </SectionCard>

      <SectionCard
        title="Top Tutors"
        eyebrow="Earnings"
        icon="trophy-outline"
      >
        {dashboard?.topTutors?.length ? (
          dashboard.topTutors.map((tutor, index) => (
            <View key={tutor.tutorId} style={styles.topTutor}>
              <View style={styles.rank}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{tutor.name}</Text>
                <Text style={styles.rowSubtitle}>
                  {tutor.payments} verified payment
                  {tutor.payments === 1 ? "" : "s"}
                </Text>
              </View>
              <Text style={styles.rowAmount}>
                {formatCurrency(tutor.earnings)}
              </Text>
            </View>
          ))
        ) : (
          <EmptyState label="Tutor earnings will appear after verified payments." />
        )}
      </SectionCard>

      <DecisionModal
        decision={decision}
        busy={decisionBusy}
        onChange={(remarks) =>
          setDecision((current) => ({ ...current, remarks }))
        }
        onConfirm={submitDecision}
        onClose={() => setDecision(null)}
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

function RevenueBars({ series }) {
  const recent = series.slice(-6);
  const maxRevenue = Math.max(
    ...recent.map((item) => Number(item.revenue) || 0),
    1,
  );

  if (!recent.length) {
    return <EmptyState label="Revenue trend will appear after verified payments." />;
  }

  return (
    <View style={styles.chart}>
      {recent.map((item) => {
        const width = `${Math.max(
          3,
          ((Number(item.revenue) || 0) / maxRevenue) * 100,
        )}%`;
        return (
          <View key={item.month} style={styles.chartRow}>
            <Text style={styles.chartLabel}>{item.month}</Text>
            <View style={styles.chartTrack}>
              <View style={[styles.chartBar, { width }]} />
            </View>
            <Text style={styles.chartValue}>{formatCurrency(item.revenue)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function FinanceMetric({ label, value }) {
  return (
    <View style={styles.financeMetric}>
      <Text style={styles.financeMetricLabel}>{label}</Text>
      <Text style={styles.financeMetricValue}>{value}</Text>
    </View>
  );
}

function FilterChips({ options, value, onChange }) {
  return (
    <View style={styles.filters}>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          style={[styles.filter, value === option && styles.filterActive]}
          onPress={() => onChange(option)}
          activeOpacity={0.84}
        >
          <Text
            style={[
              styles.filterText,
              value === option && styles.filterTextActive,
            ]}
          >
            {String(option).toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function DecisionModal({
  decision,
  busy,
  onChange,
  onConfirm,
  onClose,
}) {
  if (!decision) return null;
  const approving = decision.action === "approve";

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <View
            style={[
              styles.modalIcon,
              !approving && styles.modalIconReject,
            ]}
          >
            <Ionicons
              name={approving ? "checkmark-circle-outline" : "close-circle-outline"}
              size={34}
              color={approving ? "#0f766e" : "#991b1b"}
            />
          </View>
          <Text style={styles.modalTitle}>
            {approving ? "Approve Withdrawal" : "Reject Withdrawal"}
          </Text>
          <Text style={styles.modalText}>
            {formatCurrency(decision.request.amount)} for{" "}
            {decision.request.tutor?.user?.fullName || "this tutor"}
          </Text>
          <TextInput
            style={styles.remarksInput}
            value={decision.remarks}
            onChangeText={onChange}
            multiline
            placeholder={
              approving
                ? "Optional processing note"
                : "Reason for rejection"
            }
            placeholderTextColor="#94a3b8"
          />
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={onClose}
              disabled={busy}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalConfirm,
                !approving && styles.modalConfirmReject,
              ]}
              onPress={onConfirm}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.modalConfirmText}>
                  {approving ? "Approve" : "Reject"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  loading: {
    minHeight: 110,
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  loadingText: { color: "#64748b", fontSize: 12, fontWeight: "800" },
  chart: { gap: 9 },
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chartLabel: { width: 54, color: "#475569", fontSize: 10, fontWeight: "900" },
  chartTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#e2e8f0",
    overflow: "hidden",
  },
  chartBar: { height: "100%", borderRadius: 5, backgroundColor: "#14b8a6" },
  chartValue: {
    width: 72,
    color: "#020617",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "right",
  },
  financeMeta: { flexDirection: "row", gap: 8, marginTop: 15 },
  financeMetric: {
    flex: 1,
    minHeight: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    padding: 9,
    justifyContent: "space-between",
  },
  financeMetricLabel: {
    color: "#64748b",
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  financeMetricValue: {
    color: "#020617",
    fontSize: 13,
    fontWeight: "900",
  },
  tabs: { flexDirection: "row", gap: 7, marginBottom: 12 },
  tab: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 6,
  },
  tabActive: { borderColor: "#0f172a", backgroundColor: "#0f172a" },
  tabText: { color: "#475569", fontSize: 9, fontWeight: "900" },
  tabTextActive: { color: "#ffffff" },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 12,
  },
  filter: {
    minHeight: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  filterActive: { backgroundColor: "#ccfbf1", borderColor: "#5eead4" },
  filterText: { color: "#64748b", fontSize: 9, fontWeight: "900" },
  filterTextActive: { color: "#0f766e" },
  row: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    padding: 12,
    marginBottom: 9,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
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
  rowAmount: { color: "#0f766e", fontSize: 13, fontWeight: "900" },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 9,
    marginTop: 10,
  },
  rowDate: { color: "#64748b", fontSize: 9, fontWeight: "800" },
  splitText: {
    color: "#475569",
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "800",
    marginTop: 9,
  },
  decisionActions: { flexDirection: "row", gap: 8, marginTop: 11 },
  rejectButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fee2e2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  rejectButtonText: { color: "#991b1b", fontSize: 11, fontWeight: "900" },
  approveButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: "#0f766e",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  approveButtonText: { color: "#ffffff", fontSize: 11, fontWeight: "900" },
  ledgerRow: {
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
  ledgerIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#ccfbf1",
    alignItems: "center",
    justifyContent: "center",
  },
  ledgerIconDebit: { backgroundColor: "#ffe4e6" },
  ledgerAmount: { color: "#0f766e", fontSize: 12, fontWeight: "900" },
  ledgerAmountDebit: { color: "#be123c" },
  topTutor: {
    minHeight: 62,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    padding: 11,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rank: {
    width: 35,
    height: 35,
    borderRadius: 8,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { color: "#92400e", fontSize: 14, fontWeight: "900" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.72)",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    borderRadius: 8,
    backgroundColor: "#ffffff",
    padding: 22,
  },
  modalIcon: {
    width: 68,
    height: 68,
    borderRadius: 8,
    backgroundColor: "#ccfbf1",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  modalIconReject: { backgroundColor: "#fee2e2" },
  modalTitle: {
    color: "#020617",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 14,
  },
  modalText: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 6,
  },
  remarksInput: {
    minHeight: 86,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    color: "#020617",
    padding: 12,
    marginTop: 16,
    textAlignVertical: "top",
  },
  modalActions: { flexDirection: "row", gap: 9, marginTop: 15 },
  modalCancel: {
    flex: 1,
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: { color: "#020617", fontSize: 12, fontWeight: "900" },
  modalConfirm: {
    flex: 1,
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: "#0f766e",
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmReject: { backgroundColor: "#dc2626" },
  modalConfirmText: { color: "#ffffff", fontSize: 12, fontWeight: "900" },
});
