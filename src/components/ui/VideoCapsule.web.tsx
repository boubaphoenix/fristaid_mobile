import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';
import { buildYoutubeEmbedUrl } from '@/lib/youtubeSafety';

// Variante web : `react-native-youtube-iframe` résout `WebView.web.js` vers
// le paquet `react-native-web-webview` (abandonné depuis 2022, dépendance
// peer de Webpack `file-loader`, introuvable sous Metro) — un `require`
// non résolu qui casse le bundle web entier via le barrel `@/components/ui`
// (32 écrans en dépendent). Cette variante contourne complètement la
// librairie sur web : Metro sélectionne ce fichier (extension `.web.tsx`)
// avant `VideoCapsule.tsx`, donc `react-native-youtube-iframe` n'est jamais
// importé côté web. On rend directement l'iframe embed YouTube standard.

type VideoCapsuleProps = {
  videoId: string;
  durationSeconds?: number | null;
};

type PlayerStatus = 'loading' | 'ready' | 'error';

const READY_TIMEOUT_MS = 8000;

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}

const initialWidth = Dimensions.get('window').width - spacing.screenPadding * 2 - 2;

export function VideoCapsule({ videoId, durationSeconds }: VideoCapsuleProps) {
  const [status, setStatus] = useState<PlayerStatus>('loading');
  const [width, setWidth] = useState(initialWidth);
  const containerRef = useRef<View>(null);
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

  const clearReadyTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleLoad = () => {
    clearReadyTimeout();
    setStatus('ready');
  };

  const handleError = () => {
    clearReadyTimeout();
    setStatus('error');
  };

  // Mesure la largeur réelle du conteneur une fois monté (équivalent web de
  // `onLayout` — react-native-web ne remonte pas toujours un `onLayout`
  // fiable pour un `<View>` racine, `getBoundingClientRect` est direct ici).
  useEffect(() => {
    const node = containerRef.current as unknown as HTMLElement | null;
    if (node && typeof node.getBoundingClientRect === 'function') {
      const measured = node.getBoundingClientRect().width;
      if (measured > 0 && measured !== width) {
        setWidth(measured);
      }
    }
    // Largeur mesurée une seule fois au montage, comme la variante native.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const height = Math.round(width * (9 / 16));
  const headerLabel =
    durationSeconds == null ? 'Capsule Vidéo' : `Capsule Vidéo • ${formatDuration(durationSeconds)} min`;
  const embedUrl = buildYoutubeEmbedUrl(videoId);

  return (
    <View style={styles.container} ref={containerRef}>
      <View style={styles.header}>
        <Text style={[typography.small, styles.headerText]}>{headerLabel}</Text>
      </View>

      {status === 'error' || !embedUrl ? (
        <View style={styles.errorBlock}>
          <Text style={[typography.body, styles.errorText]}>
            Vidéo indisponible hors-ligne — lisez le cours ci-dessous
          </Text>
        </View>
      ) : (
        <View style={[styles.playerArea, { height }]}>
          {status === 'loading' && <View style={[styles.skeleton, { width, height }]} />}
          {width > 0 && (
            // eslint-disable-next-line react/no-unknown-property -- iframe web natif, ce fichier ne compile que pour la plateforme web
            <iframe
              src={embedUrl}
              width={width}
              height={height}
              style={frameStyle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              // Sans sandbox, l'iframe tourne avec des privilèges complets.
              // allow-scripts + allow-same-origin sont requis pour que le
              // player YouTube fonctionne ; allow-popups pour "Regarder sur
              // YouTube" ; allow-presentation pour le plein écran/PiP.
              // Volontairement absents : allow-forms, allow-top-navigation,
              // allow-modals, allow-pointer-lock.
              sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
              referrerPolicy="strict-origin-when-cross-origin"
              onLoad={handleLoad}
              onError={handleError}
            />
          )}
        </View>
      )}
    </View>
  );
}

const frameStyle: CSSProperties = { border: 0, display: 'block' };

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
