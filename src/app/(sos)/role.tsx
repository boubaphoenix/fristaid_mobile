import { router } from 'expo-router';
import { Text } from 'react-native';

import { EmergencyBanner, OutlineButton, PrimaryButton, Screen } from '@/components/ui';
import { spacing, typography } from '@/constants/theme';

// Placeholder — contenu réel (écran 11) livré en Vague 2.
export default function SosRoleScreen() {
  return (
    <Screen mode="stress">
      <EmergencyBanner phoneNumber="185" />
      <Text style={[typography.h1, { color: '#FFFFFF', marginTop: spacing.lg }]}>
        Choix du rôle (placeholder)
      </Text>
      <PrimaryButton
        label="Continuer"
        onPress={() => router.push('/(sos)/incident')}
        stress
        variant="danger"
        style={{ marginTop: spacing.lg }}
      />
      <OutlineButton
        label="Quitter"
        onPress={() => router.back()}
        stress
        variant="danger"
        style={{ marginTop: spacing.md }}
      />
    </Screen>
  );
}
