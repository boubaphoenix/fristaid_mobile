# Déployer la PWA AfricaSecours sur Cloudflare Workers

Guide pas à pas pour mettre en ligne l'app web sur `app.africasecour.com`,
gratuitement, sur Cloudflare. Remplace l'ancien guide Hostinger.

> Le panneau admin et le site public (`africasecour.com`, `/privacy`,
> `/delete-account`...) restent sur Vercel comme aujourd'hui — ce guide ne
> concerne que la PWA (`fristaid-mobile`).

## 1. Premier déploiement (manuel, pour vérifier que tout marche)

Dans le dossier `fristaid-mobile` :

```
npx wrangler login
```

Ça ouvre ton navigateur pour te connecter à ton compte Cloudflare (ou en
créer un gratuitement si tu n'en as pas). Une fois connecté, reviens au
terminal.

```
npm run deploy:web
```

Cette commande fait tout : reconstruit l'app (`build:web`) puis l'envoie
sur Cloudflare (`wrangler deploy`). À la fin, le terminal affiche une
adresse en `*.workers.dev` — Cloudflare crée aussi automatiquement
`https://app.africasecour.com` avec son certificat HTTPS (grâce à la
route `custom_domain` dans `wrangler.jsonc`), ça peut prendre 1-2 minutes
à devenir actif la première fois.

**Vérifier que ça marche :**

```
curl -I https://app.africasecour.com
```

Tu dois voir `content-security-policy`, `strict-transport-security`, et
les autres en-têtes de `public/_headers` dans la réponse. Vérifie aussi
que `sw.js` a bien `cache-control: no-cache` :

```
curl -I https://app.africasecour.com/sw.js
```

Puis dans un navigateur : connexion, un cours, un quiz — le parcours
complet doit fonctionner comme en local.

## 2. Déploiement automatique (GitHub Actions)

Le fichier `.github/workflows/deploy-web.yml` est déjà prêt : à chaque
`git push` sur `main` qui touche le code de l'app, il reconstruit et
redéploie automatiquement. Il lui faut juste deux secrets GitHub.

**Créer le jeton API Cloudflare** (jamais la "Global API Key", toujours un
jeton limité) :

1. Va sur [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens).
2. **Create Token**.
3. Cherche le modèle **"Edit Cloudflare Workers"** → **Use template**.
4. Sous **Account Resources**, choisis ton compte. Sous **Zone
   Resources**, choisis **Specific zone** → `africasecour.com` (pas
   "All zones").
5. **Continue to summary** → **Create Token**.
6. Copie le jeton affiché (il ne sera plus jamais visible après).

**Trouver ton Account ID :**

1. [dash.cloudflare.com](https://dash.cloudflare.com) → clique sur ton
   compte.
2. Dans le menu de gauche de n'importe quel domaine, l'**Account ID**
   est affiché dans la colonne de droite ("API" ou en bas de la page
   d'aperçu du domaine).

**Ajouter les deux secrets sur GitHub :**

1. Sur la page du dépôt `fristaid-mobile` → **Settings** → **Secrets and
   variables** → **Actions**.
2. **New repository secret** : nom `CLOUDFLARE_API_TOKEN`, colle le jeton
   de l'étape précédente.
3. **New repository secret** à nouveau : nom `CLOUDFLARE_ACCOUNT_ID`,
   colle l'Account ID.

À partir de là, chaque `git push` sur `main` redéploie automatiquement.

## 3. Revenir en arrière en cas de problème

**Option rapide (CLI) :**

```
npx wrangler rollback
```

Revient à la version précédente immédiatement.

**Option tableau de bord :**

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**
   → `africasecours-app`.
2. Onglet **Deployments** → trouve une version antérieure qui marchait →
   **"..."** → **Rollback to this deployment**.

## 4. Réglages Cloudflare pour la zone `africasecour.com`

Ces réglages s'appliquent à tout le domaine (donc aussi à `api.` et
`africasecour.com` qui restent sur Vercel) — Cloudflare ne fait ici que la
résolution DNS pour eux, donc les presque tous ces réglages SSL/TLS
n'impactent que la nouvelle partie Cloudflare Workers. Vérifie quand même
que le site Vercel fonctionne encore après chaque changement.

1. [dash.cloudflare.com](https://dash.cloudflare.com) → domaine
   `africasecour.com`.
2. **SSL/TLS** → **Overview** → mode **Full (strict)**.
3. **SSL/TLS** → **Edge Certificates** → active **Always Use HTTPS**.
   Vérifie aussi que **Minimum TLS Version** est sur **TLS 1.2**.
4. **Speed** → **Optimization** → laisse **Brotli** activé. **Ne touche
   pas à "Rocket Loader"** (le laisser désactivé — il casse souvent les
   apps JavaScript comme la nôtre).
5. **Security** → **Bots** → **Bot Fight Mode** : laisse désactivé pour
   `api.africasecour.com` (ou configure une règle d'exception) — il peut
   bloquer par erreur des requêtes légitimes de l'app mobile.
6. **Caching** → **Configuration Rules** : s'assurer qu'aucune règle ne
   force la mise en cache de `sw.js`, `index.html` ou de `api.`.
7. **Analytics & Logs** → **Web Analytics** : active-le si tu veux des
   statistiques de visite gratuites et sans cookies. Si activé, ajoute une
   ligne dans `/privacy` (sur le site admin/Vercel) mentionnant cet outil.
8. **DNS** → vérifie que le renouvellement automatique du domaine est
   activé (normalement le cas par défaut chez Cloudflare Registrar).

⚠️ **HSTS** (dans Edge Certificates) : à activer seulement une fois que tu
as vérifié que `app.`, `africasecour.com` et `api.` fonctionnent tous en
HTTPS sans erreur — une fois activé, les navigateurs refuseront le HTTP
pendant la durée choisie, pour tout le monde, même si quelque chose casse.

## 5. Où voir les statistiques

**Workers & Pages** → `africasecours-app` → onglet **Metrics** : nombre de
requêtes, bande passante, erreurs. Les requêtes vers des fichiers
statiques ne comptent pas dans le quota gratuit.

## 6. Mettre à jour le site plus tard

Si tu as configuré GitHub Actions (étape 2) : un simple `git push` sur
`main` suffit, le reste est automatique.

Sinon, manuellement : `npm run deploy:web` à nouveau. Les visiteurs qui
ont déjà l'app installée verront un bandeau "Nouvelle version disponible"
à leur prochaine ouverture — rien d'autre à faire de ton côté.
