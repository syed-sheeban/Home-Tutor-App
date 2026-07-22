import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
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

const formatPercent = (value) =>
  `${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}%`;

const normalizePercent = (value) =>
  Math.min(Math.max(Math.round((Number(value) || 0) * 100) / 100, 0), 100);

const paymentStatuses = [
  "ALL",
  "PAID",
  "CREATED",
  "ATTEMPTED",
  "FAILED",
  "CANCELLED",
];
const withdrawalStatuses = [
  "ALL",
  "Pending",
  "Approved",
  "Completed",
  "Rejected",
];
const commissionScopes = ["ALL", "CUSTOM", "DEFAULT"];
const verificationStatuses = ["ALL", "APPROVED", "PENDING", "REJECTED"];

export default function AdminFinance({ onChanged }) {
  const [dashboard, setDashboard] = useState(null);
  const [payments, setPayments] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [commissionSummary, setCommissionSummary] = useState(null);
  const [tab, setTab] = useState("payments");
  const [paymentStatus, setPaymentStatus] = useState("ALL");
  const [withdrawalStatus, setWithdrawalStatus] = useState("ALL");
  const [commissionScope, setCommissionScope] = useState("ALL");
  const [verificationStatus, setVerificationStatus] = useState("ALL");
  const [commissionSearch, setCommissionSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [commissionLoading, setCommissionLoading] = useState(false);
  const [decision, setDecision] = useState(null);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [commissionEditor, setCommissionEditor] = useState(null);
  const [commissionMode, setCommissionMode] = useState("default");
  const [commissionValue, setCommissionValue] = useState("20");
  const [commissionBusy, setCommissionBusy] = useState(false);
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

  const loadCommissions = useCallback(async () => {
    setCommissionLoading(true);
    try {
      const result = await adminPaymentApi.tutorCommissions({
        page: 1,
        limit: 50,
        ...(commissionSearch.trim()
          ? { search: commissionSearch.trim() }
          : {}),
        ...(commissionScope !== "ALL" ? { scope: commissionScope } : {}),
        ...(verificationStatus !== "ALL" ? { verificationStatus } : {}),
      });
      setCommissions(result?.items || []);
      setCommissionSummary(result?.summary || null);
    } catch (error) {
      setCommissions([]);
      setFeedback({
        type: "error",
        title: "Commission Rules",
        message:
          error?.response?.data?.message ||
          "Could not load tutor commission rules.",
      });
    } finally {
      setCommissionLoading(false);
    }
  }, [
    commissionScope,
    commissionSearch,
    verificationStatus,
  ]);

  useEffect(() => {
    loadFinance();
  }, [loadFinance]);

  useEffect(() => {
    if (tab === "commissions") {
      loadCommissions();
    }
  }, [loadCommissions, tab]);

  const stats = dashboard?.stats || {};
  const defaultCommission =
    commissionSummary?.defaultCommissionPercent ??
    dashboard?.commissionConfig?.defaultCommissionPercent ??
    20;
  const previewPercent =
    commissionMode === "default"
      ? defaultCommission
      : normalizePercent(commissionValue);
  const previewGross = 1000;
  const previewCommission = Math.floor(
    (previewGross * previewPercent) / 100,
  );
  const previewTutor = previewGross - previewCommission;
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

  const openCommissionEditor = (tutor) => {
    const isCustom = tutor.commissionSource === "CUSTOM";
    setCommissionEditor(tutor);
    setCommissionMode(isCustom ? "custom" : "default");
    setCommissionValue(String(tutor.effectiveCommissionPercent));
  };

  const adjustCommission = (change) => {
    setCommissionValue((current) =>
      String(normalizePercent((Number(current) || 0) + change)),
    );
  };

  const saveCommission = async () => {
    if (!commissionEditor) return;

    const percent = Number(commissionValue);
    if (
      commissionMode === "custom" &&
      (String(commissionValue).trim() === "" ||
        !Number.isFinite(percent) ||
        percent < 0 ||
        percent > 100)
    ) {
      setFeedback({
        type: "error",
        title: "Commission Rule",
        message: "Commission must be between 0 and 100 percent.",
      });
      return;
    }

    setCommissionBusy(true);
    try {
      await adminPaymentApi.updateTutorCommission(
        commissionEditor.tutorId,
        commissionMode === "default" ? null : normalizePercent(percent),
      );
      setCommissionEditor(null);
      setFeedback({
        type: "success",
        title: "Commission Rule Updated",
        message:
          commissionMode === "default"
            ? `${commissionEditor.name} now follows the platform default.`
            : `${commissionEditor.name} now uses a ${formatPercent(percent)} platform commission.`,
      });
      await Promise.all([loadCommissions(), onChanged?.()]);
    } catch (error) {
      setFeedback({
        type: "error",
        title: "Commission Rule",
        message:
          error?.response?.data?.message ||
          "Could not update this tutor's commission.",
      });
    } finally {
      setCommissionBusy(false);
    }
  };

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
        eyebrow="Payments, Commissions, Withdrawals & Ledger"
        icon="swap-horizontal-outline"
      >
        <View style={styles.tabs}>
          {[
            { id: "payments", label: "Payments", icon: "card-outline" },
            {
              id: "commissions",
              label: "Commission Rules",
              icon: "options-outline",
            },
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
                      {payment.receiptNumber} |{" "}
                      {formatDate(payment.paidAt || payment.createdAt)}
                    </Text>
                  </View>
                  {payment.status === "PAID" && (
                    <Text style={styles.splitText}>
                      Commission {formatCurrency(payment.adminCommission)} (
                      {formatPercent(payment.commissionPercent)}) | Tutor{" "}
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

        {tab === "commissions" && (
          <>
            <View style={styles.commissionSummary}>
              <FinanceMetric
                label="Platform default"
                value={formatPercent(defaultCommission)}
              />
              <FinanceMetric
                label="Custom rates"
                value={commissionSummary?.customizedTutors || 0}
              />
              <FinanceMetric
                label="Using default"
                value={commissionSummary?.defaultTutors || 0}
              />
            </View>

            <View style={styles.searchField}>
              <Ionicons name="search-outline" size={17} color="#64748b" />
              <TextInput
                style={styles.searchInput}
                value={commissionSearch}
                onChangeText={setCommissionSearch}
                placeholder="Search tutor, email, or subject"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                returnKeyType="search"
              />
              {!!commissionSearch && (
                <TouchableOpacity
                  style={styles.clearSearch}
                  onPress={() => setCommissionSearch("")}
                  accessibilityLabel="Clear commission search"
                >
                  <Ionicons name="close" size={16} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.filterLabel}>Commission rule</Text>
            <FilterChips
              options={commissionScopes}
              value={commissionScope}
              onChange={setCommissionScope}
            />

            <Text style={styles.filterLabel}>Tutor verification</Text>
            <FilterChips
              options={verificationStatuses}
              value={verificationStatus}
              onChange={setVerificationStatus}
            />

            {commissionLoading ? (
              <View style={styles.commissionLoading}>
                <ActivityIndicator color="#0f766e" />
                <Text style={styles.loadingText}>
                  Loading commission rules...
                </Text>
              </View>
            ) : commissions.length ? (
              commissions.map((tutor) => (
                <View key={tutor.tutorId} style={styles.commissionRow}>
                  <View style={styles.commissionHeader}>
                    <View style={styles.tutorAvatar}>
                      <Text style={styles.tutorAvatarText}>
                        {String(tutor.name || "T").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle}>{tutor.name}</Text>
                      <Text style={styles.rowSubtitle}>
                        {tutor.mainSubject ||
                          tutor.email ||
                          `Tutor #${tutor.tutorId}`}
                      </Text>
                    </View>
                    <Badge
                      label={tutor.verificationStatus}
                      tone={getStatusTone(tutor.verificationStatus)}
                    />
                  </View>

                  <View style={styles.commissionRule}>
                    <View>
                      <Text style={styles.commissionRuleLabel}>
                        Platform commission
                      </Text>
                      <Text style={styles.commissionRate}>
                        {formatPercent(tutor.effectiveCommissionPercent)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.commissionSource,
                        tutor.commissionSource === "CUSTOM" &&
                          styles.commissionSourceCustom,
                      ]}
                    >
                      <Text
                        style={[
                          styles.commissionSourceText,
                          tutor.commissionSource === "CUSTOM" &&
                            styles.commissionSourceTextCustom,
                        ]}
                      >
                        {tutor.commissionSource === "CUSTOM"
                          ? "CUSTOM RATE"
                          : "PLATFORM DEFAULT"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.commissionMetrics}>
                    <CommissionMetric
                      label="Paid volume"
                      value={formatCurrency(tutor.grossRevenue)}
                      detail={`${tutor.paidPayments || 0} payments`}
                    />
                    <CommissionMetric
                      label="Platform"
                      value={formatCurrency(tutor.adminCommission)}
                    />
                    <CommissionMetric
                      label="Tutor"
                      value={formatCurrency(tutor.tutorEarnings)}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.adjustButton}
                    onPress={() => openCommissionEditor(tutor)}
                    activeOpacity={0.84}
                  >
                    <Ionicons name="options-outline" size={17} color="#ffffff" />
                    <Text style={styles.adjustButtonText}>Adjust rule</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <EmptyState label="No tutors match these commission filters." />
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
                const actionable = ["Pending", "Approved"].includes(
                  request.status,
                );
                return (
                  <View key={request.id} style={styles.row}>
                    <View style={styles.rowHeader}>
                      <View style={styles.rowCopy}>
                        <Text style={styles.rowTitle}>
                          {request.tutor?.user?.fullName || "Tutor"}
                        </Text>
                        <Text style={styles.rowSubtitle}>
                          {request.bankAccountNumber} | {request.ifscCode}
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
                    {actionable && (
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
                      {transaction.description || transaction.transactionType} |{" "}
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

      <CommissionModal
        editor={commissionEditor}
        mode={commissionMode}
        value={commissionValue}
        defaultCommission={defaultCommission}
        previewPercent={previewPercent}
        previewCommission={previewCommission}
        previewTutor={previewTutor}
        busy={commissionBusy}
        onModeChange={setCommissionMode}
        onValueChange={setCommissionValue}
        onAdjust={adjustCommission}
        onConfirm={saveCommission}
        onClose={() => setCommissionEditor(null)}
      />

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

function CommissionMetric({ label, value, detail }) {
  return (
    <View style={styles.commissionMetric}>
      <Text style={styles.commissionMetricLabel}>{label}</Text>
      <Text
        style={styles.commissionMetricValue}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      {!!detail && (
        <Text style={styles.commissionMetricDetail}>{detail}</Text>
      )}
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

function CommissionModal({
  editor,
  mode,
  value,
  defaultCommission,
  previewPercent,
  previewCommission,
  previewTutor,
  busy,
  onModeChange,
  onValueChange,
  onAdjust,
  onConfirm,
  onClose,
}) {
  if (!editor) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.commissionModal}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={onClose}
            disabled={busy}
            accessibilityLabel="Close commission editor"
          >
            <Ionicons name="close" size={19} color="#475569" />
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={styles.commissionModalContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.commissionModalIcon}>
              <Ionicons name="options-outline" size={30} color="#0f766e" />
            </View>
            <Text style={styles.commissionModalEyebrow}>Commission rule</Text>
            <Text style={styles.modalTitle}>{editor.name}</Text>
            <Text style={styles.modalText}>
              {editor.email || `Tutor #${editor.tutorId}`}
            </Text>

            <View style={styles.commissionModes}>
              <TouchableOpacity
                style={[
                  styles.commissionMode,
                  mode === "default" && styles.commissionModeActive,
                ]}
                onPress={() => onModeChange("default")}
                disabled={busy}
                activeOpacity={0.84}
              >
                <Ionicons
                  name="refresh-outline"
                  size={16}
                  color={mode === "default" ? "#ffffff" : "#475569"}
                />
                <Text
                  style={[
                    styles.commissionModeText,
                    mode === "default" && styles.commissionModeTextActive,
                  ]}
                >
                  Platform default
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.commissionMode,
                  mode === "custom" && styles.commissionModeActive,
                ]}
                onPress={() => onModeChange("custom")}
                disabled={busy}
                activeOpacity={0.84}
              >
                <Ionicons
                  name="options-outline"
                  size={16}
                  color={mode === "custom" ? "#ffffff" : "#475569"}
                />
                <Text
                  style={[
                    styles.commissionModeText,
                    mode === "custom" && styles.commissionModeTextActive,
                  ]}
                >
                  Custom rate
                </Text>
              </TouchableOpacity>
            </View>

            {mode === "custom" ? (
              <View style={styles.rateControl}>
                <Text style={styles.rateControlLabel}>Platform commission</Text>
                <View style={styles.rateStepper}>
                  <TouchableOpacity
                    style={styles.stepButton}
                    onPress={() => onAdjust(-0.25)}
                    disabled={busy}
                    accessibilityLabel="Decrease commission"
                  >
                    <Ionicons name="remove" size={20} color="#0f172a" />
                  </TouchableOpacity>
                  <View style={styles.rateInputWrap}>
                    <TextInput
                      style={styles.rateInput}
                      value={value}
                      onChangeText={onValueChange}
                      keyboardType="decimal-pad"
                      selectTextOnFocus
                      maxLength={6}
                      editable={!busy}
                      accessibilityLabel="Custom commission percentage"
                    />
                    <Text style={styles.rateSuffix}>%</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.stepButton}
                    onPress={() => onAdjust(0.25)}
                    disabled={busy}
                    accessibilityLabel="Increase commission"
                  >
                    <Ionicons name="add" size={20} color="#0f172a" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.defaultRateNote}>
                <Ionicons name="refresh-outline" size={18} color="#0f766e" />
                <Text style={styles.defaultRateText}>
                  This tutor follows the current platform rate.
                </Text>
                <Text style={styles.defaultRateValue}>
                  {formatPercent(defaultCommission)}
                </Text>
              </View>
            )}

            <View style={styles.commissionPreview}>
              <Text style={styles.commissionPreviewLabel}>
                Example split on {formatCurrency(1000)}
              </Text>
              <View style={styles.commissionPreviewRow}>
                <CommissionMetric
                  label="Platform"
                  value={formatCurrency(previewCommission)}
                  detail={formatPercent(previewPercent)}
                />
                <CommissionMetric
                  label="Tutor"
                  value={formatCurrency(previewTutor)}
                  detail={formatPercent(100 - previewPercent)}
                />
              </View>
            </View>

            <Text style={styles.commissionHistoryNote}>
              The updated rate applies to new payment orders. Existing payments
              keep their original split.
            </Text>

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
                  busy && styles.modalButtonDisabled,
                ]}
                onPress={onConfirm}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <View style={styles.modalConfirmContent}>
                    <Ionicons name="checkmark" size={17} color="#ffffff" />
                    <Text style={styles.modalConfirmText}>Save rule</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
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
  commissionLoading: {
    minHeight: 110,
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
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
  commissionSummary: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 12,
  },
  tab: {
    flexGrow: 1,
    flexBasis: "47%",
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
  filterLabel: {
    color: "#64748b",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 7,
  },
  searchField: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: "#020617",
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 9,
    paddingVertical: 10,
  },
  clearSearch: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
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
  commissionRow: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    padding: 12,
    marginBottom: 10,
  },
  commissionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  tutorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#ccfbf1",
    alignItems: "center",
    justifyContent: "center",
  },
  tutorAvatarText: {
    color: "#0f766e",
    fontSize: 17,
    fontWeight: "900",
  },
  commissionRule: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 12,
    paddingVertical: 10,
  },
  commissionRuleLabel: {
    color: "#64748b",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  commissionRate: {
    color: "#020617",
    fontSize: 21,
    fontWeight: "900",
    marginTop: 2,
  },
  commissionSource: {
    maxWidth: "52%",
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  commissionSourceCustom: {
    backgroundColor: "#fef3c7",
  },
  commissionSourceText: {
    color: "#475569",
    fontSize: 8,
    lineHeight: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  commissionSourceTextCustom: {
    color: "#92400e",
  },
  commissionMetrics: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 12,
  },
  commissionMetric: {
    flex: 1,
    minWidth: 0,
  },
  commissionMetricLabel: {
    color: "#64748b",
    fontSize: 8,
    lineHeight: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  commissionMetricValue: {
    color: "#020617",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 4,
  },
  commissionMetricDetail: {
    color: "#64748b",
    fontSize: 8,
    fontWeight: "700",
    marginTop: 2,
  },
  adjustButton: {
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: "#0f172a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  adjustButtonText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
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
  commissionModal: {
    maxHeight: "92%",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  commissionModalContent: {
    padding: 22,
    paddingTop: 26,
  },
  modalClose: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 2,
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  commissionModalIcon: {
    width: 62,
    height: 62,
    borderRadius: 8,
    backgroundColor: "#ccfbf1",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  commissionModalEyebrow: {
    color: "#0f766e",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    textAlign: "center",
    marginTop: 12,
  },
  commissionModes: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
  },
  commissionMode: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 8,
  },
  commissionModeActive: {
    borderColor: "#0f172a",
    backgroundColor: "#0f172a",
  },
  commissionModeText: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center",
  },
  commissionModeTextActive: {
    color: "#ffffff",
  },
  rateControl: {
    marginTop: 16,
  },
  rateControlLabel: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  rateStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepButton: {
    width: 46,
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  rateInputWrap: {
    flex: 1,
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#5eead4",
    backgroundColor: "#f0fdfa",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  rateInput: {
    minWidth: 70,
    color: "#020617",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "right",
    paddingVertical: 8,
  },
  rateSuffix: {
    color: "#0f766e",
    fontSize: 17,
    fontWeight: "900",
    marginLeft: 4,
  },
  defaultRateNote: {
    minHeight: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#99f6e4",
    backgroundColor: "#f0fdfa",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    marginTop: 16,
  },
  defaultRateText: {
    flex: 1,
    color: "#475569",
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "800",
  },
  defaultRateValue: {
    color: "#0f766e",
    fontSize: 15,
    fontWeight: "900",
  },
  commissionPreview: {
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginTop: 16,
  },
  commissionPreviewLabel: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  commissionPreviewRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 10,
  },
  commissionHistoryNote: {
    color: "#64748b",
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "700",
    marginTop: 12,
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
  modalConfirmContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  modalButtonDisabled: {
    opacity: 0.62,
  },
  modalConfirmReject: { backgroundColor: "#dc2626" },
  modalConfirmText: { color: "#ffffff", fontSize: 12, fontWeight: "900" },
});
