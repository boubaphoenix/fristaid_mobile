import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmergencyBanner, OutlineButton, Screen } from '@/components/ui';
import { colors, radius, sizes, spacing, typography } from '@/constants/theme';
import { EMERGENCY_INSTRUCTIONS, type EmergencyInstruction } from '@/constants/emergencyInstructions';

// Écran 03 bis — "Consignes sans compte" : accessible sans authentification
// et sans réseau (contenu statique dupliqué de src/ai/scenarios.ts côté
// backend, voir emergencyInstructions.ts). Vit dans le stack (auth), qui
// ne redirige que si un token existe déjà — un visiteur non connecté y
// accède donc directement depuis l'écran de connexion.
export default function EmergencyGuideScreen() {
  const [selected, setSelected] = useState<EmergencyInstruction | null>(null);

  return (
    <Screen mode="stress" scroll>
      <EmergencyBanner phoneNumber="185" />

      {selected ? (
        <View style={styles.spaced}>
          <Text style={[typography.h1, styles.whiteText]}>{selected.label}</Text>

          {selected.steps.map((step, index) => (
            <Text key={step} style={[typography.body, styles.whiteText, styles.step]}>
              {index + 1}. {step}
            </Text>
          ))}

          <View style={styles.warningBlock}>
            <Text style={[typography.bodyBold, styles.warningText]}>À ne pas faire</Text>
            {selected.doNotDo.map((item) => (
              <Text key={item} style={[typography.small, styles.warningText]}>
                • {item}
              </Text>
            ))}
          </View>

          <OutlineButton
            label="Choisir un autre incident"
            onPress={() => setSelected(null)}
            stress
            style={styles.spaced}
          />
          <OutlineButton
            label="Retour à la connexion"
            onPress={() => router.back()}
            stress
            variant="danger"
            style={styles.spaced}
          />
        </View>
      ) : (
        <View style={styles.spaced}>
          <Text style={[typography.h2, styles.whiteText, styles.intro]}>
            Choisissez la situation la plus proche pour afficher les consignes.
          </Text>

          {EMERGENCY_INSTRUCTIONS.map((item) => (
            <Pressable
              key={item.incident}
              accessibilityRole="button"
              onPress={() => setSelected(item)}
              style={({ pressed }) => [styles.incidentRow, { opacity: pressed ? 0.7 : 1 }]}>
              <Text style={[typography.bodyBold, styles.whiteText]}>{item.label}</Text>
            </Pressable>
          ))}

          <OutlineButton
            label="Retour à la connexion"
            onPress={() => router.back()}
            stress
            variant="danger"
            style={styles.spaced}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  spaced: {
    marginTop: spacing.lg,
  },
  intro: {
    marginBottom: spacing.md,
  },
  whiteText: {
    color: colors.white,
  },
  step: {
    marginTop: spacing.sm,
  },
  incidentRow: {
    height: sizes.touchStress,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.stressSubtext,
  },
  warningBlock: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningOrange,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  warningText: {
    color: colors.white,
  },
});
