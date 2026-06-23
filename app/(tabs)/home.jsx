import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useAuthStore from "../../store/authStore";

const { width: SW, height: SH } = Dimensions.get("window");
const HERO_HEIGHT = Math.max(720, SH * 0.95);

const slides = [
  {
    image: "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80",
    title1: "Learn Smarter",
    title2: "Shine Brighter",
    subtext: "Premium 1-on-1 home tutoring for Classes 1 to 12, built to make every subject feel clear, calm, and exciting.",
    tag: "Classes 1-12",
    bottomCard: "Personal learning plans for school, homework, tests, and confidence.",
  },
  {
    image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80",
    title1: "Turn Doubts",
    title2: "Into Wins",
    subtext: "Friendly tutors help kids and teens build strong basics, better study habits, and the courage to ask questions.",
    tag: "Confidence First",
    bottomCard: "Step-by-step support across Maths, Science, English, Social Studies, and more.",
  },
  {
    image: "https://images.unsplash.com/photo-1544776193-352d25ca82cd?auto=format&fit=crop&q=80",
    title1: "Big Dreams",
    title2: "Start Here",
    subtext: "From first alphabets to board exam preparation, we match students with verified tutors who teach at their pace.",
    tag: "Future Ready",
    bottomCard: "A polished academic routine that parents can trust and students can enjoy.",
  },
];

const services = [
  {
    icon: "book-outline",
    title: "Curated Subject Tutoring",
    text: "Focused support across school boards, competitive exams, STEM subjects, languages, and foundational learning.",
  },
  {
    icon: "people-outline",
    title: "Private 1-on-1 Mentorship",
    text: "Dedicated tutor matching with learning pace, personality, academic goals, and parent expectations in mind.",
  },
  {
    icon: "shield-checkmark-outline",
    title: "Verified Home Tutors",
    text: "Every educator is screened for subject strength, teaching approach, communication, and classroom reliability.",
  },
  {
    icon: "sparkles-outline",
    title: "Premium Progress Planning",
    text: "Monthly learning roadmaps, parent updates, and performance reviews designed to build long-term confidence.",
  },
];

const tutorProcess = [
  {
    icon: "clipboard-outline",
    step: "01",
    title: "Learning Profile",
    text: "We understand class level, board, subject gaps, personality, timing, and parent expectations before suggesting anyone.",
  },
  {
    icon: "shield-checkmark-outline",
    step: "02",
    title: "Tutor Shortlist",
    text: "Only verified tutors with matching subject strength, teaching style, and location fit are shared with your family.",
  },
  {
    icon: "calendar-outline",
    step: "03",
    title: "Trial And Roadmap",
    text: "Start with a focused session, then receive a clear academic plan with milestones, reviews, and study rhythm.",
  },
];

const outcomes = [
  "Better concept clarity",
  "Consistent study routine",
  "Improved exam confidence",
  "Transparent parent updates",
];

const ctaChecks = [
  "Tutor matching within 24 hours",
  "Personal roadmap for every student",
  "Parent progress reviews included",
];

const navItems = [
  { label: "Home", action: "home", icon: "home-outline" },
  { label: "Find Tutor", route: "/(tabs)/discover", icon: "search-outline" },
  { label: "Become Tutor", route: "/(tabs)/become-tutor", icon: "ribbon-outline" },
];

