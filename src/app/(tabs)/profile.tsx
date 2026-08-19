import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';

import { OutlineButton, PrimaryButton, Screen, StateView, TextField } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { type AuthUser } from '@/lib/authApi';
import { confirmAlert } from '@/lib/confirmAlert';
import { initials } from '@/lib/initials';
import { getProfile, updateProfile, updateReminders } from '@/lib/profileApi';

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
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

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

  async function handlePickAvatar() {
    if (!token) return;
    setAvatarError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setAvatarError("L'accès aux photos est requis pour changer votre photo de profil.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;

    const mimeType = result.assets[0].mimeType ?? 'image/jpeg';
    const dataUri = `data:${mimeType};base64,${result.assets[0].base64}`;
    setIsUploadingAvatar(true);
    try {
      const user = await updateProfile(token, { avatar_url: dataUri });
      setState({ status: 'success', user });
    } catch (err) {
      setAvatarError(err instanceof ApiError ? err.message : "Impossible d'enregistrer la photo pour le moment.");
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    if (!token) return;
    setAvatarError(null);
    setIsUploadingAvatar(true);
    try {
      const user = await updateProfile(token, { avatar_url: null });
      setState({ status: 'success', user });
    } catch (err) {
      setAvatarError(err instanceof ApiError ? err.message : "Impossible de supprimer la photo pour le moment.");
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  function handleSignOutPress() {
    confirmAlert('Se déconnecter', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Rester connecté', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: signOut },
    ]);
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
    <Screen mode="normal" scroll keyboardAvoiding>
      <View style={styles.avatarBlock}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Changer la photo de profil"
          onPress={handlePickAvatar}
          disabled={isUploadingAvatar}
          style={styles.avatar}>
          {user.profile.avatar_url ? (
            <Image source={{ uri: user.profile.avatar_url }} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <Text style={[typography.h2, styles.avatarLabel]}>{initials(user.profile.full_name, user.email)}</Text>
          )}
        </Pressable>
        <Pressable onPress={handlePickAvatar} disabled={isUploadingAvatar} hitSlop={8}>
          <Text style={[typography.caption, styles.link, styles.avatarActionSpacing]}>
            {isUploadingAvatar ? 'Enregistrement...' : 'Changer la photo'}
          </Text>
        </Pressable>
        {user.profile.avatar_url && !isUploadingAvatar ? (
          <Pressable onPress={handleRemoveAvatar} hitSlop={8}>
            <Text style={[typography.caption, styles.error]}>Supprimer la photo</Text>
          </Pressable>
        ) : null}
        {avatarError ? <Text style={[typography.caption, styles.error, styles.avatarActionSpacing]}>{avatarError}</Text> : null}
        <Text style={[typography.h3, styles.spaced]}>{user.profile.full_name || user.email}</Text>
        <Text style={[typography.small, styles.muted]}>{user.email}</Text>
        {user.email_verified ? (
          <Text style={[typography.caption, styles.verifiedText]}>✓ E-mail vérifié</Text>
        ) : (
          <Pressable onPress={() => router.push('/verify-email')} hitSlop={8}>
            <Text style={[typography.caption, styles.link]}>Vérifier mon e-mail</Text>
          </Pressable>
        )}
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

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/identity-card')}
        style={styles.leaderboardRow}>
        <Text style={typography.bodyBold}>Carte d'identité AFRICASECOUR</Text>
        <Text style={[typography.small, styles.muted]}>Partager ma progression</Text>
      </Pressable>

      <Pressable accessibilityRole="button" onPress={() => router.push('/contact')} style={styles.leaderboardRow}>
        <Text style={typography.bodyBold}>Nous contacter</Text>
        <Text style={[typography.small, styles.muted]}>Signaler un problème ou nous écrire sur WhatsApp</Text>
      </Pressable>

      <OutlineButton label="Se déconnecter" onPress={handleSignOutPress} variant="danger" style={styles.spacedLg} />
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
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarActionSpacing: {
    marginTop: spacing.xs,
  },
  link: {
    color: colors.trustBlue,
  },
  verifiedText: {
    color: colors.successGreen,
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
