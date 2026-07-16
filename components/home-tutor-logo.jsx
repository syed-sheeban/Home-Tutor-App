import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

/** A scalable mark: an open book that also forms a welcoming home. */
export default function HomeTutorLogo({ size = 160 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      <Defs>
        <LinearGradient id="htBlue" x1="28" y1="132" x2="128" y2="24" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#0EA5E9" />
          <Stop offset="1" stopColor="#2563EB" />
        </LinearGradient>
        <LinearGradient id="htGold" x1="80" y1="20" x2="80" y2="53" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#FDE68A" />
          <Stop offset="1" stopColor="#F59E0B" />
        </LinearGradient>
      </Defs>
      <Path d="M80 18L85.1 31.9L99 37L85.1 42.1L80 56L74.9 42.1L61 37L74.9 31.9L80 18Z" fill="url(#htGold)" />
      <Path d="M80 53.5C63.6 39.2 42.8 41.9 28 52.5V119C44 108.6 63.5 106 80 119.5V53.5Z" fill="url(#htBlue)" />
      <Path d="M80 53.5C96.4 39.2 117.2 41.9 132 52.5V119C116 108.6 96.5 106 80 119.5V53.5Z" fill="url(#htBlue)" opacity="0.86" />
      <Path d="M45 68.5C55.7 62.8 67.6 63.2 75 67.7" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.68" />
      <Path d="M45 84C55.7 78.3 67.6 78.7 75 83.2" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.68" />
      <Path d="M115 68.5C104.3 62.8 92.4 63.2 85 67.7" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.68" />
      <Path d="M115 84C104.3 78.3 92.4 78.7 85 83.2" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.68" />
      <Path d="M80 53.5V119.5" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
      <Path d="M31 119C46 108.8 63.4 108.9 80 120.5C96.6 108.9 114 108.8 129 119" stroke="#67E8F9" strokeWidth="4" strokeLinecap="round" />
    </Svg>
  );
}
