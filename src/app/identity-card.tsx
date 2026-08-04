import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Card, ChevronStrip, LogoMark, PointsBadge, PrimaryButton, ResponsibilityNote, Screen, StateView, Wordmark } from '@/components/ui';
import { brand, colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { type IdentityCard, getIdentityCard } from '@/lib/identityCardApi';
import { IDENTITY_CARD_SHARE_COPY, buildIdentityCardMessage } from '@/lib/identityCardShare';
import { initials } from '@/lib/initials';

// Bandeau décoratif statique — identique pour tous les utilisateurs,
// aucune donnée personnelle. Volontairement en emoji + texte plutôt
// qu'en icônes SVG sur mesure (pas de dépendance supplémentaire).
const CARD_VALUES = [
  { emoji: '❤️', label: 'Apprendre' },
  { emoji: '🛡️', label: 'Agir' },
  { emoji: '👥', label: 'Protéger' },
  { emoji: '🎖️', label: 'Engagé' },
] as const;

// Écran atteint uniquement depuis Profil : même patron que passport.tsx
// (pas de Stack dédié, simple bouton retour).
export default function IdentityCardScreen() {
  const { token } = useAuth();
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error' } | { status: 'success'; card: IdentityCard }
  >({ status: 'loading' });
  const [isSharing, setIsSharing] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setState({ status: 'loading' });
    try {
      const card = await getIdentityCard(token);
      setState({ status: 'success', card });
    } catch {
      setState({ status: 'error' });
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function handleShare(card: IdentityCard) {
    setShareFeedback(null);
    Alert.alert(IDENTITY_CARD_SHARE_COPY.confirmTitle, IDENTITY_CARD_SHARE_COPY.confirmMessage, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Partager', onPress: () => shareNow(card) },
    ]);
  }

  async function shareNow(card: IdentityCard) {
    setIsSharing(true);
    try {
      const result = await Share.share({ message: buildIdentityCardMessage(card) });
      if (result.action === Share.dismissedAction) {
        setShareFeedback(IDENTITY_CARD_SHARE_COPY.shareCancelled);
      }
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <Screen mode="normal" scroll>
      <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8} style={styles.backLink}>
        <Text style={[typography.bodyBold, styles.backLabel]}>← Retour</Text>
      </Pressable>

      <ChevronStrip />
      <View style={styles.header}>
        <Text style={[typography.h2, styles.spaced]}>Carte d'identité AFRICASECOUR</Text>
        <Text style={[typography.body, styles.muted]}>Ma préparation aux gestes qui sauvent</Text>
      </View>
      <ChevronStrip style={styles.spaced} />

      {state.status === 'loading' ? <StateView state="loading" /> : null}
      {state.status === 'error' ? (
        <StateView state="error" message="Le chargement de la carte a échoué." onRetry={load} />
      ) : null}

      {state.status === 'success' ? (
        <>
          <Card style={styles.cardPreview}>
            <View style={styles.cardHeaderBar}>
              <LogoMark size={32} variant="onForest" />
              <Wordmark size={14} variant="onForest" />
            </View>

            <View style={styles.cardBody}>
              <View style={styles.avatarBlock}>
                {state.card.avatar_url ? (
                  <Image source={{ uri: state.card.avatar_url }} style={styles.avatarImage} contentFit="cover" />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={[typography.h3, styles.avatarLabel]}>
                      {initials(state.card.display_name, state.card.display_name)}
                    </Text>
                  </View>
                )}
                <Text style={[typography.h3, styles.spaced]}>{state.card.display_name}</Text>
                <Text style={[typography.bodyBold, styles.titleText]}>
                  {state.card.title} · Niveau {state.card.level}
                </Text>
                <Text style={[typography.caption, styles.muted, styles.memberSince]}>
                  Membre depuis le {new Date(state.card.member_since).toLocaleDateString('fr-FR')}
                </Text>
              </View>

              <View style={styles.statsRow}>
                <PointsBadge value={state.card.points_total} size="large" />
              </View>
              <Text style={[typography.body, styles.statsLine]}>
                {state.card.completed_courses} cours terminés • {state.card.badges_count} badges obtenus
              </Text>
              {state.card.weekly_rank ? (
                <Text style={[typography.body, styles.statsLine]}>Rang hebdomadaire #{state.card.weekly_rank}</Text>
              ) : null}

              <Text style={[typography.caption, styles.muted, styles.generatedAt]}>
                Générée le {new Date(state.card.generated_at).toLocaleDateString('fr-FR')}
              </Text>
            </View>

            <View style={styles.cardFooterBar}>
              {CARD_VALUES.map((v) => (
                <View key={v.label} style={styles.valueChip}>
                  <Text style={styles.valueEmoji}>{v.emoji}</Text>
                  <Text style={[typography.caption, styles.valueLabel]}>{v.label}</Text>
                </View>
              ))}
            </View>
          </Card>

          <ResponsibilityNote text={IDENTITY_CARD_SHARE_COPY.disclaimer} />

          <PrimaryButton
            label="Partager ma carte"
            onPress={() => handleShare(state.card)}
            loading={isSharing}
            disabled={isSharing}
            style={styles.spaced}
          />
          {shareFeedback ? <Text style={[typography.small, styles.muted, styles.spaced]}>{shareFeedback}</Text> : null}
        </>
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
  header: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  cardPreview: {
    marginTop: spacing.lg,
    padding: 0,
    overflow: 'hidden',
  },
  cardHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: brand.forest,
    paddingVertical: spacing.sm,
  },
  cardBody: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  avatarBlock: {
    alignItems: 'center',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.trustBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    color: colors.white,
  },
  titleText: {
    color: colors.darkText,
    marginTop: spacing.xs,
  },
  memberSince: {
    marginTop: spacing.xs,
  },
  statsRow: {
    marginTop: spacing.md,
  },
  statsLine: {
    color: colors.darkText,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  generatedAt: {
    marginTop: spacing.md,
  },
  cardFooterBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: brand.terracotta,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  valueChip: {
    alignItems: 'center',
  },
  valueEmoji: {
    fontSize: 16,
  },
  valueLabel: {
    color: colors.white,
    marginTop: 2,
  },
});
