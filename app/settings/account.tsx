// app/settings/account.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { User, Crown, ArrowLeft } from 'lucide-react-native';

import CosmicBackground from '@/components/CosmicBackground';
import { getCurrentUser, signOut } from '@/utils/auth';
import { clearUserData } from '@/utils/userData';
import { openStripePortal } from '@/utils/billing';

export default function AccountScreen() {
  const [email, setEmail] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getCurrentUser();
        setEmail(user?.email ?? null);
      } catch (error) {
        console.error('[account] Failed to load user:', error);
      }
    };
    loadUser();
  }, []);

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/settings');
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearUserData();
            await signOut();
          } catch (err) {
            console.error('[account] Sign out error:', err);
          } finally {
            router.replace('/auth/login');
          }
        },
      },
    ]);
  };

  const handleManageSubscription = async () => {
    try {
      console.log('[account] Manage subscription pressed');
      setLoadingPortal(true);
      await openStripePortal(); // uses returnUrl = SITE_URL + '/'
    } catch (error: any) {
      console.error('[account] openStripePortal error:', error);
      Alert.alert(
        'Billing Portal',
        error?.message || 'Failed to open billing portal',
      );
    } finally {
      setLoadingPortal(false);
    }
  };

  return (
    <View style={styles.container}>
      <CosmicBackground />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
              <ArrowLeft size={24} color="#8b9dc3" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Account</Text>
            <Text style={styles.subtitle}>
              View your profile and manage access
            </Text>

            {/* Profile card */}
            <LinearGradient
              colors={['rgba(139, 157, 195, 0.2)', 'rgba(139, 157, 195, 0.1)']}
              style={styles.card}
            >
              <User size={28} color="#8b9dc3" />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Signed in as</Text>
                <Text style={styles.cardEmail}>
                  {email || 'Loading email...'}
                </Text>
              </View>
            </LinearGradient>

            {/* Manage subscription */}
            <LinearGradient
              colors={['rgba(212, 175, 55, 0.2)', 'rgba(212, 175, 55, 0.1)']}
              style={styles.card}
            >
              <Crown size={28} color="#d4af37" />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Manage subscription</Text>
                <Text style={styles.cardDescription}>
                  Open the Stripe billing portal to update your plan, payment
                  details or cancel.
                </Text>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleManageSubscription}
                  disabled={loadingPortal}
                >
                  <Text style={styles.primaryButtonText}>
                    {loadingPortal ? 'Opening portal...' : 'Open billing portal'}
                  </Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Sign out */}
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
            >
              <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  content: { flex: 1, paddingTop: 60 },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  backText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#8b9dc3',
    marginLeft: 8,
  },

  title: {
    fontSize: 36,
    fontFamily: 'Vazirmatn-Bold',
    color: '#e8e8e8',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#8b9dc3',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 157, 195, 0.3)',
    marginBottom: 20,
  },
  cardContent: { marginLeft: 16, flex: 1 },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#e8e8e8',
    marginBottom: 4,
  },
  cardEmail: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#e8e8e8',
  },
  cardDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8b9dc3',
    marginTop: 4,
    lineHeight: 20,
  },

  primaryButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#d4af37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1a1a2e',
  },

  signOutButton: {
    marginTop: 20,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#f87171',
  },
  signOutText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#f87171',
  },
});
