import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';

const BANNER_DISMISSED_KEY = 'africasecour_install_banner_dismissed';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type Props = {
  // "settings" : rangée permanente dans Profil, toujours visible tant que
  // l'app n'est pas installée. "banner" : affiché une seule fois par
  // l'écran appelant (ex. après un premier cours terminé), avec un bouton
  // pour l'ignorer durablement. "welcome" : carte blanche sur les écrans
  // d'avant connexion (fond forêt), pour qui arrive par le lien ou le QR code.
  variant: 'settings' | 'banner' | 'welcome';
};

// Toute cette logique n'a de sens que sur web (PWA) — le natif a déjà sa
// propre icône d'app, pas de notion d'installation depuis le navigateur.
// Rien ici ne touche à window/navigator/localStorage en dehors d'un
// useEffect : le rendu statique (`expo export -p web`) exécute ce
// composant côté serveur, où ces globales n'existent pas.
export function InstallPrompt({ variant }: Props) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [dismissed, setDismissed] = useState(variant === 'banner');
  const [help, setHelp] = useState<string | null>(null);
  // Faux pendant le rendu statique et la 1re hydratation : évite d'afficher
  // la carte une fraction de seconde dans l'app déjà installée.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    setReady(true);

    setIsStandalone(
      window.matchMedia?.('(display-mode: standalone)').matches === true ||
        (navigator as unknown as { standalone?: boolean }).standalone === true,
    );
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream);

    if (variant === 'banner') {
      setDismissed(window.localStorage?.getItem(BANNER_DISMISSED_KEY) === 'true');
    } else {
      setDismissed(false);
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [variant]);

  if (Platform.OS !== 'web' || !ready || isStandalone || dismissed) return null;

  async function handleInstallPress() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    // Pas d'invite automatique : iOS (jamais), Samsung Internet, Firefox,
    // navigateur intégré de WhatsApp/Facebook, ou Chrome pas encore prêt.
    // On explique le geste manuel.
    setHelp(
      isIos
        ? "Appuyez sur le bouton Partager de Safari, puis « Sur l'écran d'accueil »."
        : "Ouvrez le menu du navigateur (les trois points en haut à droite), puis « Installer l'application » ou « Ajouter à l'écran d'accueil ». Si vous êtes dans WhatsApp ou Facebook, ouvrez d'abord ce lien dans Chrome.",
    );
  }

  function handleDismiss() {
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem(BANNER_DISMISSED_KEY, 'true');
    }
    setDismissed(true);
  }

  return (
    <View
      style={[
        styles.container,
        variant === 'banner' && styles.bannerContainer,
        variant === 'welcome' && styles.welcomeContainer,
      ]}>
      <Pressable accessibilityRole="button" onPress={handleInstallPress} style={styles.row}>
        <View style={styles.textBlock}>
          <Text style={typography.bodyBold}>Installer AfricaSecours</Text>
          <Text style={[typography.small, styles.muted]}>
            Accès plus rapide, plein écran, fonctionne même hors-ligne.
          </Text>
        </View>
      </Pressable>
      {variant === 'banner' ? (
        <Pressable accessibilityRole="button" onPress={handleDismiss} hitSlop={8}>
          <Text style={[typography.caption, styles.dismiss]}>Ne plus afficher</Text>
        </Pressable>
      ) : null}
      {help ? <Text style={[typography.caption, styles.muted, styles.iosHelp]}>{help}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bannerContainer: {
    backgroundColor: colors.trustBg,
    borderColor: colors.trustBlue,
  },
  welcomeContainer: {
    width: '100%',
    marginTop: 0,
    backgroundColor: colors.white,
    borderColor: colors.white,
  },
  row: {
    minHeight: 56,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  textBlock: {
    gap: spacing.xs,
  },
  muted: {
    color: colors.mutedText,
  },
  dismiss: {
    color: colors.mutedText,
    marginTop: spacing.xs,
  },
  iosHelp: {
    marginTop: spacing.xs,
  },
});
