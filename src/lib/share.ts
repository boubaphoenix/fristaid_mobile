import { Platform, Share } from 'react-native';

export type ShareOutcome = 'shared' | 'cancelled' | 'unsupported';

// Sur natif (iOS/Android), Share.share() ouvre le menu de partage système
// (WhatsApp, SMS, etc.) — comportement inchangé.
//
// Sur web, react-native-web délègue à window.navigator.share(), absent
// sur beaucoup de navigateurs desktop (Firefox, certains Chrome) : sans
// repli, le bouton "Partager" ne fait alors rigoureusement rien, ce qui
// est le bug observé en test web. On ouvre WhatsApp Web dans ce cas —
// c'est la seule cible fiable sans app installée ni schéma d'URL natif
// (contrairement à sms:, sans effet sur la plupart des navigateurs desktop).
export async function shareMessage(message: string): Promise<ShareOutcome> {
  if (Platform.OS !== 'web') {
    const result = await Share.share({ message });
    return result.action === Share.dismissedAction ? 'cancelled' : 'shared';
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ text: message });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }

  if (typeof window !== 'undefined') {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }
  return 'unsupported';
}