const authNavItem = { label: "Sign In / Sign Up", route: "/(auth)/signup", icon: "person-add-outline", highlight: true };
const logoutNavItem = { label: "Logout", action: "logout", icon: "log-out-outline", highlight: true, danger: true };

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const drawerAnim = useRef(new Animated.Value(0)).current;
  const { isAuthenticated, logout } = useAuthStore();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [logoutSuccessVisible, setLogoutSuccessVisible] = useState(false);

  const sectionOffsets = {
    home: 0,
    services: HERO_HEIGHT - 40,
    process: HERO_HEIGHT + 760,
    results: HERO_HEIGHT + 1380,
  };

  useEffect(() => {
    const timer = setInterval(() => {
      changeSlide((currentSlide + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [currentSlide]);

  const changeSlide = (next) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
    setCurrentSlide(next);
  };

  const prevSlide = () => changeSlide(currentSlide === 0 ? slides.length - 1 : currentSlide - 1);
  const nextSlide = () => changeSlide(currentSlide === slides.length - 1 ? 0 : currentSlide + 1);

  const openMenu = () => {
    setIsMenuOpen(true);
    Animated.spring(drawerAnim, { toValue: 1, useNativeDriver: true, tension: 70, friction: 11 }).start();
  };

  const closeMenu = () => {
    Animated.timing(drawerAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setIsMenuOpen(false));
  };

  const goToAction = (item) => {
    closeMenu();
    if (item.action === "logout") {
      setLogoutConfirmVisible(true);
      return;
    }
    if (item.route) {
      router.push(item.route);
      return;
    }
    const y = sectionOffsets[item.action] || 0;
    scrollRef.current?.scrollTo({ y, animated: true });
  };

  const slide = slides[currentSlide];
  const menuItems = [...navItems, isAuthenticated ? logoutNavItem : authNavItem];
  const drawerTranslate = drawerAnim.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] });

  const confirmLogout = async () => {
    await logout();
    setLogoutConfirmVisible(false);
    setLogoutSuccessVisible(true);
    router.replace("/(tabs)/home");
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#050810" />
      <ScrollView ref={scrollRef} style={styles.screen} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { minHeight: HERO_HEIGHT, paddingTop: insets.top + 132 }]}>
          {slides.map((item, index) => (
            <Animated.View key={item.image} style={[StyleSheet.absoluteFill, { opacity: index === currentSlide ? fadeAnim : 0 }]}>
              <Image source={{ uri: item.image }} style={styles.heroBgImage} resizeMode="cover" />
            </Animated.View>
          ))}
          <View style={styles.heroBefore} />
          <View style={styles.heroAfter} />

          <View style={[styles.siteNav, isMenuOpen && styles.siteNavOpen, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity style={styles.siteBrand} onPress={() => goToAction({ action: "home" })} activeOpacity={0.85}>
              <View style={styles.siteBrandIcon}>
                <Ionicons name="school-outline" size={24} color="#fff" />
              </View>
              <Text style={styles.siteBrandText}>HomeTutor</Text>
            </TouchableOpacity>

            <View style={styles.siteNavRight}>
              {!isAuthenticated && (
                <TouchableOpacity style={styles.siteNavAction} onPress={() => router.push("/(auth)/login")} activeOpacity={0.86}>
                  <Text style={styles.siteNavActionText}>Login / Signup</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.siteNavToggle, isMenuOpen && styles.siteNavToggleOpen]}
                onPress={isMenuOpen ? closeMenu : openMenu}
                activeOpacity={0.86}
              >
                <Ionicons name={isMenuOpen ? "close" : "menu"} size={25} color={isMenuOpen ? "#020617" : "#fff"} />
              </TouchableOpacity>
            </View>
          </View>

          {isMenuOpen && (
            <Animated.View style={[styles.mobileMenu, { top: insets.top + 86, transform: [{ translateY: drawerTranslate }] }]}>
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.mobileNavLink, item.highlight && styles.mobileNavLinkHighlight, item.danger && styles.mobileNavLinkLogout]}
                  onPress={() => goToAction(item)}
                  activeOpacity={0.82}
                >
                  <View style={[styles.mobileNavIcon, item.highlight && styles.mobileNavIconHighlight, item.danger && styles.mobileNavIconLogout]}>
                    <Ionicons name={item.icon} size={18} color={item.highlight ? "#020617" : "rgba(255,255,255,0.82)"} />
                  </View>
                  <Text style={[styles.mobileNavLinkText, item.highlight && styles.mobileNavLinkTextHighlight]}>{item.label}</Text>
                  {item.highlight && <Ionicons name="arrow-forward" size={18} color="#020617" />}
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}

          <View style={styles.homeHeroShell}>
            <Animated.View style={[styles.homeHeroCopy, { opacity: fadeAnim }]}>
              <View style={styles.homeHeroPill}>
                <Ionicons name="sparkles-outline" size={16} color="#cffafe" />
                <Text style={styles.homeHeroPillText}>{slide.tag}</Text>
              </View>
              <Text style={styles.homeHeroTitle}>
                {slide.title1}
                {"\n"}
                <Text style={styles.homeHeroTitleAccent}>{slide.title2}</Text>
              </Text>
              <Text style={styles.homeHeroText}>{slide.subtext}</Text>

              <View style={styles.homeHeroActions}>
                <TouchableOpacity style={styles.homeHeroPrimary} onPress={() => router.push("/(tabs)/discover")} activeOpacity={0.88}>
                  <Text style={styles.homeHeroPrimaryText}>Find My Tutor</Text>
                  <Ionicons name="arrow-forward" size={18} color="#020617" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.homeHeroSecondary} onPress={() => goToAction({ action: "process" })} activeOpacity={0.88}>
                  <Text style={styles.homeHeroSecondaryText}>See How It Works</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.homeHeroMicrocopy}>Verified tutor matching for school, homework, exams, and steady confidence.</Text>
              <View style={styles.homeHeroProof}>
                <HeroProof value="1:1" label="Private lessons" />
                <HeroProof value="24h" label="Tutor match" />
                <HeroProof value="4.9" label="Family rated" />
              </View>
            </Animated.View>

            <View style={styles.homeHeroStage}>
              <Animated.View style={[styles.homeHeroPhotoCard, { opacity: fadeAnim }]}>
                <Image source={{ uri: slide.image }} style={styles.homeHeroPhoto} resizeMode="cover" />
                <View style={styles.homeHeroPhotoGlow} />
                <View style={styles.homeHeroRankCard}>
                  <Ionicons name="trophy-outline" size={20} color="#facc15" />
                  <View>
                    <Text style={styles.homeHeroRankStrong}>Level Up</Text>
                    <Text style={styles.homeHeroRankSpan}>Weekly progress</Text>
                  </View>
                </View>
              </Animated.View>
            </View>
          </View>

          <View style={styles.homeHeroControls}>
            <TouchableOpacity style={styles.controlButton} onPress={prevSlide}>
              <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.76)" />
            </TouchableOpacity>
            <View style={styles.heroDots}>
              {slides.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.heroDot, index === currentSlide && styles.heroDotActive]}
                  onPress={() => changeSlide(index)}
                />
              ))}
            </View>
            <TouchableOpacity style={styles.controlButton} onPress={nextSlide}>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.76)" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionSoft}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderCopy}>
              <Eyebrow label="Signature Services" />
              <Text style={styles.sectionTitleDark}>Private tutoring shaped like a luxury academic concierge.</Text>
            </View>
            <Text style={styles.sectionCopyDark}>
              Refined home learning for families who want expertise, consistency, and a polished support system around every student.
            </Text>
          </View>

          <ImageBackground
            source={{ uri: "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&q=80" }}
            style={styles.servicesFeature}
            imageStyle={styles.servicesFeatureImage}
          >
            <View style={styles.servicesFeatureOverlay} />
            <View style={styles.servicesFeatureContent}>
              <Text style={styles.footerPill}>Premium Learning</Text>
              <View>
                <Text style={styles.servicesFeatureTitle}>Designed around the way your child learns best.</Text>
                <Text style={styles.servicesFeatureText}>
                  Tutor matching, weekly direction, parent clarity, and calm academic momentum in one guided experience.
                </Text>
              </View>
              <View style={styles.servicesMiniStats}>
                <MiniStat value="4.9" label="Family Rating" />
                <MiniStat value="24h" label="Tutor Match" />
              </View>
            </View>
          </ImageBackground>

          <View style={styles.premiumCardGrid}>
            {services.map((service) => (
              <View key={service.title} style={styles.premiumCard}>
                <View style={styles.premiumIcon}>
                  <Ionicons name={service.icon} size={26} color="#14b8a6" />
                </View>
                <Text style={styles.premiumCardTitle}>{service.title}</Text>
                <Text style={styles.premiumCardText}>{service.text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionLight}>
          <View style={styles.processShell}>
            <View style={styles.processIntro}>
              <Eyebrow label="How We Match" />
              <Text style={styles.sectionTitleDark}>A refined tutor selection process for serious academic growth.</Text>
              <Text style={[styles.sectionCopyDark, styles.processIntroText]}>
                Instead of sending random profiles, we build a thoughtful match around the student, family schedule, subject needs, and long-term goals.
              </Text>
            </View>

            <View style={styles.processSteps}>
              {tutorProcess.map((item) => (
                <View key={item.step} style={styles.processCard}>
                  <View style={styles.processCardTop}>
                    <View style={styles.processIcon}>
                      <Ionicons name={item.icon} size={24} color="#fff" />
                    </View>
                    <Text style={styles.processStep}>{item.step}</Text>
                  </View>
                  <Text style={styles.processTitle}>{item.title}</Text>
                  <Text style={styles.processText}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.resultsSection}>
          <ImageBackground
            source={{ uri: "https://images.unsplash.com/photo-1606761568499-6d2451b23c66?auto=format&fit=crop&q=80" }}
            style={styles.resultsMedia}
            imageStyle={styles.resultsImage}
          >
            <View style={styles.resultsOverlay} />
            <View style={styles.reviewPanel}>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons key={star} name="star" size={16} color="#facc15" />
                ))}
              </View>
              <Text style={styles.reviewText}>
                The tutor understood exactly where my son was struggling and made study time calmer within weeks.
              </Text>
              <Text style={styles.reviewLabel}>Parent Review</Text>
            </View>
          </ImageBackground>

          <View style={styles.resultsContent}>
            <Eyebrow label="Measured Confidence" />
            <Text style={styles.sectionTitleDark}>More than tuition. A calmer academic system at home.</Text>
            <Text style={[styles.sectionCopyDark, { marginTop: 18 }]}>
              Our tutors focus on comfort, clarity, and repeatable progress, so students do not just prepare for the next test, they learn how to learn.
            </Text>

            <View style={styles.resultsPoints}>
              {outcomes.map((item) => (
                <View key={item} style={styles.resultsPoint}>
                  <Ionicons name="checkmark-circle" size={20} color="#14b8a6" />
                  <Text style={styles.resultsPointText}>{item}</Text>
                </View>
              ))}
            </View>

            <View style={styles.resultsStats}>
              <ResultStat value="98%" label="Parent Satisfaction" />
              <ResultStat value="3x" label="Weekly Momentum" />
              <ResultStat value="1:1" label="Private Focus" />
            </View>
          </View>
        </View>

        <View style={styles.ctaLight}>
          <View style={styles.ctaLuxuryCard}>
            <View style={styles.ctaCopy}>
              <Eyebrow label="Begin With Confidence" />
              <Text style={styles.sectionTitleDark}>Match with a verified tutor who fits your child perfectly.</Text>
              <Text style={[styles.sectionCopyDark, { marginTop: 18 }]}>
                Share the subject, class level, learning goals, and preferred schedule. We curate the tutor shortlist and help you begin with clarity.
              </Text>
              <View style={styles.ctaButtons}>
                <TouchableOpacity style={styles.btnLuxury} onPress={() => router.push("/(tabs)/discover")}>
                  <Text style={styles.btnLuxuryText}>Book Consultation</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnOutlineLuxury} onPress={() => router.push("/(tabs)/become-tutor")}>
                  <Text style={styles.btnOutlineLuxuryText}>Become a Tutor</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ImageBackground
              source={{ uri: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80" }}
              style={styles.ctaMedia}
              imageStyle={styles.ctaMediaImage}
            >
              <View style={styles.ctaMediaOverlay} />
              <View style={styles.ctaPanel}>
                {ctaChecks.map((item) => (
                  <View key={item} style={styles.ctaCheckRow}>
                    <View style={styles.ctaCheckIcon}>
                      <Ionicons name="checkmark-circle" size={20} color="#14b8a6" />
                    </View>
                    <Text style={styles.ctaCheckText}>{item}</Text>
                  </View>
                ))}
              </View>
            </ImageBackground>
          </View>
        </View>

        <View style={styles.footerDark}>
          <View style={styles.footerTop}>
            <View>
              <Text style={styles.footerPill}>Start Here</Text>
              <Text style={styles.footerDarkTitle}>Find the right tutor or join as a verified educator.</Text>
            </View>
            <View>
              <Text style={styles.footerDarkCopy}>
                Choose the path that matches what you need today. The same HomeTutor flow, routes, and account access stay in place.
              </Text>
              <View style={styles.footerActionRow}>
                <TouchableOpacity style={styles.footerButton} onPress={() => router.push("/(tabs)/discover")} activeOpacity={0.86}>
                  <Text style={styles.footerButtonText}>Find Tutor</Text>
                  <Ionicons name="arrow-forward" size={17} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.footerButtonGhost} onPress={() => router.push("/(tabs)/become-tutor")} activeOpacity={0.86}>
                  <Text style={styles.footerButtonGhostText}>Become Tutor</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.footerGrid}>
            <View style={styles.footerBrandBlock}>
              <View style={styles.footerBrand}>
                <View style={styles.footerBrandIcon}>
                  <Ionicons name="school-outline" size={25} color="#fff" />
                </View>
                <Text style={styles.footerBrandText}>HomeTutor</Text>
              </View>
              <Text style={styles.footerBrandCopy}>
                Premium home tutoring and academic mentorship for students who deserve patient, personal, and expert guidance.
              </Text>
            </View>

            <View style={styles.footerColumn}>
              <Text style={styles.footerHeading}>Explore</Text>
              <FooterLink label="Home" onPress={() => goToAction({ action: "home" })} />
              <FooterLink label="Find Tutor" onPress={() => router.push("/(tabs)/discover")} />
              <FooterLink label="Become Tutor" onPress={() => router.push("/(tabs)/become-tutor")} />
              <FooterLink label="Sign In / Sign Up" onPress={() => router.push("/(auth)/signup")} />
            </View>
            <View style={styles.footerColumn}>
              <Text style={styles.footerHeading}>Contact</Text>
              <FooterContact icon="call-outline" text="+91 98765 43210" />
              <FooterContact icon="mail-outline" text="hello@hometutor.com" />
              <FooterContact icon="location-outline" text="Kolkata, India" />
            </View>
          </View>

          <View style={styles.footerBottom}>
            <Text style={styles.footerBottomText}>Copyright 2026 HomeTutor. All rights reserved.</Text>
          </View>
        </View>
      </ScrollView>

      <Modal visible={logoutConfirmVisible} transparent animationType="fade" onRequestClose={() => setLogoutConfirmVisible(false)}>
        <View style={styles.logoutBackdrop}>
          <View style={styles.logoutDialog}>
            <View style={styles.logoutIcon}>
              <Ionicons name="log-out-outline" size={30} color="#14b8a6" />
            </View>
            <Text style={styles.logoutDialogTitle}>Logout?</Text>
            <Text style={styles.logoutDialogText}>Are you sure you want to logout from this account?</Text>
            <View style={styles.logoutDialogActions}>
              <TouchableOpacity style={styles.logoutCancel} onPress={() => setLogoutConfirmVisible(false)} activeOpacity={0.86}>
                <Text style={styles.logoutCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutConfirm} onPress={confirmLogout} activeOpacity={0.86}>
                <Text style={styles.logoutConfirmText}>Yes, Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={logoutSuccessVisible} transparent animationType="fade" onRequestClose={() => setLogoutSuccessVisible(false)}>
        <View style={styles.logoutBackdrop}>
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={34} color="#14b8a6" />
            </View>
            <Text style={styles.successTitle}>Logout Successful</Text>
            <Text style={styles.successText}>You have been signed out. Sign in again to access your dashboard.</Text>
            <TouchableOpacity style={styles.successButton} onPress={() => setLogoutSuccessVisible(false)} activeOpacity={0.86}>
              <Text style={styles.successButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Eyebrow({ label }) {
  return <Text style={styles.sectionEyebrow}>{label}</Text>;
}

function MiniStat({ value, label }) {
  return (
    <View style={styles.servicesMiniStat}>
      <Text style={styles.servicesMiniValue}>{value}</Text>
      <Text style={styles.servicesMiniLabel}>{label}</Text>
    </View>
  );
}

function ResultStat({ value, label }) {
  return (
    <View style={styles.resultsStat}>
      <Text style={styles.resultsStatValue}>{value}</Text>
      <Text style={styles.resultsStatLabel}>{label}</Text>
    </View>
  );
}

function FooterLink({ label, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82}>
      <Text style={styles.footerLink}>{label}</Text>
    </TouchableOpacity>
  );
}

function FooterContact({ icon, text }) {
  return (
    <View style={styles.footerContact}>
      <Ionicons name={icon} size={16} color="rgba(255,255,255,0.42)" />
      <Text style={styles.footerContactText}>{text}</Text>
    </View>
  );
}

function HeroProof({ value, label }) {
  return (
    <View style={styles.homeHeroProofItem}>
      <Text style={styles.homeHeroProofValue}>{value}</Text>
      <Text style={styles.homeHeroProofLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#050810" },
  hero: {
    position: "relative",
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#07111f",
    paddingHorizontal: 20,
    paddingBottom: 112,
  },
  heroBgImage: {
    width: "100%",
    height: "100%",
    opacity: 0.45,
  },
  heroBefore: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,8,16,0.58)",
  },
  heroAfter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
    backgroundColor: "rgba(5,8,16,0.72)",
  },
  siteNav: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(5,8,16,0.82)",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  siteNavOpen: { backgroundColor: "rgba(5,8,16,0.95)" },
  siteBrand: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  siteBrandIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#14b8a6",
    shadowColor: "#14b8a6",
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  siteBrandText: { color: "#fff", fontSize: 22, fontWeight: "900" },
  siteNavRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  siteNavAction: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#fff",
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 5,
  },
  siteNavActionText: { color: "#000", fontSize: 13, fontWeight: "900" },
  siteNavAccountTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 8,
  },
  siteNavAccountMenuMark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  siteNavAccountAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  siteNavAccountAvatarText: { color: "#020617", fontSize: 13, fontWeight: "900" },
  siteNavToggle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  siteNavToggleOpen: {
    borderColor: "#fff",
    backgroundColor: "#fff",
    shadowColor: "#fff",
    shadowOpacity: 0.22,
    shadowRadius: 18,
  },
  mobileMenu: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 60,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(5,8,16,0.97)",
    padding: 12,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 12,
  },
  mobileNavLink: {
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  mobileNavLinkHighlight: {
    marginTop: 6,
    backgroundColor: "#facc15",
    shadowColor: "#facc15",
    shadowOpacity: 0.26,
    shadowRadius: 18,
    elevation: 7,
  },
  mobileNavLinkLogout: {
    backgroundColor: "#fff",
    shadowColor: "#fff",
    shadowOpacity: 0.2,
  },
  mobileNavIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  mobileNavIconHighlight: { backgroundColor: "rgba(2,6,23,0.10)" },
  mobileNavIconLogout: { backgroundColor: "rgba(220,38,38,0.10)" },
  mobileNavLinkText: { flex: 1, color: "rgba(255,255,255,0.78)", fontSize: 14, fontWeight: "800" },
  mobileNavLinkTextHighlight: { color: "#020617", fontWeight: "900" },
  mobileAction: { marginTop: 8, alignItems: "center" },
  accountMenu: {
    position: "absolute",
    top: 82,
    right: 16,
    width: 288,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(5,8,16,0.96)",
    padding: 12,
    gap: 6,
  },
  siteNavMobileAccount: {
    marginTop: 8,
    gap: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 12,
  },
  accountSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 12,
  },
  accountSummaryAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  accountSummaryAvatarText: { color: "#020617", fontSize: 14, fontWeight: "900" },
  accountSummaryName: { color: "#fff", fontSize: 14, fontWeight: "900" },
  accountSummaryRole: { color: "#14b8a6", fontSize: 10, fontWeight: "900", letterSpacing: 1.8, marginTop: 2 },
  accountMenuButton: {
    minHeight: 46,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
  },
  accountMenuButtonText: { flex: 1, color: "rgba(255,255,255,0.72)", fontSize: 14, fontWeight: "800" },
  homeHeroShell: {
    position: "relative",
    zIndex: 10,
    gap: 28,
    flex: 1,
    justifyContent: "center",
  },
  homeHeroCopy: { maxWidth: 720 },
  homeHeroPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginBottom: 20,
  },
  homeHeroPillText: {
    color: "#cffafe",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  homeHeroTitle: {
    color: "#fff",
    fontSize: Math.min(58, SW * 0.13),
    lineHeight: Math.min(62, SW * 0.14),
    fontWeight: "900",
  },
  homeHeroTitleAccent: {
    color: "#facc15",
  },
  homeHeroText: {
    marginTop: 20,
    maxWidth: 640,
    color: "rgba(255,255,255,0.75)",
    fontSize: 16,
    lineHeight: 27,
    fontWeight: "600",
  },
  homeHeroActions: { marginTop: 24, gap: 12 },
  homeHeroPrimary: {
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 28,
  },
  homeHeroPrimaryText: { color: "#020617", fontSize: 14, fontWeight: "900" },
  homeHeroSecondary: {
    minHeight: 54,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  homeHeroSecondaryText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  homeHeroMicrocopy: {
    color: "rgba(255,255,255,0.52)",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 16,
  },
  homeHeroProof: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  homeHeroProofItem: {
    flex: 1,
    minHeight: 74,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.10)",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  homeHeroProofValue: { color: "#fff", fontSize: 22, fontWeight: "900" },
  homeHeroProofLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "900",
    marginTop: 3,
    textTransform: "uppercase",
  },
  homeHeroTrust: { marginTop: 20, gap: 10 },
  trustStat: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.10)",
    padding: 16,
  },
  trustValue: { color: "#fff", fontSize: 26, fontWeight: "900" },
  trustLabel: { color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: "900", letterSpacing: 1.8, textTransform: "uppercase", marginTop: 4 },
  homeHeroStage: {
    position: "relative",
    height: 430,
    marginTop: 14,
  },
  homeHeroOrbit: {
    position: "absolute",
    left: 4,
    right: 4,
    top: 0,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  homeHeroOrbitPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  homeHeroOrbitText: { color: "#fff", fontSize: 10, fontWeight: "900", letterSpacing: 1.5, textTransform: "uppercase" },
  homeHeroPhotoCard: {
    position: "absolute",
    left: 8,
    right: 8,
    top: 48,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.10)",
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.42,
    shadowRadius: 36,
    elevation: 16,
  },
  homeHeroPhoto: { width: "100%", height: 315, borderRadius: 24 },
  homeHeroPhotoGlow: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    height: 170,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: "rgba(15,23,42,0.42)",
  },
  homeHeroRankCard: {
    position: "absolute",
    left: -3,
    bottom: 28,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  homeHeroRankStrong: { color: "#fff", fontSize: 14, fontWeight: "900" },
  homeHeroRankSpan: { color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "700" },
  homeHeroNoteCard: {
    position: "absolute",
    right: 0,
    bottom: 72,
    zIndex: 11,
    maxWidth: 245,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 14,
  },
  homeHeroNoteText: { flex: 1, color: "rgba(255,255,255,0.86)", fontSize: 13, lineHeight: 19, fontWeight: "800" },
  homeHeroTutorCard: {
    position: "absolute",
    right: 12,
    bottom: 22,
    zIndex: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 20,
    backgroundColor: "#14b8a6",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  homeHeroTutorText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  homeHeroControls: {
    position: "absolute",
    bottom: 28,
    alignSelf: "center",
    zIndex: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.10)",
    padding: 12,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroDots: { flexDirection: "row", alignItems: "center", gap: 8 },
  heroDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.35)" },
  heroDotActive: { width: 32, backgroundColor: "#facc15" },
  sectionSoft: { backgroundColor: "#f8fafc", paddingHorizontal: 20, paddingVertical: 80 },
  sectionLight: { backgroundColor: "#fff", paddingHorizontal: 20, paddingVertical: 80 },
  sectionHeaderRow: { gap: 24, marginBottom: 44 },
  sectionHeaderCopy: { gap: 8 },
  sectionEyebrow: {
    alignSelf: "flex-start",
    overflow: "hidden",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(20,184,166,0.20)",
    backgroundColor: "#fff",
    color: "#14b8a6",
    paddingHorizontal: 18,
    paddingVertical: 8,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2.6,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  sectionTitleDark: {
    color: "#020617",
    fontSize: 36,
    lineHeight: 39,
    fontWeight: "900",
  },
  sectionCopyDark: { color: "#64748b", fontSize: 15, lineHeight: 25, fontWeight: "600" },
  servicesFeature: {
    minHeight: 430,
    overflow: "hidden",
    borderRadius: 32,
    backgroundColor: "#020617",
    padding: 24,
    marginBottom: 20,
    shadowColor: "#0f172a",
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 8,
  },
  servicesFeatureImage: { opacity: 0.65 },
  servicesFeatureOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.56)" },
  servicesFeatureContent: { flex: 1, justifyContent: "space-between", zIndex: 2 },
  footerPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    overflow: "hidden",
  },
  servicesFeatureTitle: { color: "#fff", fontSize: 34, lineHeight: 38, fontWeight: "900" },
  servicesFeatureText: { color: "rgba(255,255,255,0.62)", fontSize: 15, lineHeight: 25, marginTop: 14 },
  servicesMiniStats: { flexDirection: "row", gap: 12 },
  servicesMiniStat: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.10)",
    padding: 16,
  },
  servicesMiniValue: { color: "#fff", fontSize: 24, fontWeight: "900" },
  servicesMiniLabel: { color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: "900", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 4 },
  premiumCardGrid: { gap: 16 },
  premiumCard: {
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.90)",
    backgroundColor: "#fff",
    padding: 24,
    minHeight: 210,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 26,
    elevation: 4,
  },
  premiumIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(20,184,166,0.10)",
    marginBottom: 18,
  },
  premiumCardTitle: { color: "#020617", fontSize: 20, lineHeight: 24, fontWeight: "900", marginBottom: 12 },
  premiumCardText: { color: "#64748b", fontSize: 14, lineHeight: 23, fontWeight: "600" },
  processShell: {
    gap: 20,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    padding: 20,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 4,
  },
  processIntro: {
    borderRadius: 24,
    backgroundColor: "#fff",
    padding: 22,
    shadowColor: "#0f172a",
    shadowOpacity: 0.05,
    shadowRadius: 22,
    elevation: 2,
  },
  processIntroText: { marginTop: 22 },
  processSteps: { gap: 14 },
  processCard: {
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    padding: 20,
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 22,
    elevation: 3,
  },
  processCardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 20 },
  processIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#020617",
  },
  processStep: { color: "#f1f5f9", fontSize: 40, fontWeight: "900" },
  processTitle: { color: "#020617", fontSize: 20, fontWeight: "900", marginTop: 20 },
  processText: { color: "#64748b", fontSize: 14, lineHeight: 23, fontWeight: "600", marginTop: 10 },
  resultsSection: { backgroundColor: "#f8fafc", paddingHorizontal: 20, paddingVertical: 80, gap: 24 },
  resultsMedia: {
    minHeight: 460,
    overflow: "hidden",
    borderRadius: 32,
    backgroundColor: "#020617",
    shadowColor: "#0f172a",
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 6,
  },
  resultsImage: { resizeMode: "cover" },
  resultsOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.32)" },
  reviewPanel: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.10)",
    padding: 20,
  },
  stars: { flexDirection: "row", gap: 4, marginBottom: 12 },
  reviewText: { color: "#fff", fontSize: 16, lineHeight: 27, fontWeight: "800" },
  reviewLabel: { color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: "900", letterSpacing: 2.5, textTransform: "uppercase", marginTop: 16 },
  resultsContent: {
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    padding: 24,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 4,
  },
  resultsPoints: { marginTop: 24, gap: 12 },
  resultsPoint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    padding: 14,
  },
  resultsPointText: { color: "#334155", fontSize: 14, fontWeight: "900", flex: 1 },
  resultsStats: { flexDirection: "row", gap: 10, marginTop: 24 },
  resultsStat: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    padding: 12,
  },
  resultsStatValue: { color: "#020617", fontSize: 23, fontWeight: "900" },
  resultsStatLabel: { color: "#94a3b8", fontSize: 9, lineHeight: 13, fontWeight: "900", letterSpacing: 0.8, textTransform: "uppercase", marginTop: 5 },
  ctaLight: { backgroundColor: "#fff", paddingHorizontal: 20, paddingVertical: 80 },
  ctaLuxuryCard: {
    overflow: "hidden",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 4,
  },
  ctaCopy: { padding: 26 },
  ctaButtons: { marginTop: 24, gap: 12 },
  btnLuxury: {
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: "#14b8a6",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  btnLuxuryText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  btnOutlineLuxury: {
    minHeight: 54,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  btnOutlineLuxuryText: { color: "#020617", fontSize: 14, fontWeight: "900" },
  ctaMedia: { minHeight: 340, justifyContent: "flex-end", padding: 20 },
  ctaMediaImage: { resizeMode: "cover" },
  ctaMediaOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.48)" },
  ctaPanel: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.10)",
    padding: 18,
    gap: 14,
  },
  ctaCheckRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  ctaCheckIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(20,184,166,0.15)",
  },
  ctaCheckText: { color: "rgba(255,255,255,0.86)", fontSize: 15, lineHeight: 21, fontWeight: "800", flex: 1 },
  footerDark: {
    position: "relative",
    backgroundColor: "#050810",
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: Platform.OS === "ios" ? 120 : 104,
  },
  footerTop: { gap: 28, paddingBottom: 44, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.10)" },
  footerDarkTitle: { color: "#fff", fontSize: 34, lineHeight: 39, fontWeight: "900", marginTop: 18 },
  footerDarkCopy: { color: "rgba(255,255,255,0.50)", fontSize: 15, lineHeight: 25, fontWeight: "600" },
  footerNewsletter: {
    marginTop: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 8,
    gap: 8,
  },
  footerInput: { minHeight: 48, color: "#fff", paddingHorizontal: 16, fontSize: 14, fontWeight: "700" },
  footerButton: { minHeight: 48, borderRadius: 999, backgroundColor: "#14b8a6", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  footerButtonText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  footerMessage: { color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: "700", marginTop: 10 },
  footerGrid: { gap: 30, paddingTop: 36 },
  footerBrandBlock: { gap: 16 },
  footerBrand: { flexDirection: "row", alignItems: "center", gap: 12 },
  footerBrandIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#14b8a6",
  },
  footerBrandText: { color: "#fff", fontSize: 24, fontWeight: "900" },
  footerBrandCopy: { color: "rgba(255,255,255,0.45)", fontSize: 14, lineHeight: 24, fontWeight: "600" },
  footerColumn: { gap: 12 },
  footerHeading: { color: "#fff", fontSize: 13, fontWeight: "900", letterSpacing: 1.7, textTransform: "uppercase", marginBottom: 4 },
  footerLink: { color: "rgba(255,255,255,0.45)", fontSize: 14, fontWeight: "700" },
  footerContact: { flexDirection: "row", alignItems: "center", gap: 10 },
  footerContactText: { color: "rgba(255,255,255,0.45)", fontSize: 14, fontWeight: "700" },
  footerBottom: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.10)", marginTop: 36, paddingTop: 22, gap: 16 },
  footerBottomText: { color: "rgba(255,255,255,0.35)", fontSize: 12, fontWeight: "700" },
  footerBottomLinks: { flexDirection: "row", flexWrap: "wrap", gap: 18 },
  footerBottomLink: { color: "rgba(255,255,255,0.42)", fontSize: 12, fontWeight: "700" },
  logoutBackdrop: { flex: 1, backgroundColor: "rgba(5,8,16,0.72)", alignItems: "center", justifyContent: "center", padding: 24 },
  logoutDialog: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(7,11,20,0.96)",
    padding: 28,
    alignItems: "center",
  },
  logoutIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "#14b8a6",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutDialogTitle: { color: "#fff", fontSize: 24, fontWeight: "900", marginTop: 16 },
  logoutDialogText: { color: "rgba(255,255,255,0.60)", fontSize: 14, lineHeight: 22, textAlign: "center", fontWeight: "600", marginTop: 10 },
  logoutDialogActions: { width: "100%", gap: 12, marginTop: 24 },
  logoutCancel: {
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutCancelText: { color: "rgba(255,255,255,0.75)", fontSize: 14, fontWeight: "900" },
  logoutConfirm: { minHeight: 48, borderRadius: 999, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  logoutConfirmText: { color: "#020617", fontSize: 14, fontWeight: "900" },
  successCard: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(20,184,166,0.18)",
    backgroundColor: "#070b14",
    padding: 32,
    alignItems: "center",
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: "rgba(20,184,166,0.22)",
    backgroundColor: "rgba(20,184,166,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: { color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 14 },
  successText: { color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 8 },
  successButton: {
    width: "100%",
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  successButtonText: { color: "#020617", fontSize: 14, fontWeight: "900" },
});
