import { Alert, Platform } from 'react-native';

type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

// react-native-web n'implémente PAS Alert.alert() : c'est un no-op total
// (aucune boîte de dialogue, aucun callback jamais appelé). Sur mobile,
// Alert.alert() marche normalement. Sur web, on retombe sur
// window.confirm()/window.alert() du navigateur pour obtenir un
// comportement équivalent (confirmation avant partage, message
// d'erreur bloquant) au lieu d'un bouton qui ne fait rien.
export function confirmAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }
  if (typeof window === 'undefined') return;

  const text = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }

  const confirmButton = buttons.find((b) => b.style !== 'cancel') ?? buttons[buttons.length - 1];
  const cancelButton = buttons.find((b) => b.style === 'cancel');
  if (window.confirm(text)) {
    confirmButton?.onPress?.();
  } else {
    cancelButton?.onPress?.();
  }
}
