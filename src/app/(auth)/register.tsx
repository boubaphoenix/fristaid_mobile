import { Link, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LogoMark, PointsBadge, PrimaryButton, Screen, TextField } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { registerAccount } from '@/lib/authApi';

const PHONE_PREFIX = '+225';

type Strength = 0 | 1 | 2 | 3;

// Robustesse indicative, pas une vraie politique de mot de passe (le
// backend impose déjà le seul vrai minimum : 8 caractères). Sert juste à
// encourager un mot de passe plus solide avant l'envoi.
function computeStrength(password: string): Strength {
  if (password.length < 8) return 0;
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasVariety = /[A-Z]/.test(password) || /[^a-zA-Z0-9]/.test(password);
  if (hasNumber && hasLetter && hasVariety && password.length >= 10) return 3;
  if (hasNumber && hasLetter) return 2;
  return 1;
}

const STRENGTH_LABEL: Record<Strength, string> = { 0: '', 1: 'Faible', 2: 'Moyen', 3: 'Fort' };
const STRENGTH_COLOR: Record<Strength, string> = {
  0: colors.border,
  1: colors.emergencyRed,
  2: colors.warningOrange,
  3: colors.successGreen,
};

function normalizePhone(rawPhone: string): string | undefined {
  const trimmed = rawPhone.trim();
  if (!trimmed) return undefined;
  return trimmed.startsWith('+') ? trimmed : `${PHONE_PREFIX} ${trimmed}`;
}

// Écran 02 — le formulaire est déjà fonctionnel depuis la Phase 0.8
// (POST /auth/register réel) ; cette version ajoute uniquement l'habillage
// Banani (indicateur de robustesse, case CGU, indicatif téléphonique,
// pastille de points) sans changer la logique de soumission.
export default function RegisterScreen() {
  const { signIn } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const strength = useMemo(() => computeStrength(password), [password]);
  const canSubmit = Boolean(email && password && acceptedTerms) && !isSubmitting;

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    try {
      const { token } = await registerAccount(email, password, fullName || undefined, normalizePhone(phone));
      await signIn(token);
      router.replace('/post-auth-loading');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de créer le compte pour le moment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen mode="normal" scroll>
      <View style={styles.logoHeader}>
        <LogoMark size={48} variant="onCream" />
      </View>
      <View style={styles.headerRow}>
        <Text style={[typography.h2, styles.spaced]}>Créer un compte</Text>
        <PointsBadge value={100} />
      </View>
      <Text style={[typography.small, styles.muted, styles.spaced]}>
        100 points offerts dès votre inscription.
      </Text>

      <TextField label="Nom complet" value={fullName} onChangeText={setFullName} style={styles.spaced} />
      <TextField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        style={styles.spaced}
      />
      <TextField
        label="Téléphone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder={`${PHONE_PREFIX} 07 00 00 00 00`}
        style={styles.spaced}
      />
      <TextField
        label="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        error={error ?? undefined}
        style={styles.spaced}
      />

      {password.length > 0 ? (
        <View style={styles.strengthBlock}>
          <View style={styles.strengthRow}>
            {[1, 2, 3].map((segment) => (
              <View
                key={segment}
                style={[
                  styles.strengthSegment,
                  { backgroundColor: segment <= strength ? STRENGTH_COLOR[strength] : colors.border },
                ]}
              />
            ))}
          </View>
          <Text style={[typography.caption, styles.muted]}>{STRENGTH_LABEL[strength]}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: acceptedTerms }}
        onPress={() => setAcceptedTerms((prev) => !prev)}
        style={styles.termsRow}>
        <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
          {acceptedTerms ? <Text style={styles.checkboxMark}>✓</Text> : null}
        </View>
        <Text style={[typography.small, styles.termsText]}>
          J'accepte les Conditions Générales d'Utilisation d'AFRICASECOUR.
        </Text>
      </Pressable>

      <PrimaryButton
        label={isSubmitting ? 'Création...' : 'Créer mon compte'}
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={!canSubmit}
        style={styles.spaced}
      />
      <Link href="/(auth)/login">
        <Text style={typography.bodyBold}>J'ai déjà un compte</Text>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logoHeader: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  spaced: {
    marginBottom: spacing.md,
  },
  muted: {
    color: colors.mutedText,
  },
  strengthBlock: {
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  strengthRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: radius.pill,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.trustBlue,
    borderColor: colors.trustBlue,
  },
  checkboxMark: {
    color: colors.white,
    fontWeight: '700',
  },
  termsText: {
    flex: 1,
    color: colors.darkText,
  },
});
