// app/(tabs)/MysticMish.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Moon, Star, Sparkles, Eye, Scroll, Crown } from 'lucide-react-native';
import CosmicBackground from '../../components/CosmicBackground';
import CosmicButton from '../../components/CosmicButton';
import HoroscopeHeader from '../../components/HoroscopeHeader';
import { getCurrentMoonPhase } from '../../utils/astronomy';
import { getSubscriptionStatus } from '../../utils/billing';

// Fallback for web environment
if (typeof Platform === 'undefined') {
  (global as any).Platform = { OS: 'web' };
}

// ✅ Pre-import the avatar image
const mishAvatar = require('../../assets/images/mystic-mish/headshot.png');

function buildWolfMoonSpell(hemisphere: 'Northern' | 'Southern') {
  if (hemisphere === 'Southern') {
    return {
      title: '🔥 Wolf Moon Fire Release',
      subtitle: 'Full Moon in Cancer - Southern Hemisphere',
      description:
        'A blazing summer spell for emotional sovereignty, ancestral clearing, and fierce self-protection.',
      seasonalContext:
        "The first Full Moon of 2026 arrives in Southern summer heat, burning bright in watery Cancer while the Sun stands opposite in Capricorn's mountain air. This Wolf Supermoon sits closer to Earth than usual, magnifying everything it touches. In the South, summer amplifies the fire element, making this a potent moment to burn away what no longer serves your emotional body and claim your territory with absolute clarity.",
      fullSpell: `Full Moon in Cancer - Southern Hemisphere
Theme: emotional sovereignty, ancestral clearing, fierce boundaries
Items: red or orange candle, fireproof bowl, bay leaves (3 to 5), pen, small glass of spring water, salt
Colours: scarlet, burnt orange, silver white, deep ocean blue

Steps
1) Stand outside if possible, barefoot on warm earth. Feel the summer night against your skin. Say aloud: "I am the wolf. I know my territory. I protect what matters."
2) Light your candle and place it safely in front of you. On each bay leaf, write one thing you refuse to carry into the rest of this year: a guilt pattern, an inherited wound, a relationship dynamic that drains you, a fear that keeps you small.
3) Hold each bay leaf to your heart before burning it in the flame. As it catches, say: "This ends with me. The cycle breaks here." Drop each burning leaf into your fireproof bowl and watch the smoke rise.
4) When all leaves are ash, add a pinch of salt to the water and drink half. Pour the rest over the ashes, speaking your own name three times with absolute authority.
5) Take the bowl outside and scatter the wet ashes onto the earth or into moving water. Walk away without looking back. The Wolf Moon honours those who release without nostalgia.
6) Before sleep, place your hands on your belly and ribs. Breathe into the space you have just reclaimed. This is your emotional territory now. Guard it.

Note
This Supermoon magnifies all emotional material. If feelings surge in the days following this ritual, let them. The wolf does not apologise for howling at what it sees clearly in the moonlight.`,
      moonPhase: 'Full Moon in Cancer (Wolf Supermoon)',
      element: 'Fire',
    };
  }

  return {
    title: '❄️ Wolf Moon Water Reclamation',
    subtitle: 'Full Moon in Cancer - Northern Hemisphere',
    description:
      'A midwinter spell for emotional truth, ancestral healing, and quiet sovereignty beneath the snow.',
    seasonalContext:
      "In the Northern winter, the Wolf Supermoon rises over frozen ground, illuminating everything that lives beneath the surface. Cancer's waters meet Capricorn's stone in the deep cold, asking you to look honestly at what you have been holding in the name of care, duty, or inherited obligation. This Moon is closer to Earth than most, pulling at your interior tides with unusual strength. The wolf howls not from aggression but from clarity about what belongs in the den and what must stay outside.",
    fullSpell: `Full Moon in Cancer - Northern Hemisphere
Theme: emotional truth, ancestral healing, boundary setting
Items: white or silver candle, bowl of clean water (snow or ice melted if possible), smooth stone, paper, pen, small sprig of evergreen
Colours: pearl white, ice blue, dark forest green, winter grey

Steps
1) Sit somewhere quiet with your candle lit. Hold the stone in your left hand and feel its weight. Say softly: "I am permitted to know what I feel without apology."
2) On your paper, write three truths you have been avoiding about your emotional patterns or family inheritance. Be ruthlessly honest. Cancer under a Supermoon will not accept performance.
3) Read each truth aloud, then dip the evergreen sprig into the water and touch it to your forehead, throat, and heart. Say: "I see this. I speak this. I feel this. And I choose differently."
4) Fold the paper small and place it under the bowl of water. Let the candle burn while you sit in silence, watching the flame's reflection in the water. This is you observing your own emotional world without drowning in it.
5) After at least ten minutes, take the paper outside and bury it in frozen earth or snow. The winter will compost what you have released. Keep the stone as a reminder of your sovereignty.
6) Return inside and drink a full glass of water slowly, feeling it travel through your body. You are clearing the channel. The Wolf Moon teaches that protection begins with knowing exactly what you are protecting.

Note
This Supermoon magnifies all emotional material. If feelings surge in the days following this ritual, let them. The wolf does not apologise for howling at what it sees clearly in the moonlight.`,
    moonPhase: 'Full Moon in Cancer (Wolf Supermoon)',
    element: 'Water',
  };
}

