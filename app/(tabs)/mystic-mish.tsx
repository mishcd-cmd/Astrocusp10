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

  // === November Spells (Southern Hemisphere focus) ===
  const southernNovemberSpell = {
    title: '🌸 The Flower Moon Grounding',
    subtitle: 'Full Moon in Taurus - Southern',
    description:
      'A grounding ritual for blossoming growth and sensual calm as the season expands',
    seasonalContext:
      'November in the South carries Flower Moon tone. Beauty is rising. Anchor growth with steady earth magic.',
    fullSpell: `Full Moon in Taurus - Southern
Theme: grounding, stability, sensual renewal
Items: moss agate, rose quartz, carnelian
Herbs: thyme, patchouli, cinnamon
Colors: deep green, copper, cream

Steps
1) Create an earthy altar with stones and soft candlelight.
2) Anoint palms and trace small spirals over heart and hips.
3) Light an intention candle for what you nourish this month.
4) Speak:
"Root me in the soil of serenity.
Let what I build be blessed and steady.
I call in pleasure, patience, peace.
The world turns slow, my heart finds ease."
5) Bury a coin or seed in soil to anchor abundance.`.trim(),
    moonPhase: 'Full Moon in Taurus',
    element: 'Earth',
  };

  const southernNovemberNewMoon = {
    title: '🌑 The Shadow Bloom',
    subtitle: 'New Moon in Scorpio - Southern',
    description:
      'A transformation rite that turns release into rebirth with early summer pulse',
    seasonalContext:
      'Scorpio New Moon meets rising warmth. Rebirth comes through passion and courage. Express your change outwardly.',
    fullSpell: `New Moon in Scorpio - Southern
Theme: transformation, mystery, rebirth
Items: obsidian, smoky quartz, labradorite
Herbs: mugwort, sage, myrrh
Colors: black, indigo, silver

Steps
1) Dim the room and sit with one candle.
2) Write what you will release and burn it safely with gratitude.
3) Anoint wrists and trace a crescent over each pulse.
4) Sit in quiet and picture a gentle inner glow.

Incantation:
"In darkness, I remember my light.
What I release becomes new life.
I trust my shadows to teach me grace.
I am reborn within this sacred space."`.trim(),
    moonPhase: 'New Moon in Scorpio',
    element: 'Water',
  };

  // === November Spells (Northern Hemisphere focus) ===
  const northernNovemberSpell = {
    title: '❄️ The Frost Moon Resting',
    subtitle: 'Full Moon in Taurus - Northern',
    description:
      'A steadying rite for warmth, rest, and completion as the world cools',
    seasonalContext:
      'November in the North carries Frost Moon tone. Stillness is growth. Let endings become winter seed.',
    fullSpell: `Full Moon in Taurus - Northern
Theme: grounding, stability, sensual renewal
Items: moss agate, rose quartz, carnelian
Herbs: thyme, patchouli, cinnamon
Colors: deep green, copper, cream

Steps
1) Build a simple altar that feels warm and calm.
2) Anoint palms and trace spirals over heart and hips to ground.
3) Light an intention candle for steady progress.
4) Speak:
"Root me in the soil of serenity.
Let what I build be blessed and steady.
I call in pleasure, patience, peace.
The world turns slow, my heart finds ease."
5) Place a coin or seed into soil to symbolize safe growth through winter.`.trim(),
    moonPhase: 'Full Moon in Taurus',
    element: 'Earth',
  };

  const northernNovemberNewMoon = {
    title: '🌑 The Shadow Bloom',
    subtitle: 'New Moon in Scorpio - Northern',
    description:
      'A quiet rebirth rite that honors deep stillness and soul alchemy',
    seasonalContext:
      'Scorpio New Moon arrives with late autumn descent. The vision forms within the dark and the quiet.',
    fullSpell: `New Moon in Scorpio - Northern
Theme: transformation, mystery, rebirth
Items: obsidian, smoky quartz, labradorite
Herbs: mugwort, sage, myrrh
Colors: black, indigo, silver

Steps
1) Darken the room and sit with a single flame.
2) Write what you release and burn it safely with thanks.
3) Anoint wrists and trace a crescent over each pulse.
4) Sit in silence and sense your inner light returning.

Incantation:
"In darkness, I remember my light.
What I release becomes new life.
I trust my shadows to teach me grace.
I am reborn within this sacred space."`.trim(),
    moonPhase: 'New Moon in Scorpio',
    element: 'Water',
  };

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
        "If you are on a cusp, you can work both signs. Blend ruling planets and elements to fit your intention.",
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
                I am Mystic Mish. I appear when the energy is ripe for magic. Let us align your ritual to the month and the moon.
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

            {/* Updated headline message */}
            <Text style={styles.moonMessage}>
              November energy is strong and includes the years 1st micro moon. See spells below.
            </Text>
            <Text style={styles.moonDescription}>
              Choose the version that fits your hemisphere and the moon you plan to work with.
            </Text>
          </LinearGradient>

          {/* Southern Hemisphere Spells */}
          <View style={styles.spellsSection}>
            <Text style={styles.sectionTitle}>🌍 Southern Hemisphere Spells</Text>

            {/* Southern Full Moon */}
            <LinearGradient
              colors={['rgba(212, 175, 55, 0.2)', 'rgba(212, 175, 55, 0.1)']}
              style={styles.spellCard}
            >
              <View style={styles.spellHeader}>
                <Scroll size={20} color="#d4af37" />
                <Text style={styles.spellTitle}>{southernNovemberSpell.title}</Text>
              </View>
              <Text style={styles.spellSubtitle}>{southernNovemberSpell.subtitle}</Text>
              <Text style={styles.spellDescription}>{southernNovemberSpell.description}</Text>

              <View style={styles.seasonalContextContainer}>
                <Text style={styles.seasonalContextTitle}>Seasonal Context</Text>
                <Text style={styles.seasonalContextText}>{southernNovemberSpell.seasonalContext}</Text>
              </View>

              <View style={styles.spellDetails}>
                <View style={styles.spellDetailItem}>
                  <Text style={styles.spellDetailLabel}>Moon Phase</Text>
                  <Text style={styles.spellDetailValue}>{southernNovemberSpell.moonPhase}</Text>
                </View>
                <View style={styles.spellDetailItem}>
                  <Text style={styles.spellDetailLabel}>Element</Text>
                  <Text style={styles.spellDetailValue}>{southernNovemberSpell.element}</Text>
                </View>
              </View>

              <View style={styles.fullSpellContainer}>
                <Text style={styles.fullSpellTitle}>The Ritual</Text>
                <Text style={styles.fullSpellText}>{southernNovemberSpell.fullSpell}</Text>
              </View>
            </LinearGradient>

            {/* Southern New Moon */}
            <LinearGradient
              colors={['rgba(212, 175, 55, 0.2)', 'rgba(212, 175, 55, 0.1)']}
              style={styles.spellCard}
            >
              <View style={styles.spellHeader}>
                <Scroll size={20} color="#d4af37" />
                <Text style={styles.spellTitle}>{southernNovemberNewMoon.title}</Text>
              </View>
              <Text style={styles.spellSubtitle}>{southernNovemberNewMoon.subtitle}</Text>
              <Text style={styles.spellDescription}>{southernNovemberNewMoon.description}</Text>

              <View style={styles.seasonalContextContainer}>
                <Text style={styles.seasonalContextTitle}>Seasonal Context</Text>
                <Text style={styles.seasonalContextText}>{southernNovemberNewMoon.seasonalContext}</Text>
              </View>

              <View style={styles.spellDetails}>
                <View style={styles.spellDetailItem}>
                  <Text style={styles.spellDetailLabel}>Moon Phase</Text>
                  <Text style={styles.spellDetailValue}>{southernNovemberNewMoon.moonPhase}</Text>
                </View>
                <View style={styles.spellDetailItem}>
                  <Text style={styles.spellDetailLabel}>Element</Text>
                  <Text style={styles.spellDetailValue}>{southernNovemberNewMoon.element}</Text>
                </View>
              </View>

              <View style={styles.fullSpellContainer}>
                <Text style={styles.fullSpellTitle}>The Ritual</Text>
                <Text style={styles.fullSpellText}>{southernNovemberNewMoon.fullSpell}</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Northern Hemisphere Spells */}
          <View style={styles.spellsSection}>
            <Text style={styles.sectionTitle}>🌎 Northern Hemisphere Spells</Text>

            {/* Northern Full Moon */}
            <LinearGradient
              colors={['rgba(139, 157, 195, 0.15)', 'rgba(139, 157, 195, 0.05)']}
              style={styles.spellCard}
            >
              <View style={styles.spellHeader}>
                <Scroll size={20} color="#8b9dc3" />
                <Text style={styles.spellTitle}>{northernNovemberSpell.title}</Text>
              </View>
              <Text style={styles.spellSubtitle}>{northernNovemberSpell.subtitle}</Text>
              <Text style={styles.spellDescription}>{northernNovemberSpell.description}</Text>

              <View style={styles.seasonalContextContainer}>
                <Text style={styles.seasonalContextTitle}>Seasonal Context</Text>
                <Text style={styles.seasonalContextText}>{northernNovemberSpell.seasonalContext}</Text>
              </View>

              <View style={styles.spellDetails}>
                <View style={styles.spellDetailItem}>
                  <Text style={styles.spellDetailLabel}>Moon Phase</Text>
                  <Text style={styles.spellDetailValue}>{northernNovemberSpell.moonPhase}</Text>
                </View>
                <View style={styles.spellDetailItem}>
                  <Text style={styles.spellDetailLabel}>Element</Text>
                  <Text style={styles.spellDetailValue}>{northernNovemberSpell.element}</Text>
                </View>
              </View>

              <View style={styles.fullSpellContainer}>
                <Text style={styles.fullSpellTitle}>The Ritual</Text>
                <Text style={styles.fullSpellText}>{northernNovemberSpell.fullSpell}</Text>
              </View>
            </LinearGradient>

            {/* Northern New Moon */}
            <LinearGradient
              colors={['rgba(139, 157, 195, 0.15)', 'rgba(139, 157, 195, 0.05)']}
              style={styles.spellCard}
            >
              <View style={styles.spellHeader}>
                <Scroll size={20} color="#8b9dc3" />
                <Text style={styles.spellTitle}>{northernNovemberNewMoon.title}</Text>
              </View>
              <Text style={styles.spellSubtitle}>{northernNovemberNewMoon.subtitle}</Text>
              <Text style={styles.spellDescription}>{northernNovemberNewMoon.description}</Text>

              <View style={styles.seasonalContextContainer}>
                <Text style={styles.seasonalContextTitle}>Seasonal Context</Text>
                <Text style={styles.seasonalContextText}>{northernNovemberNewMoon.seasonalContext}</Text>
              </View>

              <View style={styles.spellDetails}>
                <View style={styles.spellDetailItem}>
                  <Text style={styles.spellDetailLabel}>Moon Phase</Text>
                  <Text style={styles.spellDetailValue}>{northernNovemberNewMoon.moonPhase}</Text>
                </View>
                <View style={styles.spellDetailItem}>
                  <Text style={styles.spellDetailLabel}>Element</Text>
                  <Text style={styles.spellDetailValue}>{northernNovemberNewMoon.element}</Text>
                </View>
              </View>

              <View style={styles.fullSpellContainer}>
                <Text style={styles.fullSpellTitle}>The Ritual</Text>
                <Text style={styles.fullSpellText}>{northernNovemberNewMoon.fullSpell}</Text>
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
              "Magic lives in your intention and the way you tend it. Trust your rhythm. Work with the moon. Let your path be simple and true."
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
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    width: 80, height: 95, borderRadius: 18,
    backgroundColor: 'rgba(139, 157, 195, 0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  mishPreviewContainer: {
    alignItems: 'center', marginBottom: 24, borderRadius: 20,
    overflow: 'hidden', borderWidth: 2, borderColor: '#d4af37', width: 100, height: 120,
  },
  mishPreviewImage: { width: '100%', height: '100%' },
  mishPreviewFallback: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(139, 157, 195, 0.1)', alignItems: 'center', justifyContent: 'center',
  },
  welcomeContent: { flex: 1 },
  welcomeTitle: { fontSize: 22, fontFamily: 'PlayfairDisplay-Bold', color: '#d4af37', marginBottom: 8 },
  welcomeText: { fontSize: 16, fontFamily: 'Inter-Regular', color: '#e8e8e8', lineHeight: 20 },

  moonMessageCard: {
    borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 2, borderColor: '#FFD700',
  },
  moonHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  moonTitle: { fontSize: 20, fontFamily: 'PlayfairDisplay-Bold', color: '#d4af37', marginLeft: 8 },
  moonPhaseText: {
    fontSize: 16, fontFamily: 'Inter-Regular', color: '#FFD700', textAlign: 'center', marginBottom: 12,
  },
  moonMessage: {
    fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#FFD700', textAlign: 'center', marginBottom: 8,
  },
  moonDescription: {
    fontSize: 16, fontFamily: 'Inter-Regular', color: '#ffffff', textAlign: 'center', lineHeight: 20,
  },

  spellsSection: { marginBottom: 32 },
  sectionTitle: {
    fontSize: 28, fontFamily: 'PlayfairDisplay-Bold', color: '#e8e8e8', textAlign: 'center', marginBottom: 20,
  },
  spellCard: {
    borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  spellHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  spellTitle: { fontSize: 20, fontFamily: 'PlayfairDisplay-Bold', color: '#e8e8e8', marginLeft: 8 },
  spellSubtitle: { fontSize: 16, fontFamily: 'Inter-Medium', color: '#d4af37', marginBottom: 8, textAlign: 'center' },
  spellDescription: { fontSize: 16, fontFamily: 'Inter-Regular', color: '#e8e8e8', lineHeight: 20, marginBottom: 16, textAlign: 'center' },

  spellDetails: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 20 },
  spellDetailItem: { alignItems: 'center' },
  spellDetailLabel: {
    fontSize: 14, fontFamily: 'Inter-Medium', color: '#8b9dc3', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1,
  },
  spellDetailValue: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#d4af37' },

  fullSpellContainer: {
    backgroundColor: 'rgba(26, 26, 46, 0.4)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(139, 157, 195, 0.2)',
  },
  fullSpellTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#d4af37', marginBottom: 8 },
  fullSpellText: { fontSize: 16, fontFamily: 'Inter-Regular', color: '#e8e8e8', lineHeight: 20, fontStyle: 'italic' },

  seasonalContextContainer: {
    backgroundColor: 'rgba(26, 26, 46, 0.4)', borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(139, 157, 195, 0.2)',
  },
  seasonalContextTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#8b9dc3', marginBottom: 4 },
  seasonalContextText: { fontSize: 15, fontFamily: 'Inter-Regular', color: '#e8e8e8', lineHeight: 18, fontStyle: 'italic' },

  tipsSection: { marginBottom: 32 },
  tipCard: {
    borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(139, 157, 195, 0.3)',
  },
  tipHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tipTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#e8e8e8', marginLeft: 8 },
  tipText: { fontSize: 16, fontFamily: 'Inter-Regular', color: '#e8e8e8', lineHeight: 20 },

  wisdomCard: { borderRadius: 16, padding: 24, borderWidth: 2, borderColor: 'rgba(212, 175, 55, 0.4)' },
  wisdomHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  wisdomTitle: { fontSize: 22, fontFamily: 'PlayfairDisplay-Bold', color: '#d4af37', marginLeft: 8 },
  wisdomText: {
    fontSize: 18, fontFamily: 'Inter-Regular', color: '#e8e8e8', lineHeight: 24, textAlign: 'center', fontStyle: 'italic', marginBottom: 12,
  },
  wisdomSignature: { fontSize: 16, fontFamily: 'PlayfairDisplay-Bold', color: '#d4af37', textAlign: 'center' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 18, fontFamily: 'Inter-Regular', color: '#8b9dc3', marginTop: 12 },

  paywallCard: {
    borderRadius: 16, padding: 24, marginTop: 40, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.3)', alignItems: 'center',
  },
  paywallHeader: { alignItems: 'center', marginBottom: 24 },
  paywallTitle: {
    fontSize: 32, fontFamily: 'PlayfairDisplay-Bold', color: '#d4af37', marginTop: 12, textAlign: 'center', marginBottom: 16,
    ...Platform.select({
      web: { textShadow: '1px 1px 2px #4B0082' },
      default: { textShadowColor: '#4B0082', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
    }),
  },
  mishEmojiLarge: { fontSize: 60, marginBottom: 8 },
  mishNameLarge: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: '#FFD700', textAlign: 'center' },
  paywallDescription: {
    fontSize: 20, fontFamily: 'Vazirmatn-Regular', color: '#e8e8e8', textAlign: 'center', lineHeight: 26, marginBottom: 24,
  },
  featuresList: { gap: 12, marginBottom: 32, width: '100%' },
  featureItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  featureText: { fontSize: 18, fontFamily: 'Vazirmatn-Medium', color: '#e8e8e8', marginLeft: 12 },
  upgradeButton: { minWidth: 200 },
  headerIcon: { fontSize: 48, marginBottom: 6, color: '#d4af37' },
  headerTitle: { fontSize: 26, color: '#e8e8e8', fontFamily: 'Vazirmatn-Bold', textAlign: 'center' },
  headerSubtitle: { marginTop: 4, color: '#8b9dc3', fontSize: 16, fontFamily: 'Vazirmatn-Regular', textAlign: 'center' },
});
