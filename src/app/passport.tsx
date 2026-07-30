import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChevronStrip, ResponsibilityNote, Screen, StateView } from '@/components/ui';
import { colors, fonts, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { type Passport, getPassport } from '@/lib/passportApi';

type SectionKey = 'courses' | 'missions' | 'kits' | 'certificates' | 'badges';

// Écran 22 — passeport secouriste. Écran unique atteint uniquement depuis
// l'accueil : pas besoin d'un groupe de routes avec son propre Stack pour
// un simple bouton retour (contrairement à academy/missions/kits qui ont
// des sous-écrans).
export default function PassportScreen() {
  const { token } = useAuth();
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error' } | { status: 'success'; passport: Passport }
  >({ status: 'loading' });
  const [expanded, setExpanded] = useState<SectionKey | null>('courses');

  const load = useCallback(async () => {
    if (!token) return;
    setState({ status: 'loading' });
    try {
      const passport = await getPassport(token);
      setState({ status: 'success', passport });
    } catch {
      setState({ status: 'error' });
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen mode="normal" scroll>
      <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8} style={styles.backLink}>
        <Text style={[typography.bodyBold, styles.backLabel]}>← Retour</Text>
      </Pressable>

      <ChevronStrip />
      <View style={styles.header}>
        <Text style={[typography.bodyBold, styles.headerLabel]}>Mon Passeport</Text>
        <Text style={styles.pointsValue}>
          {state.status === 'success' ? state.passport.points_total : '—'}
        </Text>
        <Text style={[typography.small, styles.headerLabel]}>points</Text>
      </View>
      <ChevronStrip style={styles.spaced} />

      {state.status === 'loading' ? <StateView state="loading" /> : null}
      {state.status === 'error' ? (
        <StateView state="error" message="Le chargement du passeport a échoué." onRetry={load} />
      ) : null}

      {state.status === 'success' ? (
        <>
          <AccordionSection
            title={`Cours terminés (${state.passport.courses.completed})`}
            expanded={expanded === 'courses'}
            onToggle={() => setExpanded(expanded === 'courses' ? null : 'courses')}>
            {state.passport.courses.list.length === 0 ? (
              <Text style={[typography.body, styles.muted]}>Aucun cours terminé pour le moment.</Text>
            ) : (
              state.passport.courses.list.map((c) => (
                <Text key={c.course_id} style={[typography.body, styles.itemRow]}>
                  • {c.title}
                </Text>
              ))
            )}
          </AccordionSection>

          <AccordionSection
            title={`Missions validées (${state.passport.missions.completed})`}
            expanded={expanded === 'missions'}
            onToggle={() => setExpanded(expanded === 'missions' ? null : 'missions')}>
            {state.passport.missions.list.length === 0 ? (
              <Text style={[typography.body, styles.muted]}>Aucune mission validée pour le moment.</Text>
            ) : (
              state.passport.missions.list.map((m) => (
                <Text key={m.mission_id} style={[typography.body, styles.itemRow]}>
                  • {m.title}
                </Text>
              ))
            )}
          </AccordionSection>

          <AccordionSection
            title={`Kits commandés (${state.passport.kits.orders_count})`}
            expanded={expanded === 'kits'}
            onToggle={() => setExpanded(expanded === 'kits' ? null : 'kits')}>
            {state.passport.kits.list.length === 0 ? (
              <Text style={[typography.body, styles.muted]}>Aucun kit commandé pour le moment.</Text>
            ) : (
              <>
                {state.passport.kits.list.map((item, index) => (
                  <Text key={`${item.kit_name}-${index}`} style={[typography.body, styles.itemRow]}>
                    • {item.kit_name} × {item.quantity}
                  </Text>
                ))}
                <Text style={[typography.data, styles.itemRow]}>
                  Total dépensé : {state.passport.kits.total_spent_xof.toLocaleString('fr-FR')} FCFA
                </Text>
              </>
            )}
          </AccordionSection>

          <AccordionSection
            title={`Attestations (${state.passport.certificates.length})`}
            expanded={expanded === 'certificates'}
            onToggle={() => setExpanded(expanded === 'certificates' ? null : 'certificates')}>
            {state.passport.certificates.length === 0 ? (
              <Text style={[typography.body, styles.muted]}>Aucune attestation pour le moment.</Text>
            ) : (
              state.passport.certificates.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() =>
                    router.push({ pathname: '/(tabs)/academy/certificate/[certificateId]', params: { certificateId: c.id } })
                  }>
                  <Text style={[typography.bodyBold, styles.itemRow, styles.link]}>
                    {c.course_title} — {c.score}%
                  </Text>
                </Pressable>
              ))
            )}
          </AccordionSection>

          <AccordionSection
            title={`Badges obtenus (${state.passport.badges.length})`}
            expanded={expanded === 'badges'}
            onToggle={() => setExpanded(expanded === 'badges' ? null : 'badges')}>
            {state.passport.badges.length === 0 ? (
              <Text style={[typography.body, styles.muted]}>Aucun badge obtenu pour le moment.</Text>
            ) : (
              state.passport.badges.map((b) => (
                <Text key={b.id} style={[typography.body, styles.itemRow]}>
                  🏅 {b.title}
                </Text>
              ))
            )}
          </AccordionSection>

          <ResponsibilityNote text="Le passeport reflète votre progression déclarée. Il ne remplace ni un diagnostic médical ni une certification officielle de secourisme." />
        </>
      ) : null}
    </Screen>
  );
}

function AccordionSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Pressable accessibilityRole="button" onPress={onToggle} style={styles.sectionHeader}>
        <Text style={typography.h3}>{title}</Text>
        <Text style={typography.h3}>{expanded ? '−' : '+'}</Text>
      </Pressable>
      {expanded ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
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
    marginBottom: spacing.lg,
  },
  header: {
    backgroundColor: colors.darkText,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  headerLabel: {
    color: colors.stressSubtext,
  },
  pointsValue: {
    fontFamily: fonts.monoBold,
    fontSize: 48,
    lineHeight: 56,
    color: colors.white,
  },
  section: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  sectionBody: {
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  itemRow: {
    color: colors.darkText,
  },
  muted: {
    color: colors.mutedText,
  },
  link: {
    color: colors.trustBlue,
  },
});
