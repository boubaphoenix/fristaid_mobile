import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing, typography } from '@/constants/theme';

const paletteEntries = Object.entries(colors).filter(([, value]) => value.startsWith('#'));

export default function DesignTokensPreviewScreen() {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}>
      <Text style={[typography.h1, styles.text]}>Archivo 700 — h1</Text>
      <Text style={[typography.h2, styles.text]}>Archivo 700 — h2</Text>
      <Text style={[{ fontFamily: fonts.displayBlack }, styles.text]}>Archivo 800 — display</Text>
      <Text style={[typography.body, styles.text]}>IBM Plex Sans 400 — texte courant</Text>
      <Text style={[typography.bodyBold, styles.text]}>IBM Plex Sans 600 — texte accentué</Text>
      <Text style={[typography.data, styles.text]}>IBM Plex Mono 400 — 1 234 FCFA</Text>
      <Text style={[{ fontFamily: fonts.monoBold }, typography.dataLarge, styles.text]}>042</Text>

      <View style={styles.palette}>
        {paletteEntries.map(([name, hex]) => (
          <View key={name} style={styles.swatchRow}>
            <View style={[styles.swatch, { backgroundColor: hex }]} />
            <Text style={[typography.small, styles.text]}>{name}</Text>
            <Text style={[typography.data, styles.text]}>{hex}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.lightGray,
  },
  content: {
    padding: spacing.screenPadding,
    gap: spacing.sm,
  },
  text: {
    color: colors.darkText,
  },
  palette: {
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
