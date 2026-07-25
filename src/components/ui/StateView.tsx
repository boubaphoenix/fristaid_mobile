import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';
import { PrimaryButton } from './PrimaryButton';

type LoadingProps = {
  state: 'loading';
  skeletonCount?: number;
};

type EmptyProps = {
  state: 'empty';
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
};

type ErrorProps = {
  state: 'error';
  title?: string;
  message: string;
  onRetry: () => void;
};

type OfflineProps = {
  state: 'offline';
  onViewEmergencyInstructions: () => void;
};

type StateViewProps = LoadingProps | EmptyProps | ErrorProps | OfflineProps;

// Les 4 modèles d'état réutilisables (ecran 24). Règle : aucune mascotte,
// aucun message qui s'excuse ni ne reste vague — toujours dire quoi faire.
export function StateView(props: StateViewProps) {
  switch (props.state) {
    case 'loading':
      return <LoadingState skeletonCount={props.skeletonCount ?? 3} />;
    case 'empty':
      return <EmptyState {...props} />;
    case 'error':
      return <ErrorState {...props} />;
    case 'offline':
      return <OfflineState {...props} />;
  }
}

function LoadingState({ skeletonCount }: { skeletonCount: number }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: skeletonCount }).map((_, index) => (
        <View key={index} style={styles.skeletonBlock} />
      ))}
    </View>
  );
}

function EmptyState({ title, message, actionLabel, onAction }: Omit<EmptyProps, 'state'>) {
  return (
    <View style={styles.container}>
      <View style={styles.pictogram}>
        <View style={styles.pictogramInner} />
      </View>
      <Text style={[typography.h3, styles.centerText]}>{title}</Text>
      <Text style={[typography.body, styles.centerText, styles.muted]}>{message}</Text>
      <PrimaryButton label={actionLabel} onPress={onAction} />
    </View>
  );
}

function ErrorState({ title = "Une erreur s'est produite", message, onRetry }: Omit<ErrorProps, 'state'>) {
  return (
    <View style={styles.container}>
      <View style={styles.errorBlock}>
        <Text style={[typography.h3, styles.errorTitle]}>{title}</Text>
        <Text style={[typography.body, styles.errorMessage]}>{message}</Text>
      </View>
      <PrimaryButton label="Réessayer" onPress={onRetry} />
    </View>
  );
}

function OfflineState({ onViewEmergencyInstructions }: Omit<OfflineProps, 'state'>) {
  return (
    <View style={styles.offlineBanner}>
      <Text style={[typography.bodyBold, styles.offlineText]}>
        Pas de connexion — les consignes de secours restent accessibles hors ligne.
      </Text>
      <PrimaryButton label="Voir les consignes" onPress={onViewEmergencyInstructions} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: 'stretch',
  },
  skeletonBlock: {
    height: 72,
    borderRadius: radius.card,
    backgroundColor: colors.border,
  },
  pictogram: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: colors.mutedText,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  pictogramInner: {
    width: 20,
    height: 20,
    borderRadius: radius.button,
    backgroundColor: colors.mutedText,
  },
  centerText: {
    textAlign: 'center',
    color: colors.darkText,
  },
  muted: {
    color: colors.mutedText,
  },
  errorBlock: {
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warningOrange,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  errorTitle: {
    color: colors.darkText,
  },
  errorMessage: {
    color: colors.darkText,
  },
  offlineBanner: {
    backgroundColor: colors.darkText,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.md,
  },
  offlineText: {
    color: colors.white,
  },
});
