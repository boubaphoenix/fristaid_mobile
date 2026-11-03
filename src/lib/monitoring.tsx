import * as Sentry from '@sentry/react-native';
import type { ComponentType, ReactElement, ReactNode } from 'react';

// Hors de src/app volontairement : Expo Router charge sur web tout fichier
// _layout.* trouvé dans src/app, y compris une variante .native, ce qui
// ramenait ce SDK (~1,5 Mo) dans la page. Variante web : monitoring.web.tsx.
export function startMonitoring() {
  if (!process.env.EXPO_PUBLIC_SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: 'production',
    tracesSampleRate: Number(process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.2),
    sendDefaultPii: false,
  });
}

export function MonitoringBoundary({
  fallback,
  children,
}: {
  fallback: (props: { resetError: () => void }) => ReactElement;
  children: ReactNode;
}) {
  return <Sentry.ErrorBoundary fallback={fallback}>{children}</Sentry.ErrorBoundary>;
}

export function wrapRoot<P extends Record<string, unknown>>(component: ComponentType<P>) {
  return Sentry.wrap(component);
}
