import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { modeNormal, modeStress, spacing } from '@/constants/theme';

type ScreenMode = 'normal' | 'stress';

type ScreenProps = PropsWithChildren<{
  mode?: ScreenMode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function Screen({ mode = 'normal', scroll = false, style, children }: ScreenProps) {
  const background = mode === 'stress' ? modeStress.background : modeNormal.background;
  const Container = scroll ? ScrollView : View;
  const containerProps = scroll
    ? { contentContainerStyle: [styles.content, style] }
    : { style: [styles.content, style] };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: background }]} edges={['top', 'bottom']}>
      <Container {...(containerProps as object)}>{children}</Container>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.screenPadding,
  },
});
