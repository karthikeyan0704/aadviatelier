import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import axios from 'axios';
import { API_ENDPOINTS } from '../constants/ApiConfig';
let Notifications;
if (Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {
    console.log('expo-notifications could not be loaded.');
  }
}

async function registerForPushNotificationsAsync() {
  if (!Notifications) {
    return null;
  }
  let pushToken;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? "dummy-project-id";
      pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (e) {
      console.log('Push notifications are not supported in Expo Go for this SDK version. Please use a development build.');
    }
  }
  return pushToken;
}

function GlobalStatusBarBackground() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  if (insets.top === 0) return null;
  
  return (
    <View 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: insets.top,
        backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
        zIndex: 99999,
        elevation: 99999
      }} 
    />
  );
}

function RootLayoutNav() {
  const { token, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'login';

    if (!token && !inAuthGroup) {
      router.replace('/login');
    } else if (token && inAuthGroup) {
      router.replace('/(tabs)');
    }
    
    if (token) {
      registerForPushNotificationsAsync().then(pushToken => {
        if (pushToken) {
          axios.post(API_ENDPOINTS.LOGIN.replace('/login', '/push-token'), { token: pushToken }, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(console.log);
        }
      });
    }
  }, [token, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ animation: 'fade' }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="create-order/index" options={{ presentation: 'modal' }} />
      <Stack.Screen name="create-customer" options={{ presentation: 'modal' }} />
      <Stack.Screen name="add-staff" options={{ presentation: 'modal' }} />
      <Stack.Screen name="staff-list" />
      <Stack.Screen name="edit-staff" options={{ presentation: 'modal' }} />
      <Stack.Screen name="profile" />
      <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  return (
    <AuthProvider>
      <RootLayoutNav />
      <GlobalStatusBarBackground />
      <StatusBar 
        style={isDarkMode ? 'light' : 'dark'} 
        backgroundColor="transparent"
        translucent={true}
      />
    </AuthProvider>
  );
}
