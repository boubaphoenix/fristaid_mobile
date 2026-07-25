import { router } from 'expo-router';
import { Text } from 'react-native';

import { EmergencyBanner, OutlineButton, Screen } from '@/components/ui';
import { spacing, typography } from '@/constants/theme';

// Placeholder — contenu réel (écran 14, IA SOS) livré en Vague 1, avec
// POST /sos/start et /sos/generate-instructions (Phase 0.5+ pour l'API).
export default function SosGuidanceScreen() {
  return (
    <Screen mode="stress">
      <EmergencyBanner phoneNumber="185" />
      <Text style={[typography.h1, { color: '#FFFFFF', marginTop: spacing.lg }]}>
        Guidage pas à pas (placeholder)
      </Text>
      <OutlineButton
        label="Fermer"
        onPress={() => router.back()}
        stress
        variant="danger"
        style={{ marginTop: spacing.lg }}
      />
    </Screen>
  );
}
