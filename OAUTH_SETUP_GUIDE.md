# 🔐 Guide Complet OAuth - Google & GitHub pour SUPRSS

Ce guide vous explique **étape par étape** comment configurer l'authentification OAuth avec Google et GitHub pour SUPRSS.

## ⚠️ Important
- L'OAuth est **OPTIONNEL** - SUPRSS fonctionne sans ces configurations
- Si vous ne configurez pas OAuth, les utilisateurs pourront toujours se connecter avec email/mot de passe
- Une fois configuré, les utilisateurs pourront se connecter avec "Se connecter avec Google/GitHub"

---

## 🌟 Configuration Google OAuth

### Étape 1 : Accéder à Google Cloud Console
1. Allez sur [Google Cloud Console](https://console.cloud.google.com)
2. Connectez-vous avec votre compte Google
3. Si c'est votre première fois, acceptez les conditions d'utilisation

### Étape 2 : Créer ou Sélectionner un Projet
**Option A - Nouveau projet :**
1. Cliquez sur le sélecteur de projet (en haut à côté de "Google Cloud")
2. Cliquez "Nouveau projet"
3. Nom du projet : `SUPRSS-OAuth` (ou autre nom de votre choix)
4. Cliquez "Créer"
5. Attendez la création (30 secondes environ)
6. Sélectionnez votre nouveau projet

**Option B - Projet existant :**
1. Cliquez sur le sélecteur de projet
2. Choisissez un projet existant

### Étape 3 : Activer l'API Google+
1. Dans le menu de gauche : "APIs & Services" → "Library"
2. Cherchez "Google+ API"
3. Cliquez dessus et cliquez "Activer"
4. Attendez l'activation (quelques secondes)

### Étape 4 : Configurer l'écran de consentement OAuth
1. Allez dans "APIs & Services" → "OAuth consent screen"
2. Sélectionnez "Externe" (pour que tous puissent se connecter)
3. Cliquez "Créer"

**Remplissez le formulaire :**
- **App name** : `SUPRSS` (ou le nom de votre instance)
- **User support email** : Votre email
- **App domain** : Laissez vide pour localhost
- **Developer contact information** : Votre email
4. Cliquez "Enregistrer et continuer"
5. **Scopes** : Cliquez "Enregistrer et continuer" (gardez par défaut)
6. **Test users** : Cliquez "Enregistrer et continuer" (vide = accessible à tous)
7. **Résumé** : Cliquez "Back to Dashboard"

### Étape 5 : Créer les Identifiants OAuth
1. Allez dans "APIs & Services" → "Credentials"
2. Cliquez "Create Credentials" → "OAuth client ID"
3. **Application type** : Sélectionnez "Web application"
4. **Name** : `SUPRSS Web Client`

**Configurations importantes :**
5. **Authorized JavaScript origins** :
   - Ajoutez : `http://localhost:3000`
   - Ajoutez : `https://votredomaine.com` (si vous déployez en production)

6. **Authorized redirect URIs** :
   - Ajoutez : `http://localhost:8000/auth/google/callback`
   - Ajoutez : `https://votredomaine.com:8000/auth/google/callback` (si production)

7. Cliquez "Créer"

### Étape 6 : Récupérer les Clés
1. Une pop-up apparaît avec vos clés
2. **Copiez le "Client ID"** (commence par quelque chose comme `123456789-abc...googleusercontent.com`)
3. **Copiez le "Client Secret"** (commence par `GOCSPX-...`)
4. Gardez ces informations en sécurité !

### Étape 7 : Configurer le .env
Ajoutez dans votre fichier `.env` :
```powershell
# Variables d'environnement PowerShell
$env:GOOGLE_CLIENT_ID="votre-client-id-google"
$env:GOOGLE_CLIENT_SECRET="votre-client-secret-google"
```

---

## 🐙 Configuration GitHub OAuth

### Étape 1 : Accéder aux Paramètres Développeur
1. Connectez-vous sur [GitHub](https://github.com)
2. Cliquez sur votre photo de profil (en haut à droite)
3. Cliquez "Settings"
4. Dans le menu de gauche, cliquez "Developer settings" (tout en bas)

### Étape 2 : Créer une OAuth App
1. Cliquez "OAuth Apps" dans le menu de gauche
2. Cliquez "New OAuth App" (bouton vert)

### Étape 3 : Remplir le Formulaire
**Informations requises :**
- **Application name** : `SUPRSS` (ou le nom de votre instance)
- **Homepage URL** : `http://localhost:3000`
- **Application description** : `Lecteur RSS SUPRSS` (optionnel)
- **Authorization callback URL** : `http://localhost:8000/auth/github/callback`

**⚠️ IMPORTANT** : L'URL de callback doit être **EXACTEMENT** : `http://localhost:8000/auth/github/callback`

### Étape 4 : Créer l'Application
1. Cliquez "Register application"
2. Vous êtes redirigé vers la page de votre application

### Étape 5 : Récupérer les Clés
1. **Client ID** : Visible directement sur la page
2. **Client Secret** : 
   - Cliquez "Generate a new client secret"
   - Copiez le secret généré (il ne sera plus visible après !)
3. Gardez ces informations en sécurité !

### Étape 6 : Configurer le .env
Ajoutez dans votre fichier `.env` :
```powershell
# Variables d'environnement PowerShell
$env:GITHUB_CLIENT_ID="votre-client-id-github"
$env:GITHUB_CLIENT_SECRET="votre-client-secret-github"
```

---

## 🎯 Configuration Finale du .env

Votre fichier `.env` devrait ressembler à :

```env
# Clé secrète (OBLIGATOIRE)
SECRET_KEY="votre-cle-secrete-64-caracteres-minimum"

# SMTP pour authentification (OBLIGATOIRE)
SMTP_SERVER="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USERNAME="votre-email-suprss@gmail.com"
SMTP_PASSWORD="xxxxyyyyzzzzwwww"  # Mot de passe d'APPLICATION Gmail (16 caractères COLLÉS, sans espaces!)

# OAuth Google (OPTIONNEL - améliore l'expérience utilisateur)
GOOGLE_CLIENT_ID="123456789-abcdef.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-votre-secret-google"

# OAuth GitHub (OPTIONNEL - améliore l'expérience utilisateur)
GITHUB_CLIENT_ID="votre-client-id-github"
GITHUB_CLIENT_SECRET="votre-secret-github"
```

---

## 🔧 Test des Configurations

### 1. Redémarrer SUPRSS
```powershell
# Arrêter
docker-compose down

# Relancer
docker-compose up --build -d
```

### 2. Vérifier les Boutons OAuth
1. Allez sur `http://localhost:3000`
2. Vous devriez voir les boutons "Se connecter avec Google" et "Se connecter avec GitHub"
3. Si les boutons n'apparaissent pas, vérifiez les logs :
```powershell
docker-compose logs backend
```

### 3. Tester la Connexion
1. Cliquez sur "Se connecter avec Google"
2. Vous devriez être redirigé vers Google
3. Après autorisation, retour vers SUPRSS avec connexion automatique

---

## 🔧 Résolution des Problèmes Courants

### Erreur "redirect_uri_mismatch"
- **Cause** : L'URL de redirection ne correspond pas
- **Solution** : Vérifiez que vous avez bien ajouté `http://localhost:8000/auth/google/callback` dans les URLs autorisées

### Erreur "Client secret invalide"
- **Cause** : Le secret a été mal copié
- **Solution** : Regénérez un nouveau secret et copiez-le à nouveau

### Boutons OAuth n'apparaissent pas
- **Cause** : Variables d'environnement manquantes ou mal formatées
- **Solution** : Vérifiez votre fichier `.env` et redémarrez Docker

### Erreur 403 "access_denied"
- **Google** : Vérifiez que l'écran de consentement est configuré
- **GitHub** : Vérifiez l'URL de callback dans l'application GitHub

---

## 🚀 Pour la Production

Si vous déployez SUPRSS sur un serveur :

1. **Google OAuth** : Ajoutez votre domaine de production dans :
   - Authorized JavaScript origins : `https://votredomaine.com`
   - Authorized redirect URIs : `https://votredomaine.com/auth/google/callback`

2. **GitHub OAuth** : Modifiez les URLs dans votre OAuth App :
   - Homepage URL : `https://votredomaine.com`
   - Authorization callback URL : `https://votredomaine.com/auth/github/callback`

3. **Variables d'environnement** : Mettez à jour votre `.env` avec les nouvelles URLs

---

## 🛡️ Sécurité

- **JAMAIS** committer le fichier `.env` dans Git
- **Régénérez** les secrets si vous pensez qu'ils ont été compromis
- **Utilisez HTTPS** en production
- **Limitez** l'accès aux applications OAuth aux domaines nécessaires

---
*Dernière modification : 29 août 2025*