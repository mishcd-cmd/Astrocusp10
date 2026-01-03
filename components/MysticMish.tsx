// components/MysticMish.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getCurrentMoonPhase,
  getCurrentPlanetaryPositionsEnhanced,
} from '@/utils/astronomy';

// Fallback for web environment
if (typeof Platform === 'undefined') {
  (global as any).Platform = { OS: 'web' };
}

// Pre-import the avatar image
const mishAvatar = require('../assets/images/mystic-mish/headshot.png');

const { width: screenWidth } = Dimensions.get('window');

interface MysticMishProps {
  onRitualReveal?: (ritual: string) => void;
  hemisphere: 'Northern' | 'Southern';
}

function pad2(n: number) {
  return `${n}`.padStart(2, '0');
}

function ymdUTC(d = new Date()) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function withinDaysUTC(targetYmd: string, daysEitherSide = 1) {
  const now = new Date();
  const [y, m, d] = targetYmd.split('-').map(Number);
  const target = Date.UTC(y, (m || 1) - 1, d || 1);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffDays = Math.round((today - target) / 86400000);
  return Math.abs(diffDays) <= daysEitherSide;
}

function buildWolfMoonSpell(hemisphere: 'Northern' | 'Southern') {
  if (hemisphere === 'Southern') {
    return {
      title: '🌕 Wolf Moon Fire Release',
      subtitle: 'Full Moon in Cancer - Southern Hemisphere',
      teaser:
        'A blazing summer spell for emotional sovereignty, ancestral clearing, and fierce self-protection.',
      full: `🌕 Mystic Mish Spell: January 3rd Full Moon
🔥 Wolf Moon Fire Release
Full Moon in Cancer - Southern Hemisphere
A blazing summer spell for emotional sovereignty, ancestral clearing, and fierce self-protection.

Seasonal Context
The first Full Moon of 2026 arrives in Southern summer heat, burning bright in watery Cancer while the Sun stands opposite in Capricorn's mountain air. This Wolf Supermoon sits closer to Earth than usual, magnifying everything it touches. In the South, summer amplifies the fire element, making this a potent moment to burn away what no longer serves your emotional body and claim your territory with absolute clarity.
Moon Phase: Full Moon in Cancer (Wolf Supermoon)
Element: Fire (transformational release)

The Ritual
Full Moon in Cancer - Southern Hemisphere
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
    };
  }

  return {
    title: '🌕 Wolf Moon Water Reclamation',
    subtitle: 'Full Moon in Cancer - Northern Hemisphere',
    teaser:
      'A midwinter spell for emotional truth, ancestral healing, and quiet sovereignty beneath the snow.',
    full: `🌕 Mystic Mish Spell: January 3rd Full Moon
❄️ Wolf Moon Water Reclamation
Full Moon in Cancer - Northern Hemisphere
A midwinter spell for emotional truth, ancestral healing, and quiet sovereignty beneath the snow.

Seasonal Context
In the Northern winter, the Wolf Supermoon rises over frozen ground, illuminating everything that lives beneath the surface. Cancer's waters meet Capricorn's stone in the deep cold, asking you to look honestly at what you have been holding in the name of care, duty, or inherited obligation. This Moon is closer to Earth than most, pulling at your interior tides with unusual strength. The wolf howls not from aggression but from clarity about what belongs in the den and what must stay outside.
Moon Phase: Full Moon in Cancer (Wolf Supermoon)
Element: Water (emotional revelation)

The Ritual
Full Moon in Cancer - Northern Hemisphere
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
  };
}

export default function MysticMish({ onRitualReveal, hemisphere }: MysticMishProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentRitual, setCurrentRitual] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showRitual, setShowRitual] = useState(false);
  const [moonPhase, setMoonPhase] = useState(getCurrentMoonPhase());
  const [planetaryPositions, setPlanetaryPositions] = useState<any[]>([]);
  const [hasAccess, setHasAccess] = useState(true); // soft gate
  const [imageError, setImageError] = useState(false);

  const isMounted = useRef(true);

  // Persist Animated values across renders
  const floatAnimation = useRef(new Animated.Value(0)).current;
  const sparkleAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const wiggleAnimation = useRef(new Animated.Value(0)).current;

  const startAnimations = () => {
    // Keep iOS light for performance
    if (Platform.OS === 'ios') return;

    // Floating
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnimation, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnimation, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Sparkle pulse/rotate
    Animated.loop(
      Animated.timing(sparkleAnimation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();

    // Gentle wiggle
    Animated.loop(
      Animated.sequence([
        Animated.timing(wiggleAnimation, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(wiggleAnimation, {
          toValue: -1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(wiggleAnimation, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const buildPopupMessage = (phase: any) => {
    return 'The wolf howls its emotions to the moon, click the Mystic Mish tab to find out how you can let it go';
  };

  const checkRitualTime = async () => {
    const currentMoon = getCurrentMoonPhase();
    setMoonPhase(currentMoon);

    try {
      const positions =
        typeof getCurrentPlanetaryPositionsEnhanced === 'function'
          ? await getCurrentPlanetaryPositionsEnhanced(hemisphere as any)
          : [];
      setPlanetaryPositions(Array.isArray(positions) ? positions : []);
    } catch {
      setPlanetaryPositions([]);
    }

    const message = buildPopupMessage(currentMoon);

    if (isMounted.current) {
      setCurrentRitual(message);
      setIsVisible(true);
      startAnimations();
    }
  };

  const handleMishTap = () => {
    if (isAnimating) return;

    if (isMounted.current) setIsAnimating(true);

    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 1.15,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (isMounted.current) {
        setIsAnimating(false);
        setShowRitual(true);
        onRitualReveal?.(currentRitual);
      }
    });
  };

  useEffect(() => {
    isMounted.current = true;

    // Soft subscription check
    const checkAccess = async () => {
      try {
        const { getSubscriptionStatus } = await import('@/utils/billing');
        const subscriptionStatus = await getSubscriptionStatus();
        if (isMounted.current) {
          const allowed = subscriptionStatus?.active !== false;
          setHasAccess(allowed);
        }
      } catch {
        if (isMounted.current) setHasAccess(true);
      }
    };

    checkAccess();

    const isOldDevice =
      Platform.OS === 'ios' && (Number(Platform.Version) || 0) < 13;
    const delay = isOldDevice ? 3000 : 2000;

    const timer = setTimeout(async () => {
      if (isMounted.current) {
        await checkRitualTime();
      }
    }, delay);

    return () => {
      isMounted.current = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hemisphere]);

  // Auto-hide ritual popup after a while
  useEffect(() => {
    if (!showRitual) return;
    const timer = setTimeout(() => {
      if (isMounted.current) setShowRitual(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, [showRitual]);

  if (!isVisible) return null;

  const floatTransform = floatAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const sparkleOpacity = sparkleAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 1, 0.3],
  });

  const sparkleRotate = sparkleAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const wiggleRotate = wiggleAnimation.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-1.5deg', '0deg', '1.5deg'],
  });

  const getTransforms = () => {
    if (Platform.OS === 'ios') {
      return [{ scale: scaleAnimation }];
    }
    return [
      { translateY: floatTransform },
      { scale: scaleAnimation },
      { rotate: wiggleRotate },
    ];
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Ritual popup */}
      {showRitual && (
        <View style={styles.ritualPopup} pointerEvents="box-none">
          <LinearGradient
            colors={['rgba(139, 157, 195, 0.98)', 'rgba(75, 0, 130, 0.95)']}
            style={styles.ritualCard}
          >
            <Text style={styles.ritualTitle}>✨ Mystic Mish Says ✨</Text>
            <Text style={styles.moonPhaseText}>
              Current Moon: {moonPhase.phase} ({moonPhase.illumination}%)
            </Text>
            <Text style={styles.ritualText}>{currentRitual}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowRitual(false)}
            >
              <Text style={styles.closeButtonText}>Thank you, Mish! 🌟</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}

      {/* Mystic Mish character */}
      <Animated.View style={[styles.mishContainer, { transform: getTransforms() }]}>
        <TouchableOpacity
          onPress={handleMishTap}
          style={styles.mishTouchable}
          activeOpacity={0.8}
        >
          {/* Sparkles (skip for iOS to avoid native driver warnings) */}
          {Platform.OS !== 'ios' && (
            <>
              <Animated.View
                style={[
                  styles.sparkle,
                  styles.sparkle1,
                  { opacity: sparkleOpacity, transform: [{ rotate: sparkleRotate }] },
                ]}
              >
                <Text style={styles.sparkleText}>✨</Text>
              </Animated.View>
              <Animated.View
                style={[
                  styles.sparkle,
                  styles.sparkle2,
                  { opacity: sparkleOpacity, transform: [{ rotate: sparkleRotate }] },
                ]}
              >
                <Text style={styles.sparkleText}>🌟</Text>
              </Animated.View>
              <Animated.View
                style={[
                  styles.sparkle,
                  styles.sparkle3,
                  { opacity: sparkleOpacity, transform: [{ rotate: sparkleRotate }] },
                ]}
              >
                <Text style={styles.sparkleText}>⭐</Text>
              </Animated.View>
              <Animated.View
                style={[
                  styles.sparkle,
                  styles.sparkle4,
                  { opacity: sparkleOpacity, transform: [{ rotate: sparkleRotate }] },
                ]}
              >
                <Text style={styles.sparkleText}>💫</Text>
              </Animated.View>
            </>
          )}

          {/* Avatar */}
          <View style={styles.imageContainer}>
            {!imageError ? (
              <Image
                source={mishAvatar}
                style={styles.mishImage}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <View style={styles.mishPlaceholder}>
                <Text style={styles.mishEmoji}>🔮</Text>
                <Text style={styles.mishName}>Mish</Text>
              </View>
            )}
            {Platform.OS !== 'ios' && <View style={styles.glowEffect} />}
          </View>

          {/* Little ! bubble */}
          <View style={styles.speechBubble}>
            <Text style={styles.speechText}>!</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 120,
    left: 15,
    zIndex: 1000,
    pointerEvents: 'box-none',
  },
  mishContainer: {
    position: 'relative',
  },
  mishTouchable: {
    position: 'relative',
    padding: 8,
    pointerEvents: 'auto',
  },
  imageContainer: {
    position: 'relative',
    width: 85,
    height: 100,
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 0 12px rgba(255, 215, 0, 0.6)' },
      ios: {},
      default: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
      },
    }),
  },
  mishImage: {
    width: 80,
    height: 95,
    borderRadius: 18,
  },
  mishPlaceholder: {
    width: 80,
    height: 95,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 157, 195, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  mishEmoji: { fontSize: 32, marginBottom: 4 },
  mishName: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFD700',
    textAlign: 'center',
  },
  glowEffect: {
    position: 'absolute',
    inset: 0,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    ...Platform.select({
      web: { boxShadow: '0 0 15px rgba(255, 215, 0, 0.4)' },
      ios: {},
      default: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
      },
    }),
  },
  sparkle: { position: 'absolute', zIndex: 1 },
  sparkle1: { top: 2, left: 12 },
  sparkle2: { top: 18, right: 8 },
  sparkle3: { bottom: 15, left: 8 },
  sparkle4: { top: 35, right: 20 },
  sparkleText: {
    fontSize: 12,
    color: '#FFD700',
    ...Platform.select({
      web: { textShadow: '0 0 2px rgba(255, 255, 255, 1)' },
      ios: {},
      default: {
        textShadowColor: 'rgba(255, 255, 255, 1)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 2,
      },
    }),
  },
  speechBubble: {
    position: 'absolute',
    top: -2,
    right: 2,
    width: 20,
    height: 20,
    backgroundColor: '#FFD700',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    ...Platform.select({
      web: { boxShadow: '0 0 5px rgba(255, 215, 0, 0.8)' },
      ios: {},
      default: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 5,
      },
    }),
  },
  speechText: { color: '#4B0082', fontSize: 12, fontFamily: 'Inter-Bold' },

  ritualPopup: {
    position: 'absolute',
    top: 0,
    left: 95,
    width: Math.min(screenWidth - 130, 280),
    zIndex: 1001,
  },
  ritualCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: '#FFD700',
    ...Platform.select({
      web: { boxShadow: '0 0 12px rgba(255, 215, 0, 0.6)' },
      ios: {},
      default: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
      },
    }),
  },
  ritualTitle: {
    fontSize: 15,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 10,
    ...Platform.select({
      web: { textShadow: '1px 1px 2px #4B0082' },
      ios: {},
      default: {
        textShadowColor: '#4B0082',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
      },
    }),
  },
  moonPhaseText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.8,
  },
  ritualText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
    lineHeight: 18,
    marginBottom: 14,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.25)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  closeButtonText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#FFD700',
    textAlign: 'center',
  },
});
