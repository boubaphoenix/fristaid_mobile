import * as Sharing from 'expo-sharing';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { ChevronStrip, LogoMark, LogoSeal, OutlineButton, PointsBadge, PrimaryButton, ResponsibilityNote, Screen, StateView, Wordmark } from '@/components/ui';
import { brand, colors, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { confirmAlert } from '@/lib/confirmAlert';
import { saveIdentityCardImage } from '@/lib/identityCardDownload';
import { type IdentityCard, getIdentityCard } from '@/lib/identityCardApi';
import { IDENTITY_CARD_SHARE_COPY, buildIdentityCardMessage } from '@/lib/identityCardShare';
import { initials } from '@/lib/initials';
import { shareMessage } from '@/lib/share';
import { openHttpsUrl } from '@/lib/urlSafety';

type ShareTarget = 'whatsapp' | 'facebook';

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
  const [isDownloading, setIsDownloading] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const cardRef = useRef<View>(null);

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

  // Sur mobile natif, un seul bouton suffit : la carte est capturée en
  // image et envoyée au menu de partage du téléphone, où WhatsApp/Facebook
  // apparaissent naturellement s'ils sont installés. Sur web, il n'existe
  // aucun moyen fiable d'imposer une app cible avec une image depuis une
  // page — on redirige donc explicitement vers WhatsApp ou Facebook avec
  // le texte de la carte (voir shareOnWeb).
  function handleShare(card: IdentityCard, target?: ShareTarget) {
    if (!card.can_share) {
      confirmAlert(IDENTITY_CARD_SHARE_COPY.lockedTitle, IDENTITY_CARD_SHARE_COPY.lockedMessage);
      return;
    }
    setShareFeedback(null);
    confirmAlert(IDENTITY_CARD_SHARE_COPY.confirmTitle, IDENTITY_CARD_SHARE_COPY.confirmMessage, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Partager', onPress: () => shareNow(card, target) },
    ]);
  }

  async function shareNow(card: IdentityCard, target?: ShareTarget) {
    if (!card.can_share) return;
    setIsSharing(true);
    try {
      if (Platform.OS === 'web') {
        shareOnWeb(card, target ?? 'whatsapp');
        return;
      }
      await shareCardImage(card);
    } finally {
      setIsSharing(false);
    }
  }

  // Le téléchargement réutilise la même capture d'image que le partage
  // natif (cardRef/captureRef) : sur web, déclenchement d'un téléchargement
  // navigateur standard ; sur natif, enregistrement dans la galerie photo
  // via expo-media-library — pas de PDF, pas de rendu serveur.
  function handleDownload(card: IdentityCard) {
    if (!card.can_download) {
      confirmAlert(IDENTITY_CARD_SHARE_COPY.lockedTitle, IDENTITY_CARD_SHARE_COPY.lockedMessage);
      return;
    }
    setShareFeedback(null);
    confirmAlert(IDENTITY_CARD_SHARE_COPY.downloadConfirmTitle, IDENTITY_CARD_SHARE_COPY.confirmMessage, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Télécharger', onPress: () => downloadNow(card) },
    ]);
  }

  async function downloadNow(card: IdentityCard) {
    if (!card.can_download) return;
    setIsDownloading(true);
    try {
      if (!cardRef.current) throw new Error('card not ready');
      const uri = await captureRef(cardRef, { format: 'png', quality: 0.92 });
      const outcome = await saveIdentityCardImage(uri);
      setShareFeedback(
        outcome === 'saved' ? IDENTITY_CARD_SHARE_COPY.downloadSaved : IDENTITY_CARD_SHARE_COPY.downloadPermissionDenied,
      );
    } catch {
      setShareFeedback(IDENTITY_CARD_SHARE_COPY.downloadFailed);
    } finally {
      setIsDownloading(false);
    }
  }

  function shareOnWeb(card: IdentityCard, target: ShareTarget) {
    const message = buildIdentityCardMessage(card);
    if (target === 'facebook') {
      // Facebook n'accepte pas de texte pré-rempli via URL (seulement un
      // lien, pour éviter le spam) — on copie donc le message et on ouvre
      // Facebook pour que l'utilisateur le colle lui-même.
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(message).catch(() => {});
      }
      openHttpsUrl('https://www.facebook.com/');
      setShareFeedback(IDENTITY_CARD_SHARE_COPY.facebookCopyHint);
      return;
    }
    openHttpsUrl(`https://wa.me/?text=${encodeURIComponent(message)}`);
  }

  async function shareCardImage(card: IdentityCard) {
    try {
      if (!cardRef.current) throw new Error('card not ready');
      const uri = await captureRef(cardRef, { format: 'png', quality: 0.92 });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) throw new Error('sharing unavailable');
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: IDENTITY_CARD_SHARE_COPY.confirmTitle });
    } catch {
      // Repli texte si la capture d'image ou le partage natif échoue
      // (ex. aucune app associée, permission refusée).
      const outcome = await shareMessage(buildIdentityCardMessage(card));
      if (outcome === 'cancelled') {
        setShareFeedback(IDENTITY_CARD_SHARE_COPY.shareCancelled);
      }
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
          <View ref={cardRef} collapsable={false}>
            <View style={styles.cardFrame}>
              <View style={styles.cardHeaderBar}>
                <View style={styles.cardHeaderBrand}>
                  <LogoMark size={24} variant="onForest" />
                  <Wordmark size={13} variant="onForest" />
                </View>
                <LogoSeal size={64} />
              </View>

              <View style={styles.cardRow}>
                <View style={styles.photoColumn}>
                  {state.card.avatar_url ? (
                    <Image source={{ uri: state.card.avatar_url }} style={styles.photoImage} contentFit="cover" />
                  ) : (
                    <View style={styles.photoFallback}>
                      <Text style={[typography.h2, styles.photoFallbackLabel]}>
                        {initials(state.card.display_name, state.card.display_name)}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.infoColumn}>
                  <View style={styles.fieldRow}>
                    <View style={styles.fieldHalf}>
                      <Text style={[typography.caption, styles.fieldLabel]}>NOM</Text>
                      <Text style={[typography.h3, styles.nameTextVivid]} numberOfLines={1}>
                        {state.card.display_name}
                      </Text>
                    </View>
                    <View style={styles.fieldHalfEnd}>
                      <Text style={[typography.caption, styles.fieldLabel]}>RANG</Text>
                      <Text style={[typography.bodyBold, styles.fieldValue, styles.fieldValueEnd]}>
                        {state.card.weekly_rank ? `#${state.card.weekly_rank}` : '—'}
                      </Text>
                    </View>
                  </View>

                  <Text style={[typography.caption, styles.fieldLabel, styles.fieldSpaced]}>DATE D'ADHÉSION</Text>
                  <Text style={[typography.bodyBold, styles.fieldValue]}>
                    {new Date(state.card.member_since).toLocaleDateString('fr-FR')}
                  </Text>

                  <Text style={[typography.caption, styles.fieldLabel, styles.fieldSpaced]}>STATUT</Text>
                  <Text style={[typography.bodyBold, styles.fieldValue]} numberOfLines={1}>
                    {state.card.title} - Niveau {state.card.level}
                  </Text>

                  <View style={[styles.fieldRow, styles.fieldSpaced]}>
                    <PointsBadge value={state.card.points_total} />
                    <Text style={[typography.small, styles.statsLine]}>
                      {state.card.completed_courses} cours · {state.card.badges_count} badges ·{' '}
                      {state.card.completed_circuits}/{state.card.required_circuits} circuits
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardFooterBar}>
                {CARD_VALUES.map((v) => (
                  <View key={v.label} style={styles.valueChip}>
                    <Text style={styles.valueEmoji}>{v.emoji}</Text>
                    <Text style={[typography.caption, styles.valueLabel]}>{v.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <ResponsibilityNote text={IDENTITY_CARD_SHARE_COPY.disclaimer} />

          <View style={styles.unlockBlock}>
            <Text style={[typography.bodyBold, styles.unlockTitle]}>Déblocage de la carte partageable</Text>
            <Text style={[typography.body, styles.unlockProgress]}>
              Progression : {state.card.completed_circuits} / {state.card.required_circuits} circuits validés
            </Text>
            <Text style={[typography.small, styles.muted, styles.unlockMessage]}>{state.card.unlock_message}</Text>
          </View>

          {Platform.OS === 'web' ? (
            <View style={styles.shareButtonsRow}>
              <PrimaryButton
                label={state.card.can_share ? 'WhatsApp' : 'WhatsApp 🔒'}
                onPress={() => handleShare(state.card, 'whatsapp')}
                loading={isSharing}
                disabled={isSharing}
                style={styles.shareButtonHalf}
              />
              <PrimaryButton
                label={state.card.can_share ? 'Facebook' : 'Facebook 🔒'}
                onPress={() => handleShare(state.card, 'facebook')}
                loading={isSharing}
                disabled={isSharing}
                style={styles.shareButtonHalf}
              />
            </View>
          ) : (
            <PrimaryButton
              label={state.card.can_share ? 'Partager ma carte' : 'Partager ma carte 🔒'}
              onPress={() => handleShare(state.card)}
              loading={isSharing}
              disabled={isSharing}
              style={styles.spaced}
            />
          )}

          <PrimaryButton
            label={state.card.can_download ? 'Télécharger ma carte' : 'Télécharger ma carte 🔒'}
            onPress={() => handleDownload(state.card)}
            loading={isDownloading}
            disabled={isDownloading}
            style={styles.spaced}
          />

          {!state.card.can_share ? (
            <OutlineButton
              label="Commencer un cours"
              onPress={() => router.push('/(tabs)/academy')}
              style={styles.spaced}
            />
          ) : null}

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
  unlockBlock: {
    marginTop: spacing.lg,
  },
  unlockTitle: {
    color: colors.darkText,
  },
  unlockProgress: {
    color: colors.darkText,
    marginTop: spacing.xs,
  },
  unlockMessage: {
    marginTop: spacing.xs,
  },
  shareButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  shareButtonHalf: {
    flex: 1,
  },
  muted: {
    color: colors.mutedText,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  cardFrame: {
    marginTop: spacing.lg,
    borderWidth: 2,
    borderColor: brand.forest,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  cardHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: brand.forest,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  cardHeaderBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
  },
  photoColumn: {
    width: '26%',
  },
  photoImage: {
    width: '100%',
    aspectRatio: 0.75,
    borderRadius: radius.card,
  },
  photoFallback: {
    width: '100%',
    aspectRatio: 0.75,
    borderRadius: radius.card,
    backgroundColor: brand.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFallbackLabel: {
    color: colors.white,
  },
  infoColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  nameTextVivid: {
    color: brand.terracotta,
  },
  fieldLabel: {
    color: colors.mutedText,
    letterSpacing: 0.5,
  },
  fieldValue: {
    color: brand.terracotta,
    marginTop: 2,
  },
  fieldValueEnd: {
    textAlign: 'right',
  },
  fieldSpaced: {
    marginTop: spacing.sm,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  fieldHalf: {
    flex: 1,
  },
  fieldHalfEnd: {
    alignItems: 'flex-end',
  },
  statsLine: {
    color: colors.darkText,
    flexShrink: 1,
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
