import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';
import { isWhatsAppConfigured, openWhatsApp, WHATSAPP_NUMBER, WHATSAPP_TRANSPARENCY_NOTICE } from '@/lib/whatsapp';
import { OutlineButton } from './OutlineButton';

type WhatsAppContactActionProps = {
  message: string;
  label: string;
};

// Unité réutilisable (mention de transparence + bouton + repli) pour les
// deux points d'entrée WhatsApp (leçon, Profil) — évite de dupliquer la
// logique de repli à chaque endroit.
export function WhatsAppContactAction({ message, label }: WhatsAppContactActionProps) {
  const [showFallback, setShowFallback] = useState(!isWhatsAppConfigured);
  const [copied, setCopied] = useState(false);

  async function handlePress() {
    const opened = await openWhatsApp(message);
    if (!opened) setShowFallback(true);
  }

  async function handleCopy() {
    await Clipboard.setStringAsync(WHATSAPP_NUMBER);
    setCopied(true);
  }

  return (
    <View>
      <Text style={[typography.caption, styles.notice]}>{WHATSAPP_TRANSPARENCY_NOTICE}</Text>
      <OutlineButton label={label} onPress={handlePress} disabled={!isWhatsAppConfigured} style={styles.spaced} />
      {showFallback ? (
        <View style={styles.fallback}>
          <Text style={[typography.small, styles.muted]}>
            {isWhatsAppConfigured
              ? `Vous pouvez aussi nous écrire directement au ${WHATSAPP_NUMBER}.`
              : "Le contact WhatsApp n'est pas encore configuré."}
          </Text>
          {isWhatsAppConfigured ? (
            <Text
              accessibilityRole="button"
              onPress={handleCopy}
              style={[typography.small, styles.link]}>
              {copied ? 'Numéro copié' : 'Copier le numéro'}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    color: colors.mutedText,
    marginBottom: spacing.xs,
  },
  spaced: {
    marginTop: spacing.xs,
  },
  fallback: {
    marginTop: spacing.sm,
  },
  muted: {
    color: colors.mutedText,
  },
  link: {
    color: colors.trustBlue,
    marginTop: spacing.xs,
  },
});
