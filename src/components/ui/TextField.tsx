import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radius, sizes, spacing, typography } from '@/constants/theme';

type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  style?: StyleProp<ViewStyle>;
  multiline?: boolean;
  numberOfLines?: number;
};

export function TextField({
  label,
  value,
  onChangeText,
  error,
  secureTextEntry = false,
  placeholder,
  keyboardType,
  autoCapitalize = 'none',
  style,
  multiline = false,
  numberOfLines,
}: TextFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const hasError = Boolean(error);
  const isPassword = secureTextEntry;

  return (
    <View style={style}>
      <Text style={[typography.bodyBold, styles.label]}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          multiline && styles.inputRowMultiline,
          { borderColor: hasError ? colors.emergencyRed : colors.border },
        ]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedText}
          secureTextEntry={isPassword && !revealed}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
          style={[typography.body, styles.input, multiline && styles.inputMultiline]}
        />
        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            onPress={() => setRevealed((prev) => !prev)}
            hitSlop={{ top: 18, bottom: 18, left: 12, right: 12 }}>
            <Text style={[typography.small, styles.reveal]}>{revealed ? 'Masquer' : 'Afficher'}</Text>
          </Pressable>
        ) : null}
      </View>
      {hasError ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.darkText,
    marginBottom: spacing.xs,
  },
  inputRow: {
    height: sizes.inputHeight,
    borderWidth: 1,
    borderRadius: radius.button,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  inputRowMultiline: {
    height: undefined,
    minHeight: sizes.inputHeight,
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.darkText,
    height: '100%',
  },
  inputMultiline: {
    height: undefined,
    textAlignVertical: 'top',
  },
  reveal: {
    color: colors.trustBlue,
  },
  error: {
    color: colors.emergencyRed,
    marginTop: spacing.xs,
  },
});
