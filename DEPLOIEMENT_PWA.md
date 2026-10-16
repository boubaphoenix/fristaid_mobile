# Déployer la PWA AfricaSecours sur Hostinger

Guide pas à pas pour mettre en ligne l'app web sur `app.africasecour.com`.
Pas besoin de connaissances techniques particulières — suis les étapes dans
l'ordre.

## 1. Créer le sous-domaine `app.africasecour.com`

1. Connecte-toi sur **hPanel** (le tableau de bord Hostinger).
2. Va dans **Domaines** → choisis `africasecour.com` → **Sous-domaines**.
3. Crée un sous-domaine nommé `app` (il devient automatiquement
   `app.africasecour.com`).
4. Hostinger crée un dossier dédié pour ce sous-domaine (en général
   `public_html/app/` ou similaire — hPanel te montre le chemin exact après
   la création). C'est là qu'on enverra les fichiers.

## 2. Activer le HTTPS (SSL)

1. Toujours dans hPanel, va dans **Sécurité** → **SSL**.
2. Choisis `app.africasecour.com` dans la liste et active le certificat SSL
   gratuit (Let's Encrypt). Ça prend quelques minutes à s'activer après la
   création du sous-domaine — si ça échoue, réessaie dans 10-15 min.

## 3. Construire le site (sur ton ordinateur)

Dans le dossier `fristaid-mobile`, lance :

```
npm run build:web
```

Ça fabrique le dossier `dist/` — c'est **tout le contenu de ce dossier**
(et uniquement son contenu, pas le dossier `dist` lui-même) qu'il faut
envoyer sur Hostinger.

Le fichier `.env.production.local` (déjà en place, jamais envoyé sur
GitHub) fait automatiquement pointer ce build vers le vrai serveur
(`https://api.africasecour.com`), même si `.env.local` reste réglé sur
`localhost` pour ton développement quotidien — rien à changer avant de
construire.

## 4. Envoyer les fichiers sur Hostinger

**Option A — Gestionnaire de fichiers (le plus simple, sans rien installer)**

1. hPanel → **Fichiers** → **Gestionnaire de fichiers**.
2. Ouvre le dossier du sous-domaine `app` (créé à l'étape 1).
3. Supprime les fichiers par défaut s'il y en a (ex: une page
   "Bientôt en ligne").
4. Compresse ton dossier `dist/` en `.zip` sur ton ordinateur (clic droit →
   "Envoyer vers" → "Dossier compressé" sous Windows), envoie ce `.zip`
   via le bouton **Upload**, puis clic droit dessus → **Extraire**.
5. Vérifie que `index.html` et `.htaccess` se retrouvent directement dans
   le dossier du sous-domaine (pas dans un sous-dossier `dist/` imbriqué).

**Option B — FTP (plus rapide pour les mises à jour suivantes)**

1. hPanel → **Fichiers** → **Comptes FTP** → note l'hôte, l'identifiant et
   le mot de passe (ou crée un compte FTP dédié).
2. Avec un client FTP (ex: [FileZilla](https://filezilla-project.org/),
   gratuit), connecte-toi avec ces identifiants.
3. Glisse-dépose tout le **contenu** de `dist/` dans le dossier du
   sous-domaine côté serveur.

## 5. Vérifier que ça marche

1. Ouvre `https://app.africasecour.com` dans un navigateur.
2. Le cadenas HTTPS doit être présent (pas d'avertissement de sécurité).
3. Teste le parcours complet : connexion, un cours, un quiz.
4. Sur un vrai téléphone Android (Chrome) : un bandeau ou le menu ⋮ doit
   proposer "Installer l'application" / "Ajouter à l'écran d'accueil".
5. Sur iPhone (Safari) : bouton Partager → "Sur l'écran d'accueil".
6. Après installation, l'app doit s'ouvrir en plein écran (sans la barre
   d'adresse du navigateur) avec la bonne icône.

Si une page affiche une erreur 404 en rechargeant (ex: tu es sur un cours
et tu actualises la page), vérifie que le fichier `.htaccess` est bien
présent sur le serveur, au même niveau que `index.html` — c'est lui qui
évite ce problème (voir l'étape 4).

## 6. Mettre à jour le site plus tard

À chaque changement de code :

1. `npm run build:web` à nouveau.
2. Renvoie le contenu de `dist/` (remplace les anciens fichiers).
3. Les visiteurs qui ont déjà l'app installée verront un bandeau "Nouvelle
   version disponible" la prochaine fois qu'ils l'ouvrent — rien d'autre à
   faire de ton côté, c'est automatique.

---

## Optionnel : déploiement automatique via GitHub Actions

Si tu veux qu'un `git push` déploie automatiquement sur Hostinger (sans
refaire les étapes 3-4 à la main à chaque fois), c'est possible avec FTP
via GitHub Actions. **Ce n'est pas nécessaire pour démarrer** — à mettre en
place plus tard si tu le souhaites, dis-le-moi et je le configure.
