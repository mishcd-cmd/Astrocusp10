// app/settings/subscription.tsx
// Minimal debug screen for Astral Plane route

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function AstralPlaneDebugScreen() {
  console.log('[AstralPlaneDebug] Rendered');

  const handleBack = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/settings');
      }
    } catch (err) {
      console.error('[AstralPlaneDebug] Back error', err);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.inner}>
          <Text style={styles.title}>Astral Plane (Debug)</Text>
          <Text style={styles.text}>
            If you can see this screen, the route wiring is fine and the crash
            is in the fancy Astral Plane UI, not the navigation.
          </Text>

          <TouchableOpacity style={styles.button} onPress={handleBack}>
            <Text style={styles.buttonText}>Back to Settings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050816' },
  safeArea: { flex: 1 },
  inner: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  title: {
    fontSize: 24,
    color: '#e8e8e8',
    textAlign: 'center',
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    color: '#8b9dc3',
    textAlign: 'center',
    maxWidth: 340,
  },
  button: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#8b9dc3',
  },
  buttonText: {
    color: '#050816',
    fontSize: 16,
  },
});
