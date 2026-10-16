import { router } from 'expo-router';

import { EmergencyBanner, PrimaryButton, Screen } from '@/components/ui';
import { spacing, typography } from '@/constants/theme';
import { useEmergencyContacts } from '@/context/EmergencyContactsContext';
import { StyleSheet, Text, View } from 'react-native';

// Page de secours du service worker (web uniquement) : servie quand une
// route jamais visitée hors-ligne est demandée et que même l'app shell
// précaché est indisponible (voir sw-src.ts, setCatchHandler). Le numéro
// d'urgence reste affichable même dans ce cas extrême — useEmergencyContacts
// a son propre repli en dur ("185"), jamais vide.
export default function OfflineScreen() {
  const { samuNumber } = useEmergencyContacts();

  return (
    <Screen mode="normal" scroll>
      <EmergencyBanner message="En cas d'urgence vitale, appelez les secours" phoneNumber={samuNumber} />
      <View style={styles.body}>
        <Text style={[typography.h2, styles.spaced]}>Pas de connexion</Text>
        <Text style={[typography.body, styles.spaced]}>
          Cette page n'a pas encore été ouverte hors-ligne. Les cours que vous avez déjà consultés restent
          disponibles — reconnectez-vous pour accéder au reste de l'application.
        </Text>
        <PrimaryButton label="Retour à l'accueil" onPress={() => router.replace('/')} style={styles.spaced} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing.screenPadding,
  },
  spaced: {
    marginTop: spacing.lg,
  },
});
