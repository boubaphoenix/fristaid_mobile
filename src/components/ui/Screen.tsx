import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { modeNormal, modeStress, spacing } from '@/constants/theme';

type ScreenMode = 'normal' | 'stress';

type ScreenProps = PropsWithChildren<{
  mode?: ScreenMode;
  scroll?: boolean;
  // Opt-in: wraps content in KeyboardAvoidingView so a focused TextField
  // stays above the keyboard on iOS (ScrollView alone does not do this).
  // Only screens with text inputs need it.
  keyboardAvoiding?: boolean;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
}>;

export function Screen({
  mode = 'normal',
  scroll = false,
  keyboardAvoiding = false,
  backgroundColor,
  style,
  children,
}: ScreenProps) {
  const background = backgroundColor ?? (mode === 'stress' ? modeStress.background : modeNormal.background);
  const Container = scroll ? ScrollView : View;
  const containerProps = scroll
    ? { contentContainerStyle: [styles.content, style] }
    : { style: [styles.content, style] };

  const content = <Container {...(containerProps as object)}>{children}</Container>;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: background }]} edges={['top', 'bottom']}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView style={styles.safeArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
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
