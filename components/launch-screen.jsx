import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import HomeTutorLogo from "./home-tutor-logo";

export default function LaunchScreen({ onFinished }) {
  const reveal = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.86)).current;
  const logoLift = useRef(new Animated.Value(12)).current;
  const accentWidth = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(reveal, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 8,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(logoLift, { toValue: 0, duration: 520, useNativeDriver: true }),
        Animated.timing(accentWidth, { toValue: 1, duration: 680, useNativeDriver: false }),
        Animated.timing(progress, { toValue: 1, duration: 1500, useNativeDriver: false }),
      ]),
      Animated.delay(240),
      Animated.timing(fadeOut, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]);

    animation.start(({ finished }) => finished && onFinished());
    return () => animation.stop();
  }, [accentWidth, fadeOut, logoLift, logoScale, onFinished, progress, reveal]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.container, { opacity: fadeOut }]}
    >
      <View style={styles.topRule} />
      <View style={styles.bottomRule} />
      <Animated.View
        style={[
          styles.content,
          { opacity: reveal, transform: [{ translateY: logoLift }, { scale: logoScale }] },
        ]}
      >
        <View style={styles.emblemFrame}>
          <View style={styles.emblemInset}>
            <HomeTutorLogo size={154} />
          </View>
        </View>
        <Text style={styles.title}>TutorNest</Text>
        <Animated.View
          style={[
            styles.accent,
            {
              width: accentWidth.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 64],
              }),
            },
          ]}
        />
        <Text style={styles.tagline}>LEARNING, MADE PERSONAL</Text>
      </Animated.View>
      <Animated.View style={[styles.progressTrack, { opacity: reveal }]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ["8%", "100%"],
              }),
            },
          ]}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "#07111A",
    justifyContent: "center",
    overflow: "hidden",
    zIndex: 99,
  },
  topRule: {
    position: "absolute",
    top: 56,
    width: 1,
    height: 72,
    backgroundColor: "rgba(245,185,66,0.44)",
  },
  bottomRule: {
    position: "absolute",
    bottom: 48,
    width: 1,
    height: 32,
    backgroundColor: "rgba(103,232,249,0.24)",
  },
  content: {
    alignItems: "center",
    width: "100%",
  },
  emblemFrame: {
    width: 202,
    height: 202,
    borderRadius: 101,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B1722",
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.22)",
    shadowColor: "#020617",
    shadowOpacity: 0.48,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 16,
  },
  emblemInset: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 0,
    marginTop: 28,
  },
  accent: {
    height: 3,
    borderRadius: 2,
    backgroundColor: "#F5B942",
    marginTop: 13,
  },
  tagline: {
    color: "#9FB2C2",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 14,
  },
  progressTrack: {
    width: 88,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 2,
    position: "absolute",
    bottom: 104,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#2DD4BF",
    borderRadius: 2,
  },
});
