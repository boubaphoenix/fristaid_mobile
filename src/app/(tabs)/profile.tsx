import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';

import { OutlineButton, PrimaryButton, Screen, StateView, TextField } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { type AuthUser } from '@/lib/authApi';
import { getProfile, updateProfile, updateReminders } from '@/lib/profileApi';

function initials(fullName: string | null, email: string): string {
  if (fullName && fullName.trim()) {
    const parts = fullName.trim().split(/\s+/);
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('');
  }
  return email[0]?.toUpperCase() ?? '?';
}

// Écran 23 — profil et réglages.
export default function ProfileScreen() {
  const { token, signOut } = useAuth();
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error' } | { status: 'success'; user: AuthUser }>(
    { status: 'loading' },
  );
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isTogglingReminders, setIsTogglingReminders] = useState(false);

  useEffect(() => {
    if (!token) return;
    getProfile(token)
      .then((user) => {
        setState({ status: 'success', user });
        setFullName(user.profile.full_name ?? '');
        setPhone(user.profile.phone ?? '');
      })
      .catch(() => setState({ status: 'error' }));
  }, [token]);

  async function handleSave() {
    if (!token) return;
    setSaveError(null);
    setIsSaving(true);
    try {
      const user = await updateProfile(token, { full_name: fullName || undefined, phone: phone || undefined });
      setState({ status: 'success', user });
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Impossible de mettre à jour le profil pour le moment.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleReminders(value: boolean) {
    if (!token || state.status !== 'success') return;
    setIsTogglingReminders(true);
    try {
      const user = await updateReminders(token, value);
      setState({ status: 'success', user });
    } catch {
      // Pas de changement d'état local si l'appel échoue : l'interrupteur
      // reflète toujours la valeur réellement enregistrée côté serveur.
    } finally {
      setIsTogglingReminders(false);
    }
  }

  if (state.status === 'loading') {
    return (
      <Screen mode="normal" scroll>
        <StateView state="loading" />
      </Screen>
    );
  }
  if (state.status === 'error') {
    return (
      <Screen mode="normal" scroll>
        <StateView state="error" message="Le chargement du profil a échoué." onRetry={() => setState({ status: 'loading' })} />
      </Screen>
    );
  }

  const { user } = state;

  return (
    <Screen mode="normal" scroll>
      <View style={styles.avatarBlock}>
        <View style={styles.avatar}>
          <Text style={[typography.h2, styles.avatarLabel]}>{initials(user.profile.full_name, user.email)}</Text>
        </View>
        <Text style={[typography.h3, styles.spaced]}>{user.profile.full_name || user.email}</Text>
        <Text style={[typography.small, styles.muted]}>{user.email}</Text>
      </View>

      <TextField label="Nom complet" value={fullName} onChangeText={setFullName} style={styles.spaced} />
      <TextField
        label="Téléphone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="+225 07 00 00 00 00"
        style={styles.spaced}
      />
      {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
      <PrimaryButton
        label={isSaving ? 'Enregistrement...' : 'Enregistrer'}
        onPress={handleSave}
        loading={isSaving}
        style={styles.spaced}
      />

      <View style={styles.remindersRow}>
        <View style={styles.remindersText}>
          <Text style={typography.bodyBold}>Rappels de reprise</Text>
          <Text style={[typography.caption, styles.muted]}>
            Un rappel tous les 2 jours maximum, jusqu'à 3 rappels par cours.
          </Text>
        </View>
        <Switch
          value={user.profile.reminders_enabled}
          onValueChange={handleToggleReminders}
          disabled={isTogglingReminders}
          trackColor={{ true: colors.trustBlue, false: colors.border }}
          thumbColor={colors.white}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/leaderboard')}
        style={styles.leaderboardRow}>
        <Text style={typography.bodyBold}>Mon classement / Mes titres</Text>
        <Text style={[typography.small, styles.muted]}>Voir mon rang et ma progression</Text>
      </Pressable>

      <OutlineButton label="Se déconnecter" onPress={signOut} variant="danger" style={styles.spacedLg} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarBlock: {
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.trustBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarLabel: {
    color: colors.white,
  },
  spaced: {
    marginBottom: spacing.md,
  },
  spacedLg: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  muted: {
    color: colors.mutedText,
  },
  error: {
    color: colors.emergencyRed,
    marginBottom: spacing.sm,
  },
  remindersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 64,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  remindersText: {
    flex: 1,
  },
  leaderboardRow: {
    marginTop: spacing.md,
    minHeight: 64,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    gap: spacing.xs,
  },
});
