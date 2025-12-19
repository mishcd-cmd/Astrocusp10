import React, { useEffect, useMemo, useRef, useState } from 'react'; 
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
import { Gem } from 'lucide-react-native';

import CosmicBackground from '../../components/CosmicBackground';
import MysticMish from '../../components/MysticMish';
import HoroscopeHeader from '../../components/HoroscopeHeader';

import { getUserData, type UserProfile } from '../../utils/userData';
import { getSubscriptionStatus } from '../../utils/billing';
import { getAccessibleHoroscope, type HoroscopeData } from '../../utils/horoscopeData';
import { getHemisphereEvents, getCurrentPlanetaryPositionsEnhanced } from '../../utils/astronomy';
import { getLunarNow } from '../../utils/lunar';
import { getCuspGemstoneAndRitual } from '../../utils/cuspData';
import { getDefaultSignFromUserData } from '../../utils/signs';

/* -------------------------
 * Safe helpers
 * ------------------------- */
function asString(v: any): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

/* -------------------------
 * 🔑 CANONICAL CUSP NORMALISER
 * ------------------------- */
function normaliseCuspForGemstone(raw: string): string {
  if (!raw) return '';

  let s = raw
    .replace(/_/g, '-')
    .replace(/[—–]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  // remove existing "cusp"
  s = s.replace(/\s*cusp\s*/g, '');

  const parts = s.split('-').map(p =>
    p
      .trim()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  );

  if (parts.length < 2) return '';

  return `${parts.join('–')} Cusp`;
}

export default function HoroscopeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sign?: string; hemisphere?: string }>();

  const initOnce = useRef(false);
  const inFlight = useRef(false);

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [horoscope, setHoroscope] = useState<HoroscopeData | null>(null);
  const [selectedSign, setSelectedSign] = useState('');
  const [selectedHemisphere, setSelectedHemisphere] = useState<'Northern' | 'Southern'>('Northern');

  useEffect(() => {
    if (initOnce.current) return;
    initOnce.current = true;

    const run = async () => {
      setLoading(true);

      const u = await getUserData();
      setUser(u);

      const sub = await getSubscriptionStatus();
      setHasAccess(!!sub?.active);

      const sign =
        decodeURIComponent(asString(params.sign)) ||
        u?.cuspResult?.cuspName ||
        u?.cuspResult?.primarySign ||
        getDefaultSignFromUserData(u);

      const hemi =
        (decodeURIComponent(asString(params.hemisphere)) as 'Northern' | 'Southern') ||
        (u?.hemisphere as 'Northern' | 'Southern') ||
        'Northern';

      setSelectedSign(sign);
      setSelectedHemisphere(hemi);

      const data = await getAccessibleHoroscope(new Date(), sign, hemi);
      setHoroscope(data || null);

      setReady(true);
      setLoading(false);
    };

    run();
  }, []);

  const isCusp =
    asString(horoscope?.sign).toLowerCase().includes('cusp') ||
    asString(selectedSign).toLowerCase().includes('-');

  const canonicalCusp = normaliseCuspForGemstone(
    horoscope?.sign || selectedSign
  );

  const gemstoneData = canonicalCusp
    ? getCuspGemstoneAndRitual(canonicalCusp)
    : null;

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

  return (
    <View style={styles.container}>
      <CosmicBackground />
      <MysticMish hemisphere={selectedHemisphere} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView>
          <HoroscopeHeader signLabel={horoscope?.sign || selectedSign} />

          {hasAccess && isCusp && (
            <LinearGradient
              style={styles.gemstoneCard}
              colors={['rgba(212,175,55,0.15)', 'rgba(139,157,195,0.1)']}
            >
              <View style={styles.cardHeader}>
                <Gem size={20} color="#d4af37" />
                <Text style={styles.cardTitle}>Your Cusp Birthstone</Text>
              </View>

              {gemstoneData ? (
                <>
                  <Text style={styles.gemstoneName}>{gemstoneData.gemstone}</Text>
                  <Text style={styles.gemstoneMeaning}>{gemstoneData.meaning}</Text>
                </>
              ) : (
                <Text style={styles.gemstoneMeaning}>
                  ⚠ No gemstone found for "{canonicalCusp}"
                </Text>
              )}
            </LinearGradient>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  gemstoneCard: {
    borderRadius: 16,
    padding: 20,
    margin: 20,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle: { color: '#fff', marginLeft: 8, fontSize: 16 },

  gemstoneName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#d4af37',
    textAlign: 'center',
    marginBottom: 8,
  },
  gemstoneMeaning: {
    fontSize: 14,
    color: '#e8e8e8',
    textAlign: 'center',
  },
});
