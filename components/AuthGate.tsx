import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { clearLocalAuthData } from '@/utils/auth';
import CosmicBackground from './CosmicBackground';

type Props = {
  children: React.ReactNode;
};

// Routes that should be visible even when the user is NOT signed in
const PUBLIC_ROUTES = [
  '/',                     // homepage
  '/auth/welcome',         // auth welcome (if used)
  '/settings/welcome',     // settings welcome (if hit directly)
  '/auth/login',           // login
  '/auth/signup',          // signup
  '/auth/forgot-password',
  '/password-reset',
  '/(tabs)/find-cusp',     // cusp calculator
];

function isPublicRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  // Strip query params like ?foo=bar
  const clean = pathname.split('?')[0];
  return PUBLIC_ROUTES.includes(clean);
}

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
          pathname,
        });

        // No session
        if (!session) {
          // Public route - allow
          if (isPublicRoute(pathname)) {
            console.log('ℹ️ [AuthGate] Public route with no session - allow');
            setReady(true);
            return;
          }

          // Protected route - send to login
          if (!routedRef.current) {
            console.log('➡️ [AuthGate] No session on protected route, redirecting to /auth/login');
            routedRef.current = true;
            router.replace('/auth/login');
          }

          setReady(true);
          return;
        }

        // We have a session - allow
        setReady(true);
      } catch (error) {
        console.error('❌ [AuthGate] Error checking session:', error);
        clearLocalAuthData();

        if (!mounted) return;

        // On error, allow public routes, redirect protected
        if (isPublicRoute(pathname)) {
          console.log('ℹ️ [AuthGate] Error but route is public - allow');
          setReady(true);
        } else {
          setReady(true);
          if (!routedRef.current) {
            console.log('➡️ [AuthGate] Error on protected route, redirecting to /auth/login');
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

        console.log('🔄 [AuthGate] Auth state change:', event, !!session?.user, 'on', pathname);

        if (event === 'SIGNED_IN' && session?.user && !routedRef.current) {
          // After sign-in, always land on Daily tab
          console.log('✅ [AuthGate] Signed in - routing to Daily');
          routedRef.current = true;
          router.replace('/(tabs)/astrology');
        }

        if (event === 'SIGNED_OUT' && !routedRef.current) {
          if (!isPublicRoute(pathname)) {
            console.log('ℹ️ [AuthGate] Signed out on protected route - go to login');
            routedRef.current = true;
            router.replace('/auth/login');
          } else {
            console.log('ℹ️ [AuthGate] Signed out on public route - stay');
          }
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
