import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Document HTML racine pour l'export web statique (app.json → web.output:
// "static"). expo-router rend ce fichier une seule fois au build pour
// chaque route ; tout ce qui est commun à toutes les pages (manifeste,
// meta tags d'installation) va ici plutôt que dans _layout.tsx, qui ne
// contrôle que le <body>.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta
          name="description"
          content="AfricaSecours — les gestes de premiers secours qui sauvent, adaptés à l'Afrique francophone."
        />

        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#173B2E" />

        {/* Safari n'honore pas manifest.json pour l'icône/l'écran d'accueil :
            ces balises sont le seul moyen d'avoir une icône correcte et un
            lancement en plein écran (sans barre d'adresse) sur iPhone. */}
        <link rel="apple-touch-icon" href="/pwa-icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AfricaSecours" />

        {/* Évite un flash de page non stylée pendant l'hydratation
            (patron recommandé par expo-router pour l'export web statique). */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
