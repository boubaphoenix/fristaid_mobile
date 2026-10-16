import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';

// Enregistre le service worker (web uniquement) et affiche un bandeau
// seulement quand une NOUVELLE version est prête — jamais au premier
// enregistrement (sinon tout nouvel utilisateur verrait "mise à jour
// disponible" dès sa première visite). `skipWaiting` n'est déclenché
// qu'au clic : changer le code qui tourne sous les pieds de l'utilisateur
// sans prévenir casserait un formulaire/quiz en cours.
export function UpdateBanner() {
  const [updateReady, setUpdateReady] = useState(false);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // `skipWaiting` fait prendre le contrôle au nouveau SW ; un seul
      // rechargement doit en résulter, jamais une boucle.
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });

    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // Un SW en attente dès l'enregistrement = l'utilisateur avait déjà
      // l'app ouverte pendant un déploiement.
      if (registration.waiting && registration.active) {
        waitingWorkerRef.current = registration.waiting;
        setUpdateReady(true);
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          // `registration.active` déjà présent = ce n'est pas la toute
          // première installation, c'est une mise à jour.
          if (newWorker.state === 'installed' && registration.active) {
            waitingWorkerRef.current = newWorker;
            setUpdateReady(true);
          }
        });
      });
    }).catch(() => {
      // Pas de service worker = pas de hors-ligne ni d'installation, mais
      // l'app reste utilisable en ligne — jamais bloquant.
    });
  }, []);

  if (!updateReady) return null;

  return (
    <View style={styles.banner}>
      <Text style={[typography.small, styles.text]}>Nouvelle version disponible</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => waitingWorkerRef.current?.postMessage({ type: 'SKIP_WAITING' })}>
        <Text style={[typography.smallBold, styles.action]}>Mettre à jour</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.trustBlue,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  text: {
    color: colors.white,
  },
  action: {
    color: colors.white,
  },
});
