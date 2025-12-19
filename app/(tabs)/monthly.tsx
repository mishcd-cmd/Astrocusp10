// app/(tabs)/monthly-forecast.tsx 
import React, { useEffect, useState, useMemo, useCallback } from 'react';
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

// Optional: symbol map if you want to show icons later
const ZODIAC_ICON: Record<string, string> = {
  Aries: '♈︎', Taurus: '♉︎', Gemini: '♊︎', Cancer: '♋︎',
  Leo: '♌︎', Virgo: '♍︎', Libra: '♎︎', Scorpio: '♏︎',
  Sagittarius: '♐︎', Capricorn: '♑︎', Aquarius: '♒︎', Pisces: '♓︎',
};

type Meta = {
  date?: string;
  hemisphere?: string;
  sign?: string;
} | null;

/* -------------------------
 * Helpers
 * ------------------------- */
function asString(v: any): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

const ZODIAC = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

function isCuspLabel(labelRaw: string): boolean {
  const s = asString(labelRaw).trim().toLowerCase();
  if (!s) return false;

  if (s.includes('cusp')) return true;

  const cleaned = s.replace(/[\s]/g, '');
  const hasSeparator = cleaned.includes('_') || cleaned.includes('-') || cleaned.includes('–');

  if (!hasSeparator) return false;

  let hits = 0;
  for (const z of ZODIAC) {
    if (s.includes(z)) hits += 1;
  }
  return hits >= 2;
}

function normaliseCuspLabelForLookup(labelRaw: string): string {
  let s = asString(labelRaw).trim();
  if (!s) return '';

  // Convert underscore to dash
  s = s.replace(/_/g, '-');

  // Normalise dash variants to hyphen first (includes em dash too, just for input tolerance)
  s = s.replace(/[—–]/g, '-');

  // Remove trailing cusp word
  s = s.replace(/\s*cusp\s*$/i, '').trim();

  // Collapse spaces
  s = s.replace(/\s+/g, ' ');

  // Tighten spaces around separators
  s = s.replace(/\s*-\s*/g, '-');

  return s;
}

function buildMonthlySignAttempts(u: UserProfile): string[] {
  const preferred = asString((u as any)?.preferred_sign).trim();
  const cuspName = asString(u?.cuspResult?.cuspName).trim();
  const primary = asString(u?.cuspResult?.primarySign).trim();
  const secondary = asString((u as any)?.cuspResult?.secondarySign).trim();

  const baseAttempts: string[] = [];

  // Prefer preferred_sign if it looks cusp-like
  if (preferred && isCuspLabel(preferred)) baseAttempts.push(preferred);

  // Then cuspName if present
  if (cuspName) baseAttempts.push(cuspName);

  // Then pure signs
  if (primary) baseAttempts.push(primary);
  if (secondary) baseAttempts.push(secondary);

  // Expand cusp variants for anything cusp-like
  const expanded: string[] = [];
  for (const a of baseAttempts) {
    const raw = asString(a).trim();
    if (!raw) continue;

    expanded.push(raw);

    if (isCuspLabel(raw)) {
      const base = normaliseCuspLabelForLookup(raw);

      // Try both hyphen and en dash versions, with and without " Cusp"
      const hyphen = base;                 // Aries-Taurus
      const enDash = base.replace(/-/g, '–'); // Aries–Taurus

      expanded.push(hyphen);
      expanded.push(`${hyphen} Cusp`);
      expanded.push(enDash);
      expanded.push(`${enDash} Cusp`);
    }
  }

  // De-dupe while preserving order
  return Array.from(new Set(expanded.filter(Boolean)));
}

function resolveHeaderSign(u: UserProfile | null): string | undefined {
  if (!u) return undefined;
  const preferred = asString((u as any)?.preferred_sign).trim();
  if (preferred) return preferred;
  return asString(u.cuspResult?.cuspName || u.cuspResult?.primarySign).trim() || undefined;
}

// Helper: is the forecast likely HTML?
const isHtml = (s?: string | null) =>
  !!s && /<\/?[a-z][\s\S]*>/i.test(s);

