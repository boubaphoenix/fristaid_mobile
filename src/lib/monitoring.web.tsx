import { Component, type ComponentType, type ReactElement, type ReactNode } from 'react';

// Bundle CDN de Sentry plutôt que le paquet npm : Metro n'élimine pas le code
// inutilisé du SDK (~1,1 Mo dans notre bundle, ~150 Ko pour ce fichier).
// Version et empreinte vont ensemble : changer l'une impose de recalculer l'autre.
const SENTRY_CDN_URL = 'https://browser.sentry-cdn.com/10.75.0/bundle.tracing.min.js';
const SENTRY_CDN_INTEGRITY = 'sha384-wuUOPnSi8FR8l7mI0XE5ckys5zbwMk7SACqSCR3W86Sqh1l2JSTMXn3P4nG0uAtm';

type SentryEvent = { exception?: { values?: { value?: string }[] } };

declare global {
  interface Window {
    Sentry?: {
      init: (options: Record<string, unknown>) => void;
      captureException: (error: unknown) => void;
    };
  }
}

function loadSentry() {
  const script = document.createElement('script');
  script.src = SENTRY_CDN_URL;
  script.integrity = SENTRY_CDN_INTEGRITY;
  script.crossOrigin = 'anonymous';
  script.onload = () => {
    window.Sentry?.init({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
      environment: 'web',
      tracesSampleRate: Number(process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.2),
      sendDefaultPii: false,
      beforeSend: (event: SentryEvent, hint: { originalException?: unknown }) => {
        // Bruit sans valeur de diagnostic : boucle ResizeObserver (inoffensive)
        // et NETWORK_ERROR de api.ts, attendu hors-ligne sur une PWA en 3G.
        const message = hint?.originalException instanceof Error ? hint.originalException.message : '';
        if (
          message.includes('ResizeObserver loop') ||
          message.includes('NETWORK_ERROR') ||
          event.exception?.values?.some((v) => v.value?.includes('ResizeObserver loop'))
        ) {
          return null;
        }
        return event;
      },
    });
  };
  document.head.appendChild(script);
}

// Après une mise en ligne, une page encore ouverte sur l'ancienne version
// demande des morceaux de code (chunks) qui n'existent plus sur le serveur.
// Recharger récupère la nouvelle version. Une seule fois par minute, pour ne
// jamais boucler (hors-ligne, serveur en panne).
const CHUNK_RELOAD_KEY = 'africasecour_chunk_reload_at';

function isChunkLoadError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === 'AsyncRequireError' || error.message.startsWith('Loading module '))
  );
}

function reloadOnceForChunkError(error: unknown) {
  if (!isChunkLoadError(error)) return false;
  try {
    const last = Number(window.sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? 0);
    if (Date.now() - last < 60_000) return false;
    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

// Après l'événement load pour ne jamais concurrencer le premier affichage.
// Une erreur survenue avant la fin de ce chargement n'est pas remontée.
export function startMonitoring() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  window.addEventListener('unhandledrejection', (event) => reloadOnceForChunkError(event.reason));
  window.addEventListener('error', (event) => reloadOnceForChunkError(event.error));
  if (!process.env.EXPO_PUBLIC_SENTRY_DSN) return;
  if (document.readyState === 'complete') {
    loadSentry();
  } else {
    window.addEventListener('load', loadSentry, { once: true });
  }
}

type BoundaryProps = {
  fallback: (props: { resetError: () => void }) => ReactElement;
  children: ReactNode;
};

export class MonitoringBoundary extends Component<BoundaryProps, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    window.Sentry?.captureException(error);
    reloadOnceForChunkError(error);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback({ resetError: () => this.setState({ hasError: false }) });
    }
    return this.props.children;
  }
}

export function wrapRoot<P extends Record<string, unknown>>(component: ComponentType<P>) {
  return component;
}
