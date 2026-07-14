import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { Easing, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const activeColor = '#1F6F5B';
const inactiveColor = '#7A8882';
const tabItems = {
  home: { title: 'Home', icon: 'home' },
  discover: { title: 'Find Tutor', icon: 'search' },
  'become-tutor': { title: 'Become Tutor', icon: 'school' },
  profile: { title: 'Profile', icon: 'person' },
};

const premiumTabTransition = ({ current }) => ({
  sceneStyle: {
    opacity: current.progress.interpolate({
      inputRange: [-1, -0.25, 0, 0.25, 1],
      outputRange: [0, 0.72, 1, 0.72, 0],
      extrapolate: 'clamp',
    }),
    transform: [
      {
        translateX: current.progress.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [-24, 0, 24],
          extrapolate: 'clamp',
        }),
      },
      {
        translateY: current.progress.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [6, 0, 6],
          extrapolate: 'clamp',
        }),
      },
      {
        scale: current.progress.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [0.985, 1, 0.985],
          extrapolate: 'clamp',
        }),
      },
    ],
  },
});

function TabIcon({ name, color }) {
  return <MaterialIcons name={name} size={24} color={color} />;
}

function AnimatedTabButton({ route, descriptor, navigation, isFocused }) {
  const item = tabItems[route.name];
  const progress = useSharedValue(isFocused ? 1 : 0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(isFocused ? 1 : 0, { duration: 240 });
  }, [isFocused, progress]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -3 * progress.value },
      { scale: pressScale.value },
    ],
  }));

  const iconWrapStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(31,111,91,${0.1 + progress.value * 0.12})`,
    transform: [{ scale: 1 + progress.value * 0.08 }],
  }));

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scaleX: 0.45 + progress.value * 0.55 }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: 0.68 + progress.value * 0.32,
    transform: [{ translateY: -1 + progress.value }],
  }));

  const onPress = () => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  const onLongPress = () => {
    navigation.emit({
      type: 'tabLongPress',
      target: route.key,
    });
  };

  const accessibilityLabel =
    descriptor.options.tabBarAccessibilityLabel || descriptor.options.title || item.title;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        pressScale.value = withSpring(0.94, { damping: 16, stiffness: 260 });
      }}
      onPressOut={() => {
        pressScale.value = withSpring(1, { damping: 15, stiffness: 220 });
      }}
      style={styles.tabPressable}
    >
      <Animated.View style={[styles.tabButton, buttonStyle]}>
        <Animated.View style={[styles.iconWrap, iconWrapStyle]}>
          <TabIcon name={item.icon} color={isFocused ? activeColor : inactiveColor} />
        </Animated.View>
        <Animated.Text style={[styles.tabLabel, isFocused && styles.tabLabelActive, labelStyle]}>
          {item.title}
        </Animated.Text>
        <Animated.View style={[styles.activeIndicator, indicatorStyle]} />
      </Animated.View>
    </Pressable>
  );
}

function SmoothTabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) =>
        tabItems[route.name] ? (
          <AnimatedTabButton
            key={route.key}
            route={route}
            descriptor={descriptors[route.key]}
            navigation={navigation}
            isFocused={state.index === index}
          />
        ) : null,
      )}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          borderTopColor: '#DDE7E2',
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
        animation: 'shift',
        sceneStyleInterpolator: premiumTabTransition,
        transitionSpec: {
          animation: 'timing',
          config: {
            duration: 320,
            easing: Easing.out(Easing.cubic),
          },
        },
      }}
      tabBar={(props) => <SmoothTabBar {...props} />}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Find Tutor',
          tabBarIcon: ({ color }) => <TabIcon name="search" color={color} />,
        }}
      />
      <Tabs.Screen
        name="become-tutor"
        options={{
          title: 'Become Tutor',
          tabBarIcon: ({ color }) => <TabIcon name="school" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon name="person" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    minHeight: 70,
    paddingTop: 8,
    paddingBottom: 9,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#DDE7E2',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  tabPressable: {
    flex: 1,
    minHeight: 52,
  },
  tabButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconWrap: {
    width: 36,
    height: 30,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    color: inactiveColor,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: activeColor,
  },
  activeIndicator: {
    width: 22,
    height: 3,
    borderRadius: 99,
    backgroundColor: activeColor,
    marginTop: 3,
  },
});
