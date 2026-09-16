import { Link } from 'expo-router';
import { Text } from 'react-native';

import { PrimaryButton, Screen } from '@/components/ui';
import { typography } from '@/constants/theme';

// Point d'entrée du parcours SOS (mode stress) — pousse vers le stack
// modal (sos). Message d'ouverture v1.2 (section 2, OUVERTURE) : nomme
// directement la possibilité du gel/sidération plutôt que de l'ignorer,
// sur un ton calme — voir arbre décisionnel IA SOS v1.2, section 1bis.
export default function SosEntryScreen() {
  return (
    <Screen mode="normal">
      <Text style={typography.h2}>SOS</Text>
      <Text style={typography.body}>
        Restez en sécurité. Si vous sentez que vous n'arrivez pas à bouger ou à réfléchir, c'est normal — je vous
        guide un geste à la fois. Si le danger est immédiat, appelez les secours locaux.
      </Text>
      <Link href="/(sos)/role" asChild>
        <PrimaryButton label="Démarrer le guidage SOS" onPress={() => {}} variant="danger" />
      </Link>
    </Screen>
  );
}
