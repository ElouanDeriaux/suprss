# 🚀 Installation Rapide - SUPRSS (Windows)

> 🪟 **Plateforme Windows uniquement** - Ce guide est spécifiquement conçu pour Windows avec PowerShell

## 📋 Table des matières
1. [Prérequis Windows](#-prérequis-windows)
2. [Télécharger SUPRSS](#-télécharger-suprss)
3. [Configuration des emails 2FA](#️-configuration-des-emails-2fa-obligatoire)
4. [Configuration OAuth](#-configuration-oauth-optionnel---connexion-googleGitHub)
5. [Sécurité Avancée avec Security Helper](#️-sécurité-avancée-avec-security-helper-recommandé)
6. [Lancer SUPRSS](#️-lancer-suprss)
7. [Résolution de problèmes](#-problème)
8. [Arrêter SUPRSS](#-arrêter-suprss)

## 📋 Prérequis Windows
1. **Windows 10/11** (version supportée)
2. **PowerShell 5.1+** (inclus dans Windows)
3. **Python 3.11+** pour la génération de clés et les outils de sécurité
   - [Télécharger Python pour Windows](https://www.python.org/downloads/windows/)
   - **Installation rapide avec winget** : `winget install Python.Python.3.12`
   - **Vérifier l'installation** : `python --version`
4. **Docker Desktop pour Windows** installé et démarré
   - [Télécharger Docker Desktop pour Windows](https://docs.docker.com/desktop/windows/install/)

## 📥 Télécharger SUPRSS

### Option 1: ZIP (Pas besoin de Git)
1. Aller sur : https://github.com/ElouanDeriaux/suprss
2. Cliquer sur **"Code"** (bouton vert)
3. Cliquer sur **"Download ZIP"**
4. Extraire le fichier
5. Renommer le dossier `suprss-main` en `suprss`

### Option 2: Avec Git

**Installation de Git (si nécessaire) :**

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

**Cloner le projet et déplacement dans le bon dossier :**
```powershell
git clone https://github.com/ElouanDeriaux/suprss.git
cd suprss
```

## 🔧 Configuration des emails 2FA (OBLIGATOIRE)

⚠️ **CONFIGURATION SMTP REQUISE** : La configuration SMTP est **obligatoire** pour que SUPRSS fonctionne correctement. La 2FA nécessite un serveur email configuré :

1. **Créer un email spécifique** pour votre application SUPRSS (ex: `suprss.monnom@gmail.com`)
2. **Activer la 2FA** sur ce compte Gmail
3. **Générer un mot de passe d'APPLICATION** (IMPORTANT - ce n'est PAS votre mot de passe email) :
   - Aller dans Google Account → Sécurité → Vérification en 2 étapes
   - Cliquer "Mots de passe des applications"
   - Générer un mot de passe pour "Courrier" (format affiché: xxxx yyyy zzzz wwww, à coller SANS espaces: xxxxyyyyzzzzwwww)
4. **Configurer le fichier .env** :
   ```powershell
   copy .env.example .env
   notepad .env
   ```
5. **Générer une clé secrète sécurisée :**
   
   ```powershell
   # Méthode recommandée avec Python (installé en prérequis)
   python -c "import secrets; print(secrets.token_hex(32))"
   
   # Alternative PowerShell si problème avec Python :
   -join ((1..64) | ForEach {'{0:X}' -f (Get-Random -Max 16)})
   
   # Autre option PowerShell :
   Add-Type -AssemblyName System.Web; [System.Web.Security.Membership]::GeneratePassword(64, 20)
   ```

6. **Ajouter dans .env** :
   ```env
   SECRET_KEY="votre-cle-generee-64-caracteres"  # Utilisez la clé générée ci-dessus
   SMTP_SERVER="smtp.gmail.com"
   SMTP_PORT="587"
   SMTP_USERNAME="votre-email-suprss@gmail.com"
   SMTP_PASSWORD="xxxxyyyyzzzzwwww"  # Mot de passe d'APPLICATION Gmail (16 caractères COLLÉS, sans espaces!)
   ```

## 🔐 Configuration OAuth (OPTIONNEL - Connexion Google/GitHub)

⚠️ **Cette section est OPTIONNELLE** - SUPRSS fonctionne avec OAuth désactivé, mais **SMTP reste obligatoire** pour la 2FA. Configurez OAuth seulement si vous voulez que vos utilisateurs puissent se connecter avec Google ou GitHub pour une expérience utilisateur optimale.

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
```env
# OAuth Google (OPTIONNEL - améliore l'expérience utilisateur)
GOOGLE_CLIENT_ID="votre-client-id-google"
GOOGLE_CLIENT_SECRET="votre-client-secret-google"

# OAuth GitHub (OPTIONNEL - améliore l'expérience utilisateur)
GITHUB_CLIENT_ID="votre-client-id-github"
GITHUB_CLIENT_SECRET="votre-client-secret-github"
```

## 🛡️ Sécurité Avancée avec Security Helper (RECOMMANDÉ)

SUPRSS inclut un outil de sécurité intégré pour protéger automatiquement vos credentials :

### Configuration Automatique Sécurisée

**Étape 1 : Installer les dépendances requises**
```powershell
# OBLIGATOIRE : Installer les dépendances pour Security Helper
python -m pip install cryptography python-dotenv
```

**Étape 2 : Lancer la configuration sécurisée**
```powershell
# Installation et configuration complète en une commande
python security_helper.py setup-security
```

**📋 Questions/Réponses attendues durant l'exécution :**
1. **"Mettre à jour automatiquement .env ? (y/N):"** → Répondez **"y"** (oui)
2. **"Voulez-vous chiffrer le fichier .env ? (y/N):"** → Répondez **"y"** (recommandé pour sécurité)
3. **"Entrez un mot de passe maître pour chiffrer .env:"** → Choisissez un mot de passe fort
4. **"Confirmez le mot de passe:"** → Retapez le même mot de passe
5. **"Supprimer le fichier .env original ? (y/N):"** → Répondez **"y"** (⚠️ IMPORTANT pour sécurité réelle !)

**✅ Cet outil fait automatiquement :**
- ✅ **Génère des clés sécurisées** (SECRET_KEY, JWT_REFRESH_SECRET, etc.)
- ✅ **Configure les permissions fichiers** (.env en mode 600)
- ✅ **Met à jour .gitignore** pour exclure les fichiers sensibles
- ✅ **Propose le chiffrement** de votre .env avec un mot de passe maître
- ✅ **Effectue un audit sécurisé** de votre configuration

**🛡️ SÉCURITÉ RÉELLE : Votre fichier .env sera chiffré et le fichier original supprimé !**  
**L'application déchiffrera automatiquement au démarrage en demandant votre mot de passe maître.**

**💡 En cas de problème de démarrage après chiffrement :**
```powershell
# Si l'application ne démarre pas avec .env.encrypted, installez les dépendances :
python -m pip install python-dotenv cryptography

# Ou lancez manuellement le démarrage avec Docker :
docker-compose up -d
```

### 🔧 Dépannage si l'application ne démarre pas avec .env chiffré

Si après avoir supprimé .env l'application ne démarre pas, voici les solutions :

**Option 1 : Vérifier les dépendances Docker**
```powershell
# Les dépendances sont automatiquement installées dans le conteneur Docker
docker-compose up --build -d
```

**Option 2 : Mode de secours - restaurer temporairement .env**
```powershell
# Déchiffrer temporairement pour tester
python security_helper.py decrypt-env
# Puis relancer l'application
```

### Support Docker avec Environnements Chiffrés
```powershell
# Pour Docker avec environnement chiffré
$env:SUPRSS_MASTER_PASSWORD="votre-mot-de-passe-maitre"
docker-compose up -d
```

📖 **Guide complet** : `SECURITY_HELPER_GUIDE.md`
🐳 **Guide Docker avec chiffrement** : `DOCKER_ENCRYPTED_ENV_GUIDE.md`

### ✅ Vérification OAuth
Après redémarrage, vous devriez avoir les boutons "Se connecter avec Google/GitHub" sur la page de connexion fonctionnels.

### 📚 Guides de référence
- 📖 **Configuration OAuth complète** : `OAUTH_SETUP_GUIDE.md` (avec captures d'écran)
- 🛡️ **Sécurisation avancée** : `SECURITY_HELPER_GUIDE.md` 
- 👥 **Guide utilisateur** : `MANUEL_UTILISATEUR.md`
- 📚 **Documentation technique** : `DOCUMENTATION_TECHNIQUE.md`

---

## ▶️ Lancer SUPRSS

1. **Ouvrir un terminal/invite de commande**
2. **Aller dans le dossier :**
   ```powershell
   cd suprss
   ```

3. **Lancer l'application :**
   
   ### 📁 **Si vous N'AVEZ PAS chiffré votre .env :**
   - Double-cliquer sur `start.bat`
   - **Ou directement avec Docker Compose** : `docker-compose up -d`
   
   ### 🔐 **Si vous AVEZ chiffré votre .env (après setup-security) :**
   - **Recommandé** : Double-cliquer sur `start.bat` (gère automatiquement le chiffrement)
   - **Ou avec Docker + mot de passe** :
     ```powershell
     # Windows PowerShell
     $env:SUPRSS_MASTER_PASSWORD="votre-mot-de-passe-maitre"
     docker-compose up -d
     ```
   - ⚠️ **IMPORTANT** : `docker-compose up -d` **SEUL** ne fonctionnera PAS avec un .env chiffré !

4. **Attendre que ça démarre** (30 secondes environ)

5. **Ouvrir votre navigateur** et aller sur : http://localhost:3000

## ✅ C'est prêt !

Vous devriez voir la page de connexion SUPRSS.

## ❓ Problème ?

### Problèmes courants :
- **Docker pas démarré** : Ouvrez Docker Desktop
- **Port occupé** : Quelque chose utilise déjà le port 3000
- **Permission refusée** : Exécutez en tant qu'administrateur

### 🔐 Problèmes avec fichier .env chiffré :
- **Erreur "Fichier .env chiffré détecté mais pas de mot de passe"** : 
  - ✅ **Solution 1** : Utilisez `start.bat` (recommandé)
  - ✅ **Solution 2** : Définissez `SUPRSS_MASTER_PASSWORD` avant `docker-compose up`
  - ✅ **Solution 3** : Déchiffrez temporairement avec `python security_helper.py decrypt-env`
- **Le conteneur redémarre en boucle** : Même cause que ci-dessus

## 🛑 Arrêter SUPRSS

```powershell
# Arrêt avec le script fourni
stop.bat

# Ou directement avec Docker Compose
docker-compose down
```

---
*Dernière modification : 29 août 2025*
