import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen, WhatsAppContactAction } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { buildGeneralContactMessage, CONTACT_CATEGORIES, type ContactCategory } from '@/lib/contactMessages';

// Écran atteint depuis Profil (même patron que identity-card.tsx/verify-email.tsx :
// pas de Stack dédié, simple bouton retour). Choix rapide de catégorie avant
// d'ouvrir WhatsApp — pas un vrai formulaire, juste une pré-catégorisation du
// message (voir plan Contact WhatsApp).
export default function ContactScreen() {
  const [selected, setSelected] = useState<ContactCategory | null>(null);

  return (
    <Screen mode="normal" scroll>
      <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8} style={styles.backLink}>
        <Text style={[typography.bodyBold, styles.backLabel]}>← Retour</Text>
      </Pressable>

      <Text style={[typography.h2, styles.spaced]}>Nous contacter</Text>
      <Text style={[typography.body, styles.muted, styles.spaced]}>
        Choisissez ce qui correspond le mieux à votre message.
      </Text>

      <View style={styles.spaced}>
        {CONTACT_CATEGORIES.map((category) => (
          <Pressable
            key={category.key}
            accessibilityRole="button"
            onPress={() => setSelected(category)}
            style={[styles.categoryRow, selected?.key === category.key && styles.categoryRowSelected]}>
            <Text style={typography.bodyBold}>{category.label}</Text>
          </Pressable>
        ))}
      </View>

      {selected ? (
        <View style={styles.spaced}>
          <WhatsAppContactAction message={buildGeneralContactMessage(selected.label)} label="Ouvrir WhatsApp" />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  backLink: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  backLabel: {
    color: colors.trustBlue,
  },
  spaced: {
    marginTop: spacing.lg,
  },
  muted: {
    color: colors.mutedText,
  },
  categoryRow: {
    marginTop: spacing.sm,
    minHeight: 56,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  categoryRowSelected: {
    borderColor: colors.trustBlue,
    borderWidth: 2,
  },
});
