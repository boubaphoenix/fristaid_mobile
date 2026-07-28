import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { LogoLockup } from '@/components/ui';
import { brand, typography } from '@/constants/theme';

const MIN_DISPLAY_MS = 900;

// Affiché uniquement juste après une connexion/inscription explicite
// (déclenché par login.tsx / register.tsx), jamais au redémarrage à froid
// avec un token déjà stocké — ce cas reste géré par le splash natif.
// Route volontairement hors des groupes (auth)/(tabs) : (auth)/_layout.tsx
// redirige tout accès à (auth)/* vers /(tabs) dès qu'un token existe, ce
// qui court-circuiterait cet écran s'il vivait dans ce groupe.
export default function PostAuthLoadingScreen() {
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();

    const timeout = setTimeout(() => {
      router.replace('/(tabs)');
    }, MIN_DISPLAY_MS);

    return () => {
      loop.stop();
      clearTimeout(timeout);
    };
  }, [pulse]);

  return (
    <View style={styles.container}>
      <LogoLockup markSize={96} wordmarkSize={26} variant="onForest" tagline={false} />
      <Animated.Text style={[typography.small, styles.loadingLabel, { opacity: pulse }]}>
        CHARGEMENT…
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.forest,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingLabel: {
    color: brand.mutedOnDark,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
