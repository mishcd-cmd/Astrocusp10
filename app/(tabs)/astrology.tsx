// app/(tabs)/astrology.tsx
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
import { Star, Moon, Crown, Telescope, Gem, Sparkles } from 'lucide-react-native';

import CosmicBackground from '../../components/CosmicBackground';
import CosmicButton from '../../components/CosmicButton';
import MysticMish from '../../components/MysticMish';
import HoroscopeHeader from '../../components/HoroscopeHeader';

import { getUserData, type UserProfile } from '../../utils/userData';
import { getSubscriptionStatus } from '../../utils/billing';
import { getAccessibleHoroscope as getDailyAccessible } from '../../utils/daily';

import {
  getHemisphereEvents,
  getCurrentPlanetaryPositionsEnhanced,
  getVisibleConstellationsEnhanced,
} from '../../utils/astronomy';
import { getLunarNow } from '../../utils/lunar';
import { getCuspGemstoneAndRitual } from '../../utils/cuspData';
import { translateText, getUserLanguage, type SupportedLanguage } from '../../utils/translation';
import { useHemisphere } from '../../providers/HemisphereProvider';
import HemisphereToggle from '../../components/HemisphereToggle';
import { getAstrologicalHouse } from '../../utils/zodiacData';

/* -------------------------
 * Safe helpers
 * ------------------------- */
function asString(v: any): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}
function stripVersionSuffix(v?: string) {
  return asString(v).replace(/\s*V\d+\s*$/i, '').trim();
}

/* -------------------------
 * CUSP BIRTHSTONE FIX (KEY)
 * ------------------------- */
function getCuspLabelFromUser(user: UserProfile | null): string | null {
  const cr: any = user?.cuspResult;
  if (!cr) return null;

  if (typeof cr.cuspName === 'string' && cr.cuspName.trim()) {
    return cr.cuspName.trim();
  }

  if (typeof cr.primarySign === 'string' && typeof cr.secondarySign === 'string') {
    return `${cr.primarySign}–${cr.secondarySign}`;
  }

  return null;
}

function normaliseCuspLabel(label: string): string {
  return label
    .replace(/[—–-]/g, '–')
    .replace(/\s*Cusp\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getCuspGemstoneFromUser(user: UserProfile | null) {
  const raw = getCuspLabelFromUser(user);
  if (!raw) return null;

  const normalised = normaliseCuspLabel(raw);

  const candidates = [
    raw,
    normalised,
    normalised.replace(/[–]/g, '-'),
  ];

  for (const c of candidates) {
    const hit = getCuspGemstoneAndRitual(c);
    if (hit?.gemstone) return hit;
  }

  return null;
}

/* -------------------------
 * Date helpers
 * ------------------------- */
function getUTCMidnightForLocalDay(d = new Date()) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}
function msUntilNextLocalMidnight(now = new Date()) {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

/* -------------------------
 * Screen
 * ------------------------- */
export default function AstrologyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sign?: string; hemisphere?: string }>();
  const { hemisphere: contextHemisphere } = useHemisphere();

  const initOnce = useRef(false);
  const inFlight = useRef(false);
  const lastSubCheck = useRef(0);

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
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en');
  const [translatedContent, setTranslatedContent] = useState<any>({});
  const [dayTick, setDayTick] = useState(0);

  const resolvedHemisphere = useMemo<'Northern' | 'Southern'>(() => {
    const p = asString(params.hemisphere);
    if (p) return decodeURIComponent(p) as any;
    return contextHemisphere || (user?.hemisphere as any) || 'Northern';
  }, [params.hemisphere, contextHemisphere, user]);

  const serviceDateUTC = useMemo(() => getUTCMidnightForLocalDay(), [dayTick]);

  useEffect(() => {
    const t = setTimeout(() => setDayTick((x) => x + 1), msUntilNextLocalMidnight() + 1000);
    return () => clearTimeout(t);
  }, [dayTick]);

  useEffect(() => {
    if (initOnce.current) return;
    initOnce.current = true;

    (async () => {
      try {
        const u = await getUserData();
        setUser(u);

        const sub = await getSubscriptionStatus();
        setHasAccess(!!sub?.active);

        const dailyUser = {
          ...u,
          hemisphere: resolvedHemisphere,
          preferred_sign: u?.cuspResult?.isOnCusp ? u.cuspResult.cuspName : u?.cuspResult?.primarySign,
        };

        const d = await getDailyAccessible(dailyUser, { useCache: true });
        setDaily(d);

        setMoonPhase(getLunarNow(resolvedHemisphere));
        setAstronomicalEvents(getHemisphereEvents(resolvedHemisphere));
        setPlanetaryPositions(await getCurrentPlanetaryPositionsEnhanced(resolvedHemisphere));
        setVisibleConstellations(await getVisibleConstellationsEnhanced(resolvedHemisphere));

        setCurrentLanguage(await getUserLanguage());
        setReady(true);
      } catch (e: any) {
        setError(e?.message || 'Failed to load horoscope.');
      } finally {
        setLoading(false);
      }
    })();
  }, [resolvedHemisphere, serviceDateUTC]);

  if (!ready || loading) {
    return (
      <View style={styles.container}>
        <CosmicBackground />
        <SafeAreaView style={styles.safeArea}>
          <ActivityIndicator size="large" color="#d4af37" />
        </SafeAreaView>
      </View>
    );
  }

  const cuspGemstone = hasAccess ? getCuspGemstoneFromUser(user) : null;

  return (
    <View style={styles.container}>
      <CosmicBackground />
      <MysticMish hemisphere={resolvedHemisphere} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>

          <HoroscopeHeader signLabel={user?.cuspResult?.cuspName || user?.cuspResult?.primarySign || ''} />
          <HemisphereToggle />

          {daily?.daily && (
            <LinearGradient colors={['rgba(139,157,195,0.2)','rgba(139,157,195,0.1)']} style={styles.horoscopeCard}>
              <Text style={styles.horoscopeText}>{daily.daily}</Text>
            </LinearGradient>
          )}

          {hasAccess && cuspGemstone && (
            <LinearGradient colors={['rgba(212,175,55,0.15)','rgba(139,157,195,0.1)']} style={styles.gemstoneCard}>
              <Text style={styles.gemstoneName}>{cuspGemstone.gemstone}</Text>
              <Text style={styles.gemstoneMeaning}>{cuspGemstone.meaning}</Text>
            </LinearGradient>
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* -------------------------
 * Styles (unchanged visuals)
 * ------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 40 },
  horoscopeCard: { borderRadius: 16, padding: 20, marginBottom: 20 },
  horoscopeText: { fontSize: 18, color: '#e8e8e8', textAlign: 'center' },
  gemstoneCard: { borderRadius: 16, padding: 20, marginBottom: 20 },
  gemstoneName: { fontSize: 18, fontWeight: '700', color: '#d4af37', textAlign: 'center' },
  gemstoneMeaning: { fontSize: 14, color: '#e8e8e8', textAlign: 'center' },
});
