import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, typography } from '@/constants/theme';

// Les 8 cours MVP (PRD §19). Rouge réservé aux 3 incidents vitaux
// (hémorragie, arrêt cardiaque, noyade), bleu pour les autres.
export type CourseType =
  | 'accident_circulation'
  | 'hemorragie'
  | 'etouffement'
  | 'brulure'
  | 'malaise'
  | 'chute'
  | 'arret_cardiaque'
  | 'noyade';

const VITAL_COURSES: ReadonlySet<CourseType> = new Set(['hemorragie', 'arret_cardiaque', 'noyade']);

const MONOGRAM: Record<CourseType, string> = {
  accident_circulation: 'AC',
  hemorragie: 'HE',
  etouffement: 'ET',
  brulure: 'BR',
  malaise: 'MA',
  chute: 'CH',
  arret_cardiaque: 'AR',
  noyade: 'NO',
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
