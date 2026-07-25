import { Text } from 'react-native';

import { OutlineButton, Screen } from '@/components/ui';
import { spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

// Placeholder — contenu réel (écran 23) livré en Vague 7. Le bouton de
// déconnexion est branché dès maintenant sur AuthContext.signOut, seul
// moyen de repasser manuellement par le stack Auth pendant les tests.
export default function ProfileScreen() {
  const { signOut } = useAuth();

  return (
    <Screen mode="normal">
      <Text style={[typography.h2, { marginBottom: spacing.md }]}>Profil (placeholder)</Text>
      <Text style={[typography.body, { marginBottom: spacing.md }]}>
        Contenu détaillé en Vague 7.
      </Text>
      <OutlineButton label="Se déconnecter" onPress={signOut} variant="danger" />
    </Screen>
  );
}
