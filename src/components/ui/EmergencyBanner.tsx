import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, sizes, spacing, typography } from '@/constants/theme';

type EmergencyBannerProps = {
  message?: string;
  phoneNumber?: string;
};

// Bandeau rouge secours, hauteur fixe, non masquable — présent sur tout le
// parcours SOS (écrans 11-15). Le numéro, quand fourni, est tappable.
export function EmergencyBanner({
  message = 'Urgence vitale — les secours restent prioritaires',
  phoneNumber,
}: EmergencyBannerProps) {
  const content = (
    <View style={styles.banner}>
      <Text style={[typography.bodyBold, styles.message]}>{message}</Text>
      {phoneNumber ? (
        <Text style={[typography.data, styles.phone]}>{phoneNumber}</Text>
      ) : null}
    </View>
  );

  if (!phoneNumber) {
    return content;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Appeler les secours au ${phoneNumber}`}
      onPress={() => Linking.openURL(`tel:${phoneNumber}`)}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    minHeight: sizes.bannerHeight,
    backgroundColor: colors.emergencyRed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.xs,
  },
  message: {
    color: colors.white,
    flexShrink: 1,
  },
  phone: {
    color: colors.white,
  },
});
