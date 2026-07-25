import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmergencyBanner, Screen } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { INCIDENTS, VITAL_INCIDENTS } from '@/constants/sosContent';
import type { SosRole } from '@/lib/sosApi';

// Écran 12 — choix de l'incident (Mode Stress). Grille 2 colonnes, les 3
// incidents vitaux (hémorragie, arrêt cardiaque, noyade) sont mis en
// évidence par un liseré rouge — jamais un fond rouge plein (réservé aux
// vrais éléments d'urgence active, pas une simple mise en avant visuelle).
export default function SosIncidentScreen() {
  const { role } = useLocalSearchParams<{ role?: string }>();
  const currentRole = (role as SosRole | undefined) ?? 'witness';

  return (
    <Screen mode="stress" scroll>
      <EmergencyBanner phoneNumber="185" />
      <Text style={[typography.h1, styles.whiteText, styles.title]}>Quel est l'incident ?</Text>

      <View style={styles.grid}>
        {INCIDENTS.map((incident) => {
          const isVital = VITAL_INCIDENTS.has(incident.value);
          return (
            <Pressable
              key={incident.value}
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/(sos)/questions',
                  params: { role: currentRole, incident: incident.value },
                })
              }
              style={[styles.block, isVital && styles.blockVital]}>
              <Text style={[typography.bodyBold, styles.whiteText, styles.blockLabel]}>{incident.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  whiteText: {
    color: colors.white,
  },
  title: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  block: {
    width: '47%',
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.stressSubtext,
    padding: spacing.sm,
  },
  blockVital: {
    borderColor: colors.emergencyRed,
    borderWidth: 2,
  },
  blockLabel: {
    textAlign: 'center',
  },
});