export default function MysticMishScreen() {
  const router = useRouter();
  const [moonPhase, setMoonPhase] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      let subscriptionStatus: any;
      try {
        subscriptionStatus = await getSubscriptionStatus();
        const phase = getCurrentMoonPhase();
        setMoonPhase(phase);
      } catch (error) {
        console.error('Error loading Mystic Mish data:', error);
      } finally {
        if (isMounted) {
          if (subscriptionStatus) {
            setHasAccess(subscriptionStatus.active || false);
          }
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleUpgrade = () => router.push('/subscription');
  const handleSettings = () => router.push('/(tabs)/settings');
  const handleAccount = () => router.push('/settings');

  // Wolf Moon spells only
  const southernWolfMoon = buildWolfMoonSpell('Southern');
  const northernWolfMoon = buildWolfMoonSpell('Northern');

  if (loading) {
    return (
      <View style={styles.container}>
        <CosmicBackground />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#d4af37" />
            <Text style={styles.loadingText}>Loading mystical wisdom...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Paywall
  if (!hasAccess) {
    return (
      <View style={styles.container}>
        <CosmicBackground />
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.headerCenter}>
              <Text style={styles.title}>Mystic Mish</Text>
              <Text style={styles.subtitle}>Your Cosmic Guide & Ritual Keeper</Text>
            </View>

            <LinearGradient
              colors={['rgba(212, 175, 55, 0.2)', 'rgba(212, 175, 55, 0.1)']}
              style={styles.paywallCard}
            >
              <View style={styles.paywallHeader}>
                <Crown size={32} color="#d4af37" />
                <Text style={styles.paywallTitle}>Unlock Mystic Mish</Text>
              </View>

              <Text style={styles.paywallDescription}>
                Access Mystic Mish spells, moon rituals, and cosmic wisdom with Astral Plane.
              </Text>

              <View style={styles.mishPreviewContainer}>
                <Image
                  source={mishAvatar}
                  style={styles.mishPreviewImage}
                  resizeMode="cover"
                  onError={() => setImageError(true)}
                />
                {imageError && (
                  <View style={styles.mishPreviewFallback}>
                    <Text style={styles.mishEmojiLarge}>🔮</Text>
                    <Text style={styles.mishNameLarge}>Mish</Text>
                  </View>
                )}
              </View>

              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Scroll size={16} color="#d4af37" />
                  <Text style={styles.featureText}>Sacred spells and rituals</Text>
                </View>
                <View style={styles.featureItem}>
                  <Moon size={16} color="#d4af37" />
                  <Text style={styles.featureText}>Moon phase guidance</Text>
                </View>
                <View style={styles.featureItem}>
                  <Sparkles size={16} color="#d4af37" />
                  <Text style={styles.featureText}>Cusp specific practices</Text>
                </View>
                <View style={styles.featureItem}>
                  <Eye size={16} color="#d4af37" />
                  <Text style={styles.featureText}>Mystic tips and wisdom</Text>
                </View>
              </View>

              <CosmicButton
                title="Upgrade to Astral Plane"
                onPress={handleUpgrade}
                style={styles.upgradeButton}
              />
            </LinearGradient>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  const tips = [
    {
      icon: <Moon size={20} color="#d4af37" />,
      title: 'Moon Phase Magic',
      tip:
        'New moons invite intentions. Full moons support release and blessing. Waxing builds. Waning clears.',
    },
    {
      icon: <Sparkles size={20} color="#8b9dc3" />,
      title: 'Cusp Power',
      tip:
        'If you are on a cusp, you can work both signs. Blend ruling planets and elements to fit your intention.',
    },
    {
      icon: <Star size={20} color="#d4af37" />,
      title: 'Daily Practice',
      tip:
        'Small daily rituals compound. Light a candle, speak one line, breathe with intention.',
    },
  ];

  return (
    <View style={styles.container}>
      <CosmicBackground />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerCenter}>
            <Text style={styles.headerIcon}>✨</Text>
            <Text style={styles.headerTitle}>Mystic Mish</Text>
            <Text style={styles.headerSubtitle}>Your Cosmic Guide and Ritual Keeper</Text>
          </View>

          {/* Avatar and welcome */}
          <LinearGradient
            colors={['rgba(212, 175, 55, 0.2)', 'rgba(139, 157, 195, 0.1)']}
            style={styles.welcomeCard}
          >
            <View style={styles.mishAvatarContainer}>
              <Image
                source={mishAvatar}
                style={styles.mishAvatar}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
              {imageError && (
                <View style={styles.mishAvatarFallback}>
                  <Text style={styles.mishEmojiLarge}>🔮</Text>
                  <Text style={styles.mishNameLarge}>Mish</Text>
                </View>
              )}
            </View>

            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeTitle}>Welcome, cosmic soul</Text>
              <Text style={styles.welcomeText}>
                I am Mystic Mish. I appear when the energy is ripe for magic. Let us align your ritual to the Wolf Moon and your hemisphere.
              </Text>
            </View>
          </LinearGradient>

          {/* Current Moon Message */}
          <LinearGradient
            colors={['rgba(139, 157, 195, 0.25)', 'rgba(75, 0, 130, 0.15)']}
            style={styles.moonMessageCard}
          >
            <View style={styles.moonHeader}>
              <Moon size={24} color="#d4af37" />
              <Text style={styles.moonTitle}>Seasonal Rituals</Text>
            </View>

            {moonPhase && (
              <Text style={styles.moonPhaseText}>
                Current Moon: {moonPhase.phase} ({moonPhase.illumination}% illuminated)
              </Text>
            )}

            <Text style={styles.moonMessage}>
              The Wolf Moon is here. This is release, protection, and emotional sovereignty.
            </Text>
            <Text style={styles.moonDescription}>
              Choose the ritual for your hemisphere below. Full Moon energy is perfect for letting go with clarity.
            </Text>
          </LinearGradient>

          {/* Southern Hemisphere Spell */}
          <View style={styles.spellsSection}>
            <Text style={styles.sectionTitle}>🌍 Southern Hemisphere Spell</Text>

            <LinearGradient
              colors={['rgba(212, 175, 55, 0.2)', 'rgba(212, 175, 55, 0.1)']}
              style={styles.spellCard}
            >
              <View style={styles.spellHeader}>
                <Scroll size={20} color="#d4af37" />
                <Text style={styles.spellTitle}>{southernWolfMoon.title}</Text>
              </View>
              <Text style={styles.spellSubtitle}>{southernWolfMoon.subtitle}</Text>
              <Text style={styles.spellDescription}>{southernWolfMoon.description}</Text>

              <View style={styles.seasonalContextContainer}>
                <Text style={styles.seasonalContextTitle}>Seasonal Context</Text>
                <Text style={styles.seasonalContextText}>{southernWolfMoon.seasonalContext}</Text>
              </View>

              <View style={styles.spellDetails}>
                <View style={styles.spellDetailItem}>
                  <Text style={styles.spellDetailLabel}>Moon Phase</Text>
                  <Text style={styles.spellDetailValue}>{southernWolfMoon.moonPhase}</Text>
                </View>
                <View style={styles.spellDetailItem}>
                  <Text style={styles.spellDetailLabel}>Element</Text>
                  <Text style={styles.spellDetailValue}>{southernWolfMoon.element}</Text>
                </View>
              </View>

              <View style={styles.fullSpellContainer}>
                <Text style={styles.fullSpellTitle}>The Ritual</Text>
                <Text style={styles.fullSpellText}>{southernWolfMoon.fullSpell}</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Northern Hemisphere Spell */}
          <View style={styles.spellsSection}>
            <Text style={styles.sectionTitle}>🌎 Northern Hemisphere Spell</Text>

            <LinearGradient
              colors={['rgba(139, 157, 195, 0.15)', 'rgba(139, 157, 195, 0.05)']}
              style={styles.spellCard}
            >
              <View style={styles.spellHeader}>
                <Scroll size={20} color="#8b9dc3" />
                <Text style={styles.spellTitle}>{northernWolfMoon.title}</Text>
              </View>
              <Text style={styles.spellSubtitle}>{northernWolfMoon.subtitle}</Text>
              <Text style={styles.spellDescription}>{northernWolfMoon.description}</Text>

              <View style={styles.seasonalContextContainer}>
                <Text style={styles.seasonalContextTitle}>Seasonal Context</Text>
                <Text style={styles.seasonalContextText}>{northernWolfMoon.seasonalContext}</Text>
              </View>

              <View style={styles.spellDetails}>
                <View style={styles.spellDetailItem}>
                  <Text style={styles.spellDetailLabel}>Moon Phase</Text>
                  <Text style={styles.spellDetailValue}>{northernWolfMoon.moonPhase}</Text>
                </View>
                <View style={styles.spellDetailItem}>
                  <Text style={styles.spellDetailLabel}>Element</Text>
                  <Text style={styles.spellDetailValue}>{northernWolfMoon.element}</Text>
                </View>
              </View>

              <View style={styles.fullSpellContainer}>
                <Text style={styles.fullSpellTitle}>The Ritual</Text>
                <Text style={styles.fullSpellText}>{northernWolfMoon.fullSpell}</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Tips */}
          <View style={styles.tipsSection}>
            <Text style={styles.sectionTitle}>Mish's Cosmic Tips</Text>
            {tips.map((tip) => (
              <LinearGradient
                key={tip.title}
                colors={['rgba(139, 157, 195, 0.15)', 'rgba(139, 157, 195, 0.05)']}
                style={styles.tipCard}
              >
                <View style={styles.tipHeader}>
                  {tip.icon}
                  <Text style={styles.tipTitle}>{tip.title}</Text>
                </View>
                <Text style={styles.tipText}>{tip.tip}</Text>
              </LinearGradient>
            ))}
          </View>

          {/* Wisdom */}
          <LinearGradient
            colors={['rgba(212, 175, 55, 0.2)', 'rgba(139, 157, 195, 0.1)']}
            style={styles.wisdomCard}
          >
            <View style={styles.wisdomHeader}>
              <Eye size={24} color="#d4af37" />
              <Text style={styles.wisdomTitle}>Mish's Final Wisdom</Text>
            </View>
            <Text style={styles.wisdomText}>
              "Magic lives in your intention and the way you tend it. Trust your rhythm. Work with the moon. Let your boundaries be clean and your heart be free."
            </Text>
            <Text style={styles.wisdomSignature}>- Mystic Mish ✨</Text>
          </LinearGradient>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  headerCenter: { alignItems: 'center', paddingTop: 20, paddingBottom: 24 },
  title: {
    fontSize: 36,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#e8e8e8',
    textAlign: 'center',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#8b9dc3',
    textAlign: 'center',
    marginTop: 4,
  },
  welcomeCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  mishAvatarContainer: {
    position: 'relative',
    width: 80,
    height: 95,
    marginRight: 20,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  mishAvatar: { width: '100%', height: '100%', borderRadius: 18 },
  mishAvatarFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 80,
    height: 95,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 157, 195, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mishPreviewContainer: {
    alignItems: 'center',
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#d4af37',
    width: 100,
    height: 120,
  },
  mishPreviewImage: { width: '100%', height: '100%' },
  mishPreviewFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(139, 157, 195, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeContent: { flex: 1 },
  welcomeTitle: {
    fontSize: 22,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#d4af37',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#e8e8e8',
    lineHeight: 20,
  },

  moonMessageCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  moonHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  moonTitle: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#d4af37',
    marginLeft: 8,
  },
  moonPhaseText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 12,
  },
  moonMessage: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 8,
  },
  moonDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 20,
  },

  spellsSection: { marginBottom: 32 },
  sectionTitle: {
    fontSize: 28,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#e8e8e8',
    textAlign: 'center',
    marginBottom: 20,
  },
  spellCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  spellHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  spellTitle: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#e8e8e8',
    marginLeft: 8,
  },
  spellSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#d4af37',
    marginBottom: 8,
    textAlign: 'center',
  },
  spellDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#e8e8e8',
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'center',
  },

  spellDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  spellDetailItem: { alignItems: 'center' },
  spellDetailLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#8b9dc3',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  spellDetailValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#d4af37',
  },

  fullSpellContainer: {
    backgroundColor: 'rgba(26, 26, 46, 0.4)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 157, 195, 0.2)',
  },
  fullSpellTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#d4af37',
    marginBottom: 8,
  },
  fullSpellText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#e8e8e8',
    lineHeight: 20,
    fontStyle: 'italic',
  },

  seasonalContextContainer: {
    backgroundColor: 'rgba(26, 26, 46, 0.4)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 157, 195, 0.2)',
  },
  seasonalContextTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#8b9dc3',
    marginBottom: 4,
  },
  seasonalContextText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#e8e8e8',
    lineHeight: 18,
    fontStyle: 'italic',
  },

  tipsSection: { marginBottom: 32 },
  tipCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 157, 195, 0.3)',
  },
  tipHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tipTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#e8e8e8',
    marginLeft: 8,
  },
  tipText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#e8e8e8',
    lineHeight: 20,
  },

  wisdomCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  wisdomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  wisdomTitle: {
    fontSize: 22,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#d4af37',
    marginLeft: 8,
  },
  wisdomText: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#e8e8e8',
    lineHeight: 24,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  wisdomSignature: {
    fontSize: 16,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#d4af37',
    textAlign: 'center',
  },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#8b9dc3',
    marginTop: 12,
  },

  paywallCard: {
    borderRadius: 16,
    padding: 24,
    marginTop: 40,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    alignItems: 'center',
  },
  paywallHeader: { alignItems: 'center', marginBottom: 24 },
  paywallTitle: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#d4af37',
    marginTop: 12,
    textAlign: 'center',
    marginBottom: 16,
    ...Platform.select({
      web: { textShadow: '1px 1px 2px #4B0082' },
      default: {
        textShadowColor: '#4B0082',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
      },
    }),
  },
  mishEmojiLarge: { fontSize: 60, marginBottom: 8 },
  mishNameLarge: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFD700',
    textAlign: 'center',
  },
  paywallDescription: {
    fontSize: 20,
    fontFamily: 'Vazirmatn-Regular',
    color: '#e8e8e8',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 24,
  },
  featuresList: { gap: 12, marginBottom: 32, width: '100%' },
  featureItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  featureText: {
    fontSize: 18,
    fontFamily: 'Vazirmatn-Medium',
    color: '#e8e8e8',
    marginLeft: 12,
  },
  upgradeButton: { minWidth: 200 },
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
});
