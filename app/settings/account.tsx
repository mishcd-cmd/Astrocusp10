// project 10/app/settings/account.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { User, LogOut, Crown, CreditCard, Pencil, User as User2, Calendar, Clock, MapPin, Star } from 'lucide-react-native';
import { ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import CosmicBackground from '@/components/CosmicBackground';

import { supabase } from '@/utils/supabase';
import { getSubscriptionStatus } from '@/utils/billing';
import { getCurrentUser } from '@/utils/auth';
import { getCosmicProfile, type CosmicProfile } from '@/utils/userProfile';
import { openBillingPortal } from '@/utils/openBillingPortal';

type SubStatus = {
  active: boolean;
  plan?: 'monthly' | 'yearly';
  renewsAt?: string;
  customerId?: string;
  price_id?: string;
  status?: string;
} | null;

export default function AccountDetailsScreen() {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState<string>('');
  const [subStatus, setSubStatus] = useState<SubStatus>(null);
  const [profile, setProfile] = useState<CosmicProfile>({});
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const user = await getCurrentUser();
        if (user?.email) {
          setAuthed(true);
          setEmail(user.email);

          // Fetch subscription status
          try {
            const s = await getSubscriptionStatus();
            setSubStatus(s);
          } catch (e) {
            console.error('[account] subscription check error', e);
            setSubStatus({ active: false });
          }

          // Fetch cosmic profile
          try {
            const cosmicProfile = await getCosmicProfile();
            setProfile(cosmicProfile || {});
          } catch (profileError) {
            console.error('❌ [account] profile load error', profileError);
            setProfile({});
          }
        } else {
          setAuthed(false);
        }
      } catch (e) {
        console.error('[account] load error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const goLogin = () => router.push('/auth/login');
  const goEditCosmicProfile = () => router.push('/settings/edit-profile');

  const onOpenBillingPortal = async () => {
    try {
      setPortalLoading(true);
      await openBillingPortal(); // unified helper uses Supabase JWT with credentials: 'omit'
    } catch (e: any) {
      console.error('[account] openBillingPortal error', e);
      Alert.alert('Billing Portal', e?.message || 'Failed to open billing portal.');
    } finally {
      setPortalLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/auth/login');
    } catch (e) {
      console.error('[signout] error', e);
      Alert.alert('Sign out error', 'Please try again.');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString || dateString === '1900-01-01' || dateString === '' || dateString === 'Invalid Date') {
      return '—';
    }
    try {
      if (dateString.includes('/')) {
        const [day, month, year] = dateString.split('/');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('en-GB', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
      return dateString;
    } catch {
      return '—';
    }
  };

  const displayValue = (value?: string | null, placeholder = '—') => {
    if (!value || `${value}`.trim() === '' || value === 'Unknown') return placeholder;
    return `${value}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <CosmicBackground />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#d4af37" />
          <Text style={styles.loadingText}>Loading account…</Text>
        </View>
      </View>
    );
  }

  const readableZodiac =
    profile?.zodiacResult?.cuspName ||
    profile?.zodiacResult?.primarySign ||
    'Not calculated yet';

  const subActive = !!subStatus?.active;

  return (
    <View style={styles.container}>
      <CosmicBackground />
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft size={24} color="#8b9dc3" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Account Details</Text>

        {authed ? (
          <LinearGradient colors={['rgba(212, 175, 55, 0.15)', 'rgba(212, 175, 55, 0.05)']} style={styles.card}>
            <View style={styles.row}>
              <User size={20} color="#d4af37" />
              <Text style={styles.cardTitle}>Logged in</Text>
            </View>
            <Text style={styles.body}>
              Email: <Text style={styles.accent}>{email}</Text>
            </Text>
          </LinearGradient>
        ) : (
          <LinearGradient colors={['rgba(139, 157, 195, 0.15)', 'rgba(139, 157, 195, 0.05)']} style={styles.card}>
            <View style={styles.row}>
              <User size={20} color="#8b9dc3" />
              <Text style={styles.cardTitle}>You are not logged in</Text>
            </View>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={goLogin}>
              <Text style={styles.btnTextDark}>Sign In</Text>
            </TouchableOpacity>
          </LinearGradient>
        )}

        <LinearGradient colors={['rgba(139, 157, 195, 0.15)', 'rgba(139, 157, 195, 0.05)']} style={styles.card}>
          <View style={styles.row}>
            <User2 size={20} color="#8b9dc3" />
            <Text style={styles.cardTitle}>Cosmic Profile</Text>
          </View>

          <View style={styles.profileDetails}>
            <View style={styles.profileRow}>
              <Calendar size={16} color="#8b9dc3" />
              <View style={styles.profileContent}>
                <Text style={styles.profileLabel}>Birth Date</Text>
                <Text style={styles.profileValue}>{formatDate(displayValue(profile.birthDate))}</Text>
              </View>
            </View>

            <View style={styles.profileRow}>
              <Clock size={16} color="#8b9dc3" />
              <View style={styles.profileContent}>
                <Text style={styles.profileLabel}>Birth Time</Text>
                <Text style={styles.profileValue}>{displayValue(profile.birthTime)}</Text>
              </View>
            </View>

            <View style={styles.profileRow}>
              <MapPin size={16} color="#8b9dc3" />
              <View style={styles.profileContent}>
                <Text style={styles.profileLabel}>Birth Location</Text>
                <Text style={styles.profileValue}>{displayValue(profile.birthCity)}</Text>
              </View>
            </View>

            <View style={styles.profileRow}>
              <Star size={16} color="#d4af37" />
              <View style={styles.profileContent}>
                <Text style={styles.profileLabel}>Cosmic Position</Text>
                <Text style={styles.profileValue}>{displayValue(readableZodiac, 'Not calculated yet')}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={goEditCosmicProfile}>
            <Pencil size={16} color="#d4af37" />
            <Text style={styles.btnText}>Edit Cosmic Profile</Text>
          </TouchableOpacity>
        </LinearGradient>

        <LinearGradient colors={['rgba(212, 175, 55, 0.15)', 'rgba(212, 175, 55, 0.05)']} style={styles.card}>
          <View style={styles.row}>
            <Crown size={20} color="#d4af37" />
            <Text style={styles.cardTitle}>Subscription</Text>
          </View>

          {subActive ? (
            <>
              <Text style={styles.body}>
                Status: <Text style={styles.good}>Active</Text>
              </Text>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary, portalLoading && { opacity: 0.6 }]}
                onPress={onOpenBillingPortal}
                disabled={portalLoading}
              >
                <CreditCard size={16} color="#1a1a2e" />
                <Text style={styles.btnTextDark}>{portalLoading ? 'Opening…' : 'Manage Subscription'}</Text>
              </TouchableOpacity>
            </>
          ) : subActive === false ? (
            <>
              <Text style={styles.body}>
                Status: <Text style={styles.bad}>Inactive</Text>
              </Text>
              <TouchableOpacity
                style={[styles.btn, styles.btnOutline]}
                onPress={() => router.push('/subscription')}
              >
                <Crown size={16} color="#d4af37" />
                <Text style={styles.btnText}>View Subscription Options</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.body}>
              Status: <Text style={styles.dim}>Checking...</Text>
            </Text>
          )}
        </LinearGradient>

        {authed && (
          <LinearGradient colors={['rgba(220, 38, 38, 0.15)', 'rgba(220, 38, 38, 0.05)']} style={styles.card}>
            <View style={styles.row}>
              <LogOut size={20} color="#f87171" />
              <Text style={[styles.cardTitle, styles.signOutTitle]}>Sign Out</Text>
            </View>
            <Text style={styles.body}>
              You will be signed out but your sign and hemisphere preferences stay saved on this device.
            </Text>
            <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={signOut}>
              <Text style={styles.btnTextLight}>Sign Out</Text>
            </TouchableOpacity>
          </LinearGradient>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, gap: 20, paddingTop: 20 },
  backButton: { flexDirection: 'row', alignItems: 'center', paddingTop: 20, paddingBottom: 10, paddingHorizontal: 24 },
  backText: { fontSize: 18, fontFamily: 'Inter-Medium', color: '#8b9dc3', marginLeft: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { fontSize: 18, fontFamily: 'Inter-Regular', color: '#8b9dc3', marginTop: 12 },
  title: { fontSize: 36, color: '#e8e8e8', fontFamily: 'PlayfairDisplay-Bold', textAlign: 'center', marginBottom: 16, letterSpacing: 1 },
  card: { padding: 20, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.2)', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontSize: 20, color: '#e8e8e8', fontFamily: 'Inter-SemiBold' },
  body: { fontSize: 17, color: '#c0c0c0', fontFamily: 'Inter-Regular', lineHeight: 22 },
  accent: { color: '#d4af37', fontFamily: 'Inter-SemiBold' },
  good: { color: '#4ade80', fontFamily: 'Inter-SemiBold' },
  bad: { color: '#f87171', fontFamily: 'Inter-SemiBold' },
  dim: { color: '#9ca3af', fontFamily: 'Inter-Regular' },
  profileDetails: { gap: 12, marginVertical: 8 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileContent: { flex: 1 },
  profileLabel: { fontSize: 14, fontFamily: 'Inter-Medium', color: '#8b9dc3', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1 },
  profileValue: { fontSize: 18, fontFamily: 'Inter-Regular', color: '#e8e8e8' },
  btn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 12, minHeight: 44, flexDirection: 'row', gap: 8 },
  btnPrimary: { backgroundColor: '#d4af37' },
  btnDanger: { backgroundColor: '#dc2626' },
  btnOutline: { borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.5)', backgroundColor: 'rgba(212, 175, 55, 0.1)' },
  btnText: { color: '#d4af37', fontFamily: 'Inter-SemiBold', fontSize: 17 },
  btnTextDark: { color: '#1a1a2e', fontFamily: 'Inter-SemiBold', fontSize: 17 },
  btnTextLight: { color: '#ffffff', fontFamily: 'Inter-SemiBold', fontSize: 17 },
  rowBtns: { flexDirection: 'row', gap: 12, marginTop: 12 },
  signOutTitle: { color: '#f87171' },
});
