import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../constants/Colors";
import useAuthStore from "../../store/authStore";
import { tutorService } from "../../services/tutorService";
import LocationMapPicker from "../../components/location-map-picker";

const emptyForm = {
  fullName: "",
  email: "",
  degree: "",
  experience: "",
  hourlyRate: "",
  subjects: [],
  availability: [],
  lat: "",
  lng: "",
  locationName: "",
  teachingRadius: "8",
  qualificationFileName: "",
  qualificationFile: null,
};

const defaultSubjects = [
  "Mathematics",
  "Science",
  "English",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "History",
  "Geography",
  "Economics",
  "Urdu",
  "Hindi",
];

const availabilityOptions = [
  "Morning Sessions",
  "Afternoon Slots",
  "Evening Cohorts",
  "Weekends Only",
];

const fieldMessages = {
  degree: "Degree/Qualification is required.",
  experience: "Please enter your teaching experience.",
  subjects: "Please select at least one subject.",
  location: "Please choose and confirm your teaching location.",
  qualificationFileName: "Please upload your academic qualification certificate.",
};

const hasValue = (value) => String(value ?? "").trim().length > 0;

const statusCopy = {
  PENDING: {
    label: "PENDING",
    title: "Application Received",
    message:
      "Your tutor profile has been submitted and is currently under verification by the administrator.",
  },
  APPROVED: {
    label: "Verified Tutor",
    title: "Verified Tutor",
    message: "Your tutor profile is approved. Families can now discover your verified tutor profile.",
  },
  REJECTED: {
    label: "REJECTED",
    title: "Application Rejected",
    message: "Your tutor application was rejected by the administrator.",
  },
};

