import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import useAuthStore from "../../store/authStore";
import { adminService } from "../../services/adminService";
import {
  Badge,
  DashboardShell,
  EmptyState,
  ListRow,
  SectionCard,
  SkeletonDashboard,
  StatGrid,
  getStatusTone,
} from "../../components/dashboard-kit";
import { Ionicons } from "@expo/vector-icons";

export default function AdminDashboard() {
  const logout = useAuthStore((s) => s.logout);
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [reviews, setReviews] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notificationStats, setNotificationStats] = useState({});
  const [notificationForm, setNotificationForm] = useState({
    title: "",
    message: "",
    recipientType: "STUDENTS",
    notificationType: "GENERAL",
    priority: "MEDIUM",
    status: "SENT",
    scheduledAt: "",
  });
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewModal, setReviewModal] = useState(null);
  const [resultModal, setResultModal] = useState(null);
  const [reviewDeletePrompt, setReviewDeletePrompt] = useState(null);
  const [processingReview, setProcessingReview] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const [requestData, statsData, userData, reviewData, notificationData] = await Promise.all([
        adminService.getTutorRequests(),
        adminService.getDashboardStats(),
        adminService.getUsers(),
        adminService.getReviews(),
        adminService.getNotifications(),
      ]);
      setRequests(Array.isArray(requestData) ? requestData : []);
      setStats(statsData || {});
      setUsers(Array.isArray(userData) ? userData : []);
      setReviews(Array.isArray(reviewData) ? reviewData : []);
      setNotifications(notificationData?.notifications || []);
      setNotificationStats(notificationData?.stats || {});
    } catch (error) {
      setResultModal({ type: "error", title: "Admin Dashboard", message: error?.response?.data?.message || "Could not load admin dashboard." });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.verificationStatus === "PENDING"),
    [requests],
  );
  const rejectedRequests = useMemo(
    () => requests.filter((request) => request.verificationStatus === "REJECTED"),
    [requests],
  );
  const approvedRequests = useMemo(
    () => requests.filter((request) => ["APPROVED", "VERIFIED"].includes(request.verificationStatus)),
    [requests],
  );
  const completedReviews = useMemo(
    () => requests.filter((request) => ["APPROVED", "VERIFIED", "REJECTED"].includes(request.verificationStatus)).slice(0, 8),
    [requests],
  );

  const students = users.filter((user) => user.role === "STUDENT");
  const tutors = users.filter((user) => user.role === "TUTOR");
  const parents = users.filter((user) => user.role === "PARENT");

  const statItems = useMemo(
    () => [
      { label: "Total Users", value: stats.totalUsers || users.length, icon: "people-outline" },
      { label: "Students", value: stats.totalStudents || students.length, icon: "school-outline" },
      { label: "Approved Tutors", value: stats.totalTutors || approvedRequests.length, icon: "shield-checkmark-outline" },
      { label: "Pending Tutors", value: stats.pendingTutors || pendingRequests.length, icon: "time-outline" },
    ],
    [stats, users.length, students.length, approvedRequests.length, pendingRequests.length],
  );

  const processTutor = async (request, action) => {
    setProcessingReview(true);
    try {
      await adminService.processTutorRequest(request.id, action);
      setReviewModal(null);
      setResultModal({
        type: "success",
        title: action === "approve" ? "Tutor Approved" : "Tutor Rejected",
        message:
          action === "approve"
            ? `${getTutorName(request)} can now access the tutor dashboard after their session refreshes.`
            : `${getTutorName(request)} has been moved out of the approval queue.`,
      });
      await loadDashboard();
    } catch (error) {
      setResultModal({
        type: "error",
        title: "Review Failed",
        message: error?.response?.data?.message || `Could not ${action} tutor profile.`,
      });
    } finally {
      setProcessingReview(false);
    }
  };

  const removeStudentReview = async (review) => {
    setReviewDeletePrompt(review);
  };

  const confirmRemoveStudentReview = async () => {
    if (!reviewDeletePrompt) return;
    try {
      await adminService.removeReview(reviewDeletePrompt.id);
      setReviewDeletePrompt(null);
      setResultModal({ type: "success", title: "Review Removed", message: "The review was removed from tutor performance history." });
      loadDashboard();
    } catch (error) {
      setResultModal({ type: "error", title: "Reviews", message: error?.response?.data?.message || "Could not remove review." });
    }
  };

  const updateNotificationField = (field, value) => {
    setNotificationForm((current) => ({ ...current, [field]: value }));
  };

  const submitNotification = async () => {
    if (!notificationForm.title.trim() || !notificationForm.message.trim()) {
      setResultModal({
        type: "error",
        title: "Notification Missing",
        message: "Add a title and message before sending.",
      });
      return;
    }

    setNotificationBusy(true);
    try {
      const payload = {
        ...notificationForm,
        actionUrl: "",
        scheduledAt: notificationForm.status === "SCHEDULED" && notificationForm.scheduledAt ? notificationForm.scheduledAt : null,
      };
      await adminService.createNotification(payload);
      setNotificationForm({
        title: "",
        message: "",
        recipientType: "STUDENTS",
        notificationType: "GENERAL",
        priority: "MEDIUM",
        status: "SENT",
        scheduledAt: "",
      });
      await loadDashboard();
      setResultModal({
        type: "success",
        title: payload.status === "SCHEDULED" ? "Notification Scheduled" : "Notification Sent",
        message: `Delivered to ${payload.recipientType.replaceAll("_", " ").toLowerCase()}.`,
      });
    } catch (error) {
      setResultModal({
        type: "error",
        title: "Notification Failed",
        message: error?.response?.data?.message || "Could not create notification.",
      });
    } finally {
      setNotificationBusy(false);
    }
  };

  const resendNotification = async (notification) => {
    try {
      await adminService.resendNotification(notification.id);
      await loadDashboard();
      setResultModal({ type: "success", title: "Notification Resent", message: notification.title });
    } catch (error) {
      setResultModal({ type: "error", title: "Notifications", message: error?.response?.data?.message || "Could not resend notification." });
    }
  };

  const deleteNotification = async (notification) => {
    try {
      await adminService.deleteNotification(notification.id);
      await loadDashboard();
      setResultModal({ type: "success", title: "Notification Deleted", message: "The notification was removed from history." });
    } catch (error) {
      setResultModal({ type: "error", title: "Notifications", message: error?.response?.data?.message || "Could not delete notification." });
    }
  };

  const confirmTutorAction = (request, action) => {
    setReviewModal({
      request,
      action,
      name: getTutorName(request),
      email: getTutorEmail(request),
      subjects: getTutorSubjects(request),
      qualification: getTutorQualification(request),
    });
  };

  const getTutorName = (request) => request.user?.fullName || request.user?.name || "Tutor applicant";
  const getTutorEmail = (request) => request.user?.email || "No email available";
  const getTutorSubjects = (request) =>
    request.subjects?.length
      ? request.subjects.map((item) => item.subject || item.name || item).filter(Boolean).join(", ")
      : request.mainSubject || "Subject pending";
  const getTutorQualification = (request) =>
    [
      request.degree || request.qualification || "Qualification not added",
      request.qualificationFileName ? `Certificate: ${request.qualificationFileName}` : "Certificate not uploaded",
    ].join("\n");

  if (loading) return <SkeletonDashboard label="Loading admin console..." />;

  return (
    <DashboardShell
      title="Admin Dashboard"
      icon="shield-checkmark-outline"
      subtitle={{
        title: "Operations command center",
        text: "See what needs approval, what has already been reviewed, and the current platform account mix.",
        icon: "analytics-outline",
      }}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onLogout={logout}
    >
      <StatGrid stats={statItems} />

      <SectionCard title="Admin Action Center" eyebrow="Needs Attention" icon="notifications-outline">
        <View style={styles.actionSummary}>
          <ActionMetric icon="time-outline" label="Waiting Review" value={pendingRequests.length} tone="warning" />
          <ActionMetric icon="checkmark-done-outline" label="Approved" value={stats.totalTutors || approvedRequests.length} tone="success" />
          <ActionMetric icon="close-circle-outline" label="Rejected" value={stats.rejectedTutors || rejectedRequests.length} tone="danger" />
        </View>
        <View style={styles.priorityBanner}>
          <View style={[styles.priorityIcon, pendingRequests.length ? styles.priorityIconHot : styles.priorityIconCalm]}>
            <Text style={styles.priorityIconText}>{pendingRequests.length}</Text>
          </View>
          <View style={styles.priorityCopy}>
            <Text style={styles.priorityTitle}>
              {pendingRequests.length ? `${pendingRequests.length} tutor application${pendingRequests.length === 1 ? "" : "s"} need review` : "No pending review right now"}
            </Text>
            <Text style={styles.priorityText}>
              {pendingRequests.length
                ? "Review qualification, certificate, subjects, and profile details before approving."
                : "New tutor applications will appear here as soon as they are submitted."}
            </Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Notification Handler" eyebrow="Platform Messaging" icon="megaphone-outline">
        <View style={styles.notificationStats}>
          <ActionMetric icon="megaphone-outline" label="Total" value={notificationStats.total || notifications.length} tone="success" />
          <ActionMetric icon="time-outline" label="Scheduled" value={notificationStats.scheduled || 0} tone="warning" />
          <ActionMetric icon="mail-unread-outline" label="Unread" value={notificationStats.unread || 0} tone="danger" />
        </View>

        <View style={styles.notificationComposer}>
          <TextInput
            style={styles.input}
            value={notificationForm.title}
            onChangeText={(title) => updateNotificationField("title", title)}
            placeholder="Notification title"
            placeholderTextColor="#94a3b8"
          />
          <TextInput
            style={[styles.input, styles.textarea]}
            value={notificationForm.message}
            onChangeText={(message) => updateNotificationField("message", message)}
            multiline
            placeholder="Write class reminder, announcement, or system update"
            placeholderTextColor="#94a3b8"
          />
          <SegmentedOptions
            value={notificationForm.recipientType}
            options={["STUDENTS", "TUTORS", "PARENTS", "ALL_USERS"]}
            onChange={(recipientType) => updateNotificationField("recipientType", recipientType)}
          />
          <SegmentedOptions
            value={notificationForm.notificationType}
            options={["GENERAL", "ANNOUNCEMENT", "REMINDER", "CLASS_UPDATE", "VERIFICATION", "SYSTEM_UPDATE"]}
            onChange={(notificationType) => updateNotificationField("notificationType", notificationType)}
          />
          <SegmentedOptions
            value={notificationForm.priority}
            options={["LOW", "MEDIUM", "HIGH"]}
            onChange={(priority) => updateNotificationField("priority", priority)}
          />
          <SegmentedOptions
            value={notificationForm.status}
            options={["SENT", "SCHEDULED"]}
            onChange={(status) => updateNotificationField("status", status)}
          />
          {notificationForm.status === "SCHEDULED" && (
            <TextInput
              style={styles.input}
              value={notificationForm.scheduledAt}
              onChangeText={(scheduledAt) => updateNotificationField("scheduledAt", scheduledAt)}
              placeholder="Schedule date/time"
              placeholderTextColor="#94a3b8"
            />
          )}
          <TouchableOpacity style={styles.approveButton} onPress={submitNotification} disabled={notificationBusy} activeOpacity={0.86}>
            <Ionicons name="send-outline" size={18} color="#fff" />
            <Text style={styles.approveButtonText}>
              {notificationBusy ? "Saving..." : notificationForm.status === "SCHEDULED" ? "Schedule Notification" : "Send Notification"}
            </Text>
          </TouchableOpacity>
        </View>

        {notifications.slice(0, 6).map((notification) => (
          <NotificationHistoryRow
            key={notification.id}
            notification={notification}
            onResend={() => resendNotification(notification)}
            onDelete={() => deleteNotification(notification)}
          />
        ))}
        {!notifications.length && <EmptyState label="No notification history yet." />}
      </SectionCard>

      <SectionCard title="Pending Tutor Approvals" eyebrow="Action Queue" icon="checkmark-done-outline">
        {pendingRequests.length ? (
          pendingRequests.map((request) => (
            <ReviewCard
              key={request.id}
              request={request}
              name={getTutorName(request)}
              email={getTutorEmail(request)}
              subjects={getTutorSubjects(request)}
              qualification={getTutorQualification(request)}
              onApprove={() => confirmTutorAction(request, "approve")}
              onReject={() => confirmTutorAction(request, "reject")}
            />
          ))
        ) : (
          <EmptyState label="No pending tutor applications." />
        )}
      </SectionCard>

      <SectionCard title="Completed Reviews" eyebrow="What You Have Done" icon="checkmark-circle-outline">
        {completedReviews.length ? (
          completedReviews.map((request) => (
            <DecisionRow
              key={`decision-${request.id}`}
              request={request}
              name={getTutorName(request)}
              subjects={getTutorSubjects(request)}
              qualification={getTutorQualification(request)}
            />
          ))
        ) : (
          <EmptyState label="Approved and rejected tutor applications will appear here." />
        )}
      </SectionCard>

      <SectionCard title="Users Overview" eyebrow="Accounts" icon="people-outline">
        <ListRow icon="people-outline" title="Parents" subtitle="Registered parent accounts" meta={parents.length} />
        <ListRow icon="school-outline" title="Students" subtitle="Registered student accounts" meta={students.length} />
        <ListRow icon="briefcase-outline" title="Tutors" subtitle="All tutor accounts" meta={tutors.length} />
      </SectionCard>

      <SectionCard title="Reviews & Ratings" eyebrow="Tutor Performance" icon="star-outline">
        {reviews.length ? (
          reviews.flatMap((group) =>
            group.reviews.map((review) => (
              <ListRow
                key={review.id}
                icon="star-outline"
                title={`${group.tutorName} - ${review.rating}/5`}
                subtitle={`${review.student?.user?.fullName || "Student"}: ${review.text}`}
                meta={new Date(review.createdAt).toLocaleDateString("en-IN")}
                onPress={() => removeStudentReview(review)}
              />
            )),
          )
        ) : (
          <EmptyState label="No tutor reviews have been submitted." />
        )}
      </SectionCard>

      <SectionCard title="Tutor Applications Overview" eyebrow="All Requests" icon="calendar-outline">
        {requests.length ? (
          requests.slice(0, 8).map((request) => (
            <ListRow
              key={`application-${request.id}`}
              icon="reader-outline"
              title={getTutorName(request)}
              subtitle={`${getTutorSubjects(request)}\n${request.degree || request.qualification || "Qualification not added"}`}
              badge={request.verificationStatus}
              tone={getStatusTone(request.verificationStatus)}
            />
          ))
        ) : (
          <EmptyState label="Tutor applications will appear here." />
        )}
      </SectionCard>
      <ReviewDecisionModal
        visible={!!reviewModal}
        review={reviewModal}
        processing={processingReview}
        onClose={() => setReviewModal(null)}
        onConfirm={() => processTutor(reviewModal.request, reviewModal.action)}
      />
      <ReviewResultModal
        visible={!!resultModal}
        result={resultModal}
        onClose={() => setResultModal(null)}
      />
      <ReviewResultModal
        visible={!!reviewDeletePrompt}
        result={{
          type: "warning",
          title: "Remove Review?",
          message: "This review will be removed from tutor performance history.",
          confirmLabel: "Remove Review",
          cancelLabel: "Cancel",
        }}
        onClose={() => setReviewDeletePrompt(null)}
        onConfirm={confirmRemoveStudentReview}
      />
    </DashboardShell>
  );
}

