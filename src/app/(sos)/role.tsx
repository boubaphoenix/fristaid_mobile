import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmergencyBanner, Screen } from '@/components/ui';
import { colors, radius, sizes, spacing, typography } from '@/constants/theme';
import { ROLES } from '@/constants/sosContent';
import { useEmergencyContacts } from '@/context/EmergencyContactsContext';
import { confirmAlert } from '@/lib/confirmAlert';

// Écran 11 — choix du rôle (Mode Stress). Une seule action par écran :
// sélectionner un rôle pousse directement vers le choix de l'incident.
export default function SosRoleScreen() {
  const { samuNumber } = useEmergencyContacts();

  function confirmExit() {
    confirmAlert(
      'Quitter le guidage SOS ?',
      'Vous perdrez votre progression dans ce guidage.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Quitter', style: 'destructive', onPress: () => router.back() },
      ],
    );
  }

  return (
    <Screen mode="stress" scroll>
      <EmergencyBanner phoneNumber={samuNumber} />

      <View style={styles.header}>
        <Text style={[typography.h1, styles.whiteText]}>Qui êtes-vous ?</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Quitter" onPress={confirmExit} hitSlop={12}>
          <Text style={[typography.h2, styles.whiteText]}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {ROLES.map((role) => (
          <Pressable
            key={role.value}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/(sos)/incident', params: { role: role.value } })}
            style={styles.block}>
            <Text style={[typography.h3, styles.whiteText]}>{role.label}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  whiteText: {
    color: colors.white,
  },
  list: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  block: {
    minHeight: sizes.cardMinHeight,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.stressSubtext,
  },
});
