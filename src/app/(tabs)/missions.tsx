import { Text } from 'react-native';

import { Screen } from '@/components/ui';
import { typography } from '@/constants/theme';

// Placeholder — contenu réel (écrans 16-17) livré en Vague 5.
export default function MissionsScreen() {
  return (
    <Screen mode="normal">
      <Text style={typography.h2}>Missions (placeholder)</Text>
      <Text style={typography.body}>Contenu détaillé en Vague 5.</Text>
    </Screen>
  );
}
