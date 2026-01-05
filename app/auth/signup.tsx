import React, { useRef, useState } from 'react';
import {
  Platform,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'react-native';
import { supabase } from '@/utils/supabase';
import BirthdateField from '../../components/BirthdateField';
import { signUp } from '@/utils/auth';
import CosmicBackground from '../../components/CosmicBackground';
import CosmicButton from '../../components/CosmicButton';

// ✅ import the cache clearer we fixed earlier
import { clearUserData } from '@/utils/userData';

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [birthDateISO, setBirthDateISO] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  // ----------------------------
  // Helpers
  // ----------------------------
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const safeLocalStorageRemove = (key: string) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {}
  };

  const safeLocalStorageClearAstroKeys = () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const keys = Object.keys(window.localStorage);

        // Remove your known session key from logs
        const kill = new Set<string>([
          'astro-cusp-auth-session',
          '@astro_cusp_user_data',
          '@astro_cusp_last_auth_user_id',
        ]);

        // Remove any per-user cached profiles we introduced
        for (const k of keys) {
          if (k.startsWith('@astro_cusp_user_data:')) kill.add(k);
        }

        // Remove any email-scoped monthly caches too
        for (const k of keys) {
          if (k.toLowerCase().startsWith('@astro_cusp_monthly_')) kill.add(k);
        }

        kill.forEach((k) => window.localStorage.removeItem(k));
      }
    } catch {}
  };

  /**
   * Critical: ensure we are NOT carrying an old session into signup.
   * This is what was causing "new browser" to still see Mish profile.
   */
  const ensureNoActiveSession = async () => {
    try {
      console.log('🧼 [signup] Clearing local app caches (userData + auth keys)');

      // 1) Clear profile caches
      await clearUserData();

      // 2) Clear known web session/cache keys
      safeLocalStorageClearAstroKeys();

      // 3) Sign out of Supabase (global)
      console.log('🧼 [signup] Signing out any existing Supabase session');
      await supabase.auth.signOut({ scope: 'global' });

      // 4) Wait until getSession returns null
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          console.log(`✅ [signup] Session cleared after ${(i + 1) * 250}ms`);
          return;
        }
        await sleep(250);
      }

      console.warn('⚠️ [signup] Session still present after timeout, continuing anyway');
    } catch (e) {
      console.warn('⚠️ [signup] ensureNoActiveSession error:', e);
    }
  };

  /**
   * Wait until Supabase session user email matches the signup email.
   * If it never matches, we do NOT redirect (prevents leaking into Mish account).
   */
  const waitForSessionEmail = async (expectedEmail: string) => {
    for (let i = 0; i < 20; i++) {
      const { data } = await supabase.auth.getSession();
      const sessionEmail = data.session?.user?.email?.toLowerCase() || '';
      if (data.session && sessionEmail === expectedEmail.toLowerCase()) {
        console.log(`✅ [signup] Session email matches after ${(i + 1) * 250}ms`);
        return true;
      }
      await sleep(250);
    }
    return false;
  };

  const handlePasswordReset = async (emailAddress: string) => {
    try {
      console.log('[signup] Sending reset email to:', emailAddress);

      const origin =
        typeof window !== 'undefined' && window.location?.origin
          ? window.location.origin
          : 'https://www.astrocusp.com.au';

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(emailAddress, {
        redirectTo: `${origin}/auth/reset`,
      });

      if (resetError) {
        console.error('[signup] Reset failed:', resetError);
        Alert.alert('Reset Email Failed', `Unable to send reset email: ${resetError.message}`);
      } else {
        console.log('[signup] Reset email sent successfully to:', emailAddress);
        Alert.alert(
          'Check Your Email',
          `We've sent a password reset link to ${emailAddress}. Please check your email and follow the instructions.`,
          [{ text: 'OK', onPress: () => router.replace('/auth/login') }]
        );
      }
    } catch (e: any) {
      console.error('[signup] Reset email exception:', e);
      Alert.alert('Reset Email Error', `An unexpected error occurred: ${e.message}`);
    }
  };

  // ----------------------------
  // Signup
  // ----------------------------
  const handleSignup = async () => {
    if (submittingRef.current || isLoading) {
      console.log('🚫 [signup] Preventing duplicate submission');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !name.trim() || !pwd) {
      setError('Please enter your name, email and password');
      return;
    }
    if (pwd.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (pwd !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (!birthDateISO) {
      setError('Please enter your birth date');
      return;
    }

    setError(null);
    submittingRef.current = true;
    setIsLoading(true);

    try {
      console.log('🚀 [signup] Starting signup process for:', cleanEmail);

      // ✅ THIS IS THE FIX: purge any old session + caches before signup
      await ensureNoActiveSession();

      console.log('Attempting signup with:', cleanEmail);
      const { user, error } = await signUp(cleanEmail, pwd, name.trim(), birthDateISO || undefined);

      if (error) {
        console.error('Signup failed:', error);

        if (error.message.includes('User already registered') || error.message.includes('user_already_exists')) {
          Alert.alert(
            'Account Already Exists',
            `An account with this email already exists. This could mean:\n\n• You previously created an account\n• The account needs email verification\n• The account was created but not completed\n\nWould you like to try signing in instead?`,
            [
              { text: 'Try Sign In', onPress: () => router.push('/auth/login') },
              { text: 'Reset Password', onPress: () => handlePasswordReset(cleanEmail) },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        } else {
          setError(error.message);
        }
        return;
      }

      console.log('✅ Signup call returned user:', user?.email);

      // Ensure the session now belongs to the expected email
      console.log('⏳ [signup] Waiting for correct session user...');
      const ok = await waitForSessionEmail(cleanEmail);

      if (!ok) {
        console.error('❌ [signup] Session did not match expected email. Blocking redirect for safety.');
        setError(
          'We created your account, but the app session did not update correctly. Please close this tab, reopen, then sign in with your new email.'
        );
        return;
      }

      console.log('✅ [signup] Signup successful, redirecting to astrology');
      router.replace('/(tabs)/astrology');
    } finally {
      submittingRef.current = false;
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CosmicBackground />
      <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="always">
            <View style={styles.content}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('@/assets/images/icon.png')}
                  style={[styles.logo, styles.logoWithBackground]}
                  resizeMode="contain"
                />
              </View>

              <Text style={styles.title}>Astro Cusp</Text>
              <Text style={styles.subtitle}>Join the Cosmic Journey</Text>
              <Text style={styles.description}>Create your account to unlock personalized horoscopes</Text>

              <View style={styles.form}>
                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    nativeID="signup-email"
                    accessibilityLabel="Email"
                    autoComplete="email"
                    inputMode="email"
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="Enter your email"
                    placeholderTextColor="#8b9dc3"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    nativeID="signup-name"
                    accessibilityLabel="Name"
                    autoComplete="name"
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your name"
                    placeholderTextColor="#8b9dc3"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <BirthdateField initialISO={birthDateISO} onValidISO={setBirthDateISO} />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Password</Text>
                  <TextInput
                    nativeID="signup-password"
                    accessibilityLabel="Password"
                    autoComplete="new-password"
                    style={styles.input}
                    value={pwd}
                    onChangeText={setPwd}
                    secureTextEntry
                    placeholder="Enter your password (min 8 characters)"
                    placeholderTextColor="#8b9dc3"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <TextInput
                    nativeID="signup-confirm-password"
                    accessibilityLabel="Confirm Password"
                    autoComplete="new-password"
                    style={styles.input}
                    value={confirm}
                    onChangeText={setConfirm}
                    secureTextEntry
                    placeholder="Confirm your password"
                    placeholderTextColor="#8b9dc3"
                    onSubmitEditing={handleSignup}
                  />
                </View>

                <CosmicButton
                  title={isLoading ? 'Creating Account...' : 'Create Account'}
                  onPress={handleSignup}
                  disabled={isLoading}
                  style={styles.signupButton}
                />

                <Pressable style={styles.loginLink} onPress={() => router.push('/auth/login')}>
                  <Text style={styles.loginText}>
                    Already have an account? <Text style={styles.loginTextBold}>Sign in</Text>
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardAvoidingView: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24 },
  content: { flex: 1, justifyContent: 'center', paddingTop: 60 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 120, height: 120 },
  logoWithBackground: { backgroundColor: '#1a1a2e', borderRadius: 20, padding: 8 },
  title: {
    fontSize: 36,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#e8e8e8',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 22,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#d4af37',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#8b9dc3',
    textAlign: 'center',
    marginBottom: 40,
  },
  form: { gap: 20 },
  inputContainer: { gap: 8 },
  label: { fontSize: 18, fontFamily: 'Inter-Medium', color: '#e8e8e8' },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#e8e8e8',
    backgroundColor: 'rgba(26, 26, 46, 0.4)',
  },
  signupButton: { marginTop: 20 },
  loginLink: { alignItems: 'center', marginTop: 20 },
  loginText: { fontSize: 14, fontFamily: 'Inter-Regular', color: '#8b9dc3' },
  loginTextBold: { fontFamily: 'Inter-SemiBold', color: '#d4af37' },
  errorContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  errorText: { fontSize: 14, fontFamily: 'Inter-Medium', color: '#ff6b6b', textAlign: 'center' },
});
