import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { ResponsibilityNote, Screen, StateView } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { KIT_SALES_ENABLED } from '@/constants/kits';
import { type Kit, getKits } from '@/lib/kitsApi';

// Écran 18 — catalogue des kits. Public (pas de token requis côté API),
// mais la navigation reste dans le stack authentifié pour l'instant
// (accès uniquement depuis l'accueil, voir bouton "Kits de secours").
export default function KitsCatalogueScreen() {
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error' } | { status: 'success'; kits: Kit[] }
  >({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const kits = await getKits();
      setState({ status: 'success', kits });
    } catch {
      setState({ status: 'error' });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen mode="normal" scroll>
      <Text style={[typography.h2, styles.title]}>Kits de secours</Text>

      {state.status === 'loading' ? <StateView state="loading" /> : null}
      {state.status === 'error' ? (
        <StateView state="error" message="Le chargement des kits a échoué." onRetry={load} />
      ) : null}
      {state.status === 'success' ? (
        state.kits.length === 0 ? (
          <StateView
            state="empty"
            title="Aucun kit disponible"
            message="Revenez plus tard pour découvrir le catalogue."
            actionLabel="Retour à l'accueil"
            onAction={() => router.replace('/(tabs)')}
          />
        ) : (
          <>
            <ResponsibilityNote text="Les kits complètent une formation, ils ne la remplacent pas. Suivez toujours les gestes appris en priorité." />
            {state.kits.map((kit) => (
              <Pressable
                key={kit.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/kits/[kitId]', params: { kitId: kit.id } })}
                style={styles.card}>
                <Text style={[typography.h3, styles.cardTitle]}>{kit.name}</Text>
                <Text style={[typography.body, styles.cardDescription]} numberOfLines={2}>
                  {kit.description}
                </Text>
                {KIT_SALES_ENABLED ? (
                  <Text style={[typography.dataLarge, styles.cardPrice]}>
                    {kit.price_xof.toLocaleString('fr-FR')} FCFA
                  </Text>
                ) : (
                  <Text style={[typography.small, styles.cardBadge]}>Bientôt disponible</Text>
                )}
              </Pressable>
            ))}
          </>
        )
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  card: {
    minHeight: 200,
    borderRadius: radius.card,
    backgroundColor: colors.trustBlue,
    padding: spacing.md,
    justifyContent: 'flex-end',
    marginBottom: spacing.md,
  },
  cardTitle: {
    color: colors.white,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    color: colors.white,
    marginBottom: spacing.md,
  },
  cardPrice: {
    color: colors.white,
  },
  cardBadge: {
    color: colors.white,
    fontStyle: 'italic',
  },
});
