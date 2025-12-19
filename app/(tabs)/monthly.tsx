// app/(tabs)/monthly.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import RenderHTML from 'react-native-render-html';

import CosmicBackground from '@/components/CosmicBackground';
import CosmicButton from '@/components/CosmicButton';
import { getUserData, type UserProfile } from '@/utils/userData';
import { getLatestForecast } from '@/utils/forecasts';
import { getSubscriptionStatus } from '@/utils/billing';

/* -------------------------
 * Helpers
 * ------------------------- */
function asString(v: any): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

/**
 * Convert any input into a DB-safe slug:
 * - "Aries–Taurus" -> "aries-taurus"
 * - "Aries_Taurus" -> "aries-taurus"
 * - "Aries Taurus" -> "aries-taurus"
 * - "Cusp of Power" -> "cusp-of-power" (we will NOT use this for DB)
 */
function toSlug(input: string): string {
  return asString(input)
    .trim()
    .toLowerCase()
    .replace(/\s*cusp\s*$/i, '')
    .replace(/[–—_]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\-+|\-+$/g, '');
}

function titleCaseWord(w: string) {
  if (!w) return w;
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

function slugToDisplay(slug: string) {
  const parts = asString(slug).split('-').filter(Boolean);
  if (parts.length === 2) {
    return `${titleCaseWord(parts[0])}-${titleCaseWord(parts[1])}`;
  }
  if (parts.length === 1) return titleCaseWord(parts[0]);
  return slug;
}

const ZODIAC_ORDER = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

function zodiacIndex(signSlug: string): number {
  const s = asString(signSlug).trim().toLowerCase();
  const idx = ZODIAC_ORDER.indexOf(s);
  return idx === -1 ? 999 : idx;
}

function isSingleZodiacSignSlug(slug: string): boolean {
  const s = asString(slug).trim().toLowerCase();
  return ZODIAC_ORDER.includes(s);
}

/**
 * ✅ IMPORTANT FIX
 * Always order cusp slugs to match DB storage.
 * Example: if user data gives Taurus + Aries, DB still stores aries-taurus
 */
function buildOrderedCuspSlug(primaryRaw: string, secondaryRaw: string): string {
  const a = toSlug(primaryRaw);
  const b = toSlug(secondaryRaw);

  if (!a || !b) return '';
  if (!isSingleZodiacSignSlug(a) || !isSingleZodiacSignSlug(b)) return '';
  if (a === b) return a;

  const first = zodiacIndex(a) <= zodiacIndex(b) ? a : b;
  const second = first === a ? b : a;

  return `${first}-${second}`; // aries-taurus
}

/**
 * ✅ FORCE CUSP RESOLUTION
 *
 * DB wants:
 *   "aries-taurus"
 *
 * DB does NOT want:
 *   "cusp-of-power"
 *
 * So we ALWAYS derive the DB slug from primarySign + secondarySign (ordered).
 * cuspName is only used for display, never for DB query.
 */
function resolveForcedCusp(u: UserProfile | null): { slug: string; display: string } | null {
  if (!u) return null;

  const primaryRaw = asString(u.cuspResult?.primarySign).trim();
  const secondaryRaw = asString((u as any)?.cuspResult?.secondarySign).trim();

  // 1) Proper cusp from primary + secondary (ordered to match DB)
  const cuspSlug = buildOrderedCuspSlug(primaryRaw, secondaryRaw);
  if (cuspSlug.includes('-')) {
    return { slug: cuspSlug, display: slugToDisplay(cuspSlug) };
  }

  // 2) If only one sign, still valid DB key
  const primary = toSlug(primaryRaw);
  const secondary = toSlug(secondaryRaw);

  if (primary && isSingleZodiacSignSlug(primary)) return { slug: primary, display: slugToDisplay(primary) };
  if (secondary && isSingleZodiacSignSlug(secondary)) return { slug: secondary, display: slugToDisplay(secondary) };

  // 3) Last resort: try cuspName ONLY if it is literally "aries-taurus" style (not cusp-of-power)
  const cuspNameRaw = asString(u.cuspResult?.cuspName).trim();
  const cuspNameSlug = toSlug(cuspNameRaw);

  if (cuspNameSlug.includes('-')) {
    const parts = cuspNameSlug.split('-').filter(Boolean);
    if (parts.length === 2 && isSingleZodiacSignSlug(parts[0]) && isSingleZodiacSignSlug(parts[1])) {
      // Order it as well, just in case it came in reversed
      const ordered = buildOrderedCuspSlug(parts[0], parts[1]);
      return { slug: ordered || cuspNameSlug, display: slugToDisplay(ordered || cuspNameSlug) };
    }
  } else if (isSingleZodiacSignSlug(cuspNameSlug)) {
    return { slug: cuspNameSlug, display: slugToDisplay(cuspNameSlug) };
  }

  return null;
}

const isHtml = (s?: string | null) => !!s && /<\/?[a-z][\s\S]*>/i.test(s);

export default function MonthlyForecastScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [forecastText, setForecastText] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ sign?: string; hemisphere?: string; date?: string } | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    setForecastText(null);

    try {
      const u = await getUserData();
      if (!u) throw new Error('No user profile');

      setUser(u);

      const sub = await getSubscriptionStatus();
      const active = !!sub?.active;
      setHasAccess(active);

      const hemisphere = asString(u.hemisphere).trim();
      if (!hemisphere) throw new Error('Missing hemisphere');

      const cusp = resolveForcedCusp(u);
      if (!cusp) throw new Error('Unable to resolve sign');

      // Set header immediately
      setMeta({
        sign: cusp.display,
        hemisphere,
        date: new Date().toISOString().slice(0, 10),
      });

      if (!active) return;

      console.log('[monthly] QUERY', {
        slug: cusp.slug,
        hemisphere,
        primary: u?.cuspResult?.primarySign,
        secondary: (u as any)?.cuspResult?.secondarySign,
        cuspName: u?.cuspResult?.cuspName,
      });

      const res = await getLatestForecast(cusp.slug, hemisphere);

      if (res.ok && res.row?.monthly_forecast) {
        console.log('[monthly] HIT', { rowSign: res.row.sign, rowDate: res.row.date });
        setForecastText(res.row.monthly_forecast);
      } else {
        throw new Error(`No monthly forecast found for ${cusp.slug}`);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load monthly forecast');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <CosmicBackground />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#d4af37" />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const monthLabel = meta?.date
    ? new Date(meta.date).toLocaleDateString('en-AU', { year: 'numeric', month: 'long' })
    : '';

  return (
    <View style={styles.container}>
      <CosmicBackground />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d4af37" />}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
            <ArrowLeft size={20} color="#8b9dc3" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Monthly Forecast</Text>
          <Text style={styles.subtitle}>
            {meta?.sign || 'Your Sign'} • {monthLabel}
          </Text>

          <LinearGradient
            colors={['rgba(212,175,55,0.18)', 'rgba(139,157,195,0.1)']}
            style={styles.card}
          >
            {!hasAccess ? (
              <CosmicButton title="Upgrade to unlock" onPress={() => router.push('/subscription')} />
            ) : error ? (
              <Text style={styles.error}>{error}</Text>
            ) : forecastText ? (
              isHtml(forecastText) ? (
                <RenderHTML contentWidth={width - 40} source={{ html: forecastText }} />
              ) : (
                <Text style={styles.text}>{forecastText}</Text>
              )
            ) : (
              <Text style={styles.error}>No forecast available.</Text>
            )}
          </LinearGradient>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  safeArea: { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  loadingText: { color: '#8b9dc3', marginTop: 10 },

  backRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  backText: { color: '#8b9dc3', marginLeft: 8 },

  title: { fontSize: 26, color: '#e8e8e8', textAlign: 'center', marginTop: 12 },
  subtitle: { color: '#8b9dc3', textAlign: 'center', marginBottom: 16 },

  card: { marginHorizontal: 20, padding: 20, borderRadius: 16 },
  text: { color: '#e8e8e8', fontSize: 16, lineHeight: 26 },
  error: { color: '#ff6b6b', textAlign: 'center' },
});
