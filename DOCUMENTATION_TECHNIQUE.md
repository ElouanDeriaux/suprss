# Documentation Technique - SUPRSS

## Table des matières
1. [Informations générales](#informations-générales)
2. [Guide de déploiement](#guide-de-déploiement)
3. [Justification des choix techniques](#justification-des-choix-techniques)
4. [Diagrammes UML](#diagrammes-uml)
5. [Schéma de base de données](#schéma-de-base-de-données)

---

## Informations générales

### Prérequis système
- **Python 3.11+** pour la génération de clés et les outils de sécurité
  - Téléchargement : https://www.python.org/downloads/windows/
  - Installation rapide avec winget : `winget install Python.Python.3.12`
  - Vérifier l'installation : `python --version`
- **Docker Desktop** installé et démarré
  - Windows : https://docs.docker.com/desktop/windows/install/
- **Docker** >= 20.10.0 et Docker Compose >= 2.0.0 (inclus dans Docker Desktop)
- **Ports libres** : 3000 (frontend), 8000 (backend), 5432 (base de données)
- **RAM minimum** : 512 Mo
- **Espace disque** : 1 Go minimum
- **Git** (optionnel - alternative ZIP disponible)

### Variables d'environnement nécessaires
| Variable | Description | Comment l'obtenir | Obligatoire |
|----------|-------------|-------------------|-------------|
| `SECRET_KEY` | Clé secrète JWT (32+ caractères) | Générer avec `openssl rand -hex 32` ou tout générateur de clés | ✅ |
| `GOOGLE_CLIENT_ID` | ID client OAuth Google | Console Google Cloud → APIs & Services → Credentials | ⚪ Optionnel - Améliore l'UX |
| `GOOGLE_CLIENT_SECRET` | Secret OAuth Google | Console Google Cloud → APIs & Services → Credentials | ⚪ Optionnel - Améliore l'UX |
| `GITHUB_CLIENT_ID` | ID client OAuth GitHub | GitHub Settings → Developer settings → OAuth Apps | ⚪ Optionnel - Améliore l'UX |
| `GITHUB_CLIENT_SECRET` | Secret OAuth GitHub | GitHub Settings → Developer settings → OAuth Apps | ⚪ Optionnel - Améliore l'UX |
| `SMTP_SERVER` | Serveur SMTP | smtp.gmail.com ou serveur de votre fournisseur email | ✅ |
| `SMTP_PORT` | Port SMTP | 587 (TLS) ou 465 (SSL) selon le serveur | ✅ |
| `SMTP_USERNAME` | Utilisateur SMTP | Votre email pour l'envoi (ex: votremail@gmail.com) | ✅ |
| `SMTP_PASSWORD` | Mot de passe SMTP | **Mot de passe d'APPLICATION** Gmail (PAS le mot de passe email) | ✅ |

⚠️ **IMPORTANT SÉCURITÉ** : 
- **Ne jamais** committer le fichier `.env` sur Git (déjà dans .gitignore)
- **OBLIGATOIRE** : Utiliser un mot de passe d'APPLICATION Gmail pour SMTP (JAMAIS le mot de passe email principal)
- **Générer** des clés secrètes aléatoires longues (32+ caractères)
- **Utiliser le Security Helper pour la protection automatique
- **Consulter** `SECURITY.md` pour les bonnes pratiques complètes de gestion des secrets

### 🛡️ Security Helper - Gestion Sécurisée des Environnements

SUPRSS intègre maintenant un système de sécurité avancé pour protéger vos credentials.

#### Variables Additionnelles pour Environnements Chiffrés
| Variable | Description | Usage |
|----------|-------------|-------|
| `SUPRSS_MASTER_PASSWORD` | Mot de passe maître pour déchiffrement | Mode production Docker |

#### Outils de Sécurité Intégrés
```bash
python security_helper.py setup-security     # Configuration complète automatique
python security_helper.py encrypt-env        # Chiffrement du .env
python security_helper.py generate-keys      # Génération de clés sécurisées
python security_helper.py check-security     # Audit de sécurité
```

#### Architecture de Chiffrement
- **Algorithme** : AES-256 via Fernet (cryptographie library)
- **Dérivation clé** : PBKDF2-HMAC-SHA256, 100,000 itérations
- **Déchiffrement** : Automatique au démarrage via `env_loader.py`
- **Modes** : Interactif (prompt password) ou production (env var)

#### Guide détaillé pour obtenir les clés OAuth :

**Google OAuth :**
1. Aller sur https://console.cloud.google.com
2. Créer un nouveau projet ou sélectionner un existant
3. Activer l'API Google+ 
4. Aller dans "APIs & Services" → "Credentials"
5. Cliquer "Create Credentials" → "OAuth client ID"
6. Choisir "Web application"
7. Ajouter `http://localhost:3000` dans "Authorized origins"
8. Ajouter `http://localhost:8000/auth/google/callback` dans "Authorized redirect URIs"

**GitHub OAuth :**
1. Aller sur https://github.com/settings/developers
2. Cliquer "New OAuth App"
3. Remplir :
   - Application name: "SUPRSS"
   - Homepage URL: http://localhost:3000
   - Authorization callback URL: http://localhost:8000/auth/github/callback

**Configuration SMTP Gmail (OBLIGATOIRE pour SUPRSS) :**

⚠️ **RECOMMANDATION SÉCURISÉE** : Créez un **email dédié spécifiquement pour SUPRSS** (ex: `suprss.monnom@gmail.com`) au lieu d'utiliser votre email principal.

1. **Créer un compte Gmail dédié** pour votre application SUPRSS
2. **Activer la 2FA** sur ce nouveau compte Google
3. **Aller dans "Sécurité" → "Vérification en 2 étapes" → "Mots de passe d'application"**
4. **Générer un mot de passe d'application** pour "Courrier"
5. **Utiliser ce mot de passe d'APPLICATION** dans `SMTP_PASSWORD` - Le mot de passe est affiché avec espaces (xxxx yyyy zzzz wwww) mais doit être collé SANS espaces (xxxxyyyyzzzzwwww) - JAMAIS votre mot de passe email
6. **Avantages du compte dédié** :
   - Sécurité renforcée (isolation des accès)
   - Meilleur suivi des emails SUPRSS
   - Pas de pollution de votre boîte principale
   - Révocation facile si nécessaire

---

## Guide de déploiement

### Téléchargement du projet

#### Option 1 : ZIP (Sans Git - Pour utilisateurs finaux)
1. Aller sur https://github.com/ElouanDeriaux/suprss
2. Cliquer **"Code"** → **"Download ZIP"**
3. Extraire et renommer le dossier `suprss-main` en `suprss`

⚠️ **IMPORTANT** : Vous devez **obligatoirement** configurer un serveur SMTP pour que SUPRSS fonctionne (voir section Configuration ci-dessous).

#### Option 2 : Git Clone (Pour développeurs)

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

**Clonage du projet :**
```powershell
git clone https://github.com/ElouanDeriaux/suprss.git
cd suprss
```

⚠️ **IMPORTANT** : Vous devez **obligatoirement** configurer un serveur SMTP pour que SUPRSS fonctionne (voir section Configuration ci-dessous).

### Déploiement avec Docker (Recommandé)

⚙️ **Gestion simplifiée avec Docker Compose** : Le projet peut être entièrement géré avec les commandes `docker-compose up` et `docker-compose down` pour le démarrage et l'arrêt.

1. **Configuration des variables d'environnement**

**Étape 1 : Copier le fichier de configuration**
```powershell
copy .env.example .env
```

**Étape 2 : Éditer le fichier .env**

```powershell
# Ouvrir avec le Bloc-notes
notepad .env

# Ou avec VSCode si installé
code .env
```

**Étape 3 : Configurer les variables obligatoires**

Modifiez les lignes suivantes dans le fichier `.env` :

```env
# OBLIGATOIRE : Clé secrète pour JWT (générez une clé sécurisée)
SECRET_KEY="votre-cle-secrete-64-caracteres-minimum"

# OBLIGATOIRE : SMTP pour le système d'authentification
SMTP_SERVER="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USERNAME="votre-email-suprss@gmail.com"
SMTP_PASSWORD="xxxxyyyyzzzzwwww"  # Mot de passe d'application Gmail

# OPTIONNEL : OAuth Google (pour connexion Google)
GOOGLE_CLIENT_ID="votre-google-client-id"
GOOGLE_CLIENT_SECRET="votre-google-client-secret"

# OPTIONNEL : OAuth GitHub (pour connexion GitHub)
GITHUB_CLIENT_ID="votre-github-client-id"
GITHUB_CLIENT_SECRET="votre-github-client-secret"
```

**🔑 Génération de la clé secrète :**

**Génération de clé sécurisée :**
```powershell
# Méthode recommandée avec Python (installé en prérequis)
python -c "import secrets; print(secrets.token_hex(32))"

# Alternatives PowerShell si problème avec Python
Add-Type -AssemblyName System.Web; [System.Web.Security.Membership]::GeneratePassword(32, 10)

# Ou génération hexadécimale
-join ((1..64) | ForEach {'{0:X}' -f (Get-Random -Max 16)})
```

**💡 Exemple de fichier .env complet (RECOMMANDÉ) :**
```env
# Configuration complète pour SUPRSS
SECRET_KEY="a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"

# SMTP pour le système d'authentification (OBLIGATOIRE)
SMTP_SERVER="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USERNAME="votre-email-suprss@gmail.com"  # Email dédié pour SUPRSS
SMTP_PASSWORD="xxxxyyyyzzzzwwww"       # Mot de passe d'application Gmail (16 caractères COLLÉS)

# OAuth optionnel pour connexion Google/GitHub
# GOOGLE_CLIENT_ID=""
# GOOGLE_CLIENT_SECRET=""
# GITHUB_CLIENT_ID=""
# GITHUB_CLIENT_SECRET=""
```

**💡 Exemple de fichier .env minimal (si aucun OAuth) :**
```env
# Configuration minimale pour SUPRSS
SECRET_KEY="a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"

# SMTP pour le système d'authentification (TOUJOURS OBLIGATOIRE)
SMTP_SERVER="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USERNAME="votre-email-suprss@gmail.com"
SMTP_PASSWORD="xxxxyyyyzzzzwwww"

# OAuth laissé vide si non utilisé
# GOOGLE_CLIENT_ID=""
# GOOGLE_CLIENT_SECRET=""
# GITHUB_CLIENT_ID=""
# GITHUB_CLIENT_SECRET=""
```

3. **Lancement**
```powershell
# Démarrage automatique
start.bat

# Ou directement avec Docker Compose
docker-compose up -d            # Démarrage normal
docker-compose up --build -d    # Avec reconstruction des images
```

4. **Vérification**
```powershell
docker-compose ps
Invoke-WebRequest http://localhost:8000/health
```

### Déploiement manuel (Développement)

1. **Backend Python**
```powershell
# Installation dépendances
pip install fastapi sqlmodel uvicorn bcrypt python-jose[cryptography] feedparser requests apscheduler bleach python-dotenv authlib httpx

# Variables d'environnement
$env:SECRET_KEY="votre-cle-secrete"
$env:GOOGLE_CLIENT_ID="votre-google-client-id"
# ... autres variables

# Lancement
uvicorn main:app --reload --port 8000
```

2. **Frontend**
```powershell
cd simple-frontend
python -m http.server 3000
```

3. **Base de données**
- SQLite : Automatique (fichier `suprss.db`)
- PostgreSQL : Configurer DATABASE_URL

### Arrêt des services
```powershell
# Script automatique
stop.bat

# Commandes Docker Compose directes
docker-compose down     # Arrêt normal
docker-compose down -v  # Arrêt avec suppression des volumes
```

### Administration de la base de données

#### Suppression complète de la base de données
Pour supprimer toutes les données de la base tout en conservant la structure des tables :

```powershell
# Supprimer toutes les données (PowerShell)
docker exec suprss_db psql -U suprss_user -d suprss_db -c 'TRUNCATE TABLE article, articlearchive, articlereadflag, articlestar, collection, collectionmember, collectionmessage, emailverificationcode, feed, messagereadflag, "user" CASCADE;'

# Alternative si la commande ci-dessus pose problème :
docker exec -it suprss_db psql -U suprss_user -d suprss_db
# Puis dans psql, exécuter :
# TRUNCATE TABLE article, articlearchive, articlereadflag, articlestar, collection, collectionmember, collectionmessage, emailverificationcode, feed, messagereadflag, "user" CASCADE;
# \q pour quitter
```

⚠️ **ATTENTION** : Cette commande supprime **toutes les données** de manière irréversible.

**💡 Résolution de problèmes courants :**
- Si la commande échoue avec une erreur de guillemets, utilisez la méthode interactive (docker exec -it)
- Assurez-vous que le conteneur suprss_db est bien démarré : `docker-compose ps`
- Si le conteneur n'existe pas, lancez d'abord : `docker-compose up -d`

---

## Justification des choix techniques

### Langages et frameworks

#### Backend : Python + FastAPI
**Justification :**
- **Performance** : FastAPI basé sur Starlette (async/await natif)
- **Documentation** : Génération automatique OpenAPI/Swagger
- **Validation** : Pydantic pour validation des données
- **Écosystème** : Librairies RSS (feedparser) et sécurité (bcrypt) matures
- **Typage** : Support TypeScript-like avec type hints

#### Frontend : Vanilla JavaScript + Tailwind CSS
**Justification :**
- **Performance** : Pas de framework, chargement rapide
- **Maintenance** : Code simple, pas de dépendances complexes
- **Flexibilité** : Contrôle total de l'interface
- **Compatibilité** : Fonctionne dans tous les navigateurs modernes
- **Styling** : Tailwind pour un design cohérent et responsive

#### Base de données : SQLite + PostgreSQL
**Justification :**
- **SQLite** : Déploiement simple, pas de serveur séparé
- **PostgreSQL** : Production avec haute concurrence
- **SQLModel** : ORM moderne avec validation Pydantic intégrée
- **Migration** : Support transparent des deux bases

### Librairies principales

#### Sécurité
- **bcrypt** : Hachage de mots de passe résistant aux attaques
- **python-jose** : JWT sécurisés avec algorithmes cryptographiques
- **bleach** : Sanitisation HTML contre XSS
- **authlib** : OAuth2 sécurisé avec Google/GitHub

#### RSS et contenus
- **feedparser** : Parser RSS/Atom robuste et universel
- **requests** : HTTP client fiable avec gestion des erreurs
- **apscheduler** : Ordonnanceur pour actualisation périodique
- **httpx** : Client HTTP async pour performances

#### Interface
- **Tailwind CSS** : Framework CSS utilitaire moderne
- **Vanilla JS** : Performance maximale, pas de surcharge

---

## Diagrammes UML

### Diagramme de classes (Modèles de données)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│      User       │    │   Collection    │    │      Feed       │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ - id: int       │    │ - id: int       │    │ - id: int       │
│ - username: str │────│ - user_id: int  │────│ - collection_id │
│ - email: str    │    │ - name: str     │    │ - title: str    │
│ - password_hash │    │ - created_at    │    │ - url: str      │
│ - is_2fa_active │    │ - shared: bool  │    │ - description   │
│ - theme_pref    │    └─────────────────┘    │ - last_updated  │
└─────────────────┘                           │ - status: bool  │
                                               └─────────────────┘
                                                        │
                                               ┌─────────────────┐
                                               │     Article     │
                                               ├─────────────────┤
                                               │ - id: int       │
                                               │ - feed_id: int  │
                                               │ - title: str    │
                                               │ - link: str     │
                                               │ - content: text │
                                               │ - pub_date      │
                                               │ - author: str   │
                                               └─────────────────┘
```

### Diagramme de séquence (Ajout de flux RSS)

```
Utilisateur    Dashboard     API Backend    Base de données    Parser RSS
    │              │              │               │                │
    │─────────────▶│              │               │                │
    │ Clic "Ajouter│              │               │                │
    │   flux"      │              │               │                │
    │              │─────────────▶│               │                │
    │              │ POST /feeds/ │               │                │
    │              │              │──────────────▶│                │
    │              │              │ Vérif. droits │                │
    │              │              │◀──────────────│                │
    │              │              │               │                │
    │              │              │──────────────────────────────▶│
    │              │              │        Test URL RSS            │
    │              │              │◀──────────────────────────────│
    │              │              │         Validation OK          │
    │              │              │               │                │
    │              │              │──────────────▶│                │
    │              │              │ Sauvegarde    │                │
    │              │              │◀──────────────│                │
    │              │◀─────────────│               │                │
    │              │   200 OK     │               │                │
    │◀─────────────│              │               │                │
    │Toast "Succès"│              │               │                │
```

---

## Schéma de base de données

### Modèle Entité-Relation

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│      users      │────▶│   collections   │────▶│      feeds      │
│                 │ 1:n │                 │ 1:n │                 │
│ id (PK)         │     │ id (PK)         │     │ id (PK)         │
│ username        │     │ user_id (FK)    │     │ collection_id   │
│ email           │     │ name            │     │ title           │
│ password_hash   │     │ created_at      │     │ url             │
│ is_2fa_active   │     │ shared          │     │ description     │
│ theme_preference│     └─────────────────┘     │ last_updated    │
│ created_at      │                             │ active          │
└─────────────────┘                             └─────────────────┘
         │                                               │
         │                                               │ 1:n
         │                                               ▼
┌─────────────────┐                             ┌─────────────────┐
│collection_members│                            │     articles    │
│                 │                             │                 │
│ id (PK)         │                             │ id (PK)         │
│ collection_id   │                             │ feed_id (FK)    │
│ user_id (FK)    │                             │ title           │
│ role            │                             │ link            │
│ joined_at       │                             │ content         │
└─────────────────┘                             │ published_at    │
                                                │ author          │
┌─────────────────┐                             │ created_at      │
│ article_read_flag│                            └─────────────────┘
│                 │                                       │
│ id (PK)         │                                       │
│ article_id (FK) │──────────────────────────────────────┘
│ user_id (FK)    │
│ read_at         │
└─────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ collection_messages   │   message_read   │     │ article_archive │
│                 │     │      _flags     │     │                 │
│ id (PK)         │     │                 │     │ id (PK)         │
│ collection_id   │     │ id (PK)         │     │ user_id (FK)    │
│ user_id (FK)    │────▶│ message_id (FK) │     │ article_id      │
│ article_id      │     │ user_id (FK)    │     │ title           │
│ message         │     │ read_at         │     │ link            │
│ message_type    │     └─────────────────┘     │ content_html    │
│ created_at      │                             │ archived_at     │
└─────────────────┘                             └─────────────────┘
```

### Index de performance
```sql
-- Index pour les requêtes fréquentes
CREATE INDEX idx_articles_feed_id ON articles(feed_id);
CREATE INDEX idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX idx_article_read_flag_user_article ON article_read_flag(user_id, article_id);
CREATE INDEX idx_collection_members_collection_user ON collection_members(collection_id, user_id);
CREATE INDEX idx_feeds_collection_id ON feeds(collection_id);
CREATE INDEX idx_collection_messages_collection ON collection_messages(collection_id, created_at);
```

### Contraintes de données
- **Mots de passe** : Minimum 8 caractères, majuscule, minuscule, chiffre, caractère spécial
- **Emails** : Validation RFC 5322
- **URLs RSS** : Validation HTTP/HTTPS
- **Rôles** : "owner", "admin", "editor", "reader"
- **Types de messages** : "message", "comment"

---

## Architecture système

### Conteneurisation Docker
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (Nginx)       │    │   (FastAPI)     │    │ (PostgreSQL)    │
│                 │    │                 │    │                 │
│ Port: 3000      │───▶│ Port: 8000      │───▶│ Port: 5432      │
│ Volume: html    │    │ Volume: uploads │    │ Volume: pgdata  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Sécurité
- **Sanitisation** : Tous les contenus HTML avec bleach
- **CORS** : Configuration stricte pour production
- **JWT** : Expiration configurée, algorithme HS256
- **Mots de passe** : Hachage bcrypt avec salt
- **Variables d'environnement** : Secrets externalisés

---
*Dernière modification : 29 août 2025*
