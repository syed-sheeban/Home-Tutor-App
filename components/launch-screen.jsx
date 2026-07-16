import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import HomeTutorLogo from "./home-tutor-logo";

export default function LaunchScreen({ onFinished }) {
  const reveal = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.72)).current;
  const logoLift = useRef(new Animated.Value(16)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(reveal, { toValue: 1, duration: 480, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 75, useNativeDriver: true }),
        Animated.timing(logoLift, { toValue: 0, duration: 580, useNativeDriver: true }),
      ]),
      Animated.delay(900),
      Animated.timing(fadeOut, { toValue: 0, duration: 360, useNativeDriver: true }),
    ]);

    animation.start(({ finished }) => finished && onFinished());
    return () => animation.stop();
  }, [fadeOut, logoLift, logoScale, onFinished, reveal]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      <View style={styles.orbOne} />
      <View style={styles.orbTwo} />
      <Animated.View
        style={[
          styles.content,
          { opacity: reveal, transform: [{ translateY: logoLift }, { scale: logoScale }] },
        ]}
      >
        <View style={styles.logoHalo}>
          <HomeTutorLogo size={166} />
        </View>
        <Text style={styles.title}>HomeTutor</Text>
        <Text style={styles.tagline}>Learn. Grow. Belong.</Text>
      </Animated.View>
      <Animated.View style={[styles.progressTrack, { opacity: reveal }]}>
        <View style={styles.progressFill} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: "#050810", alignItems: "center", justifyContent: "center", overflow: "hidden", zIndex: 99 },
  orbOne: { position: "absolute", width: 330, height: 330, borderRadius: 165, backgroundColor: "#0F766E", opacity: 0.22, top: -118, right: -105 },
  orbTwo: { position: "absolute", width: 290, height: 290, borderRadius: 145, backgroundColor: "#1D4ED8", opacity: 0.2, bottom: -125, left: -105 },
  content: { alignItems: "center" },
  logoHalo: { width: 214, height: 214, borderRadius: 107, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(103,232,249,0.20)", shadowColor: "#22D3EE", shadowOpacity: 0.34, shadowRadius: 28, shadowOffset: { width: 0, height: 12 }, elevation: 14 },
  title: { color: "#FFFFFF", fontSize: 31, fontWeight: "800", letterSpacing: -1, marginTop: 26 },
  tagline: { color: "#94A3B8", fontSize: 14, fontWeight: "600", letterSpacing: 1.2, marginTop: 8 },
  progressTrack: { width: 72, height: 3, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 4, position: "absolute", bottom: 72, overflow: "hidden" },
  progressFill: { width: "65%", height: "100%", backgroundColor: "#2DD4BF", borderRadius: 4 },
});
