import { router } from 'expo-router';
import { Text } from 'react-native';

import { EmergencyBanner, OutlineButton, Screen } from '@/components/ui';
import { spacing, typography } from '@/constants/theme';

// Placeholder — contenu réel (écran 15, quota IA atteint) livré en Vague 2.
export default function SosQuotaScreen() {
  return (
    <Screen mode="stress">
      <EmergencyBanner phoneNumber="185" />
      <Text style={[typography.h1, { color: '#FFFFFF', marginTop: spacing.lg }]}>
        Quota atteint (placeholder)
      </Text>
      <OutlineButton
        label="Retour"
        onPress={() => router.back()}
        stress
        variant="danger"
        style={{ marginTop: spacing.lg }}
      />
    </Screen>
  );
}