function ActionMetric({ icon, label, value, tone }) {
  const color = tone === "danger" ? "#ef4444" : tone === "warning" ? "#f59e0b" : "#14b8a6";
  const bg = tone === "danger" ? "#fee2e2" : tone === "warning" ? "#fef3c7" : "#dcfce7";

  return (
    <View style={styles.actionMetric}>
      <View style={[styles.actionMetricIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.actionMetricValue}>{value}</Text>
      <Text style={styles.actionMetricLabel}>{label}</Text>
    </View>
  );
}

function ReviewCard({ name, email, subjects, qualification, request, onApprove, onReject }) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewTop}>
        <View style={styles.reviewAvatar}>
          <Text style={styles.reviewAvatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.reviewIdentity}>
          <Text style={styles.reviewName}>{name}</Text>
          <Text style={styles.reviewEmail}>{email}</Text>
        </View>
        <Badge label={request.verificationStatus || "PENDING"} tone={getStatusTone(request.verificationStatus)} />
      </View>

      <View style={styles.reviewDetails}>
        <ReviewDetail icon="school-outline" label="Subjects" value={subjects} />
        <ReviewDetail icon="document-attach-outline" label="Qualification" value={qualification} />
        <ReviewDetail icon="cash-outline" label="Rate" value={request.hourlyRate ? `Rs ${request.hourlyRate}/hr` : "Not added"} />
      </View>

      <View style={styles.reviewActions}>
        <TouchableOpacity style={styles.rejectButton} onPress={onReject} activeOpacity={0.86}>
          <Ionicons name="close-outline" size={18} color="#991b1b" />
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.approveButton} onPress={onApprove} activeOpacity={0.86}>
          <Ionicons name="checkmark-outline" size={18} color="#fff" />
          <Text style={styles.approveButtonText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ReviewDetail({ icon, label, value }) {
  return (
    <View style={styles.reviewDetail}>
      <Ionicons name={icon} size={17} color="#14b8a6" />
      <View style={styles.reviewDetailCopy}>
        <Text style={styles.reviewDetailLabel}>{label}</Text>
        <Text style={styles.reviewDetailValue}>{value}</Text>
      </View>
    </View>
  );
}

function DecisionRow({ request, name, subjects, qualification }) {
  const status = request.verificationStatus || "REVIEWED";
  return (
    <View style={styles.decisionRow}>
      <View style={styles.decisionTop}>
        <Text style={styles.decisionName}>{name}</Text>
        <Badge label={status} tone={getStatusTone(status)} />
      </View>
      <Text style={styles.decisionText}>{subjects}</Text>
      <Text style={styles.decisionSub}>{qualification}</Text>
    </View>
  );
}

function SegmentedOptions({ value, options, onChange }) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          style={[styles.segmentChip, value === option && styles.segmentChipActive]}
          onPress={() => onChange(option)}
          activeOpacity={0.84}
        >
          <Text style={[styles.segmentText, value === option && styles.segmentTextActive]} numberOfLines={1} adjustsFontSizeToFit>
            {option.replaceAll("_", " ")}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function NotificationHistoryRow({ notification, onResend, onDelete }) {
  const priority = String(notification.priority || "MEDIUM").toLowerCase();

  return (
    <View style={styles.notificationRow}>
      <View style={styles.notificationIcon}>
        <Ionicons name="megaphone-outline" size={18} color="#14b8a6" />
      </View>
      <View style={styles.notificationCopy}>
        <Text style={styles.notificationTitle}>{notification.title}</Text>
        <Text style={styles.notificationMessage} numberOfLines={2}>{notification.message}</Text>
        <Text style={styles.notificationMeta}>
          {String(notification.recipientType || "USERS").replaceAll("_", " ")} - {notification.status || "SENT"}
        </Text>
      </View>
      <View style={styles.notificationActions}>
        <Text style={[styles.priorityPill, priority === "high" && styles.priorityHigh]}>{notification.priority || "MEDIUM"}</Text>
        <View style={styles.rowActions}>
          <TouchableOpacity onPress={onResend} activeOpacity={0.84}>
            <Ionicons name="send-outline" size={18} color="#0f766e" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} activeOpacity={0.84}>
            <Ionicons name="trash-outline" size={18} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function ReviewDecisionModal({ visible, review, processing, onClose, onConfirm }) {
  if (!review) return null;
  const isApprove = review.action === "approve";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.decisionModal}>
          <View style={[styles.decisionModalIcon, isApprove ? styles.modalApproveIcon : styles.modalRejectIcon]}>
            <Ionicons name={isApprove ? "shield-checkmark-outline" : "close-circle-outline"} size={33} color={isApprove ? "#0f766e" : "#991b1b"} />
          </View>
          <Text style={styles.decisionModalEyebrow}>{isApprove ? "Approve Tutor" : "Reject Application"}</Text>
          <Text style={styles.decisionModalTitle}>{review.name}</Text>
          <Text style={styles.decisionModalText}>
            {isApprove
              ? "This will verify the tutor and unlock tutor dashboard access after refresh."
              : "This will remove the application from the pending approval queue."}
          </Text>

          <View style={styles.modalInfoPanel}>
            <ModalInfo icon="mail-outline" label="Email" value={review.email} />
            <ModalInfo icon="school-outline" label="Subjects" value={review.subjects} />
            <ModalInfo icon="document-attach-outline" label="Qualification" value={review.qualification} />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelButton} onPress={onClose} disabled={processing} activeOpacity={0.86}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirmButton, !isApprove && styles.modalRejectButton]}
              onPress={onConfirm}
              disabled={processing}
              activeOpacity={0.86}
            >
              <Ionicons name={isApprove ? "checkmark-outline" : "close-outline"} size={18} color="#fff" />
              <Text style={styles.modalConfirmText}>{processing ? "Processing..." : isApprove ? "Approve Tutor" : "Reject Tutor"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ReviewResultModal({ visible, result, onClose, onConfirm }) {
  if (!result) return null;
  const isSuccess = result.type === "success";
  const isWarning = result.type === "warning";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.resultModal}>
          <View style={[styles.resultIcon, isSuccess ? styles.modalApproveIcon : isWarning ? styles.modalWarningIcon : styles.modalRejectIcon]}>
            <Ionicons
              name={isSuccess ? "checkmark" : isWarning ? "trash-outline" : "alert-circle-outline"}
              size={34}
              color={isSuccess ? "#0f766e" : isWarning ? "#b45309" : "#991b1b"}
            />
          </View>
          <Text style={styles.resultTitle}>{result.title}</Text>
          <Text style={styles.resultText}>{result.message}</Text>
          {onConfirm ? (
            <View style={styles.resultActionRow}>
              <TouchableOpacity style={styles.resultCancelButton} onPress={onClose} activeOpacity={0.86}>
                <Text style={styles.resultCancelText}>{result.cancelLabel || "Cancel"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.resultButton, styles.resultDangerButton]} onPress={onConfirm} activeOpacity={0.86}>
                <Text style={styles.resultButtonText}>{result.confirmLabel || "Confirm"}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.resultButton} onPress={onClose} activeOpacity={0.86}>
              <Text style={styles.resultButtonText}>Continue</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

function ModalInfo({ icon, label, value }) {
  return (
    <View style={styles.modalInfoRow}>
      <View style={styles.modalInfoIcon}>
        <Ionicons name={icon} size={17} color="#14b8a6" />
      </View>
      <View style={styles.modalInfoCopy}>
        <Text style={styles.modalInfoLabel}>{label}</Text>
        <Text style={styles.modalInfoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionSummary: { flexDirection: "row", gap: 10, marginBottom: 12 },
  notificationStats: { flexDirection: "row", gap: 10, marginBottom: 14 },
  notificationComposer: {
    gap: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    padding: 12,
    marginBottom: 14,
  },
  input: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
    color: "#020617",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: "800",
  },
  textarea: { minHeight: 92, textAlignVertical: "top" },
  segmented: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  segmentChip: {
    minHeight: 34,
    maxWidth: "48%",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
    justifyContent: "center",
    paddingHorizontal: 11,
  },
  segmentChipActive: { backgroundColor: "#0f172a", borderColor: "#0f172a" },
  segmentText: { color: "#334155", fontSize: 10, fontWeight: "900", textAlign: "center" },
  segmentTextActive: { color: "#fff" },
  notificationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    padding: 12,
    marginBottom: 10,
  },
  notificationIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#ccfbf1",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationCopy: { flex: 1, minWidth: 0 },
  notificationTitle: { color: "#020617", fontSize: 14, fontWeight: "900" },
  notificationMessage: { color: "#64748b", fontSize: 12, lineHeight: 17, fontWeight: "700", marginTop: 3 },
  notificationMeta: { color: "#0f766e", fontSize: 10, fontWeight: "900", marginTop: 6, textTransform: "uppercase" },
  notificationActions: { alignItems: "flex-end", gap: 10 },
  priorityPill: {
    borderRadius: 999,
    backgroundColor: "#fef3c7",
    color: "#92400e",
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 9,
    fontWeight: "900",
    overflow: "hidden",
  },
  priorityHigh: { backgroundColor: "#fee2e2", color: "#991b1b" },
  rowActions: { flexDirection: "row", gap: 12 },
  actionMetric: {
    flex: 1,
    minHeight: 98,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    padding: 12,
    justifyContent: "space-between",
  },
  actionMetricIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionMetricValue: { color: "#020617", fontSize: 24, fontWeight: "900" },
  actionMetricLabel: { color: "#64748b", fontSize: 10, lineHeight: 14, fontWeight: "900", textTransform: "uppercase" },
  priorityBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    backgroundColor: "#0f172a",
    padding: 14,
  },
  priorityIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityIconHot: { backgroundColor: "#facc15" },
  priorityIconCalm: { backgroundColor: "#14b8a6" },
  priorityIconText: { color: "#020617", fontSize: 22, fontWeight: "900" },
  priorityCopy: { flex: 1 },
  priorityTitle: { color: "#fff", fontSize: 15, fontWeight: "900" },
  priorityText: { color: "rgba(255,255,255,0.68)", fontSize: 12, lineHeight: 18, fontWeight: "700", marginTop: 3 },
  reviewCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    padding: 14,
    marginBottom: 12,
    gap: 13,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  reviewTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  reviewAvatar: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#ccfbf1",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewAvatarText: { color: "#0f766e", fontSize: 18, fontWeight: "900" },
  reviewIdentity: { flex: 1, minWidth: 0 },
  reviewName: { color: "#020617", fontSize: 16, fontWeight: "900" },
  reviewEmail: { color: "#64748b", fontSize: 12, lineHeight: 17, fontWeight: "700", marginTop: 2 },
  reviewDetails: { gap: 8 },
  reviewDetail: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    padding: 11,
  },
  reviewDetailCopy: { flex: 1 },
  reviewDetailLabel: { color: "#64748b", fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.7 },
  reviewDetailValue: { color: "#020617", fontSize: 13, lineHeight: 18, fontWeight: "800", marginTop: 2 },
  reviewActions: { flexDirection: "row", gap: 10 },
  rejectButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fee2e2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  rejectButtonText: { color: "#991b1b", fontSize: 14, fontWeight: "900" },
  approveButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "#14b8a6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  approveButtonText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  decisionRow: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    padding: 13,
    marginBottom: 9,
  },
  decisionTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  decisionName: { flex: 1, color: "#020617", fontSize: 15, fontWeight: "900" },
  decisionText: { color: "#334155", fontSize: 13, lineHeight: 18, fontWeight: "800", marginTop: 8 },
  decisionSub: { color: "#64748b", fontSize: 12, lineHeight: 17, fontWeight: "700", marginTop: 4 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.62)",
    justifyContent: "center",
    padding: 22,
  },
  decisionModal: {
    borderRadius: 28,
    backgroundColor: "#fff",
    padding: 24,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 28,
    elevation: 12,
  },
  decisionModalIcon: {
    width: 76,
    height: 76,
    borderRadius: 26,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  modalApproveIcon: { backgroundColor: "#ccfbf1" },
  modalRejectIcon: { backgroundColor: "#fee2e2" },
  modalWarningIcon: { backgroundColor: "#fef3c7" },
  decisionModalEyebrow: {
    color: "#14b8a6",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    textAlign: "center",
  },
  decisionModalTitle: { color: "#020617", fontSize: 25, lineHeight: 30, fontWeight: "900", textAlign: "center", marginTop: 5 },
  decisionModalText: { color: "#475569", fontSize: 14, lineHeight: 22, fontWeight: "700", textAlign: "center", marginTop: 9 },
  modalInfoPanel: {
    gap: 9,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginTop: 18,
  },
  modalInfoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  modalInfoIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#ccfbf1",
    alignItems: "center",
    justifyContent: "center",
  },
  modalInfoCopy: { flex: 1 },
  modalInfoLabel: { color: "#64748b", fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.7 },
  modalInfoValue: { color: "#020617", fontSize: 13, lineHeight: 18, fontWeight: "800", marginTop: 2 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  modalCancelButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: { color: "#020617", fontSize: 14, fontWeight: "900" },
  modalConfirmButton: {
    flex: 1.3,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: "#14b8a6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  modalRejectButton: { backgroundColor: "#dc2626" },
  modalConfirmText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  resultModal: {
    borderRadius: 28,
    backgroundColor: "#fff",
    padding: 26,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 26,
    elevation: 12,
  },
  resultIcon: {
    width: 78,
    height: 78,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  resultTitle: { color: "#020617", fontSize: 24, lineHeight: 30, fontWeight: "900", textAlign: "center" },
  resultText: { color: "#475569", fontSize: 14, lineHeight: 22, fontWeight: "700", textAlign: "center", marginTop: 9 },
  resultButton: {
    flex: 1,
    width: "100%",
    minHeight: 50,
    borderRadius: 8,
    backgroundColor: "#14b8a6",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  resultDangerButton: { backgroundColor: "#dc2626" },
  resultButtonText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  resultActionRow: { width: "100%", flexDirection: "row", gap: 10, marginTop: 22 },
  resultCancelButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  resultCancelText: { color: "#020617", fontSize: 14, fontWeight: "900" },
});
