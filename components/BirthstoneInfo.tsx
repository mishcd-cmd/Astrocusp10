import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { getEnhancedZodiacInfo, getAstrologicalHouse } from '@/utils/zodiacData';
import { getBirthstoneForSign, getBirthstoneForCusp } from '@/utils/birthstones';

interface BirthstoneInfoProps {
  // Can be a pure sign ("Leo") or a cusp name ("Leo-Virgo" or "Leo–Virgo")
  sign: string;
}

type CuspStone = {
  gemstone: string;
  meaning: string;
  cuspName?: string;
  dateRange?: string;
};

function isProbablyCuspName(name: string) {
  return name.includes('–') || name.includes('-');
}

function normaliseCuspKey(raw: string) {
  return raw.replace(/[—–]/g, '-').trim();
}

export default function BirthstoneInfo({ sign }: BirthstoneInfoProps) {
  const safeName = useMemo(() => (sign || '').trim(), [sign]);

  const isCusp = useMemo(() => isProbablyCuspName(safeName), [safeName]);

  // Pure sign rich info
  const zodiacInfo = useMemo(() => {
    if (!safeName || isCusp) return null;
    return getEnhancedZodiacInfo(safeName);
  }, [safeName, isCusp]);

  const houseInfo = useMemo(() => {
    if (!zodiacInfo) return null;
    return getAstrologicalHouse(zodiacInfo.rulingHouse);
  }, [zodiacInfo]);

  // Birthstone resolution
  const [cuspStone, setCuspStone] = useState<CuspStone | null>(null);

  const signStones = useMemo(() => {
    if (!safeName || isCusp) return null;
    const s = getBirthstoneForSign(safeName);
    if (!s) return null;
    return {
      traditional: s.traditional,
      alternative: s.alternative,
      meaning: s.meaning,
    };
  }, [safeName, isCusp]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!safeName || !isCusp) {
        if (mounted) setCuspStone(null);
        return;
      }

      try {
        const cuspKey = normaliseCuspKey(safeName);
        const res = await getBirthstoneForCusp(cuspKey);

        if (!mounted) return;

        if (res?.gemstone) {
          setCuspStone({
            gemstone: res.gemstone,
            meaning: res.meaning || '',
            cuspName: res.cuspName,
            dateRange: res.dateRange,
          });
        } else {
          setCuspStone(null);
        }
      } catch (e) {
        console.warn('[BirthstoneInfo] cusp stone resolve failed', e);
        if (mounted) setCuspStone(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [safeName, isCusp]);

  // Nothing to show
  if (!safeName) return null;
  if (!isCusp && !signStones) return null;
  if (isCusp && !cuspStone) return null;

  return (
    <ScrollView style={styles.container}>
      {/* Zodiac Sign Overview (pure signs only) */}
      {zodiacInfo && (
        <LinearGradient
          colors={['rgba(212, 175, 55, 0.2)', 'rgba(212, 175, 55, 0.1)']}
          style={styles.zodiacCard}
        >
          <View style={styles.zodiacHeader}>
            <Text style={styles.zodiacSymbol}>{zodiacInfo.symbol}</Text>
            <Text style={styles.zodiacName}>{zodiacInfo.name}</Text>
          </View>
          <Text style={styles.zodiacDates}>{zodiacInfo.dates}</Text>

          <View style={styles.zodiacDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Element:</Text>
              <Text style={styles.detailValue}>{zodiacInfo.element}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Quality:</Text>
              <Text style={styles.detailValue}>{zodiacInfo.quality}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ruling Planet:</Text>
              <Text style={styles.detailValue}>{zodiacInfo.rulingPlanet}</Text>
            </View>
          </View>

          <View style={styles.keywordsContainer}>
            <Text style={styles.keywordsTitle}>Key Themes:</Text>
            <View style={styles.keywordsList}>
              {zodiacInfo.keywords.map((keyword) => (
                <View key={keyword} style={styles.keywordItem}>
                  <Text style={styles.keywordText}>{keyword}</Text>
                </View>
              ))}
            </View>
          </View>
        </LinearGradient>
      )}

      {/* Astrological House (pure signs only) */}
      {houseInfo && (
        <LinearGradient
          colors={['rgba(139, 157, 195, 0.2)', 'rgba(139, 157, 195, 0.1)']}
          style={styles.houseCard}
        >
          <Text style={styles.houseTitle}>
            {houseInfo.number}
            {houseInfo.number === 1
              ? 'st'
              : houseInfo.number === 2
              ? 'nd'
              : houseInfo.number === 3
              ? 'rd'
              : 'th'}{' '}
            House: {houseInfo.name}
          </Text>

          <Text style={styles.houseDescription}>{houseInfo.description}</Text>

          <View style={styles.themesContainer}>
            <Text style={styles.themesTitle}>House Themes:</Text>
            <View style={styles.themesList}>
              {houseInfo.themes.map((theme) => (
                <View key={theme} style={styles.themeItem}>
                  <Text style={styles.themeText}>• {theme}</Text>
                </View>
              ))}
            </View>
          </View>
        </LinearGradient>
      )}

      {/* Birthstones */}
      <LinearGradient
        colors={['rgba(212, 175, 55, 0.15)', 'rgba(212, 175, 55, 0.05)']}
        style={styles.birthstoneCard}
      >
        <Text style={styles.title}>{isCusp ? 'Cusp Birthstone' : 'Birthstones'}</Text>

        {isCusp && cuspStone ? (
          <>
            <View style={styles.stoneContainerSingle}>
              <View style={styles.stoneItem}>
                <Text style={styles.stoneLabel}>Gemstone</Text>
                <Text style={styles.stoneName}>{cuspStone.gemstone}</Text>
              </View>
            </View>
            {!!cuspStone.meaning && <Text style={styles.description}>{cuspStone.meaning}</Text>}
          </>
        ) : (
          <>
            <View style={styles.stoneContainer}>
              <View style={styles.stoneItem}>
                <Text style={styles.stoneLabel}>Traditional</Text>
                <Text style={styles.stoneName}>{signStones?.traditional}</Text>
              </View>
              <View style={styles.stoneItem}>
                <Text style={styles.stoneLabel}>Alternative</Text>
                <Text style={styles.stoneName}>{signStones?.alternative}</Text>
              </View>
            </View>
            <Text style={styles.description}>
              Birthstones are believed to bring good fortune and amplify your natural energy when worn or kept close.
            </Text>
          </>
        )}
      </LinearGradient>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 24 },

  zodiacCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  zodiacHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  zodiacSymbol: { fontSize: 32, color: '#d4af37', marginRight: 12 },
  zodiacName: { fontSize: 24, fontFamily: 'PlayfairDisplay-Bold', color: '#e8e8e8' },
  zodiacDates: { fontSize: 16, fontFamily: 'Inter-Medium', color: '#8b9dc3', textAlign: 'center', marginBottom: 16 },

  zodiacDetails: { marginBottom: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  detailLabel: { fontSize: 14, fontFamily: 'Inter-Medium', color: '#8b9dc3' },
  detailValue: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: '#d4af37' },

  keywordsContainer: { marginTop: 8 },
  keywordsTitle: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: '#e8e8e8', marginBottom: 8 },
  keywordsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  keywordItem: { backgroundColor: 'rgba(212, 175, 55, 0.2)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  keywordText: { fontSize: 12, fontFamily: 'Inter-Medium', color: '#d4af37' },

  houseCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 157, 195, 0.3)',
  },
  houseTitle: { fontSize: 18, fontFamily: 'PlayfairDisplay-Bold', color: '#8b9dc3', textAlign: 'center', marginBottom: 8 },
  houseDescription: { fontSize: 14, fontFamily: 'Inter-Regular', color: '#e8e8e8', textAlign: 'center', lineHeight: 20, marginBottom: 16 },

  themesContainer: { marginTop: 8 },
  themesTitle: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: '#8b9dc3', marginBottom: 8 },
  themesList: { gap: 4 },
  themeItem: { marginBottom: 2 },
  themeText: { fontSize: 12, fontFamily: 'Inter-Regular', color: '#e8e8e8', lineHeight: 16 },

  birthstoneCard: { borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.3)' },
  title: { fontSize: 18, fontFamily: 'PlayfairDisplay-Bold', color: '#d4af37', textAlign: 'center', marginBottom: 16 },

  stoneContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 12 },
  stoneContainerSingle: { marginBottom: 16 },

  stoneItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 157, 195, 0.15)',
  },
  stoneLabel: { fontSize: 12, fontFamily: 'Inter-Medium', color: '#8b9dc3', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  stoneName: { fontSize: 16, fontFamily: 'PlayfairDisplay-Bold', color: '#e8e8e8', textAlign: 'center' },

  description: { fontSize: 14, fontFamily: 'Inter-Regular', color: '#8b9dc3', textAlign: 'center', lineHeight: 20, fontStyle: 'italic' },
});
