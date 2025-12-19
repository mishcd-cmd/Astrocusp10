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

/* -------------------------
 * Helpers
 * ------------------------- */
function asString(v: any): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function toSlug(input: string): string {
  return asString(input)
    .toLowerCase()
    .replace(/\s*cusp\s*$/i, '')
    .replace(/[–—_]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function titleCaseWord(w: string) {
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

function slugToDisplay(slug: string) {
  const parts = slug.split('-').filter(Boolean);
  if (parts.length === 2) {
    return `${titleCaseWord(parts[0])}-${titleCaseWord(parts[1])}`;
  }
  return titleCaseWord(parts[0]);
}

/**
 * 🚨 FORCE CUSP LOGIC
 * This is the key fix
 */
function resolveForcedCusp(u: UserProfile | null) {
  if (!u) return null;

  const cuspName = asString(u.cuspResult?.cuspName).trim();
  const primary = asString(u.cuspResult?.primarySign).trim();
  const secondary = asString((u as any)?.cuspResult?.secondarySign).trim();

  // 1️⃣ Explicit cusp always wins
  if (cuspName) {
    const slug = toSlug(cuspName);
    return { slug, display: slugToDisplay(slug) };
  }

  // 2️⃣ Build cusp from primary + secondary
  if (primary && secondary && primary !== secondary) {
    const slug = toSlug(`${primary}-${secondary}`);
    return { slug, display: slugToDisplay(slug) };
  }

  // 3️⃣ Fallback to single sign
  if (primary) {
    const slug = toSlug(primary);
    return { slug, display: slugToDisplay(slug) };
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

      const hemisphere = asString(u.hemisphere);
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

      console.log('[monthly] FORCED CUSP QUERY', cusp.slug, hemisphere);

      const res = await getLatestForecast(cusp.slug, hemisphere);

      if (res.ok && res.row?.monthly_forecast) {
        setForecastText(res.row.monthly_forecast);
      } else {
        throw new Error(`No monthly forecast found for ${cusp.slug}`);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load monthly forecast');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <CosmicBackground />
        <SafeAreaView style={styles.safeArea}>
          <ActivityIndicator size="large" color="#d4af37" />
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
            <ArrowLeft size={20} color="#8b9dc3" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Monthly Forecast</Text>
          <Text style={styles.subtitle}>
            {meta?.sign} • {monthLabel}
          </Text>

          <LinearGradient colors={['rgba(212,175,55,0.18)','rgba(139,157,195,0.1)']} style={styles.card}>
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
            ) : null}
          </LinearGradient>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  safeArea: { flex: 1 },
  backRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  backText: { color: '#8b9dc3', marginLeft: 8 },
  title: { fontSize: 26, color: '#e8e8e8', textAlign: 'center', marginTop: 12 },
  subtitle: { color: '#8b9dc3', textAlign: 'center', marginBottom: 16 },
  card: { margin: 20, padding: 20, borderRadius: 16 },
  text: { color: '#e8e8e8', fontSize: 16, lineHeight: 26 },
  error: { color: '#ff6b6b', textAlign: 'center' },
});
