import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
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

const financeTabs = [
  { id: "commissions", label: "Commission", icon: "options-outline" },
  { id: "payments", label: "Payments", icon: "card-outline" },
  { id: "withdrawals", label: "Payouts", icon: "cash-outline" },
  { id: "ledger", label: "Ledger", icon: "list-outline" },
];

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
const commissionScopes = [
  { id: "ALL", label: "All" },
  { id: "CUSTOM", label: "Custom" },
  { id: "DEFAULT", label: "Default" },
];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatPercent = (value) =>
  `${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}%`;

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

const clampPercent = (value) =>
  Math.min(Math.max(Number(value) || 0, 0), 100);

const roundPercent = (value) =>
  Math.round(clampPercent(value) * 100) / 100;

const sanitizePercent = (value) => {
  const normalized = String(value).replace(",", ".").replace(/[^0-9.]/g, "");
  const [whole = "", ...decimalParts] = normalized.split(".");
  if (!decimalParts.length) return whole.slice(0, 3);
  return `${whole.slice(0, 3)}.${decimalParts.join("").slice(0, 2)}`;
};

const getInitial = (name) =>
  String(name || "T").trim().charAt(0).toUpperCase() || "T";

export default function AdminFinance({ onChanged }) {
  const [dashboard, setDashboard] = useState(null);
  const [tab, setTab] = useState("commissions");
  const [records, setRecords] = useState([]);
  const [commissionSummary, setCommissionSummary] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("ALL");
  const [withdrawalStatus, setWithdrawalStatus] = useState("ALL");
  const [commissionScope, setCommissionScope] = useState("ALL");
  const [commissionSearch, setCommissionSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [commissionMode, setCommissionMode] = useState("default");
  const [commissionValue, setCommissionValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [commissionBusy, setCommissionBusy] = useState(false);
  const [decision, setDecision] = useState(null);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const selectedTutorIdRef = useRef(null);

  const defaultCommission =
    commissionSummary?.defaultCommissionPercent
    ?? dashboard?.commissionConfig?.defaultCommissionPercent
    ?? 0;

  const selectTutor = useCallback((tutor) => {
    selectedTutorIdRef.current = tutor?.tutorId || null;
    setSelectedTutor(tutor);
    if (!tutor) return;
    setCommissionMode(
      tutor.commissionSource === "CUSTOM" ? "custom" : "default",
    );
    setCommissionValue(String(tutor.effectiveCommissionPercent ?? ""));
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      const result = await adminPaymentApi.dashboard({ days: 30, months: 6 });
      setDashboard(result);
    } catch (error) {
      setFeedback({
        type: "error",
        title: "Finance Summary",
        message:
          error?.response?.data?.message
          || "Could not load the finance summary.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      let result;

      if (tab === "commissions") {
        result = await adminPaymentApi.tutorCommissions({
          page: 1,
          limit: 100,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(commissionScope !== "ALL" ? { scope: commissionScope } : {}),
        });
        const nextRecords = result?.items || [];
        const nextTutor =
          nextRecords.find(
            (tutor) => tutor.tutorId === selectedTutorIdRef.current,
          )
          || nextRecords[0]
          || null;
        setCommissionSummary(result?.summary || null);
        setRecords(nextRecords);
        selectTutor(nextTutor);
      } else if (tab === "payments") {
        result = await adminPaymentApi.payments({
          page: 1,
          limit: 60,
          ...(paymentStatus !== "ALL" ? { status: paymentStatus } : {}),
        });
        setRecords(result?.items || []);
      } else if (tab === "withdrawals") {
        result = await adminPaymentApi.withdrawals({
          page: 1,
          limit: 60,
          ...(withdrawalStatus !== "ALL"
            ? { status: withdrawalStatus }
            : {}),
        });
        setRecords(result?.items || []);
      } else {
        result = await adminPaymentApi.walletTransactions({
          page: 1,
          limit: 60,
        });
        setRecords(result?.items || []);
      }
    } catch (error) {
      setRecords([]);
      setFeedback({
        type: "error",
        title: "Finance Records",
        message:
          error?.response?.data?.message
          || "Could not load finance records.",
      });
    } finally {
      setRecordsLoading(false);
    }
  }, [
    commissionScope,
    debouncedSearch,
    paymentStatus,
    selectTutor,
    tab,
    withdrawalStatus,
  ]);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(commissionSearch.trim()),
      350,
    );
    return () => clearTimeout(timer);
  }, [commissionSearch]);

  useEffect(() => {
    void Promise.resolve().then(loadDashboard);
  }, [loadDashboard]);

  useEffect(() => {
    void Promise.resolve().then(loadRecords);
  }, [loadRecords]);

  const switchTab = (nextTab) => {
    setTab(nextTab);
    setRecords([]);
    if (nextTab !== "commissions") {
      selectedTutorIdRef.current = null;
      setSelectedTutor(null);
    }
  };

  const adjustCommission = (amount) => {
    const current = Number.isFinite(Number(commissionValue))
      ? Number(commissionValue)
      : defaultCommission;
    setCommissionValue(String(roundPercent(current + amount)));
  };

  const saveCommission = async () => {
    if (!selectedTutor) return;

    const percent = Number(commissionValue);
    if (
      commissionMode === "custom"
      && (
        commissionValue.trim() === ""
        || !Number.isFinite(percent)
        || percent < 0
        || percent > 100
      )
    ) {
      setFeedback({
        type: "error",
        title: "Invalid Commission",
        message: "Enter a commission rate between 0 and 100 percent.",
      });
      return;
    }

    setCommissionBusy(true);
    try {
      const result = await adminPaymentApi.updateTutorCommission(
        selectedTutor.tutorId,
        commissionMode === "default" ? null : roundPercent(percent),
      );
      selectTutor({ ...selectedTutor, ...result?.tutor });
      setFeedback({
        type: "success",
        title:
          commissionMode === "default"
            ? "Default Restored"
            : "Commission Saved",
        message:
          commissionMode === "default"
            ? `${selectedTutor.name} now follows the platform default.`
            : `${selectedTutor.name} now uses ${formatPercent(percent)}.`,
      });
      await Promise.all([
        loadRecords(),
        loadDashboard(),
        Promise.resolve(onChanged?.()),
      ]);
    } catch (error) {
      setFeedback({
        type: "error",
        title: "Commission Update",
        message:
          error?.response?.data?.message
          || "Could not update this tutor's commission.",
      });
    } finally {
      setCommissionBusy(false);
    }
  };

  const submitDecision = async () => {
    if (!decision) return;
    if (decision.action === "reject" && !decision.remarks.trim()) {
      setFeedback({
        type: "error",
        title: "Rejection Reason",
        message: "Add a reason before rejecting this withdrawal.",
      });
      return;
    }

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
        message: `${formatCurrency(decision.request.amount)} was processed.`,
      });
      await Promise.all([loadRecords(), loadDashboard()]);
    } catch (error) {
      setFeedback({
        type: "error",
        title: "Withdrawal Decision",
        message:
          error?.response?.data?.message
          || "Could not process this withdrawal.",
      });
    } finally {
      setDecisionBusy(false);
    }
  };

  const stats = dashboard?.stats || {};
  const statItems = [
    {
      label: "Revenue",
      value: formatCurrency(stats.totalRevenue),
      icon: "cash-outline",
    },
    {
      label: "Platform Share",
      value: formatCurrency(stats.adminCommission),
      icon: "pie-chart-outline",
    },
    {
      label: "Tutor Earnings",
      value: formatCurrency(stats.tutorEarnings),
      icon: "wallet-outline",
    },
    {
      label: "Pending Payouts",
      value: formatCurrency(stats.pendingWithdrawals),
      icon: "time-outline",
    },
  ];

  if (loading) {
    return (
      <SectionCard
        title="Finance Control"
        eyebrow="Payments"
        icon="card-outline"
      >
        <LoadingState label="Loading finance data..." />
      </SectionCard>
    );
  }

  return (
    <>
      <StatGrid stats={statItems} />

      <SectionCard
        title="Finance Control"
        eyebrow="Commission, Payments & Payouts"
        icon="card-outline"
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {financeTabs.map((item) => {
            const active = tab === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => switchTab(item.id)}
                activeOpacity={0.84}
              >
                <Ionicons
                  name={item.icon}
                  size={16}
                  color={active ? "#ffffff" : "#52636d"}
                />
                <Text
                  style={[styles.tabText, active && styles.tabTextActive]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {tab === "commissions" && (
          <CommissionView
            summary={commissionSummary}
            defaultCommission={defaultCommission}
            tutors={records}
            loading={recordsLoading}
            search={commissionSearch}
            scope={commissionScope}
            selectedTutor={selectedTutor}
            mode={commissionMode}
            value={commissionValue}
            busy={commissionBusy}
            onSearch={setCommissionSearch}
            onScope={setCommissionScope}
            onSelect={selectTutor}
            onMode={setCommissionMode}
            onValue={(value) => setCommissionValue(sanitizePercent(value))}
            onStep={adjustCommission}
            onSave={saveCommission}
          />
        )}

        {tab === "payments" && (
          <PaymentsView
            records={records}
            loading={recordsLoading}
            status={paymentStatus}
            onStatus={setPaymentStatus}
          />
        )}

        {tab === "withdrawals" && (
          <WithdrawalsView
            records={records}
            loading={recordsLoading}
            status={withdrawalStatus}
            onStatus={setWithdrawalStatus}
            onDecision={(request, action) =>
              setDecision({ request, action, remarks: "" })
            }
          />
        )}

        {tab === "ledger" && (
          <LedgerView records={records} loading={recordsLoading} />
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

function CommissionView({
  summary,
  defaultCommission,
  tutors,
  loading,
  search,
  scope,
  selectedTutor,
  mode,
  value,
  busy,
  onSearch,
  onScope,
  onSelect,
  onMode,
  onValue,
  onStep,
  onSave,
}) {
  return (
    <>
      <View style={styles.commissionSummary}>
        <View style={styles.summaryLead}>
          <View style={styles.summaryIcon}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.summaryLabel}>Platform default</Text>
            <Text style={styles.summaryRate}>
              {formatPercent(defaultCommission)}
            </Text>
          </View>
        </View>
        <SummaryCount
          label="Custom"
          value={summary?.customizedTutors || 0}
          color="#f5b82e"
        />
        <SummaryCount
          label="Default"
          value={summary?.defaultTutors || 0}
          color="#5eead4"
        />
      </View>

      <View style={styles.search}>
        <Ionicons name="search-outline" size={17} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={onSearch}
          placeholder="Search tutor or subject"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          returnKeyType="search"
        />
        {!!search && (
          <TouchableOpacity
            style={styles.clearSearch}
            onPress={() => onSearch("")}
            accessibilityLabel="Clear tutor search"
          >
            <Ionicons name="close-outline" size={18} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.scopeControl}>
        {commissionScopes.map((item) => {
          const active = scope === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.scopeButton, active && styles.scopeButtonActive]}
              onPress={() => onScope(item.id)}
              activeOpacity={0.84}
            >
              <Text
                style={[
                  styles.scopeButtonText,
                  active && styles.scopeButtonTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {!!selectedTutor && (
        <CommissionEditor
          tutor={selectedTutor}
          defaultCommission={defaultCommission}
          mode={mode}
          value={value}
          busy={busy}
          onMode={onMode}
          onValue={onValue}
          onStep={onStep}
          onSave={onSave}
        />
      )}

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Tutors</Text>
        <Text style={styles.listCount}>{tutors.length} shown</Text>
      </View>

      {loading ? (
        <LoadingState label="Loading tutor rules..." />
      ) : tutors.length ? (
        tutors.map((tutor) => {
          const selected = selectedTutor?.tutorId === tutor.tutorId;
          const custom = tutor.commissionSource === "CUSTOM";
          return (
            <TouchableOpacity
              key={tutor.tutorId}
              style={[styles.tutorRow, selected && styles.tutorRowSelected]}
              onPress={() => onSelect(tutor)}
              activeOpacity={0.84}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitial(tutor.name)}</Text>
              </View>
              <View style={styles.tutorCopy}>
                <Text style={styles.tutorName} numberOfLines={1}>
                  {tutor.name || "Tutor"}
                </Text>
                <Text style={styles.tutorSubject} numberOfLines={1}>
                  {tutor.mainSubject
                    || tutor.email
                    || `Tutor #${tutor.tutorId}`}
                </Text>
              </View>
              <View style={styles.tutorRule}>
                <Text style={styles.tutorRate}>
                  {formatPercent(tutor.effectiveCommissionPercent)}
                </Text>
                <Text
                  style={[
                    styles.tutorRuleLabel,
                    custom && styles.tutorRuleLabelCustom,
                  ]}
                >
                  {custom ? "CUSTOM" : "DEFAULT"}
                </Text>
              </View>
              <Ionicons
                name={selected ? "checkmark-circle" : "chevron-forward"}
                size={18}
                color={selected ? "#0f766e" : "#94a3b8"}
              />
            </TouchableOpacity>
          );
        })
      ) : (
        <EmptyState label="No tutors match this filter." />
      )}
    </>
  );
}

function CommissionEditor({
  tutor,
  defaultCommission,
  mode,
  value,
  busy,
  onMode,
  onValue,
  onStep,
  onSave,
}) {
  const previewPercent =
    mode === "default" ? defaultCommission : clampPercent(value);
  const platformAmount = Math.floor((1000 * previewPercent) / 100);
  const tutorAmount = 1000 - platformAmount;

  return (
    <View style={styles.editor}>
      <View style={styles.editorHeader}>
        <View style={styles.editorIdentity}>
          <View style={styles.editorAvatar}>
            <Text style={styles.editorAvatarText}>{getInitial(tutor.name)}</Text>
          </View>
          <View style={styles.editorCopy}>
            <Text style={styles.editorEyebrow}>Commission rule</Text>
            <Text style={styles.editorName} numberOfLines={1}>
              {tutor.name}
            </Text>
          </View>
        </View>
        <Badge
          label={tutor.verificationStatus || "Pending"}
          tone={getStatusTone(tutor.verificationStatus)}
        />
      </View>

      <View style={styles.modeControl}>
        <ModeButton
          label="Platform default"
          icon="refresh-outline"
          active={mode === "default"}
          disabled={busy}
          onPress={() => onMode("default")}
        />
        <ModeButton
          label="Custom rate"
          icon="options-outline"
          active={mode === "custom"}
          disabled={busy}
          onPress={() => onMode("custom")}
        />
      </View>

      {mode === "custom" ? (
        <View style={styles.rateEditor}>
          <Text style={styles.rateLabel}>Platform commission</Text>
          <View style={styles.rateStepper}>
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => onStep(-1)}
              disabled={busy}
              accessibilityLabel="Decrease commission"
            >
              <Ionicons name="remove-outline" size={22} color="#172a33" />
            </TouchableOpacity>
            <View style={styles.rateInputWrap}>
              <TextInput
                style={styles.rateInput}
                value={value}
                onChangeText={onValue}
                keyboardType="decimal-pad"
                selectTextOnFocus
                maxLength={6}
                editable={!busy}
              />
              <Text style={styles.rateSuffix}>%</Text>
            </View>
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => onStep(1)}
              disabled={busy}
              accessibilityLabel="Increase commission"
            >
              <Ionicons name="add-outline" size={22} color="#172a33" />
            </TouchableOpacity>
          </View>
          <View style={styles.presets}>
            {[10, 15, 20, 25].map((rate) => {
              const active = Number(value) === rate;
              return (
                <TouchableOpacity
                  key={rate}
                  style={[styles.preset, active && styles.presetActive]}
                  onPress={() => onValue(String(rate))}
                  disabled={busy}
                >
                  <Text
                    style={[
                      styles.presetText,
                      active && styles.presetTextActive,
                    ]}
                  >
                    {rate}%
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={styles.defaultRule}>
          <Ionicons name="refresh-outline" size={18} color="#0f766e" />
          <Text style={styles.defaultRuleLabel}>Platform default</Text>
          <Text style={styles.defaultRuleValue}>
            {formatPercent(defaultCommission)}
          </Text>
        </View>
      )}

      <View style={styles.splitPreview}>
        <View style={styles.splitHeader}>
          <Text style={styles.splitLabel}>Example split</Text>
          <Text style={styles.splitGross}>{formatCurrency(1000)}</Text>
        </View>
        <View style={styles.splitTrack}>
          <View
            style={[
              styles.splitPlatformTrack,
              { width: `${previewPercent}%` },
            ]}
          />
        </View>
        <View style={styles.splitValues}>
          <SplitValue
            label="Platform"
            value={formatCurrency(platformAmount)}
            percent={formatPercent(previewPercent)}
            color="#f5b82e"
          />
          <SplitValue
            label="Tutor receives"
            value={formatCurrency(tutorAmount)}
            percent={formatPercent(100 - previewPercent)}
            color="#5eead4"
            alignRight
          />
        </View>
      </View>

      <View style={styles.performance}>
        <PerformanceValue
          label="Paid volume"
          value={formatCurrency(tutor.grossRevenue)}
        />
        <PerformanceValue
          label="Platform"
          value={formatCurrency(tutor.adminCommission)}
        />
        <PerformanceValue
          label="Tutor"
          value={formatCurrency(tutor.tutorEarnings)}
        />
      </View>

      <TouchableOpacity
        style={[styles.saveButton, busy && styles.buttonDisabled]}
        onPress={onSave}
        disabled={busy}
        activeOpacity={0.84}
      >
        {busy ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <>
            <Ionicons name="checkmark-outline" size={18} color="#ffffff" />
            <Text style={styles.saveButtonText}>
              {mode === "default"
                ? "Use platform default"
                : "Save custom rate"}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

function PaymentsView({ records, loading, status, onStatus }) {
  return (
    <>
      <FilterChips
        options={paymentStatuses}
        value={status}
        onChange={onStatus}
      />
      {loading ? (
        <LoadingState label="Loading payments..." />
      ) : records.length ? (
        records.map((payment) => (
          <View key={payment.id} style={styles.record}>
            <View style={styles.recordHeader}>
              <View style={styles.recordCopy}>
                <Text style={styles.recordTitle}>
                  {payment.booking?.subject || "Tutor payment"}
                </Text>
                <Text style={styles.recordSubtitle}>
                  {payment.student?.user?.fullName || "Student"} to{" "}
                  {payment.tutor?.user?.fullName || "Tutor"}
                </Text>
              </View>
              <Text style={styles.recordAmount}>
                {formatCurrency(payment.amount)}
              </Text>
            </View>
            <View style={styles.recordMeta}>
              <Badge
                label={payment.status}
                tone={getStatusTone(payment.status)}
              />
              <Text style={styles.recordDate}>
                {payment.receiptNumber} |{" "}
                {formatDate(payment.paidAt || payment.createdAt)}
              </Text>
            </View>
            {payment.status === "PAID" && (
              <View style={styles.paymentSplit}>
                <PerformanceValue
                  label={`Platform ${formatPercent(payment.commissionPercent)}`}
                  value={formatCurrency(payment.adminCommission)}
                />
                <PerformanceValue
                  label="Tutor credited"
                  value={formatCurrency(payment.tutorAmount)}
                />
              </View>
            )}
          </View>
        ))
      ) : (
        <EmptyState label="No payments match this status." />
      )}
    </>
  );
}

function WithdrawalsView({
  records,
  loading,
  status,
  onStatus,
  onDecision,
}) {
  return (
    <>
      <FilterChips
        options={withdrawalStatuses}
        value={status}
        onChange={onStatus}
      />
      {loading ? (
        <LoadingState label="Loading payouts..." />
      ) : records.length ? (
        records.map((request) => {
          const actionable = ["Pending", "Approved"].includes(request.status);
          return (
            <View key={request.id} style={styles.record}>
              <View style={styles.recordHeader}>
                <View style={styles.recordCopy}>
                  <Text style={styles.recordTitle}>
                    {request.tutor?.user?.fullName || "Tutor"}
                  </Text>
                  <Text style={styles.recordSubtitle}>
                    {request.bankAccountNumber} | {request.ifscCode}
                  </Text>
                </View>
                <Text style={styles.recordAmount}>
                  {formatCurrency(request.amount)}
                </Text>
              </View>
              <View style={styles.recordMeta}>
                <Badge
                  label={request.status}
                  tone={getStatusTone(request.status)}
                />
                <Text style={styles.recordDate}>
                  {formatDate(request.requestedAt)}
                </Text>
              </View>
              {!!request.adminRemarks && (
                <Text style={styles.remarks}>{request.adminRemarks}</Text>
              )}
              {actionable && (
                <View style={styles.decisionActions}>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => onDecision(request, "reject")}
                    activeOpacity={0.84}
                  >
                    <Ionicons name="close-outline" size={17} color="#a12828" />
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => onDecision(request, "approve")}
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
        <EmptyState label="No payouts match this status." />
      )}
    </>
  );
}

function LedgerView({ records, loading }) {
  if (loading) return <LoadingState label="Loading wallet ledger..." />;
  if (!records.length) {
    return <EmptyState label="Wallet transactions will appear here." />;
  }

  return records.map((transaction) => {
    const credit = transaction.transactionType === "CREDIT";
    return (
      <View key={transaction.id} style={styles.ledgerRow}>
        <View
          style={[styles.ledgerIcon, !credit && styles.ledgerIconDebit]}
        >
          <Ionicons
            name={credit ? "arrow-down-outline" : "arrow-up-outline"}
            size={17}
            color={credit ? "#0f766e" : "#be123c"}
          />
        </View>
        <View style={styles.recordCopy}>
          <Text style={styles.recordTitle}>
            {transaction.wallet?.tutor?.user?.fullName || "Tutor"}
          </Text>
          <Text style={styles.recordSubtitle}>
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
  });
}

function ModeButton({ label, icon, active, disabled, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.modeButton, active && styles.modeButtonActive]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.84}
    >
      <Ionicons
        name={icon}
        size={15}
        color={active ? "#ffffff" : "#52636d"}
      />
      <Text
        style={[styles.modeButtonText, active && styles.modeButtonTextActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SummaryCount({ label, value, color }) {
  return (
    <View style={styles.summaryCount}>
      <Text style={[styles.summaryCountValue, { color }]}>{value}</Text>
      <Text style={styles.summaryCountLabel}>{label}</Text>
    </View>
  );
}

function SplitValue({
  label,
  value,
  percent,
  color,
  alignRight = false,
}) {
  return (
    <View style={[styles.splitValue, alignRight && styles.splitValueRight]}>
      <Text style={styles.splitValueLabel}>{label}</Text>
      <Text style={[styles.splitValueAmount, { color }]}>{value}</Text>
      <Text style={styles.splitValuePercent}>{percent}</Text>
    </View>
  );
}

function PerformanceValue({ label, value }) {
  return (
    <View style={styles.performanceValue}>
      <Text style={styles.performanceLabel}>{label}</Text>
      <Text
        style={styles.performanceAmount}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

function FilterChips({ options, value, onChange }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filters}
    >
      {options.map((option) => {
        const active = value === option;
        return (
          <TouchableOpacity
            key={option}
            style={[styles.filter, active && styles.filterActive]}
            onPress={() => onChange(option)}
            activeOpacity={0.84}
          >
            <Text
              style={[
                styles.filterText,
                active && styles.filterTextActive,
              ]}
            >
              {String(option).toUpperCase()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function LoadingState({ label }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color="#0f766e" />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

function DecisionModal({ decision, busy, onChange, onConfirm, onClose }) {
  if (!decision) return null;
  const approving = decision.action === "approve";

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <View
            style={[styles.modalIcon, !approving && styles.modalIconReject]}
          >
            <Ionicons
              name={
                approving
                  ? "checkmark-circle-outline"
                  : "close-circle-outline"
              }
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
              approving ? "Optional processing note" : "Reason for rejection"
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
  tabs: {
    gap: 7,
    paddingBottom: 12,
    paddingRight: 4,
  },
  tab: {
    minWidth: 102,
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d2dce0",
    backgroundColor: "#f3f6f7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 10,
  },
  tabActive: {
    borderColor: "#15333d",
    backgroundColor: "#15333d",
  },
  tabText: {
    color: "#52636d",
    fontSize: 10,
    fontWeight: "900",
  },
  tabTextActive: { color: "#ffffff" },
  commissionSummary: {
    minHeight: 96,
    borderRadius: 8,
    backgroundColor: "#15333d",
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 13,
    marginBottom: 10,
  },
  summaryLead: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#0f766e",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryLabel: {
    color: "#a8b9c0",
    fontSize: 8,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  summaryRate: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 2,
  },
  summaryCount: { minWidth: 42, alignItems: "center" },
  summaryCountValue: { fontSize: 17, fontWeight: "900" },
  summaryCountLabel: {
    color: "#a8b9c0",
    fontSize: 8,
    fontWeight: "900",
    marginTop: 2,
    textTransform: "uppercase",
  },
  search: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccd7dc",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingLeft: 11,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: "#1c3039",
    fontSize: 12,
    fontWeight: "800",
    paddingVertical: 10,
  },
  clearSearch: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  scopeControl: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  scopeButton: {
    flex: 1,
    minHeight: 34,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  scopeButtonActive: { backgroundColor: "#dff7f4" },
  scopeButtonText: {
    color: "#64748b",
    fontSize: 9,
    fontWeight: "900",
  },
  scopeButtonTextActive: { color: "#0f766e" },
  editor: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d9e2e6",
    backgroundColor: "#ffffff",
    padding: 12,
    marginBottom: 12,
  },
  editorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  editorIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#e6efff",
    alignItems: "center",
    justifyContent: "center",
  },
  editorAvatarText: {
    color: "#245dc1",
    fontSize: 15,
    fontWeight: "900",
  },
  editorCopy: { flex: 1, minWidth: 0 },
  editorEyebrow: {
    color: "#75848c",
    fontSize: 8,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  editorName: {
    color: "#142831",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 2,
  },
  modeControl: {
    flexDirection: "row",
    gap: 7,
    marginTop: 11,
  },
  modeButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ced8dd",
    backgroundColor: "#f8fafb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 6,
  },
  modeButtonActive: {
    borderColor: "#15333d",
    backgroundColor: "#15333d",
  },
  modeButtonText: {
    color: "#52636d",
    fontSize: 9,
    fontWeight: "900",
  },
  modeButtonTextActive: { color: "#ffffff" },
  rateEditor: { marginTop: 11 },
  rateLabel: {
    color: "#5d6f78",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  rateStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  stepButton: {
    width: 44,
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccd7dc",
    backgroundColor: "#f8fafb",
    alignItems: "center",
    justifyContent: "center",
  },
  rateInputWrap: {
    flex: 1,
    minWidth: 0,
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#75c9bf",
    backgroundColor: "#eefaf8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  rateInput: {
    minWidth: 58,
    color: "#142831",
    fontSize: 19,
    fontWeight: "900",
    textAlign: "right",
    paddingVertical: 7,
  },
  rateSuffix: {
    color: "#0f766e",
    fontSize: 17,
    fontWeight: "900",
    marginLeft: 3,
  },
  presets: {
    flexDirection: "row",
    gap: 6,
    marginTop: 7,
  },
  preset: {
    flex: 1,
    minHeight: 31,
    borderRadius: 8,
    backgroundColor: "#eef2f4",
    alignItems: "center",
    justifyContent: "center",
  },
  presetActive: { backgroundColor: "#dff7f4" },
  presetText: {
    color: "#667780",
    fontSize: 9,
    fontWeight: "900",
  },
  presetTextActive: { color: "#0f766e" },
  defaultRule: {
    minHeight: 58,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#91d9d0",
    backgroundColor: "#eefaf8",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 11,
    marginTop: 11,
  },
  defaultRuleLabel: {
    flex: 1,
    color: "#60727a",
    fontSize: 10,
    fontWeight: "800",
  },
  defaultRuleValue: {
    color: "#0f766e",
    fontSize: 15,
    fontWeight: "900",
  },
  splitPreview: {
    borderRadius: 8,
    backgroundColor: "#15333d",
    padding: 11,
    marginTop: 10,
  },
  splitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  splitLabel: {
    color: "#a8b9c0",
    fontSize: 8,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  splitGross: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
  },
  splitTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "#2dd4bf",
    marginTop: 9,
  },
  splitPlatformTrack: {
    height: "100%",
    backgroundColor: "#f5b82e",
  },
  splitValues: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 8,
  },
  splitValue: { flex: 1 },
  splitValueRight: { alignItems: "flex-end" },
  splitValueLabel: {
    color: "#a8b9c0",
    fontSize: 8,
    fontWeight: "800",
  },
  splitValueAmount: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 2,
  },
  splitValuePercent: {
    color: "#a8b9c0",
    fontSize: 8,
    fontWeight: "800",
    marginTop: 1,
  },
  performance: {
    flexDirection: "row",
    gap: 7,
    marginTop: 9,
  },
  performanceValue: {
    flex: 1,
    minWidth: 0,
    borderLeftWidth: 3,
    borderLeftColor: "#0f766e",
    backgroundColor: "#f7f9fa",
    padding: 7,
  },
  performanceLabel: {
    color: "#728189",
    fontSize: 7,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  performanceAmount: {
    color: "#1a2d36",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 3,
  },
  saveButton: {
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: "#0f766e",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
  },
  buttonDisabled: { opacity: 0.62 },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  listTitle: {
    color: "#142831",
    fontSize: 12,
    fontWeight: "900",
  },
  listCount: {
    color: "#75848c",
    fontSize: 9,
    fontWeight: "800",
  },
  tutorRow: {
    minHeight: 62,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    marginBottom: 7,
  },
  tutorRowSelected: {
    borderColor: "#75c9bf",
    backgroundColor: "#eefaf8",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#e6efff",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#245dc1",
    fontSize: 15,
    fontWeight: "900",
  },
  tutorCopy: { flex: 1, minWidth: 0 },
  tutorName: {
    color: "#1b2e37",
    fontSize: 12,
    fontWeight: "900",
  },
  tutorSubject: {
    color: "#77868e",
    fontSize: 9,
    fontWeight: "700",
    marginTop: 3,
  },
  tutorRule: { alignItems: "flex-end" },
  tutorRate: {
    color: "#172a33",
    fontSize: 12,
    fontWeight: "900",
  },
  tutorRuleLabel: {
    color: "#6c7c84",
    fontSize: 7,
    fontWeight: "900",
    marginTop: 2,
  },
  tutorRuleLabelCustom: { color: "#a35f00" },
  filters: {
    gap: 6,
    paddingBottom: 10,
    paddingRight: 4,
  },
  filter: {
    minHeight: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d2dce0",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  filterActive: {
    borderColor: "#91d9d0",
    backgroundColor: "#dff7f4",
  },
  filterText: {
    color: "#64748b",
    fontSize: 8,
    fontWeight: "900",
  },
  filterTextActive: { color: "#0f766e" },
  loading: {
    minHeight: 110,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "800",
  },
  record: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    padding: 11,
    marginBottom: 8,
  },
  recordHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  recordCopy: { flex: 1, minWidth: 0 },
  recordTitle: {
    color: "#1b2e37",
    fontSize: 12,
    fontWeight: "900",
  },
  recordSubtitle: {
    color: "#77868e",
    fontSize: 9,
    lineHeight: 14,
    fontWeight: "700",
    marginTop: 3,
  },
  recordAmount: {
    color: "#0f766e",
    fontSize: 13,
    fontWeight: "900",
  },
  recordMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 9,
  },
  recordDate: {
    flex: 1,
    color: "#77868e",
    fontSize: 8,
    fontWeight: "800",
    textAlign: "right",
  },
  paymentSplit: {
    flexDirection: "row",
    gap: 7,
    paddingTop: 9,
    marginTop: 9,
    borderTopWidth: 1,
    borderTopColor: "#e7ecee",
  },
  remarks: {
    color: "#52636d",
    fontSize: 9,
    lineHeight: 14,
    fontWeight: "700",
    marginTop: 8,
  },
  decisionActions: {
    flexDirection: "row",
    gap: 7,
    marginTop: 9,
  },
  rejectButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f1b7c5",
    backgroundColor: "#ffe7ec",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  rejectButtonText: {
    color: "#a12828",
    fontSize: 10,
    fontWeight: "900",
  },
  approveButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 8,
    backgroundColor: "#0f766e",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  approveButtonText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
  },
  ledgerRow: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 10,
    marginBottom: 7,
  },
  ledgerIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#dff7f4",
    alignItems: "center",
    justifyContent: "center",
  },
  ledgerIconDebit: { backgroundColor: "#ffe7ec" },
  ledgerAmount: {
    color: "#0f766e",
    fontSize: 11,
    fontWeight: "900",
  },
  ledgerAmountDebit: { color: "#be123c" },
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
    width: 66,
    height: 66,
    borderRadius: 8,
    backgroundColor: "#dff7f4",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  modalIconReject: { backgroundColor: "#ffe7ec" },
  modalTitle: {
    color: "#142831",
    fontSize: 21,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 13,
  },
  modalText: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 6,
  },
  remarksInput: {
    minHeight: 86,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    color: "#142831",
    padding: 12,
    marginTop: 15,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  modalCancel: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    color: "#142831",
    fontSize: 11,
    fontWeight: "900",
  },
  modalConfirm: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: "#0f766e",
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmReject: { backgroundColor: "#dc2626" },
  modalConfirmText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
  },
});
