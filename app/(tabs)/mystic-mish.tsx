// app/(tabs)/MysticMish.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Moon, Star, Sparkles, Eye, Scroll, Crown } from 'lucide-react-native';
import CosmicBackground from '../../components/CosmicBackground';
import CosmicButton from '../../components/CosmicButton';
import { getCurrentMoonPhase } from '../../utils/astronomy';
import { getSubscriptionStatus } from '../../utils/billing';

// Fallback for web environment
if (typeof Platform === 'undefined') {
  (global as any).Platform = { OS: 'web' };
}

// ✅ Pre import the avatar image
const mishAvatar = require('../../assets/images/mystic-mish/headshot.png');

function buildBloodMoonEclipseSpell(hemisphere: 'Northern' | 'Southern') {
  if (hemisphere === 'Southern') {
    return {
      title: '🍂 Eclipse of the Falling Leaves',
      subtitle: 'Full Moon Lunar Eclipse in Virgo - Southern Hemisphere',
      description:
        'A late summer to early autumn eclipse spell for purification, karmic clearing, and releasing perfection that no longer serves you.',
      seasonalContext:
        'In the Southern Hemisphere, this eclipse rises as the heat begins to soften and the first hints of autumn stir. Virgo governs refinement, discernment, health, and sacred order. But under a Blood Moon eclipse, Virgo energy can expose where you have over corrected, over controlled, or tried to earn worth through perfection. Eclipses remove what is unsustainable. This ritual clears self judgement, inherited standards, and quiet exhaustion.',
      fullSpell: `Full Moon Lunar Eclipse in Virgo - Southern Hemisphere
Theme: purification, karmic release, sacred recalibration
Items: dark red or deep burgundy candle, small bowl of salt, dried bay leaf, paper, pen, small dish of soil, heat safe bowl
Colours: rust red, charcoal, deep olive, ash grey

Steps
1) Step outside if possible during the eclipse peak. If not, open a window. Light the red candle and place the bowl of salt before you. Say: "I allow what is misaligned to be revealed. I am willing to release what I have outgrown."
2) On the paper, write three standards or expectations you have been holding yourself to that feel heavy or joyless. Be precise. Virgo honours honesty.
3) Sprinkle salt over the paper and fold it once. Place a bay leaf on top and say: "I release the burden of earning my worth."
4) Burn the paper safely in the heat safe bowl. Watch it fully turn to ash. Do not rush this.
5) Mix the ash into the soil. Press your fingertips into the mixture and touch your forehead and heart.
6) Return the soil to the earth tomorrow morning. Eclipses seal overnight.
7) Before sleep, wash your hands slowly with warm water and say your full name clearly. You are closing one chapter.

Note
Eclipses can feel destabilising in the days before and after. If something exits your life around this time, trust that it was already fragile. The Blood Moon clears what quiet discipline has been unable to.`,
      moonPhase: 'Total Lunar Eclipse in Virgo (Blood Moon)',
      element: 'Earth & Fire',
    };
  }

  return {
    title: '🪱 Worm Moon Eclipse Threshold',
    subtitle: 'Full Moon Lunar Eclipse in Virgo - Northern Hemisphere',
    description:
      'An early spring eclipse spell for breaking dormant patterns and reclaiming embodied power.',
    seasonalContext:
      'In the Northern Hemisphere, the Worm Moon signals thawing soil and the return of movement beneath the ground. Earthworms rise as the frost retreats. Life begins again. But this year, the Worm Moon becomes a Blood Moon eclipse. What has been hidden beneath the surface may surface abruptly. Virgo energy highlights habits, health, routines, and internal criticism. This ritual breaks cycles that survived winter but cannot follow you into spring.',
    fullSpell: `Full Moon Lunar Eclipse in Virgo - Northern Hemisphere
Theme: pattern breaking, embodied reset, karmic shedding
Items: white candle, small bowl of soil or compost, dried herbs such as rosemary or thyme, paper, pen, small bell or chime
Colours: soft green, cream, earthy brown, muted red

Steps
1) Light the candle. Hold the soil in your hands and say: "I am ready for what awakens now."
2) Write down three habits, self criticisms, or routines that have kept you small.
3) Crumble the paper into the soil. Mix it with your fingers. Say: "This pattern dissolves. I choose renewal."
4) Sprinkle the dried herbs into the bowl. Ring the bell once clearly. Sound seals eclipse work.
5) Sit quietly for five minutes visualising roots growing from your feet into thawing earth. You are stabilising new ground.
6) Bury the mixture outdoors within three days. Do not keep eclipse remnants inside your home.
7) On the morning after burial, change one small daily habit immediately. Eclipses demand action.

Note
If revelations arrive suddenly, resist the urge to over analyse. Virgo under eclipse energy reveals flaws not to shame you, but to liberate you.`,
    moonPhase: 'Total Lunar Eclipse in Virgo (Blood Moon, Worm Moon)',
    element: 'Earth & Air',
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

  // Blood Moon Eclipse spells
  const southernSpell = buildBloodMoonEclipseSpell('Southern');
  const northernSpell = buildBloodMoonEclipseSpell('Northern');

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
    {
      icon: <Eye size={20} color="#d4af37" />,
      title: 'Eclipse Energy',
      tip:
        'Eclipses accelerate fate. Use them for release and recalibration rather than big manifestations.',
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
                I am Mystic Mish. I appear when the sky turns red and the veil thins. Let us align your ritual to the current Full Moon and your hemisphere.
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
              The Full Moon is here. This is culmination, release, and emotional clarity.
            </Text>
            <Text style={styles.moonDescription}>
              This lunation is a Blood Moon eclipse. Eclipses accelerate truth. Choose the ritual for your hemisphere below.
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
                <Text style={styles.spellTitle}>{southernSpell.title}</Text>
              </View>
              <Text style={styles.spellSubtitle}>{southernSpell.subtitle}</Text>
              <Text style={styles.spellDescription}>{southernSpell.description}</Text>

              <View style={styles.seasonalContextContainer}>
                <Text style={styles.seasonalContextTitle}>Seasonal Context</Text>
                <Text style={styles.seasonalContextText}>{southernSpell.seasonalContext}</Text>
              </View>

              <View style={styles.spellDetails}>
                <View style={styles.spellDetailItem}>
                  <Text style={styles.spellDetailLabel}>Moon Phase</Text>
                  <Text style={styles.spellDetailValue}>{southernSpell.moonPhase}</Text>
                </View>
                <View style={styles.spellDetailItem}>
                  <Text style={styles.spellDetailLabel}>Element</Text>
                  <Text style={styles.spellDetailValue}>{southernSpell.element}</Text>
                </View>
              </View>

              <View style={styles.fullSpellContainer}>
                <Text style={styles.fullSpellTitle}>The Ritual</Text>
                <Text style={styles.fullSpellText}>{southernSpell.fullSpell}</Text>
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
                <Text style={styles.spellTitle}>{northernSpell.title}</Text>
              </View>
              <Text style={styles.spellSubtitle}>{northernSpell.subtitle}</Text>
              <Text style={styles.spellDescription}>{northernSpell.description}</Text>

              <View style={styles.seasonalContextContainer}>
                <Text style={styles.seasonalContextTitle}>Seasonal Context</Text>
                <Text style={styles.seasonalContextText}>{northernSpell.seasonalContext}</Text>
              </View>

              <View style={styles.spellDetails}>
                <View style={styles.spellDetailItem}>
                  <Text style={styles.spellDetailLabel}>Moon Phase</Text>
                  <Text style={styles.spellDetailValue}>{northernSpell.moonPhase}</Text>
                </View>
                <View style={styles.spellDetailItem}>
                  <Text style={styles.spellDetailLabel}>Element</Text>
                  <Text style={styles.spellDetailValue}>{northernSpell.element}</Text>
                </View>
              </View>

              <View style={styles.fullSpellContainer}>
                <Text style={styles.fullSpellTitle}>The Ritual</Text>
                <Text style={styles.fullSpellText}>{northernSpell.fullSpell}</Text>
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
              "When the Moon turns red, truth is closer than comfort. Let what falls away fall. You are not losing stability. You are shedding a skin."
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