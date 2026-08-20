import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen, StateView } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getOrders, type OrderStatus, type OrderWithItems } from '@/lib/ordersApi';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'En attente de paiement',
  paid: 'Payée',
  preparing: 'En préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  failed: 'Paiement échoué',
  cancelled: 'Annulée',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: colors.warningOrange,
  paid: colors.trustBlue,
  preparing: colors.trustBlue,
  shipped: colors.trustBlue,
  delivered: colors.successGreen,
  failed: colors.emergencyRed,
  cancelled: colors.mutedText,
};

function orderTitle(order: OrderWithItems): string {
  const [first] = order.order_items;
  if (!first) return 'Commande';
  const extra = order.order_items.length - 1;
  return extra > 0 ? `${first.kit.name} +${extra}` : `${first.kit.name} × ${first.quantity}`;
}

// Écran « Mes commandes » — historique, lié depuis profile.tsx. Une
// commande encore en attente de paiement permet de reprendre le paiement
// (même écran 21, voir kits/orders/[orderId]/payment.tsx).
export default function OrdersHistoryScreen() {
  const { token } = useAuth();
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error' } | { status: 'success'; orders: OrderWithItems[] }
  >({ status: 'loading' });

  const load = useCallback(async () => {
    if (!token) return;
    setState({ status: 'loading' });
    try {
      const { orders } = await getOrders(token);
      setState({ status: 'success', orders });
    } catch {
      setState({ status: 'error' });
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  function handlePress(order: OrderWithItems) {
    if (order.status !== 'pending') return;
    router.push({
      pathname: '/kits/orders/[orderId]/payment',
      params: { orderId: order.id, phone: order.delivery_phone, amount: String(order.total_amount_xof) },
    });
  }

  return (
    <Screen mode="normal" scroll>
      <Text style={[typography.h2, styles.title]}>Mes commandes</Text>

      {state.status === 'loading' ? <StateView state="loading" /> : null}
      {state.status === 'error' ? (
        <StateView state="error" message="Le chargement des commandes a échoué." onRetry={load} />
      ) : null}
      {state.status === 'success' ? (
        state.orders.length === 0 ? (
          <StateView
            state="empty"
            title="Aucune commande"
            message="Vos commandes de kits de secours apparaîtront ici."
            actionLabel="Voir les kits"
            onAction={() => router.replace('/(tabs)/kits')}
          />
        ) : (
          state.orders.map((order) => (
            <Pressable
              key={order.id}
              accessibilityRole="button"
              disabled={order.status !== 'pending'}
              onPress={() => handlePress(order)}
              style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={typography.bodyBold}>{orderTitle(order)}</Text>
                <Text style={typography.data}>{order.total_amount_xof.toLocaleString('fr-FR')} FCFA</Text>
              </View>
              <View style={styles.cardFooter}>
                <Text style={[typography.small, { color: STATUS_COLORS[order.status] }]}>
                  {STATUS_LABELS[order.status]}
                </Text>
                <Text style={[typography.small, styles.muted]}>
                  {new Date(order.created_at).toLocaleDateString('fr-FR')}
                </Text>
              </View>
              {order.status === 'pending' ? (
                <Text style={[typography.small, styles.resumeLink]}>Reprendre le paiement</Text>
              ) : null}
            </Pressable>
          ))
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
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  muted: {
    color: colors.mutedText,
  },
  resumeLink: {
    color: colors.trustBlue,
    marginTop: spacing.sm,
  },
});
