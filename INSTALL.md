# 🚀 Installation Rapide - SUPRSS

## 📋 Ce dont vous avez besoin
1. **Docker Desktop** installé et démarré
   - [Windows](https://docs.docker.com/desktop/windows/install/)
   - [Mac](https://docs.docker.com/desktop/mac/install/)
   - [Linux](https://docs.docker.com/desktop/linux/install/)

## 📥 Télécharger SUPRSS

### Option 1: ZIP (Pas besoin de Git)
1. Aller sur : https://github.com/ElouanDeriaux/suprss
2. Cliquer sur **"Code"** (bouton vert)
3. Cliquer sur **"Download ZIP"**
4. Extraire le fichier
5. Renommer le dossier `suprss-main` en `suprss`

### Option 2: Avec Git

**Installation de Git (si nécessaire) :**

Sur **PowerShell Windows** :
```powershell
# Installer Git avec winget
winget install --id Git.Git -e --source winget
# Redémarrer PowerShell après installation
```

**Si winget ne fonctionne pas :**
1. **Essayer PowerShell en tant qu'Administrateur** (clic droit → "Exécuter en tant qu'administrateur")
2. **Ou télécharger manuellement Git** :
   - Aller sur https://git-scm.com/download/win
   - Télécharger la version 64-bit pour Windows
   - Exécuter l'installateur et suivre les étapes par défaut
   - Redémarrer PowerShell

Sur **WSL/Linux** :
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install git
# CentOS/RHEL/Fedora
sudo yum install git    # ou sudo dnf install git
```

**Cloner le projet et déplacement dans le bon dossier :**
```bash
git clone https://github.com/ElouanDeriaux/suprss.git
cd suprss
```

## ⚙️ Configuration des emails 2FA (IMPORTANT)

⚠️ **OBLIGATOIRE pour la 2FA** : Pour que l'authentification 2 facteurs fonctionne, configurez un email dédié :

1. **Créer un email spécifique** pour votre application SUPRSS (ex: `suprss.monnom@gmail.com`)
2. **Activer la 2FA** sur ce compte Gmail
3. **Générer un mot de passe d'APPLICATION** (IMPORTANT - ce n'est PAS votre mot de passe email) :
   - Aller dans Google Account → Sécurité → Vérification en 2 étapes
   - Cliquer "Mots de passe des applications"
   - Générer un mot de passe pour "Courrier" (format affiché: xxxx yyyy zzzz wwww, à coller SANS espaces: xxxxyyyyzzzzwwww)
4. **Configurer le fichier .env** :
   ```bash
   # Windows
   copy .env.example .env
   notepad .env
   
   # Linux/Mac
   cp .env.example .env
   nano .env
   ```
5. **Générer une clé secrète sécurisée :**
   
   **Windows (PowerShell) :**
   ```powershell
   # Option 1 - Avec Python (si installé)
   python -c "import secrets; print(secrets.token_hex(32))"
   
   # Option 2 - Si Python n'est pas trouvé, utiliser PowerShell :
   -join ((1..64) | ForEach {'{0:X}' -f (Get-Random -Max 16)})
   
   # Option 3 - Génération simple PowerShell :
   [System.Web.Security.Membership]::GeneratePassword(64, 20); Add-Type -AssemblyName System.Web
   ```
   
   **Linux/Mac :**
   ```bash
   # Option 1 - Avec Python
   python -c "import secrets; print(secrets.token_hex(32))"
   
   # Option 2 - Si OpenSSL est installé
   openssl rand -hex 32
   
   # Option 3 - Alternative simple
   head /dev/urandom | tr -dc A-Za-z0-9 | head -c 64
   ```

6. **Ajouter dans .env** :
   ```bash
   SECRET_KEY="votre-cle-generee-64-caracteres"  # Utilisez la clé générée ci-dessus
   SMTP_SERVER="smtp.gmail.com"
   SMTP_PORT="587"
   SMTP_USERNAME="votre-email-suprss@gmail.com"
   SMTP_PASSWORD="xxxxyyyyzzzzwwww"  # Mot de passe d'APPLICATION Gmail (16 caractères COLLÉS, sans espaces!)
   ```

## 🛡️ Sécurité Avancée avec Security Helper (RECOMMANDÉ)

**NOUVEAU !** SUPRSS inclut un outil de sécurité intégré pour protéger automatiquement vos credentials :

### Configuration Automatique Sécurisée
```bash
# Installation et configuration complète en une commande
python security_helper.py setup-security
```

**Cet outil fait automatiquement :**
- ✅ **Génère des clés sécurisées** (SECRET_KEY, JWT_REFRESH_SECRET, etc.)
- ✅ **Configure les permissions fichiers** (.env en mode 600)
- ✅ **Met à jour .gitignore** pour exclure les fichiers sensibles
- ✅ **Propose le chiffrement** de votre .env avec un mot de passe maître
- ✅ **Effectue un audit sécurisé** de votre configuration

### Chiffrement Automatique
```bash
# Chiffrer votre .env avec un mot de passe
python security_helper.py encrypt-env

# L'application déchiffrera automatiquement au démarrage !
# 🔹 Mode développement : Demande le mot de passe
# 🔹 Mode production : Utilise SUPRSS_MASTER_PASSWORD
```

### Support Docker avec Environnements Chiffrés
```bash
# Pour Docker avec environnement chiffré
set SUPRSS_MASTER_PASSWORD=votre-mot-de-passe-maitre
docker-compose up -d
```

📖 **Guide complet** : `SECURITY_HELPER_GUIDE.md`
🐳 **Guide Docker avec chiffrement** : `DOCKER_ENCRYPTED_ENV_GUIDE.md`

## 🔐 Configuration OAuth (OPTIONNEL - Connexion Google/GitHub)

⚠️ **Cette section est OPTIONNELLE** - SUPRSS fonctionne parfaitement sans OAuth. Configurez OAuth seulement si vous voulez que vos utilisateurs puissent se connecter avec Google ou GitHub.

### 🌟 Configuration Google OAuth

#### Étape 1 : Google Cloud Console
1. Allez sur [Google Cloud Console](https://console.cloud.google.com)
2. Connectez-vous avec votre compte Google
3. Créez un nouveau projet ou sélectionnez un existant

#### Étape 2 : Activer l'API
1. Menu "APIs & Services" → "Library"
2. Cherchez "Google+ API" → Cliquez "Activer"

#### Étape 3 : Écran de Consentement
1. "APIs & Services" → "OAuth consent screen"
2. Sélectionnez "Externe" → Cliquez "Créer"
3. Remplissez :
   - **App name** : `SUPRSS`
   - **User support email** : Votre email
   - **Developer contact** : Votre email
4. Cliquez "Enregistrer et continuer" (3 fois)

#### Étape 4 : Créer les Identifiants
1. "APIs & Services" → "Credentials"
2. "Create Credentials" → "OAuth client ID"
3. **Application type** : "Web application"
4. **Name** : `SUPRSS Web Client`
5. **Authorized JavaScript origins** : `http://localhost:3000`
6. **Authorized redirect URIs** : `http://localhost:8000/auth/google/callback`
7. Cliquez "Créer"

#### Étape 5 : Récupérer les Clés
1. Copiez le **Client ID** (format: `123456789-abc...googleusercontent.com`)
2. Copiez le **Client Secret** (format: `GOCSPX-...`)

### 🐙 Configuration GitHub OAuth

#### Étape 1 : Paramètres GitHub
1. Connectez-vous sur [GitHub](https://github.com)
2. Photo de profil → "Settings" → "Developer settings" → "OAuth Apps"
3. Cliquez "New OAuth App"

#### Étape 2 : Créer l'Application
Remplissez :
- **Application name** : `SUPRSS`
- **Homepage URL** : `http://localhost:3000`
- **Authorization callback URL** : `http://localhost:8000/auth/github/callback`

#### Étape 3 : Récupérer les Clés
1. **Client ID** : Visible sur la page
2. **Client Secret** : Cliquez "Generate a new client secret" → Copiez

### 📝 Ajouter les Clés dans .env

Ajoutez ces lignes dans votre fichier `.env` :
```bash
# OAuth Google (OPTIONNEL)
GOOGLE_CLIENT_ID="votre-client-id-google"
GOOGLE_CLIENT_SECRET="votre-client-secret-google"

# OAuth GitHub (OPTIONNEL)
GITHUB_CLIENT_ID="votre-client-id-github"
GITHUB_CLIENT_SECRET="votre-client-secret-github"
```

### ✅ Vérification OAuth
Après redémarrage, vous devriez voir les boutons "Se connecter avec Google/GitHub" sur la page de connexion.

📖 **Guide détaillé avec captures d'écran** : Consultez `OAUTH_SETUP_GUIDE.md` pour plus de détails.

---

## ▶️ Lancer SUPRSS

1. **Ouvrir un terminal/invite de commande**
2. **Aller dans le dossier :**
   ```bash
   cd suprss
   ```

3. **Lancer l'application :**
   - **Windows** : Double-cliquer sur `start.bat`
   - **Mac/Linux** : `./start.sh`
   - **Ou directement avec Docker Compose** : `docker-compose up -d`

4. **Attendre que ça démarre** (30 secondes environ)

5. **Ouvrir votre navigateur** et aller sur : http://localhost:3000

## ✅ C'est prêt !

Vous devriez voir la page de connexion SUPRSS.

## ❓ Problème ?

- **Docker pas démarré** : Ouvrez Docker Desktop
- **Port occupé** : Quelque chose utilise déjà le port 3000
- **Permission refusée** : Exécutez en tant qu'administrateur

## 🛑 Arrêter SUPRSS

```bash
# Arrêt avec les scripts fournis
./stop.sh       # Linux/Mac
stop.bat        # Windows

# Ou directement avec Docker Compose
docker-compose down
```

---
*Installation complète en moins de 5 minutes !*
