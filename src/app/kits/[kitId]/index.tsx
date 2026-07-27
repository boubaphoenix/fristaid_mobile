import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, Screen, StateView } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { type Kit, getKit } from '@/lib/kitsApi';

const MAX_QUANTITY = 10;

// Écran 19 — détail d'un kit.
export default function KitDetailScreen() {
  const { kitId } = useLocalSearchParams<{ kitId: string }>();
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error' } | { status: 'success'; kit: Kit }>({
    status: 'loading',
  });
  const [quantity, setQuantity] = useState(1);

  const load = useCallback(async () => {
    if (!kitId) return;
    setState({ status: 'loading' });
    try {
      const kit = await getKit(kitId);
      setState({ status: 'success', kit });
    } catch {
      setState({ status: 'error' });
    }
  }, [kitId]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === 'loading') {
    return (
      <Screen mode="normal" scroll>
        <StateView state="loading" />
      </Screen>
    );
  }
  if (state.status === 'error') {
    return (
      <Screen mode="normal" scroll>
        <StateView state="error" message="Le chargement du kit a échoué." onRetry={load} />
      </Screen>
    );
  }

  const { kit } = state;

  return (
    <Screen mode="normal" scroll>
      <View style={styles.visual}>
        <Text style={[typography.h1, styles.visualTitle]}>{kit.name}</Text>
      </View>

      <Text style={[typography.dataLarge, styles.price]}>{kit.price_xof.toLocaleString('fr-FR')} FCFA</Text>
      <Text style={[typography.body, styles.description]}>{kit.description}</Text>

      <Text style={[typography.bodyBold, styles.sectionTitle]}>Contenu</Text>
      <View style={styles.contentGrid}>
        {kit.content_items.map((item) => (
          <View key={item} style={styles.contentItem}>
            <Text style={[typography.small, styles.contentText]}>• {item}</Text>
          </View>
        ))}
      </View>

      <Text style={[typography.bodyBold, styles.sectionTitle]}>Quantité</Text>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Diminuer la quantité"
          onPress={() => setQuantity((q) => Math.max(1, q - 1))}
          disabled={quantity <= 1}
          style={[styles.stepperButton, quantity <= 1 && styles.stepperButtonDisabled]}>
          <Text style={[typography.h3, styles.stepperLabel]}>−</Text>
        </Pressable>
        <Text style={[typography.h3, styles.stepperValue]}>{quantity}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Augmenter la quantité"
          onPress={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
          disabled={quantity >= MAX_QUANTITY}
          style={[styles.stepperButton, quantity >= MAX_QUANTITY && styles.stepperButtonDisabled]}>
          <Text style={[typography.h3, styles.stepperLabel]}>+</Text>
        </Pressable>
      </View>

      <PrimaryButton
        label="Commander"
        onPress={() =>
          router.push({ pathname: '/kits/[kitId]/order', params: { kitId: kit.id, quantity: String(quantity) } })
        }
        style={styles.spaced}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  visual: {
    height: 240,
    borderRadius: radius.card,
    backgroundColor: colors.trustBlue,
    justifyContent: 'flex-end',
    padding: spacing.md,
    marginTop: spacing.md,
  },
  visualTitle: {
    color: colors.white,
  },
  price: {
    marginTop: spacing.lg,
  },
  description: {
    color: colors.mutedText,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  contentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  contentItem: {
    width: '47%',
  },
  contentText: {
    color: colors.darkText,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderColor: colors.trustBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonDisabled: {
    borderColor: colors.border,
  },
  stepperLabel: {
    color: colors.trustBlue,
  },
  stepperValue: {
    minWidth: 32,
    textAlign: 'center',
  },
  spaced: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
});
