import { Linking } from 'react-native';

// Numéro WhatsApp Business, format international sans "+" ni espaces
// (ex. "2250700000000") — jamais de numéro de test en dur ici.
export const WHATSAPP_NUMBER = process.env.EXPO_PUBLIC_WHATSAPP_NUMBER ?? '';
export const isWhatsAppConfigured = Boolean(WHATSAPP_NUMBER);

export const WHATSAPP_TRANSPARENCY_NOTICE =
  'Ceci ouvrira WhatsApp — votre numéro sera visible dans la conversation.';

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

// Linking.openURL (pas openHttpsUrl, qui est web-only) — même mécanisme
// que EmergencyBanner.tsx pour les liens tel:, fonctionne sur
// iOS/Android/web. wa.me gère lui-même le repli store si WhatsApp n'est
// pas installé ; ce `false` ne couvre que l'échec de l'appel lui-même.
export async function openWhatsApp(message: string): Promise<boolean> {
  try {
    await Linking.openURL(buildWhatsAppUrl(message));
    return true;
  } catch {
    return false;
  }
}
