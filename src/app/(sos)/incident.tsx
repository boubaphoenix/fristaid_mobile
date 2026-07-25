import { router } from 'expo-router';
import { Text } from 'react-native';

import { EmergencyBanner, OutlineButton, PrimaryButton, Screen } from '@/components/ui';
import { spacing, typography } from '@/constants/theme';

// Placeholder — contenu réel (écran 12) livré en Vague 2.
export default function SosIncidentScreen() {
  return (
    <Screen mode="stress">
      <EmergencyBanner phoneNumber="185" />
      <Text style={[typography.h1, { color: '#FFFFFF', marginTop: spacing.lg }]}>
        Choix de l'incident (placeholder)
      </Text>
      <PrimaryButton
        label="Continuer"
        onPress={() => router.push('/(sos)/questions')}
        stress
        variant="danger"
        style={{ marginTop: spacing.lg }}
      />
      <OutlineButton
        label="Retour"
        onPress={() => router.back()}
        stress
        variant="danger"
        style={{ marginTop: spacing.md }}
      />
    </Screen>
  );
}
