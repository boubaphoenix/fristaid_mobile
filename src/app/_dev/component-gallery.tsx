import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Card,
  ChevronStrip,
  CourseIcon,
  EmergencyBanner,
  OutlineButton,
  PointsBadge,
  PrimaryButton,
  ProgressSegments,
  ResponsibilityNote,
  Screen,
  StateView,
  TextField,
} from '@/components/ui';
import { colors, fonts, spacing, typography } from '@/constants/theme';

const paletteEntries = Object.entries(colors).filter(([, value]) => value.startsWith('#'));

// Écran de démo temporaire (Phase 0.2 + 0.3) : vérifie visuellement les
// polices, la palette, et chaque composant partagé dans ses variantes.
// Remplacé par la navigation réelle en Phase 0.4.
export default function ComponentGalleryScreen() {
  const [fieldValue, setFieldValue] = useState('');
  const [stateDemo, setStateDemo] = useState<'loading' | 'empty' | 'error' | 'offline' | 'none'>(
    'none',
  );

  return (
    <Screen mode="normal" scroll>
      <Section title="Typographie">
        <Text style={typography.h1}>Archivo 700 — h1</Text>
        <Text style={typography.h2}>Archivo 700 — h2</Text>
        <Text style={{ fontFamily: fonts.displayBlack, fontSize: 20 }}>Archivo 800 — display</Text>
        <Text style={typography.body}>IBM Plex Sans 400 — texte courant</Text>
        <Text style={typography.bodyBold}>IBM Plex Sans 600 — texte accentué</Text>
        <Text style={typography.data}>IBM Plex Mono 400 — 1 234 FCFA</Text>
      </Section>

      <Section title="Palette">
        {paletteEntries.map(([name, hex]) => (
          <View key={name} style={styles.swatchRow}>
            <View style={[styles.swatch, { backgroundColor: hex }]} />
            <Text style={typography.small}>{name}</Text>
            <Text style={typography.data}>{hex}</Text>
          </View>
        ))}
      </Section>

      <Section title="Boutons">
        <PrimaryButton label="Bouton principal" onPress={() => {}} />
        <PrimaryButton label="Succès (72px stress)" onPress={() => {}} variant="success" stress />
        <PrimaryButton label="Chargement" onPress={() => {}} loading />
        <PrimaryButton label="Désactivé" onPress={() => {}} disabled />
        <OutlineButton label="Bouton contour" onPress={() => {}} />
        <OutlineButton label="Consignes sans compte" onPress={() => {}} variant="danger" />
      </Section>

      <Section title="Champ de texte">
        <TextField label="Adresse e-mail" value={fieldValue} onChangeText={setFieldValue} />
        <TextField
          label="Mot de passe"
          value={fieldValue}
          onChangeText={setFieldValue}
          secureTextEntry
        />
        <TextField
          label="Téléphone"
          value=""
          onChangeText={() => {}}
          error="Ce champ est obligatoire"
        />
      </Section>

      <Section title="Card + PointsBadge">
        <Card>
          <Text style={typography.h3}>Reprendre un cours</Text>
          <PointsBadge value={120} />
        </Card>
      </Section>

      <Section title="CourseIcon (vital vs standard)">
        <View style={styles.iconRow}>
          <CourseIcon type="hemorragie" />
          <CourseIcon type="arret_cardiaque" />
          <CourseIcon type="noyade" />
          <CourseIcon type="malaise" />
          <CourseIcon type="chute" />
        </View>
      </Section>

      <Section title="ProgressSegments">
        <ProgressSegments count={2} total={5} />
      </Section>

      <Section title="ChevronStrip">
        <ChevronStrip />
      </Section>

      <Section title="ResponsibilityNote">
        <ResponsibilityNote text="AFRICASECOUR ne remplace pas les secours, un médecin ou une formation officielle." />
      </Section>

      <Section title="EmergencyBanner">
        <EmergencyBanner phoneNumber="185" />
      </Section>

      <Section title="StateView">
        <View style={styles.iconRow}>
          {(['loading', 'empty', 'error', 'offline', 'none'] as const).map((state) => (
            <OutlineButton key={state} label={state} onPress={() => setStateDemo(state)} />
          ))}
        </View>
        {stateDemo === 'loading' && <StateView state="loading" />}
        {stateDemo === 'empty' && (
          <StateView
            state="empty"
            title="Aucun cours en cours"
            message="Découvrez l'Académie pour commencer votre premier cours."
            actionLabel="Découvrir l'Académie"
            onAction={() => {}}
          />
        )}
        {stateDemo === 'error' && (
          <StateView
            state="error"
            message="Le chargement a échoué. Vérifiez votre connexion et réessayez."
            onRetry={() => {}}
          />
        )}
        {stateDemo === 'offline' && (
          <StateView state="offline" onViewEmergencyInstructions={() => {}} />
        )}
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[typography.h3, styles.sectionTitle]}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  sectionBody: {
    gap: spacing.sm,
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
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
