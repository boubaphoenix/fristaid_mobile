import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, Screen, StateView, TextField } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { type Kit, getKit } from '@/lib/kitsApi';
import { createOrder } from '@/lib/ordersApi';
import { isValidRecordId } from '@/lib/routeParams';

// Écran 20 — récapitulatif de commande et livraison. Le choix du moyen de
// paiement n'a plus lieu ici : la Checkout hébergée Bictorys le propose
// elle-même sur l'écran suivant (voir plan Bictorys §8).
export default function OrderSummaryScreen() {
  const { token } = useAuth();
  const { kitId, quantity: quantityParam } = useLocalSearchParams<{ kitId: string; quantity?: string }>();
  const quantity = Math.max(1, Number(quantityParam) || 1);

  const [state, setState] = useState<{ status: 'loading' } | { status: 'error' } | { status: 'success'; kit: Kit }>({
    status: 'loading',
  });
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [commune, setCommune] = useState('');
  const [landmark, setLandmark] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!kitId || !isValidRecordId(kitId)) {
      setState({ status: 'error' });
      return;
    }
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

  async function handleSubmit() {
    if (state.status !== 'success' || !token) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const order = await createOrder(token, {
        kit_id: state.kit.id,
        quantity,
        delivery_full_name: fullName,
        delivery_phone: phone,
        delivery_commune: commune,
        delivery_landmark: landmark || undefined,
      });
      router.push({
        pathname: '/kits/orders/[orderId]/payment',
        params: { orderId: order.id, phone: order.delivery_phone, amount: String(order.total_amount_xof) },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de créer la commande pour le moment.");
      setIsSubmitting(false);
    }
  }

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
  const subtotal = kit.price_xof * quantity;
  const canSubmit = Boolean(fullName && phone && commune) && !isSubmitting;

  return (
    <Screen mode="normal" scroll keyboardAvoiding>
      <Text style={[typography.h2, styles.title]}>Récapitulatif</Text>

      <View style={styles.lineRow}>
        <Text style={typography.body}>
          {kit.name} × {quantity}
        </Text>
        <Text style={typography.data}>{subtotal.toLocaleString('fr-FR')} FCFA</Text>
      </View>

      <Text style={[typography.bodyBold, styles.sectionTitle]}>Livraison</Text>
      <TextField label="Nom complet" value={fullName} onChangeText={setFullName} style={styles.spaced} />
      <TextField
        label="Téléphone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="+225 07 00 00 00 00"
        style={styles.spaced}
      />
      <TextField label="Commune" value={commune} onChangeText={setCommune} style={styles.spaced} />
      <TextField
        label="Point de repère (optionnel)"
        value={landmark}
        onChangeText={setLandmark}
        style={styles.spaced}
      />

      <Text style={[typography.small, styles.muted, styles.sectionTitle]}>
        Le paiement se fait sur la page sécurisée Bictorys à l'étape suivante (carte ou mobile money).
      </Text>

      {error ? <Text style={[typography.small, styles.error]}>{error}</Text> : null}

      <PrimaryButton
        label={isSubmitting ? 'Création...' : 'Confirmer la commande'}
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={!canSubmit}
        style={styles.spacedLg}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  spaced: {
    marginBottom: spacing.md,
  },
  muted: {
    color: colors.mutedText,
  },
  error: {
    color: colors.emergencyRed,
    marginTop: spacing.sm,
  },
  spacedLg: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
});
