import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Star,
  Moon,
  Eye,
  Crown,
  Telescope,
  Gem,
  Settings,
  User,
  Sparkles,
} from 'lucide-react-native';

import CosmicBackground from '../../components/CosmicBackground';
import CosmicButton from '../../components/CosmicButton';
import MysticMish from '../../components/MysticMish';
import HoroscopeHeader from '../../components/HoroscopeHeader';

import { getUserData, type UserProfile } from '../../utils/userData';
import { getSubscriptionStatus } from '../../utils/billing';
import { getAccessibleHoroscope, type HoroscopeData } from '../../utils/horoscopeData';
import { getHemisphereEvents, getCurrentPlanetaryPositionsEnhanced } from '../../utils/astronomy';
import { getLunarNow } from '../../utils/lunar';
import { getCuspGemstoneAndRitual } from '../../utils/cuspData';
import { translateText, getUserLanguage, type SupportedLanguage } from '../../utils/translation';
import { getDefaultSignFromUserData } from '../../utils/signs';

/* -------------------------
 * Safe string helpers
 * ------------------------- */
function asString(v: any): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}
function stripVersionSuffix(v?: string) {
  const s = asString(v).trim();
  return s.replace(/\s*V\d+\s*$/i, '').trim();
}

export default function HoroscopeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sign?: string; hemisphere?: string }>();

  const initOnce = useRef(false);
  const inFlight = useRef(false);
  const lastSubCheck = useRef<number>(0);

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [horoscope, setHoroscope] = useState<HoroscopeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedSign, setSelectedSign] = useState<string>('');
  const [selectedHemisphere, setSelectedHemisphere] = useState<'Northern' | 'Southern'>('Northern');
  const [moonPhase, setMoonPhase] = useState<any>(null);
  const [astronomicalEvents, setAstronomicalEvents] = useState<any[]>([]);
  const [planetaryPositions, setPlanetaryPositions] = useState<any[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en');
  const [translatedContent, setTranslatedContent] = useState<any>({});

  const resolvedSign = useMemo(() => {
    if (params.sign) {
      return decodeURIComponent(asString(params.sign));
    }
    if (!user) return undefined;
    return getDefaultSignFromUserData(user);
  }, [user, params.sign]);

  const resolvedHemisphere = useMemo<'Northern' | 'Southern'>(() => {
    const p = asString(params.hemisphere);
    if (p) return decodeURIComponent(p) as 'Northern' | 'Southern';
    return (user?.hemisphere as 'Northern' | 'Southern') || 'Northern';
  }, [user, params.hemisphere]);

  useEffect(() => {
    if (initOnce.current) return;
    initOnce.current = true;

    let cancelled = false;

    const fetchAll = async () => {
      if (inFlight.current) return;
      inFlight.current = true;

      setLoading(true);
      setError(null);

      try {
        const u = await getUserData();
        if (cancelled) return;

        setUser(u);

        const now = Date.now();
        if (now - lastSubCheck.current > 120_000) {
          lastSubCheck.current = now;
          const sub = await getSubscriptionStatus();
          setHasAccess(!!sub?.active);
        }

        const sign =
          decodeURIComponent(asString(params.sign)) ||
          u?.cuspResult?.cuspName ||
          u?.cuspResult?.primarySign ||
          '';

        const hemi =
          (decodeURIComponent(asString(params.hemisphere)) as 'Northern' | 'Southern') ||
          (u?.hemisphere as 'Northern' | 'Southern') ||
          'Northern';

        setSelectedSign(sign);
        setSelectedHemisphere(hemi);

        if (sign) {
          const data = await getAccessibleHoroscope(new Date(), sign, hemi);
          setHoroscope(data || null);
        }

        setMoonPhase(getLunarNow(hemi));
        setAstronomicalEvents(getHemisphereEvents(hemi));
        setPlanetaryPositions(await getCurrentPlanetaryPositionsEnhanced(hemi));

        setCurrentLanguage(await getUserLanguage());
      } catch (e: any) {
        setError(e?.message || 'Failed to load horoscope.');
      } finally {
        inFlight.current = false;
        setLoading(false);
        setReady(true);
      }
    };

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, []);

  const getDisplayText = (original?: string) => {
    const base = asString(original);
    if (currentLanguage !== 'zh') return base;
    return translatedContent[base] || base;
  };

  const isCusp =
    asString(horoscope?.sign).toLowerCase().includes('cusp') ||
    asString(selectedSign).toLowerCase().includes('cusp');

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

  if (error) {
    return (
      <View style={styles.container}>
        <CosmicBackground />
        <SafeAreaView style={styles.safeArea}>
          <Text style={styles.errorText}>{error}</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CosmicBackground />
      <MysticMish hemisphere={selectedHemisphere} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {}} />}
        >
          <HoroscopeHeader signLabel={horoscope?.sign || selectedSign} />

          {hasAccess && isCusp && (
            <LinearGradient style={styles.gemstoneCard} colors={['rgba(212,175,55,0.15)','rgba(139,157,195,0.1)']}>
              <View style={styles.cardHeader}>
                <Gem size={20} color="#d4af37" />
                <Text style={styles.cardTitle}>Your Cusp Birthstone</Text>
              </View>

              {(() => {
                const gemstoneData = getCuspGemstoneAndRitual(
                  horoscope?.sign || selectedSign
                );

                return gemstoneData ? (
                  <>
                    <Text style={styles.gemstoneName}>{gemstoneData.gemstone}</Text>
                    <Text style={styles.gemstoneMeaning}>{gemstoneData.meaning}</Text>
                  </>
                ) : (
                  <Text style={styles.gemstoneMeaning}>
                    Your cusp birthstone enhances the dual energies of your cosmic position.
                  </Text>
                );
              })()}
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
  errorText: { color: '#ff6b6b', textAlign: 'center', marginTop: 40 },

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
