import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { clearLocalAuthData } from '@/utils/auth';
import CosmicBackground from './CosmicBackground';

type Props = {
  children: React.ReactNode;
};

export default function AuthGate({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const routedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        console.log('🔍 [AuthGate] Checking existing session...');

        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        console.log('🔍 [AuthGate] Session check result:', {
          hasSession: !!session,
          email: session?.user?.email,
        });

        if (!session) {
          // No session at all → go to login
          if (!routedRef.current && pathname !== '/auth/login') {
            routedRef.current = true;
            router.replace('/auth/login');
          }
        }

        setReady(true);
      } catch (error) {
        console.error('❌ [AuthGate] Error checking session:', error);
        clearLocalAuthData();
        if (mounted) {
          setReady(true);
          if (!routedRef.current) {
            routedRef.current = true;
            router.replace('/auth/login');
          }
        }
      }
    };

    initAuth();

    const { data } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('🔄 [AuthGate] Auth state change:', event, !!session?.user);

        if (event === 'SIGNED_IN' && session?.user && !routedRef.current) {
          // Always land on Daily after sign in
          console.log('✅ [AuthGate] Signed in – routing to Daily');
          routedRef.current = true;
          router.replace('/(tabs)/astrology');
        }

        if (event === 'SIGNED_OUT' && !routedRef.current) {
          console.log('ℹ️ [AuthGate] User signed out, redirecting to login');
          routedRef.current = true;
          router.replace('/auth/login');
        }

        if (event === 'PASSWORD_RECOVERY' && !routedRef.current) {
          console.log('🔑 [AuthGate] Password recovery detected');
          routedRef.current = true;
          router.replace('/password-reset');
        }
      }
    );

    return () => {
      mounted = false;
      data.subscription?.unsubscribe();
    };
  }, [router, pathname]);

  if (!ready) {
    return (
      <View style={styles.container}>
        <CosmicBackground />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#d4af37" />
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
