import { useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import api from '../services/api';
import { useAppSelector } from './useRedux';

export const useNotifications = () => {
  const { isAuthenticated, accessToken } = useAppSelector(state => state.auth);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const requestUserPermission = async () => {
      try {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          const token = await messaging().getToken();
          if (token) {
            await registerToken(token);
          }
        }
      } catch (e) {
        console.error('Failed to request permission / get token:', e);
      }
    };

    const registerToken = async (fcmToken: string) => {
      try {
        await api.post('/notifications/tokens', {
          token: fcmToken,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
        });
        console.log('Successfully registered device token to backend');
      } catch (e) {
        console.error('Failed to register device token to backend:', e);
      }
    };

    requestUserPermission();

    // Listen to token refresh
    const unsubscribeTokenRefresh = messaging().onTokenRefresh(token => {
      registerToken(token);
    });

    // Listen to foreground messages
    const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
      console.log('A new FCM message arrived in foreground!', remoteMessage);
      if (remoteMessage.notification) {
        Alert.alert(
          remoteMessage.notification.title || 'Notification',
          remoteMessage.notification.body || ''
        );
      }
    });

    return () => {
      unsubscribeTokenRefresh();
      unsubscribeOnMessage();
    };
  }, [isAuthenticated, accessToken]);
};
