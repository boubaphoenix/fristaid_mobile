import { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';

import { colors, radius, spacing, typography } from '@/constants/theme';
import { isValidYoutubeVideoId } from '@/lib/youtubeSafety';

type VideoCapsuleProps = {
  videoId: string;
  durationSeconds?: number | null;
};

type PlayerStatus = 'loading' | 'ready' | 'error';

// Filet de sécurité : temps maximum avant de considérer le lecteur en échec
// si ni `onReady` ni `onError` ne se sont déclenchés. Garantit qu'aucun
// utilisateur ne reste bloqué devant un skeleton indéfiniment.
const READY_TIMEOUT_MS = 8000;

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}

// Largeur initiale estimée avant la première mesure via onLayout — évite un
// premier rendu à hauteur 0 (le calcul de hauteur dépend de la largeur).
const initialWidth = Dimensions.get('window').width - spacing.screenPadding * 2 - 2;

export function VideoCapsule({ videoId, durationSeconds }: VideoCapsuleProps) {
  const [status, setStatus] = useState<PlayerStatus>('loading');
  const [width, setWidth] = useState(initialWidth);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setStatus('loading');
    timeoutRef.current = setTimeout(() => {
      setStatus((current) => (current === 'loading' ? 'error' : current));
    }, READY_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [videoId]);

  const handleReady = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setStatus('ready');
  };

  const handleError = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setStatus('error');
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    const measuredWidth = event.nativeEvent.layout.width;
    if (measuredWidth > 0 && measuredWidth !== width) {
      setWidth(measuredWidth);
    }
  };

  const height = Math.round(width * (9 / 16));
  const headerLabel =
    durationSeconds == null ? 'Capsule Vidéo' : `Capsule Vidéo • ${formatDuration(durationSeconds)} min`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[typography.small, styles.headerText]}>{headerLabel}</Text>
      </View>

      {status === 'error' || !isValidYoutubeVideoId(videoId) ? (
        <View style={styles.errorBlock}>
          <Text style={[typography.body, styles.errorText]}>
            Vidéo indisponible hors-ligne — lisez le cours ci-dessous
          </Text>
        </View>
      ) : (
        <View style={[styles.playerArea, { height }]} onLayout={handleLayout}>
          {status === 'loading' && <View style={[styles.skeleton, { width, height }]} />}
          {width > 0 && (
            <YoutubePlayer
              videoId={videoId}
              height={height}
              width={width}
              play={false}
              onReady={handleReady}
              onError={handleError}
              // Best-effort : ces callbacks du WebView sous-jacent ne sont pas
              // garantis sur toutes les plateformes/versions — le filet de
              // sécurité par timeout ci-dessus reste la protection principale.
              webViewProps={{
                onError: handleError,
                onHttpError: handleError,
              }}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: {
    color: colors.mutedText,
  },
  playerArea: {
    position: 'relative',
  },
  skeleton: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: colors.border,
    borderRadius: radius.card,
  },
  errorBlock: {
    backgroundColor: colors.warningBg,
    padding: spacing.md,
  },
  errorText: {
    color: colors.darkText,
  },
});
