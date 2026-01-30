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

// Pre import the avatar image
const mishAvatar = require('../assets/images/mystic-mish/headshot.png');

const { width: screenWidth } = Dimensions.get('window');

interface MysticMishProps {
  onRitualReveal?: (ritual: string) => void;
  hemisphere: 'Northern' | 'Southern';
}

function buildSnowMoonTeaser(hemisphere: 'Northern' | 'Southern') {
  if (hemisphere === 'Southern') {
    return 'The Grain Moon reveals what has finished growing. Click Mystic Mish to choose what you carry forward.';
  }

  return 'The Snow Moon illuminates hidden emotions. Click Mystic Mish to reclaim what is truly yours.';
}

export default function MysticMish({ onRitualReveal, hemisphere }: MysticMishProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentRitual, setCurrentRitual] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showRitual, setShowRitual] = useState(false);
  const [moonPhase, setMoonPhase] = useState(getCurrentMoonPhase());
  const [planetaryPositions, setPlanetaryPositions] = useState<any[]>([]);
  const [hasAccess, setHasAccess] = useState(true);
  const [imageError, setImageError] = useState(false);

  const isMounted = useRef(true);

  // Persist animated values
  const floatAnimation = useRef(new Animated.Value(0)).current;
  const sparkleAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const wiggleAnimation = useRef(new Animated.Value(0)).current;

  const startAnimations = () => {
    if (Platform.OS === 'ios') return;

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnimation, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(floatAnimation, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(sparkleAnimation, { toValue: 1, duration: 2000, useNativeDriver: true })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(wiggleAnimation, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(wiggleAnimation, { toValue: -1, duration: 4000, useNativeDriver: true }),
        Animated.timing(wiggleAnimation, { toValue: 0, duration: 4000, useNativeDriver: true }),
      ])
    ).start();
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

    const teaser = buildSnowMoonTeaser(hemisphere);

    if (isMounted.current) {
      setCurrentRitual(teaser);
      setIsVisible(true);
      startAnimations();
    }
  };

  const handleMishTap = () => {
    if (isAnimating) return;

    setIsAnimating(true);

    Animated.sequence([
      Animated.timing(scaleAnimation, { toValue: 1.15, duration: 200, useNativeDriver: true }),
      Animated.timing(scaleAnimation, { toValue: 1, duration: 200, useNativeDriver: true }),
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

    const timer = setTimeout(async () => {
      if (isMounted.current) {
        await checkRitualTime();
      }
    }, 2000);

    return () => {
      isMounted.current = false;
      clearTimeout(timer);
    };
  }, [hemisphere]);

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

  const transforms =
    Platform.OS === 'ios'
      ? [{ scale: scaleAnimation }]
      : [{ translateY: floatTransform }, { scale: scaleAnimation }, { rotate: wiggleRotate }];

  return (
    <View style={styles.container} pointerEvents="box-none">
      {showRitual && (
        <View style={styles.ritualPopup} pointerEvents="box-none">
          <LinearGradient
            colors={['rgba(139,157,195,0.98)', 'rgba(75,0,130,0.95)']}
            style={styles.ritualCard}
          >
            <Text style={styles.ritualTitle}>✨ Mystic Mish Says ✨</Text>
            <Text style={styles.moonPhaseText}>
              {moonPhase.phase} ({moonPhase.illumination}%)
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

      <Animated.View style={[styles.mishContainer, { transform: transforms }]}>
        <TouchableOpacity onPress={handleMishTap} activeOpacity={0.8}>
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
          </View>
          <View style={styles.speechBubble}>
            <Text style={styles.speechText}>!</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 120, left: 15, zIndex: 1000 },
  mishContainer: { position: 'relative' },
  imageContainer: {
    width: 85,
    height: 100,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  mishImage: { width: 80, height: 95, borderRadius: 18 },
  mishPlaceholder: {
    width: 80,
    height: 95,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139,157,195,0.1)',
  },
  mishEmoji: { fontSize: 32 },
  mishName: { fontSize: 12, color: '#FFD700' },
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
  },
  speechText: { color: '#4B0082', fontSize: 12 },
  ritualPopup: {
    position: 'absolute',
    left: 95,
    width: Math.min(screenWidth - 130, 280),
    zIndex: 1001,
  },
  ritualCard: { borderRadius: 16, padding: 18, borderWidth: 2, borderColor: '#FFD700' },
  ritualTitle: { textAlign: 'center', color: '#FFD700', marginBottom: 8 },
  moonPhaseText: { textAlign: 'center', color: '#FFD700', fontSize: 12 },
  ritualText: { textAlign: 'center', color: '#fff', marginVertical: 10 },
  closeButton: { alignSelf: 'center', padding: 6 },
  closeButtonText: { color: '#FFD700', fontSize: 11 },
});
