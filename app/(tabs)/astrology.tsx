import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import {
  Star,
  Moon,
  Crown,
  Telescope,
  Gem,
  Sparkles,
} from 'lucide-react-native';

import CosmicBackground from '../../components/CosmicBackground';
import CosmicButton from '../../components/CosmicButton';
import MysticMish from '../../components/MysticMish';
import HoroscopeHeader from '../../components/HoroscopeHeader';
import HemisphereToggle from '../../components/HemisphereToggle';

import { getUserData, type UserProfile } from '../../utils/userData';
import { getSubscriptionStatus } from '../../utils/billing';
import { getAccessibleHoroscope as getDailyAccessible } from '../../utils/daily';
import {
  getHemisphereEvents,
  getCurrentPlanetaryPositionsEnhanced,
  getVisibleConstellationsEnhanced,
} from '../../utils/astronomy';
import { getLunarNow } from '../../utils/lunar';
import { getAstrologicalHouse } from '../../utils/zodiacData';
import { getBirthstoneForCusp } from '../../utils/birthstones';
import { useHemisphere } from '../../providers/HemisphereProvider';

/* -------------------------
 * helpers
 * ------------------------- */
function asString(v: any): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function isCuspLabel(label: string) {
  const s = label.toLowerCase();
  return s.includes('–') || s.includes('-') || s.includes('cusp');
}

function normaliseCusp(label: string) {
  return label
    .replace(/\s*cusp\s*$/i, '')
    .replace(/[—–]/g, '-')
    .trim();
}

function buildDailyUser(base: any, signLabel: string, hemi: 'Northern' | 'Southern') {
  const isCusp = isCuspLabel(signLabel);
  return {
    id: base?.id,
    email: base?.email,
    hemisphere: hemi,
    preferred_sign: signLabel,
    cuspResult: isCusp ? { cuspName: signLabel } : { primarySign: signLabel },
  };
}

/* -------------------------
 * component
 * ------------------------- */
export default function AstrologyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sign?: string; hemisphere?: string }>();
  const { hemisphere: contextHemisphere } = useHemisphere();

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  const [daily, setDaily] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [moonPhase, setMoonPhase] = useState<any>(null);
  const [astronomicalEvents, setAstronomicalEvents] = useState<any[]>([]);
  const [planetaryPositions, setPlanetaryPositions] = useState<any[]>([]);
  const [visibleConstellations, setVisibleConstellations] = useState<string[]>([]);

  const [cuspBirthstone, setCuspBirthstone] = useState<{
    gemstone: string;
    meaning: string;
  } | null>(null);

  const resolvedSign = useMemo(() => {
    if (params.sign) return decodeURIComponent(asString(params.sign));
    if (user?.cuspResult?.cuspName) return user.cuspResult.cuspName;
    if (user?.cuspResult?.primarySign) return user.cuspResult.primarySign;
    return '';
  }, [params.sign, user]);

  const resolvedHemisphere = useMemo<'Northern' | 'Southern'>(() => {
    if (params.hemisphere) return decodeURIComponent(asString(params.hemisphere)) as any;
    return contextHemisphere || (user?.hemisphere as any) || 'Northern';
  }, [params.hemisphere, contextHemisphere, user]);

  /* -------------------------
   * init
   * ------------------------- */
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setLoading(true);

        const u = await getUserData();
        if (cancelled) return;

        setUser(u);

        const sub = await getSubscriptionStatus();
        if (!cancelled) setHasAccess(!!sub?.active);

        if (!resolvedSign) {
          setError('No cosmic profile found. Please calculate your cosmic position.');
          setReady(true);
          return;
        }

        const dailyUser = buildDailyUser(u, resolvedSign, resolvedHemisphere);
        const d = await getDailyAccessible(dailyUser, { useCache: true });
        setDaily(d);

        setMoonPhase(getLunarNow(resolvedHemisphere));
        setAstronomicalEvents(getHemisphereEvents(resolvedHemisphere));
        setPlanetaryPositions(await getCurrentPlanetaryPositionsEnhanced(resolvedHemisphere));
        setVisibleConstellations(await getVisibleConstellationsEnhanced(resolvedHemisphere));

        setReady(true);
      } catch (e: any) {
        setError(e?.message || 'Failed to load horoscope');
      } finally {
        setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [resolvedSign, resolvedHemisphere]);

  /* -------------------------
   * cusp birthstone resolver
   * ------------------------- */
  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      if (!hasAccess || !isCuspLabel(resolvedSign)) {
        setCuspBirthstone(null);
        return;
      }

      const key = normaliseCusp(resolvedSign);
      const data = await getBirthstoneForCusp(key);

      if (cancelled) return;

      if (data?.gemstone) {
        setCuspBirthstone({
          gemstone: data.gemstone,
          meaning: data.meaning || '',
        });
      } else {
        setCuspBirthstone(null);
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [resolvedSign, hasAccess]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const dailyUser = buildDailyUser(user, resolvedSign, resolvedHemisphere);
      const d = await getDailyAccessible(dailyUser, { useCache: false });
      setDaily(d);
    } finally {
      setRefreshing(false);
    }
  }, [user, resolvedSign, resolvedHemisphere]);

  if (!ready || loading) {
    return (
      <View style={styles.container}>
        <CosmicBackground />
        <SafeAreaView style={styles.center}>
          <ActivityIndicator size="large" color="#d4af37" />
        </SafeAreaView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <CosmicBackground />
        <SafeAreaView style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <CosmicButton title="Calculate Your Cusp" onPress={() => router.push('/(tabs)/find-cusp')} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CosmicBackground />
      <MysticMish hemisphere={resolvedHemisphere} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.scroll}
        >
          <HoroscopeHeader signLabel={resolvedSign} />
          <Text style={styles.hemi}>{resolvedHemisphere} Hemisphere</Text>
          <HemisphereToggle />

          {daily?.daily && (
            <LinearGradient colors={['rgba(139,157,195,0.2)', 'rgba(139,157,195,0.1)']} style={styles.card}>
              <Text style={styles.cardTitle}>Today's Guidance</Text>
              <Text style={styles.text}>{daily.daily}</Text>
            </LinearGradient>
          )}

          {hasAccess && cuspBirthstone && (
            <LinearGradient colors={['rgba(212,175,55,0.15)', 'rgba(139,157,195,0.1)']} style={styles.card}>
              <View style={styles.headerRow}>
                <Gem size={20} color="#d4af37" />
                <Text style={styles.cardTitle}>Your Cusp Birthstone</Text>
                <Crown size={12} color="#1a1a2e" />
              </View>
              <Text style={styles.gemstone}>{cuspBirthstone.gemstone}</Text>
              <Text style={styles.text}>{cuspBirthstone.meaning}</Text>
            </LinearGradient>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* -------------------------
 * styles
 * ------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#ff6b6b', fontSize: 16, marginBottom: 20, textAlign: 'center' },
  hemi: { textAlign: 'center', color: '#8b9dc3', marginBottom: 16 },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#e8e8e8', marginBottom: 8 },
  text: { color: '#e8e8e8', lineHeight: 22 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gemstone: { fontSize: 18, fontWeight: '800', color: '#d4af37', textAlign: 'center', marginBottom: 8 },
});