export default function BecomeTutorScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const { isAuthenticated, role, user, isLoading, setVerificationStatus, setTutorApplicationRequired } =
    useAuthStore();
  const [formData, setFormData] = useState(emptyForm);
  const [subjectInput, setSubjectInput] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loadingApplication, setLoadingApplication] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [backendMessage, setBackendMessage] = useState("");
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [formNotice, setFormNotice] = useState(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  const normalizedRole = String(role || user?.role || "").toUpperCase();
  const canApply = isAuthenticated && normalizedRole === "TUTOR";
  const showAuthPanel = !isLoading && !isAuthenticated;
  const showRolePanel = !isLoading && isAuthenticated && normalizedRole !== "TUTOR";

  useEffect(() => {
    setFormData((current) => ({
      ...current,
      fullName: user?.fullName || user?.name || "",
      email: user?.email || "",
    }));
  }, [user]);

  useEffect(() => {
    let active = true;

    async function loadApplication() {
      if (!canApply) return;

      setLoadingApplication(true);
      try {
        const tutor = await tutorService.getTutorApplication();
        if (!active) return;

        setFormData((current) => ({
          ...current,
          fullName: tutor.user?.fullName || current.fullName,
          email: tutor.user?.email || current.email,
          degree: tutor.degree || "",
          experience: tutor.experience || "",
          hourlyRate: tutor.hourlyRate ? String(tutor.hourlyRate) : "",
          subjects: tutor.subjects?.map((item) => item.subject).filter(Boolean) || [],
          availability: tutor.availabilityNotes || [],
          lat: tutor.lat ?? "",
          lng: tutor.lng ?? "",
          locationName: tutor.locationName || "",
          teachingRadius: tutor.teachingRadius ? String(tutor.teachingRadius) : "8",
          qualificationFileName: tutor.qualificationFileName || "",
          qualificationFile: null,
        }));

        if (tutor.applicationSubmitted) {
          setApplicationStatus(tutor.verificationStatus || "PENDING");
          setBackendMessage(tutor.rejectionReason || tutor.rejectionMessage || "");
          setShowApplicationForm(false);
        }
      } catch (error) {
        const message = error?.response?.data?.message || "Could not load your tutor application.";
        if (error?.response?.status !== 404) Alert.alert("Tutor Application", message);
      } finally {
        if (active) setLoadingApplication(false);
      }
    }

    loadApplication();

    return () => {
      active = false;
    };
  }, [canApply]);

  const filteredSubjectOptions = useMemo(() => {
    const term = subjectInput.trim().toLowerCase();
    return defaultSubjects.filter((subject) => {
      const selected = formData.subjects.some((item) => item.toLowerCase() === subject.toLowerCase());
      return !selected && (!term || subject.toLowerCase().includes(term));
    });
  }, [formData.subjects, subjectInput]);

  const updateField = (name, value) => {
    setFormData((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: "" }));
    setFormNotice(null);
  };

  const addSubject = (value = subjectInput) => {
    const nextSubject = value.trim();
    if (!nextSubject) return;

    const exists = formData.subjects.some((item) => item.toLowerCase() === nextSubject.toLowerCase());
    if (!exists) updateField("subjects", [...formData.subjects, nextSubject]);
    setSubjectInput("");
  };

  const removeSubject = (subject) => {
    updateField(
      "subjects",
      formData.subjects.filter((item) => item !== subject),
    );
  };

  const toggleAvailability = (slot) => {
    updateField(
      "availability",
      formData.availability.includes(slot)
        ? formData.availability.filter((item) => item !== slot)
        : [...formData.availability, slot],
    );
  };

  const validate = () => {
    const nextErrors = {};
    if (!formData.degree.trim()) nextErrors.degree = fieldMessages.degree;
    if (!formData.experience.trim()) nextErrors.experience = fieldMessages.experience;
    if (!formData.subjects.length) nextErrors.subjects = fieldMessages.subjects;
    if (
      !hasValue(formData.locationName) ||
      !Number.isFinite(Number(formData.lat)) ||
      !Number.isFinite(Number(formData.lng))
    ) {
      nextErrors.location = fieldMessages.location;
    }
    if (!formData.qualificationFile?.uri) {
      nextErrors.qualificationFileName = fieldMessages.qualificationFileName;
    }
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const normalizeErrors = (errors) => {
    if (!errors) return {};
    if (Array.isArray(errors)) {
      return errors.reduce((acc, item, index) => {
        if (typeof item === "string") acc[`issue${index + 1}`] = item;
        else if (item?.field) acc[item.field] = item.message || item.msg || "Please review this field.";
        else if (item?.path) acc[item.path] = item.message || item.msg || "Please review this field.";
        return acc;
      }, {});
    }
    if (typeof errors === "string") return { server: errors };
    return Object.entries(errors).reduce((acc, [key, value]) => {
      if (Array.isArray(value)) acc[key] = value.map((item) => (typeof item === "string" ? item : item?.message || String(item))).join(", ");
      else if (value && typeof value === "object") acc[key] = value.message || value.msg || JSON.stringify(value);
      else acc[key] = value;
      return acc;
    }, {});
  };

  const getErrorSummary = (errors = fieldErrors) =>
    Object.entries(normalizeErrors(errors))
      .filter(([, value]) => !!value)
      .map(([field, value]) => ({
        field,
        label: fieldLabels[field] || prettifyFieldName(field),
        message: Array.isArray(value) ? value.join(", ") : String(value),
      }));

  const showFeedback = (type, title, message, actions) => {
    setFeedbackModal({ type, title, message, actions });
  };

  const revealFormIssues = () => {
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 210, animated: true }));
  };

  const buildApplicationPayload = () => {
    const payload = {
      degree: formData.degree.trim(),
      experience: formData.experience.trim(),
      mainSubject: formData.subjects[0],
      subjects: formData.subjects,
      availability: formData.availability,
      teachingRadius: formData.teachingRadius || "8",
      qualificationFileName: formData.qualificationFileName,
      qualificationFile: formData.qualificationFile,
    };

    if (hasValue(formData.hourlyRate)) payload.hourlyRate = formData.hourlyRate;
    if (hasValue(formData.locationName)) payload.locationName = formData.locationName.trim();
    if (hasValue(formData.lat)) payload.lat = formData.lat;
    if (hasValue(formData.lng)) payload.lng = formData.lng;

    return payload;
  };

  const pickQualificationFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const file = result.assets?.[0];
      if (!file) return;

      setFormData((current) => ({
        ...current,
        qualificationFileName: file.name || "qualification-certificate",
        qualificationFile: file,
      }));
    } catch (_error) {
      Alert.alert("Certificate Upload", "Could not select the certificate file.");
    }
  };

  const submitApplication = async () => {
    if (!validate()) {
      setFormNotice({
        title: "Required details are missing",
        message: "The exact fields are listed below. Fill those items and submit again.",
      });
      showFeedback(
        "error",
        "Review Required Fields",
        "The fields to fix are now listed at the top of the application form.",
        [{ label: "Show Fields", primary: true, onPress: revealFormIssues }],
      );
      revealFormIssues();
      return;
    }

    setSubmitting(true);
    try {
      const response = await tutorService.updateTutorApplication(buildApplicationPayload());

      await setVerificationStatus(false);
      await setTutorApplicationRequired(false);
      setApplicationStatus(response?.tutor?.verificationStatus || "PENDING");
      setFieldErrors({});
      setFormNotice(null);
      setShowApplicationForm(false);
      showFeedback(
        "success",
        "Application Submitted",
        "Your tutor application and qualification details were sent to admin for verification.",
      );
    } catch (error) {
      const responseData = error?.response?.data || {};
      const responseMessage =
        responseData.message ||
        error?.message ||
        "The server could not submit this application.";
      const normalizedErrors = normalizeErrors(responseData.errors || responseData.error || responseData.details);

      if (Object.keys(normalizedErrors).length) {
        setFieldErrors(normalizedErrors);
        setFormNotice({
          title: "Application needs updates",
          message: responseMessage,
        });
        showFeedback(
          "error",
          "Application Needs Updates",
          "The exact fields are visible at the top of the form now.",
          [{ label: "Show Fields", primary: true, onPress: revealFormIssues }],
        );
        revealFormIssues();
      } else {
        const genericError = { server: responseMessage };
        setFieldErrors(genericError);
        setFormNotice({
          title: "Submission blocked",
          message: responseMessage,
        });
        showFeedback(
          "error",
          "Submission Failed",
          "The server did not name a specific field, so its response is shown at the top of the form.",
          [{ label: "Show Message", primary: true, onPress: revealFormIssues }],
        );
        revealFormIssues();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const goAuth = (mode) => {
    router.push({ pathname: mode === "signup" ? "/(auth)/signup" : "/(auth)/login", params: { role: "tutor" } });
  };

  const currentStatus = applicationStatus ? statusCopy[applicationStatus] || statusCopy.PENDING : null;
  const rejectedMessage = applicationStatus === "REJECTED" && backendMessage ? backendMessage : currentStatus?.message;
  const errorSummary = getErrorSummary();
  const hasSubmittedApplication = !!currentStatus && applicationStatus !== "REJECTED";

  if (isLoading || loadingApplication) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading tutor application...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="shield-checkmark-outline" size={24} color={Colors.white} />
          </View>
          <Text style={styles.eyebrow}>Become A Tutor</Text>
          <Text style={styles.title}>Complete your tutor profile in one step.</Text>
          <Text style={styles.subtitle}>
            This form submits to the existing HomeTutor verification workflow for admin approval.
          </Text>
        </View>

        {hasSubmittedApplication && (
          <SubmittedApplicationCard
            status={applicationStatus}
            statusCopy={currentStatus}
            message={rejectedMessage}
            formData={formData}
            onViewApplication={() => setShowApplicationForm(true)}
          />
        )}

        {currentStatus && applicationStatus === "REJECTED" && (
          <StatusNotice status={applicationStatus} statusCopy={currentStatus} message={rejectedMessage} />
        )}

        {canApply && applicationStatus !== "APPROVED" && (!hasSubmittedApplication || showApplicationForm) && (
          <View style={styles.formCard}>
            <View style={styles.formTitleRow}>
              <Text style={styles.formTitle}>Tutor Application</Text>
              {hasSubmittedApplication && (
                <TouchableOpacity style={styles.formCloseButton} onPress={() => setShowApplicationForm(false)} activeOpacity={0.86}>
                  <Ionicons name="close" size={18} color="#020617" />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.formIntroCard}>
              <View style={styles.formIntroIcon}>
                <Ionicons name="clipboard-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.formIntroCopy}>
                <Text style={styles.formIntroTitle}>Admin verification profile</Text>
                <Text style={styles.formIntroText}>Complete contact, qualification, subjects, availability, and certificate details before submission.</Text>
              </View>
            </View>

            {(!!errorSummary.length || formNotice) && <ErrorSummary items={errorSummary} notice={formNotice} />}

            <Input label="Full Name" value={formData.fullName} editable={false} icon="person-outline" />
            <Input label="Email Address" value={formData.email} editable={false} icon="mail-outline" />
            <Input
              label="Highest Academic Degree"
              value={formData.degree}
              onChangeText={(value) => updateField("degree", value)}
              placeholder="B.Sc., M.A., Ph.D., B.Ed."
              icon="book-outline"
              error={fieldErrors.degree}
            />
            <Input
              label="Experience"
              value={formData.experience}
              onChangeText={(value) => updateField("experience", value)}
              placeholder="3-5 years"
              icon="time-outline"
              error={fieldErrors.experience}
            />
            <Input
              label="Hourly Rate"
              value={formData.hourlyRate}
              onChangeText={(value) => updateField("hourlyRate", value)}
              placeholder="700"
              keyboardType="numeric"
              icon="cash-outline"
            />

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Core Subjects Offered</Text>
              <View style={styles.inputShell}>
                <Ionicons name="school-outline" size={18} color={Colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={subjectInput}
                  onChangeText={setSubjectInput}
                  placeholder="e.g. Mathematics, Physics"
                  placeholderTextColor="#64748b"
                  onSubmitEditing={() => addSubject()}
                  returnKeyType="done"
                />
                <TouchableOpacity style={styles.iconButton} onPress={() => addSubject()}>
                  <Ionicons name="add" size={20} color={Colors.white} />
                </TouchableOpacity>
              </View>
              {!!fieldErrors.subjects && <Text style={styles.errorText}>{fieldErrors.subjects}</Text>}
              <View style={styles.chipWrap}>
                {formData.subjects.map((subject) => (
                  <TouchableOpacity key={subject} style={styles.selectedChip} onPress={() => removeSubject(subject)}>
                    <Text style={styles.selectedChipText}>{subject}</Text>
                    <Ionicons name="close" size={14} color={Colors.white} />
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.optionWrap}>
                {filteredSubjectOptions.slice(0, 8).map((subject) => (
                  <TouchableOpacity key={subject} style={styles.optionChip} onPress={() => addSubject(subject)}>
                    <Text style={styles.optionChipText}>{subject}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Select Availability Schedule</Text>
              <View style={styles.optionWrap}>
                {availabilityOptions.map((slot) => {
                  const selected = formData.availability.includes(slot);
                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[styles.scheduleChip, selected && styles.scheduleChipActive]}
                      onPress={() => toggleAvailability(slot)}
                    >
                      <Text style={[styles.scheduleChipText, selected && styles.scheduleChipTextActive]}>{slot}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.locationSection}>
              <View style={styles.locationSectionHeading}>
                <View>
                  <Text style={styles.locationEyebrow}>TEACHING AREA</Text>
                  <Text style={styles.locationTitle}>Set where you can teach</Text>
                </View>
                <View style={styles.locationRadiusBadge}>
                  <Ionicons name="radio-outline" size={14} color="#14b8a6" />
                  <Text style={styles.locationRadiusText}>
                    {formData.teachingRadius || "8"} km
                  </Text>
                </View>
              </View>
              <Text style={styles.locationDescription}>
                Families and admin will see the readable address. Coordinates are
                used only for nearby matching.
              </Text>
              <LocationMapPicker
                value={
                  Number.isFinite(Number(formData.lat)) &&
                  Number.isFinite(Number(formData.lng))
                    ? {
                        lat: Number(formData.lat),
                        lng: Number(formData.lng),
                      }
                    : null
                }
                locationName={formData.locationName}
                radius={Number(formData.teachingRadius || 8)}
                onRadiusChange={(value) =>
                  updateField("teachingRadius", String(value))
                }
                title="Pin your exact teaching locality"
                subtitle="Search a road, colony, village, landmark, or postcode in Jammu & Kashmir."
                confirmLabel="Add teaching location"
                dark
                onConfirm={(location, name) => {
                  setFormData((current) => ({
                    ...current,
                    lat: location.lat,
                    lng: location.lng,
                    locationName: name,
                  }));
                  setFieldErrors((current) => ({
                    ...current,
                    location: "",
                    locationName: "",
                    lat: "",
                    lng: "",
                  }));
                }}
              />
              {!!fieldErrors.location && (
                <Text style={styles.errorText}>{fieldErrors.location}</Text>
              )}
            </View>
            <Input
              label="Academic Qualification Certificate"
              value={formData.qualificationFileName}
              onChangeText={(value) => updateField("qualificationFileName", value)}
              placeholder="Upload a PDF or image certificate"
              icon="document-attach-outline"
              editable={false}
              error={fieldErrors.qualificationFileName}
            />
            <TouchableOpacity style={styles.uploadButton} onPress={pickQualificationFile} activeOpacity={0.86}>
              <Ionicons name="cloud-upload-outline" size={19} color={Colors.primary} />
              <View style={styles.uploadCopy}>
                <Text style={styles.uploadTitle}>Upload Certificate</Text>
                <Text style={styles.uploadText}>
                  {formData.qualificationFileName || "PDF or image certificate for admin verification"}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.submitButton} onPress={submitApplication} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color={Colors.text} />
              ) : (
                <>
                  <Text style={styles.submitText}>Submit For Verification</Text>
                  <Ionicons name="shield-checkmark-outline" size={17} color={Colors.text} />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {showAuthPanel && (
          <AccessPanel
            title="Start your tutor application"
            message="Create a Tutor account or sign in as a Tutor to continue with the application form."
            icon="school-outline"
            actions={[
              { label: "Sign Up", onPress: () => goAuth("signup"), primary: true },
              { label: "Sign In", onPress: () => goAuth("login") },
            ]}
          />
        )}

        {showRolePanel && (
          <AccessPanel
            title="Tutor account required"
            message="Only Tutor accounts can submit tutor applications. Use a Tutor account to continue."
            icon="person-add-outline"
            actions={[
              { label: "Tutor Signup", onPress: () => goAuth("signup"), primary: true },
              { label: "Tutor Login", onPress: () => goAuth("login") },
            ]}
          />
        )}
      </ScrollView>
      <PremiumFeedbackModal
        visible={!!feedbackModal}
        type={feedbackModal?.type}
        title={feedbackModal?.title}
        message={feedbackModal?.message}
        actions={feedbackModal?.actions}
        onClose={() => setFeedbackModal(null)}
      />
    </View>
  );
}

function Input({ label, error, icon, editable = true, ...props }) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, !editable && styles.inputShellDisabled, !!error && styles.inputShellError]}>
        <Ionicons name={icon} size={18} color={Colors.lightSub} />
        <TextInput
          style={styles.input}
          editable={editable}
          placeholderTextColor="#64748b"
          {...props}
        />
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

function StatusNotice({ status, statusCopy, message }) {
  return (
    <View style={styles.statusCard}>
      <View style={styles.statusTop}>
        <Ionicons
          name={status === "APPROVED" ? "checkmark-circle" : status === "REJECTED" ? "close-circle" : "time-outline"}
          size={22}
          color={status === "REJECTED" ? Colors.danger : Colors.success}
        />
        <Text style={styles.statusTitle}>{statusCopy.title}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{statusCopy.label}</Text>
        </View>
      </View>
      <Text style={styles.statusMessage}>{message}</Text>
    </View>
  );
}

function SubmittedApplicationCard({ status, statusCopy, message, formData, onViewApplication }) {
  const isApproved = status === "APPROVED";

  return (
    <View style={styles.submittedCard}>
      <View style={styles.submittedTop}>
        <View style={styles.submittedIcon}>
          <Ionicons name={isApproved ? "shield-checkmark-outline" : "hourglass-outline"} size={28} color="#14b8a6" />
        </View>
        <View style={styles.submittedCopy}>
          <Text style={styles.submittedEyebrow}>{statusCopy.label}</Text>
          <Text style={styles.submittedTitle}>{isApproved ? "Tutor profile approved" : "Form submitted and under process"}</Text>
        </View>
      </View>

      <Text style={styles.submittedMessage}>{message}</Text>

      <View style={styles.submittedDetails}>
        <DetailPill icon="book-outline" label="Qualification" value={formData.degree || "Added"} />
        <DetailPill icon="document-attach-outline" label="Certificate" value={formData.qualificationFileName || "Submitted"} />
        <DetailPill icon="school-outline" label="Subjects" value={formData.subjects?.length ? `${formData.subjects.length} selected` : "Added"} />
      </View>

      <TouchableOpacity style={styles.submittedButton} onPress={onViewApplication} activeOpacity={0.86}>
        <Text style={styles.submittedButtonText}>View Application</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function DetailPill({ icon, label, value }) {
  return (
    <View style={styles.detailPill}>
      <Ionicons name={icon} size={17} color="#14b8a6" />
      <View style={styles.detailPillCopy}>
        <Text style={styles.detailPillLabel}>{label}</Text>
        <Text style={styles.detailPillValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

const fieldLabels = {
  degree: "Highest Academic Degree",
  experience: "Teaching Experience",
  subjects: "Core Subjects Offered",
  hourlyRate: "Hourly Rate",
  qualificationFileName: "Academic Qualification Certificate",
  qualificationFile: "Certificate File",
  server: "Server response",
  location: "Teaching Location",
  locationName: "Location Name",
  teachingRadius: "Teaching Radius",
};

function prettifyFieldName(field) {
  return String(field)
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function ErrorSummary({ items, notice }) {
  return (
    <View style={styles.errorSummary}>
      <View style={styles.errorSummaryTop}>
        <View style={styles.errorSummaryIcon}>
          <Ionicons name="alert-circle-outline" size={20} color={Colors.danger} />
        </View>
        <View style={styles.errorSummaryCopy}>
          <Text style={styles.errorSummaryTitle}>{notice?.title || "Please fix these fields"}</Text>
          <Text style={styles.errorSummaryText}>{notice?.message || "The form could not be submitted until these items are complete."}</Text>
        </View>
      </View>
      {!!items.length && (
        <View style={styles.errorList}>
          {items.map((item) => (
            <View key={`${item.field}-${item.message}`} style={styles.errorListItem}>
              <Ionicons name="ellipse" size={6} color={Colors.danger} />
              <Text style={styles.errorListText}>
                <Text style={styles.errorListLabel}>{item.label}: </Text>
                {item.message}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function PremiumFeedbackModal({ visible, type, title, message, actions, onClose }) {
  const isSuccess = type === "success";
  const modalActions = actions?.length ? actions : [{ label: "Continue", onPress: onClose, primary: true }];

  const handleAction = (action) => {
    onClose();
    requestAnimationFrame(() => action.onPress?.());
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.feedbackBackdrop}>
        <View style={styles.feedbackCard}>
          <View style={styles.feedbackGrip} />
          <View style={[styles.feedbackIcon, isSuccess ? styles.feedbackIconSuccess : styles.feedbackIconError]}>
            <Ionicons name={isSuccess ? "checkmark" : "alert-circle-outline"} size={32} color={isSuccess ? Colors.primary : Colors.danger} />
          </View>
          <Text style={styles.feedbackTitle}>{title}</Text>
          <Text style={styles.feedbackMessage}>{message}</Text>
          <View style={styles.feedbackActions}>
            {modalActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={[styles.feedbackButton, action.primary && styles.feedbackButtonPrimary]}
                onPress={() => handleAction(action)}
                activeOpacity={0.86}
              >
                <Text style={[styles.feedbackButtonText, action.primary && styles.feedbackButtonPrimaryText]}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AccessPanel({ title, message, icon, actions }) {
  return (
    <View style={styles.accessCard}>
      <View style={styles.accessIcon}>
        <Ionicons name={icon} size={28} color={Colors.white} />
      </View>
      <Text style={styles.accessTitle}>{title}</Text>
      <Text style={styles.accessMessage}>{message}</Text>
      <View style={styles.accessActions}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={[styles.accessButton, action.primary && styles.accessButtonPrimary]}
            onPress={action.onPress}
            activeOpacity={0.86}
          >
            <Text style={[styles.accessButtonText, action.primary && styles.accessButtonPrimaryText]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  screen: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 110, gap: 16 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  loadingText: { marginTop: 10, color: Colors.textSecondary, fontWeight: "700" },
  header: {
    borderRadius: 24,
    backgroundColor: "#050810",
    padding: 22,
    overflow: "hidden",
  },
  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#14b8a6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  eyebrow: {
    color: "#14b8a6",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: {
    color: Colors.white,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    marginTop: 8,
  },
  subtitle: { color: "rgba(255,255,255,0.58)", fontSize: 14, lineHeight: 21, marginTop: 8 },
  statusCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  statusTop: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  statusTitle: { flex: 1, color: Colors.text, fontSize: 16, fontWeight: "900" },
  statusBadge: { borderRadius: 99, backgroundColor: "rgba(20,184,166,0.12)", paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { color: Colors.success, fontSize: 10, fontWeight: "900", letterSpacing: 0.6 },
  statusMessage: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 10 },
  submittedCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    padding: 18,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 7,
  },
  submittedTop: { flexDirection: "row", alignItems: "center", gap: 13 },
  submittedIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "#ccfbf1",
    alignItems: "center",
    justifyContent: "center",
  },
  submittedCopy: { flex: 1 },
  submittedEyebrow: { color: "#14b8a6", fontSize: 10, fontWeight: "900", letterSpacing: 1.6, textTransform: "uppercase" },
  submittedTitle: { color: "#020617", fontSize: 22, lineHeight: 27, fontWeight: "900", marginTop: 4 },
  submittedMessage: { color: "#475569", fontSize: 14, lineHeight: 22, fontWeight: "700" },
  submittedDetails: { gap: 10 },
  detailPill: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 13,
  },
  detailPillCopy: { flex: 1 },
  detailPillLabel: { color: "#64748b", fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 },
  detailPillValue: { color: "#020617", fontSize: 13, fontWeight: "900", marginTop: 2 },
  submittedButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#14b8a6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submittedButtonText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 18,
  },
  formTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  formTitle: { color: Colors.text, fontSize: 22, fontWeight: "900", marginBottom: 2 },
  formCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  formIntroCard: {
    minHeight: 76,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.lightBorder,
    backgroundColor: "#f8fafc",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  formIntroIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(20,184,166,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  formIntroCopy: { flex: 1 },
  formIntroTitle: { color: "#020617", fontSize: 14, fontWeight: "900" },
  formIntroText: { color: "#475569", fontSize: 12, lineHeight: 18, fontWeight: "700", marginTop: 2 },
  errorSummary: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(176,80,49,0.42)",
    backgroundColor: "#fff7ed",
    padding: 15,
    gap: 12,
  },
  errorSummaryTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  errorSummaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  errorSummaryCopy: { flex: 1 },
  errorSummaryTitle: { color: "#7f1d1d", fontSize: 15, fontWeight: "900" },
  errorSummaryText: { color: "#9a3412", fontSize: 12, lineHeight: 18, fontWeight: "800", marginTop: 2 },
  errorList: { gap: 8 },
  errorListItem: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  errorListText: { flex: 1, color: "#7c2d12", fontSize: 12, lineHeight: 18, fontWeight: "800" },
  errorListLabel: { color: "#7f1d1d", fontWeight: "900" },
  fieldBlock: { gap: 8 },
  label: { color: "#cbd5e1", fontSize: 12, fontWeight: "900", letterSpacing: 0.3 },
  inputShell: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
  },
  inputShellDisabled: { backgroundColor: "#f1f5f9" },
  inputShellError: {
    borderColor: "rgba(176,80,49,0.55)",
    backgroundColor: "rgba(176,80,49,0.06)",
  },
  input: { flex: 1, color: "#0f172a", fontSize: 14, fontWeight: "800", paddingVertical: 12 },
  locationSection: {
    gap: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.035)",
    padding: 12,
  },
  locationSectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  locationEyebrow: {
    color: "#14b8a6",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  locationTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4,
  },
  locationRadiusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "rgba(20,184,166,0.24)",
    backgroundColor: "rgba(20,184,166,0.10)",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  locationRadiusText: {
    color: "#5eead4",
    fontSize: 11,
    fontWeight: "900",
  },
  locationDescription: {
    color: "rgba(255,255,255,0.48)",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  uploadButton: {
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#14b8a6",
    backgroundColor: "#f0fdfa",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  uploadCopy: { flex: 1 },
  uploadTitle: { color: "#020617", fontSize: 14, fontWeight: "900" },
  uploadText: { color: "#475569", fontSize: 12, lineHeight: 18, fontWeight: "700", marginTop: 2 },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: { color: Colors.danger, fontSize: 12, fontWeight: "700" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  selectedChipText: { color: Colors.white, fontSize: 12, fontWeight: "800" },
  optionWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: {
    borderRadius: 99,
    backgroundColor: "rgba(20,184,166,0.1)",
    borderWidth: 1,
    borderColor: "rgba(20,184,166,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  optionChipText: { color: Colors.primary, fontSize: 12, fontWeight: "800" },
  scheduleChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.lightBorder,
    backgroundColor: Colors.lightBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  scheduleChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  scheduleChipText: { color: Colors.lightText, fontSize: 12, fontWeight: "800" },
  scheduleChipTextActive: { color: Colors.white },
  row: { flexDirection: "row", gap: 10 },
  rowItem: { flex: 1 },
  submitButton: {
    minHeight: 52,
    borderRadius: 99,
    backgroundColor: "#14b8a6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  submitText: { color: Colors.text, fontSize: 15, fontWeight: "900" },
  accessCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 22,
    alignItems: "center",
    gap: 10,
  },
  accessIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  accessTitle: { color: Colors.text, fontSize: 21, fontWeight: "900", textAlign: "center", marginTop: 4 },
  accessMessage: { color: Colors.textSecondary, fontSize: 14, lineHeight: 21, textAlign: "center" },
  accessActions: { width: "100%", gap: 10, marginTop: 8 },
  accessButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  accessButtonPrimary: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  accessButtonText: { color: Colors.text, fontSize: 14, fontWeight: "900" },
  accessButtonPrimaryText: { color: Colors.white },
  feedbackBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.42)",
    justifyContent: "flex-end",
  },
  feedbackCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#fff",
    padding: 24,
    paddingBottom: 30,
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
  },
  feedbackGrip: {
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#cbd5e1",
    marginBottom: 18,
  },
  feedbackIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  feedbackIconSuccess: {
    backgroundColor: "#ccfbf1",
  },
  feedbackIconError: {
    backgroundColor: "#fee2e2",
  },
  feedbackTitle: { color: "#020617", fontSize: 23, lineHeight: 28, fontWeight: "900", textAlign: "center" },
  feedbackMessage: { color: "#334155", fontSize: 14, lineHeight: 22, fontWeight: "700", textAlign: "center", marginTop: 9 },
  feedbackActions: { width: "100%", gap: 10, marginTop: 22 },
  feedbackButton: {
    minHeight: 48,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackButtonPrimary: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  feedbackButtonText: { color: "#020617", fontSize: 14, fontWeight: "900" },
  feedbackButtonPrimaryText: { color: Colors.white },
});
