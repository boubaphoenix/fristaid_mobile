import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, sizes } from '@/constants/theme';

const SLICE_WIDTH = 14;
const SLICE_COUNT = 40; // couvre tout écran raisonnable ; le conteneur coupe le surplus (overflow hidden)

type ChevronStripProps = {
  style?: StyleProp<ViewStyle>;
};

// Bande de chevrons diagonaux signature — tranches inclinées alternant
// warningOrange / darkText, hauteur fixe sizes.chevronHeight (8px).
export function ChevronStrip({ style }: ChevronStripProps) {
  return (
    <View style={[styles.strip, style]}>
      {Array.from({ length: SLICE_COUNT }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.slice,
            { backgroundColor: index % 2 === 0 ? colors.warningOrange : colors.darkText },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    height: sizes.chevronHeight,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  slice: {
    width: SLICE_WIDTH,
    height: sizes.chevronHeight * 3,
    marginLeft: -SLICE_WIDTH / 2,
    transform: [{ skewX: '-35deg' }],
  },
});
