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
- **Docker** >= 20.10.0 et Docker Compose >= 2.0.0
- **Ports libres** : 3000 (frontend), 8000 (backend), 5432 (base de données)
- **RAM minimum** : 512 Mo
- **Espace disque** : 1 Go minimum

### Variables d'environnement nécessaires
| Variable | Description | Comment l'obtenir | Obligatoire |
|----------|-------------|-------------------|-------------|
| `SECRET_KEY` | Clé secrète JWT (32+ caractères) | Générer avec `openssl rand -hex 32` ou tout générateur de clés | ✅ |
| `GOOGLE_CLIENT_ID` | ID client OAuth Google | Console Google Cloud → APIs & Services → Credentials | ❌ |
| `GOOGLE_CLIENT_SECRET` | Secret OAuth Google | Console Google Cloud → APIs & Services → Credentials | ❌ |
| `GITHUB_CLIENT_ID` | ID client OAuth GitHub | GitHub Settings → Developer settings → OAuth Apps | ❌ |
| `GITHUB_CLIENT_SECRET` | Secret OAuth GitHub | GitHub Settings → Developer settings → OAuth Apps | ❌ |
| `SMTP_SERVER` | Serveur SMTP | smtp.gmail.com ou serveur de votre fournisseur email | ❌ |
| `SMTP_PORT` | Port SMTP | 587 (TLS) ou 465 (SSL) selon le serveur | ❌ |
| `SMTP_USERNAME` | Utilisateur SMTP | Votre email pour l'envoi (ex: votremail@gmail.com) | ❌ |
| `SMTP_PASSWORD` | Mot de passe SMTP | Mot de passe d'application (Gmail) ou mot de passe email | ❌ |

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

**Configuration SMTP Gmail :**
1. Activer la 2FA sur votre compte Google
2. Aller dans "Sécurité" → "Mots de passe d'application"
3. Générer un mot de passe d'application pour "Mail"
4. Utiliser ce mot de passe (16 caractères) dans `SMTP_PASSWORD`

---

## Guide de déploiement

### Déploiement avec Docker (Recommandé)

1. **Cloner le projet**
```bash
git clone https://github.com/ElouanDeriaux/suprss.git
cd suprss
```

2. **Configuration**
```bash
cp .env.example .env
# Éditer .env avec vos valeurs
```

3. **Lancement**
```bash
# Démarrage automatique
./start.sh      # Linux/Mac
start.bat       # Windows

# Ou manuellement
docker-compose up --build -d
```

4. **Vérification**
```bash
docker-compose ps
curl http://localhost:8000/health
```

### Déploiement manuel (Développement)

1. **Backend Python**
```bash
# Installation dépendances
pip install fastapi sqlmodel uvicorn bcrypt python-jose[cryptography] \
    feedparser requests apscheduler bleach python-dotenv authlib httpx

# Variables d'environnement
export SECRET_KEY="votre-cle-secrete"
export GOOGLE_CLIENT_ID="votre-google-client-id"
# ... autres variables

# Lancement
uvicorn main:app --reload --port 8000
```

2. **Frontend**
```bash
cd simple-frontend
python -m http.server 3000
```

3. **Base de données**
- SQLite : Automatique (fichier `suprss.db`)
- PostgreSQL : Configurer DATABASE_URL

### Arrêt des services
```bash
./stop.sh               # Linux/Mac
docker-compose down     # Manuel
```

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