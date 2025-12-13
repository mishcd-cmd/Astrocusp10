import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import {
  getBirthstoneInfo,
  getEnhancedZodiacInfo,
  getAstrologicalHouse,
} from '@/utils/zodiacData';

// Use the cusp + pure sign birthstone tables you pasted earlier
import {
  getBirthstoneForSign,
  getBirthstoneForCusp,
} from '@/utils/birthstones';

interface BirthstoneInfoProps {
  sign: string; // can be "Leo" OR something cusp-like
}

function normaliseCuspKey(input: string) {
  return (input || '')
    .replace(/\u2013/g, '-') // en dash to hyphen
    .replace(/\u2014/g, '-') // em dash to hyphen
    .replace(/\s+/g, ' ')
    .trim();
}

function isCuspSign(input: string) {
  const s = normaliseCuspKey(input).toLowerCase();
  return s.includes('cusp') || s.includes('–') || s.includes('-');
}

export default function BirthstoneInfo({ sign }: BirthstoneInfoProps) {
  const cuspMode = useMemo(() => isCuspSign(sign), [sign]);

  // Pure sign data (from zodiacData)
  const zodiacInfo = useMemo(() => getEnhancedZodiacInfo(sign), [sign]);
  const houseInfo = useMemo(() => {
    return zodiacInfo ? getAstrologicalHouse(zodiacInfo.rulingHouse) : null;
  }, [zodiacInfo]);

  // Pure sign birthstones (existing)
  const pureBirthstones = useMemo(() => getBirthstoneInfo(sign), [sign]);

  // Cusp birthstone (from your new tables)
  const cuspBirthstone = useMemo(() => {
    if (!cuspMode) return null;

    // Try a few likely formats:
    // - "Sagittarius–Capricorn"
    // - "Sagittarius-Capricorn"
    // - "Cusp of Prophecy" etc
    const key = normaliseCuspKey(sign)
      .replace(/cusp/gi, '')
      .replace(/\s+of\s+/gi, ' of ')
      .trim();

    const found = getBirthstoneForCusp(key as any);
    return found || null;
  }, [cuspMode, sign]);

  // Fallback for pure sign birthstone table you pasted earlier
  const pureFallback = useMemo(() => {
    if (cuspMode) return null;
    return getBirthstoneForSign(sign) || null;
  }, [cuspMode, sign]);

  // Decide what to show
  const showCusp = cuspMode && cuspBirthstone;
  const showPure = !cuspMode && (pureBirthstones || pureFallback);

  if (!showCusp && !showPure && !zodiacInfo && !houseInfo) {
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      {/* Zodiac Sign Overview (only for pure signs) */}
      {!cuspMode && zodiacInfo && (
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

      {/* Astrological House (only for pure signs) */}
      {!cuspMode && houseInfo && (
        <LinearGradient
          colors={['rgba(139, 157, 195, 0.2)', 'rgba(139, 157, 195, 0.1)']}
          style={styles.houseCard}
        >
          <Text style={styles.houseTitle}>
            {houseInfo.number}
            {houseInfo.number === 1 ? 'st' : houseInfo.number === 2 ? 'nd' : houseInfo.number === 3 ? 'rd' : 'th'}{' '}
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
      {showCusp ? (
        <LinearGradient
          colors={['rgba(212, 175, 55, 0.15)', 'rgba(212, 175, 55, 0.05)']}
          style={styles.birthstoneCard}
        >
          <Text style={styles.title}>Cusp Birthstone</Text>

          <View style={styles.stoneContainerSingle}>
            <View style={styles.stoneItem}>
              <Text style={styles.stoneLabel}>{cuspBirthstone?.cuspName || 'Your Cusp'}</Text>
              <Text style={styles.stoneName}>{cuspBirthstone?.gemstone}</Text>
            </View>
          </View>

          {!!cuspBirthstone?.meaning && (
            <Text style={styles.description}>{cuspBirthstone.meaning}</Text>
          )}
        </LinearGradient>
      ) : showPure ? (
        <LinearGradient
          colors={['rgba(212, 175, 55, 0.15)', 'rgba(212, 175, 55, 0.05)']}
          style={styles.birthstoneCard}
        >
          <Text style={styles.title}>Birthstones</Text>

          <View style={styles.stoneContainer}>
            <View style={styles.stoneItem}>
              <Text style={styles.stoneLabel}>Traditional</Text>
              <Text style={styles.stoneName}>
                {pureBirthstones?.traditional || pureFallback?.traditional || ''}
              </Text>
            </View>
            <View style={styles.stoneItem}>
              <Text style={styles.stoneLabel}>Alternative</Text>
              <Text style={styles.stoneName}>
                {pureBirthstones?.alternative || pureFallback?.alternative || ''}
              </Text>
            </View>
          </View>

          <Text style={styles.description}>
            {(pureFallback?.meaning && pureFallback.meaning) ||
              `Birthstones are believed to bring good fortune and amplify your natural ${sign} energy when worn or kept close.`}
          </Text>
        </LinearGradient>
      ) : null}
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
  zodiacHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  zodiacSymbol: { fontSize: 32, color: '#d4af37', marginRight: 12 },
  zodiacName: { fontSize: 24, fontFamily: 'PlayfairDisplay-Bold', color: '#e8e8e8' },
  zodiacDates: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#8b9dc3',
    textAlign: 'center',
    marginBottom: 16,
  },
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
  stoneContainerSingle: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  stoneItem: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 8, backgroundColor: 'rgba(139, 157, 195, 0.15)' },

  stoneLabel: { fontSize: 12, fontFamily: 'Inter-Medium', color: '#8b9dc3', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' },
  stoneName: { fontSize: 16, fontFamily: 'PlayfairDisplay-Bold', color: '#e8e8e8', textAlign: 'center' },
  description: { fontSize: 14, fontFamily: 'Inter-Regular', color: '#8b9dc3', textAlign: 'center', lineHeight: 20, fontStyle: 'italic' },
});