export default function MonthlyForecastScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forecastText, setForecastText] = useState<string | null>(null);
  const [meta, setMeta] = useState<Meta>(null);
  const [hasAccess, setHasAccess] = useState<boolean>(false);

  const resolvedSign = useMemo(() => resolveHeaderSign(user), [user]);

  const resolvedHemisphere = useMemo(() => {
    if (!user) return undefined;
    return user.hemisphere;
  }, [user]);

  const loadAll = useCallback(async () => {
    setError(null);
    setForecastText(null);
    setMeta(null);

    try {
      // 1) Load user
      const u = await getUserData();
      if (!u) {
        setError('No user profile found. Please calculate your cosmic position first.');
        return;
      }
      setUser(u);

      // 2) Subscription gate
      const subscriptionStatus = await getSubscriptionStatus();
      const active = !!subscriptionStatus?.active;
      setHasAccess(active);

      const hemisphere = asString(u.hemisphere).trim() || undefined;
      if (!hemisphere) {
        setError('Missing hemisphere in your profile. Please update your location settings.');
        return;
      }

      // Always set meta header early so UI reflects the profile even if gated
      setMeta({
        sign: resolveHeaderSign(u) || 'Your Sign',
        hemisphere,
        date: new Date().toISOString().slice(0, 10),
      });

      if (!active) {
        return;
      }

      // 3) Fetch forecast - cusp aware attempts with variants
      const attempts = buildMonthlySignAttempts(u);
      if (attempts.length === 0) {
        setError('Missing astrological sign in your profile. Please complete your profile setup.');
        return;
      }

      let found: { text: string; m: Meta } | null = null;

      for (const signAttempt of attempts) {
        try {
          // Debugging - keep this while you verify
          console.log('[monthly] trying forecast', { signAttempt, hemisphere });

          const res = await getLatestForecast(signAttempt, hemisphere);
          if (res.ok && res.row?.monthly_forecast) {
            found = {
              text: res.row.monthly_forecast,
              m: {
                date: res.row.date,
                hemisphere: res.row.hemisphere,
                // Prefer the attempt we used (avoids showing "Taurus" if DB row.sign is weird)
                sign: signAttempt,
              },
            };
            break;
          }
        } catch (e) {
          // try next attempt
        }
      }

      if (found) {
        setForecastText(found.text);
        setMeta(found.m);
      } else {
        setError(
          `No forecast found for ${attempts.join(', ')} in the ${hemisphere} hemisphere yet. Check back soon!`
        );
      }
    } catch (e: any) {
      setError(e?.message || 'Something went wrong fetching the monthly forecast.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadAll();
  }, [loadAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  }, [loadAll]);

  const goBack = useCallback(() => {
    if ((router as any).canGoBack?.()) {
      router.back();
    } else {
      router.replace('/(tabs)/astrology');
    }
  }, [router]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    loadAll();
  }, [loadAll]);

  const handleUpgrade = () => {
    router.push('/subscription');
  };

  // HTML rendering setup (Vazirmatn everywhere)
  const systemFonts = [
    'Vazirmatn-Regular',
    'Vazirmatn-Medium',
    'Vazirmatn-SemiBold',
    'Vazirmatn-Bold',
  ];

  const baseStyle = {
    fontFamily: 'Vazirmatn-Regular',
    color: '#e8e8e8',
    lineHeight: 24,
    fontSize: 16,
  } as const;

  const tagsStyles = {
    h1: { fontFamily: 'Vazirmatn-Bold', fontSize: 24, lineHeight: 30, marginBottom: 8, color: '#e8e8e8' },
    h2: { fontFamily: 'Vazirmatn-Bold', fontSize: 20, lineHeight: 26, marginBottom: 8, color: '#e8e8e8' },
    h3: { fontFamily: 'Vazirmatn-SemiBold', fontSize: 18, lineHeight: 24, marginBottom: 6, color: '#e8e8e8' },
    strong: { fontFamily: 'Vazirmatn-SemiBold' },
    b: { fontFamily: 'Vazirmatn-SemiBold' },
    em: { fontStyle: 'italic' },
    i: { fontStyle: 'italic' },
    p: { marginBottom: 10 },
    li: { marginBottom: 6 },
    ul: { paddingLeft: 18 },
    ol: { paddingLeft: 18 },
  } as const;

  if (loading) {
    return (
      <View style={styles.container}>
        <CosmicBackground />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#d4af37" />
            <Text style={styles.muted}>Loading your monthly forecast…</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const monthLabel = meta?.date
    ? new Date(meta.date).toLocaleDateString('en-AU', { year: 'numeric', month: 'long' })
    : new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long' });

  return (
    <View style={styles.container}>
      <CosmicBackground />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#d4af37"
              colors={['#d4af37']}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backRow} onPress={goBack}>
            <ArrowLeft size={22} color="#8b9dc3" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerIcon}>✨</Text>
            <Text style={styles.headerTitle}>Monthly Forecast</Text>
            <Text style={styles.headerSubtitle}>
              {meta?.sign || resolvedSign || 'Your Sign'} • {monthLabel}
            </Text>
          </View>

          <LinearGradient
            colors={['rgba(212, 175, 55, 0.18)', 'rgba(139, 157, 195, 0.10)']}
            style={styles.card}
          >
            <View style={styles.headerStrip}>
              <View style={styles.headerItem}>
                <Text style={styles.headerSmallLabel}>Sign</Text>
                <Text style={styles.headerSmallValue}>
                  {meta?.sign || resolvedSign || 'N/A'}
                </Text>
              </View>
              <View style={styles.headerItem}>
                <Text style={styles.headerSmallLabel}>Hemisphere</Text>
                <Text style={styles.headerSmallValue}>
                  {meta?.hemisphere || resolvedHemisphere || 'N/A'}
                </Text>
              </View>
              <View style={styles.headerItem}>
                <Text style={styles.headerSmallLabel}>Month</Text>
                <Text style={styles.headerSmallValue}>
                  {monthLabel}
                </Text>
              </View>
            </View>

            {!hasAccess && user ? (
              <LinearGradient
                colors={['rgba(212, 175, 55, 0.2)', 'rgba(212, 175, 55, 0.1)']}
                style={styles.upgradeContainer}
              >
                <View style={styles.upgradeHeader}>
                  <Text style={styles.upgradeIcon}>👑</Text>
                  <Text style={styles.upgradeTitle}>Unlock Monthly Forecasts</Text>
                </View>
                <Text style={styles.upgradeDescription}>
                  Get detailed monthly cosmic guidance tailored to your {meta?.sign || 'sign'} and {meta?.hemisphere || 'hemisphere'}.
                </Text>
                <View style={styles.upgradeFeatures}>
                  <Text style={styles.upgradeFeature}>✨ Comprehensive monthly insights</Text>
                  <Text style={styles.upgradeFeature}>🌙 Lunar cycle timing</Text>
                  <Text style={styles.upgradeFeature}>🌍 Hemisphere-specific guidance</Text>
                  <Text style={styles.upgradeFeature}>🔮 Cusp-aware forecasts</Text>
                </View>
                <CosmicButton
                  title="Upgrade to Astral Plane"
                  onPress={handleUpgrade}
                  style={styles.upgradeButton}
                />
              </LinearGradient>
            ) : error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : forecastText ? (
              <View style={styles.forecastContainer}>
                {isHtml(forecastText) ? (
                  <RenderHTML
                    contentWidth={width - 48}
                    source={{ html: forecastText }}
                    systemFonts={systemFonts}
                    baseStyle={baseStyle}
                    tagsStyles={tagsStyles}
                    defaultTextProps={{ selectable: false }}
                  />
                ) : (
                  <Text style={styles.forecastText}>{forecastText}</Text>
                )}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.muted}>No forecast available.</Text>
                <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                  <Text style={styles.retryText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            )}
          </LinearGradient>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ---------- styles ----------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  safeArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  backText: {
    color: '#8b9dc3',
    fontSize: 16,
    fontFamily: 'Vazirmatn-Medium',
  },

  headerCenter: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  headerIcon: { fontSize: 48, marginBottom: 6, color: '#d4af37' },
  headerTitle: {
    fontSize: 26,
    color: '#e8e8e8',
    fontFamily: 'Vazirmatn-Bold',
    textAlign: 'center',
  },
  headerSubtitle: {
    marginTop: 4,
    color: '#8b9dc3',
    fontSize: 16,
    fontFamily: 'Vazirmatn-Regular',
    textAlign: 'center',
  },

  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    backgroundColor: 'rgba(26,26,46,0.30)',
  },

  headerStrip: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  headerItem: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.35)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(139,157,195,0.25)',
    alignItems: 'center',
  },
  headerSmallLabel: {
    color: '#8b9dc3',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
    fontFamily: 'Vazirmatn-Medium',
  },
  headerSmallValue: {
    color: '#e8e8e8',
    fontSize: 14,
    fontFamily: 'Vazirmatn-SemiBold',
    textAlign: 'center',
  },

  forecastContainer: { marginTop: 8 },
  forecastText: {
    color: '#e8e8e8',
    fontSize: 16,
    lineHeight: 26,
    fontFamily: 'Vazirmatn-Regular',
    textAlign: 'left',
  },

  muted: {
    color: '#8b9dc3',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: 'Vazirmatn-Regular',
  },

  errorBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.35)',
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    alignItems: 'center',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Vazirmatn-Regular',
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },

  retryButton: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderWidth: 1,
    borderColor: '#d4af37',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  retryText: {
    color: '#d4af37',
    fontSize: 14,
    fontFamily: 'Vazirmatn-SemiBold',
    textAlign: 'center',
  },

  upgradeContainer: {
    marginTop: 8,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    alignItems: 'center',
  },
  upgradeHeader: { alignItems: 'center', marginBottom: 16 },
  upgradeIcon: { fontSize: 32, marginBottom: 8 },
  upgradeTitle: {
    fontSize: 22,
    fontFamily: 'Vazirmatn-Bold',
    color: '#d4af37',
    textAlign: 'center',
  },
  upgradeDescription: {
    fontSize: 16,
    fontFamily: 'Vazirmatn-Regular',
    color: '#e8e8e8',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  upgradeFeatures: { gap: 8, marginBottom: 24, alignSelf: 'stretch' },
  upgradeFeature: {
    fontSize: 14,
    fontFamily: 'Vazirmatn-Regular',
    color: '#8b9dc3',
    textAlign: 'center',
    lineHeight: 20,
  },
  upgradeButton: { minWidth: 200 },
});
