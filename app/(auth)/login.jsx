import React, { useRef, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import useAuthStore from '../../store/authStore';
import AuthSuccessModal from '../../components/auth-success-modal';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { login: loginStore, isAuthenticated } = useAuthStore();
  const [successUser, setSuccessUser] = useState(null);
  const handledAuthRef = useRef(false);
  const authSessionKey = useRef(Date.now()).current;

  // Injected JavaScript to listen to localStorage and communicate success
  const injectedJS = `
    (function() {
      function clearAuthStorageOnce() {
        try {
          if (sessionStorage.getItem('rnFreshAuthSession') === 'true') {
            return;
          }
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('role');
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('isVerified');
          localStorage.removeItem('tutorApplicationRequired');
          sessionStorage.setItem('rnFreshAuthSession', 'true');
        } catch (e) {
          // Silent catch
        }
      }

      function checkAuth() {
        try {
          var token = localStorage.getItem('token');
          var user = localStorage.getItem('user');
          var isVerified = localStorage.getItem('isVerified');
          var isAuthenticated = localStorage.getItem('isAuthenticated');
          var role = localStorage.getItem('role');
          var tutorApplicationRequired = localStorage.getItem('tutorApplicationRequired');
          
          if (token && user && isAuthenticated === 'true') {
            var data = {
              type: 'AUTH_SUCCESS',
              token: token,
              user: JSON.parse(user),
              isVerified: isVerified === 'true' || isVerified === true || isVerified === 'undefined' || isVerified === undefined,
              role: role,
              tutorApplicationRequired: tutorApplicationRequired === 'true'
            };
            window.ReactNativeWebView.postMessage(JSON.stringify(data));
            return true;
          }
        } catch (e) {
          // Silent catch
        }
        return false;
      }

      clearAuthStorageOnce();

      // Check immediately
      checkAuth();

      // Check periodically
      var interval = setInterval(function() {
        if (checkAuth()) {
          clearInterval(interval);
        }
      }, 500);

      // Override localStorage.setItem to catch it instantly
      var originalSetItem = localStorage.setItem;
      localStorage.setItem = function(key, value) {
        originalSetItem.apply(this, arguments);
        if (key === 'token' || key === 'user' || key === 'isAuthenticated') {
          checkAuth();
        }
      };
    })();
    true;
  `;

  const handleMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data && data.type === 'AUTH_SUCCESS' && !handledAuthRef.current) {
        handledAuthRef.current = true;
        const { user, token, isVerified, tutorApplicationRequired } = data;
        
        // Save the authenticated user in the store
        await loginStore(user, token, isVerified, tutorApplicationRequired);
        setSuccessUser(user);
      }
    } catch (err) {
      console.warn("Failed to parse message from WebView:", err);
    }
  };

  const handleNavigationStateChange = (navState) => {
    const url = navState.url;
    // Exit webview if user goes back to the landing page and is not logged in
    if (url && !url.includes('/auth') && !isAuthenticated) {
      router.replace('/(tabs)/home');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Premium Native Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.replace('/(tabs)/home')}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sign In</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.webviewContainer}>
        <WebView
          source={{ uri: `https://home-tutor-production.up.railway.app/auth?mode=login&role=${params.role || 'student'}&sessionReset=${authSessionKey}` }}
          injectedJavaScript={injectedJS}
          injectedJavaScriptBeforeContentLoaded={injectedJS}
          onMessage={handleMessage}
          onNavigationStateChange={handleNavigationStateChange}

          style={{ flex: 1 }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          incognito={true}
          cacheEnabled={false}
          sharedCookiesEnabled={false}
          thirdPartyCookiesEnabled={false}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          )}
        />
      </View>
      <AuthSuccessModal
        visible={!!successUser}
        title="Sign In Successful"
        message={`Welcome back, ${successUser?.fullName || successUser?.name || 'there'}`}
        onClose={() => {
          setSuccessUser(null);
          router.replace('/(tabs)/home');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  webviewContainer: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
