import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, typography } from '@/constants/theme';

// Les 8 cours MVP (PRD §11.10 — identifiants techniques officiels,
// partagés avec courses.category côté backend et incident_type des
// sessions IA SOS). Rouge réservé aux 3 incidents vitaux (bleeding,
// cardiac_arrest, drowning), bleu pour les autres.
export type CourseType =
  | 'road_accident'
  | 'bleeding'
  | 'choking'
  | 'burn'
  | 'malaise'
  | 'fall'
  | 'cardiac_arrest'
  | 'drowning'
  | 'recovery_position';

const VITAL_COURSES: ReadonlySet<CourseType> = new Set(['bleeding', 'cardiac_arrest', 'drowning']);

const MONOGRAM: Record<CourseType, string> = {
  road_accident: 'AC',
  bleeding: 'HE',
  choking: 'ET',
  burn: 'BR',
  malaise: 'MA',
  fall: 'CH',
  cardiac_arrest: 'AR',
  drowning: 'NO',
  recovery_position: 'PL',
};

type CourseIconProps = {
  type: CourseType;
  size?: number;
};

// Bloc de couleur pleine + pictogramme (monogramme géométrique, pas
// d'illustration décorative), un par catégorie de cours.
export function CourseIcon({ type, size = 48 }: CourseIconProps) {
  const background = VITAL_COURSES.has(type) ? colors.emergencyRed : colors.trustBlue;

  return (
    <View
      style={[
        styles.block,
        { width: size, height: size, backgroundColor: background },
      ]}>
      <Text style={[typography.bodyBold, styles.label]}>{MONOGRAM[type]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: colors.white,
  },
});
