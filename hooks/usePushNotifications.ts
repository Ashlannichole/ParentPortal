import { useState } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function usePushNotifications() {
  const { session } = useAuth();
  const [status, setStatus] = useState<'idle' | 'registering' | 'registered' | 'denied' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const register = async () => {
    setError(null);
    setStatus('registering');

    if (!Device.isDevice) {
      setStatus('error');
      setError('Push notifications require a physical device (not a simulator).');
      return;
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status: requested } = await Notifications.requestPermissionsAsync();
      finalStatus = requested;
    }

    if (finalStatus !== 'granted') {
      setStatus('denied');
      return;
    }

    try {
      const tokenResponse = await Notifications.getExpoPushTokenAsync();
      const expoPushToken = tokenResponse.data;

      if (session) {
        const { error: dbError } = await supabase
          .from('push_tokens')
          .upsert(
            { user_id: session.user.id, expo_push_token: expoPushToken, updated_at: new Date().toISOString() },
            { onConflict: 'expo_push_token' }
          );
        if (dbError) throw dbError;
      }

      setStatus('registered');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Could not register for push notifications.');
    }
  };

  return { status, error, register };
}
