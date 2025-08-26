# SUPRSS

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-brightgreen.svg)
![Python](https://img.shields.io/badge/python-3.11+-blue.svg)

**SUPRSS** est une application web moderne de gestion de flux RSS, conçue pour offrir une expérience utilisateur intuitive et des fonctionnalités avancées de collaboration. Développée avec FastAPI et une interface vanilla JavaScript optimisée, elle propose une alternative complète aux solutions existantes.

## ✨ Fonctionnalités

### 🔐 Authentification Sécurisée
- **Inscription/Connexion** avec validation de mot de passe renforcée
- **OAuth2** : Intégration Google et GitHub
- **Authentification 2FA** avec vérification par email
- **JWT** pour la gestion sécurisée des sessions

### 📚 Gestion Avancée des Collections
- **Collections personnelles** pour organiser vos flux
- **Collections partagées** avec système de permissions (propriétaire, éditeur, lecteur)
- **Invitations** et gestion collaborative des membres
- **Indicateurs visuels** des messages non lus par collection

### 🌐 Flux RSS Intelligents
- **Ajout de flux** avec validation automatique
- **Actualisation programmée** toutes les 10 minutes avec cache ETag/If-Modified-Since
- **Flux suggérés** : Collection curatée de sources populaires (Le Monde, Hacker News, TechCrunch, etc.)
- **Détection automatique** des doublons d'articles

### 📖 Expérience de Lecture Optimisée
- **Lecteur intégré** avec contenu nettoyé et lisible
- **Mode sombre/clair** avec persistance des préférences
- **Gestion lu/non-lu** avec suivi par utilisateur
- **Système de favoris** pour marquer les articles importants

### 💬 Communication Collaborative
- **Messagerie instantanée** dans les collections partagées
- **Commentaires spécifiques** par article
- **Notifications visuelles** des messages non lus
- **Système de lecture** avec flags personnalisés

### 🗄️ Archivage et Sauvegarde
- **Archivage permanent** des articles avec contenu complet
- **Téléchargement** des archives (formats TXT/HTML)
- **Conservation** du contenu original même après suppression de la source
- **Gestion centralisée** des archives par utilisateur

### 🔍 Recherche et Filtrage
- **Recherche plein texte** dans tous les articles
- **Filtres multiples** : collection, statut (lu/non-lu), favoris, source
- **Interface responsive** adaptée mobile et desktop
- **Tri chronologique** avec pagination intelligente

### 📦 Import/Export de Données
- **Export OPML** de toutes vos collections et flux
- **Import OPML** avec création automatique des collections
- **Gestion des doublons** lors de l'import
- **Compatibilité** avec les readers RSS standard

## 🏗️ Architecture Technique

### Backend (Python/FastAPI)
```
├── main.py              # Application FastAPI principale avec tous les endpoints
├── models.py            # Modèles SQLModel (User, Collection, Feed, Article, etc.)
├── auth.py              # Authentification JWT et middleware
├── oauth.py             # Configuration OAuth2 (Google, GitHub)
├── database.py          # Configuration base de données et migrations
├── email_service.py     # Service d'envoi d'emails pour 2FA
└── utils.py             # Utilitaires (hachage bcrypt, etc.)
```

### Frontend (Vanilla JavaScript)
```
simple-frontend/
├── index.html           # Page de connexion
├── dashboard.html       # Interface principale de gestion
├── flux.html            # Visualisation des flux et articles
├── archive.html         # Gestion des archives
├── settings.html        # Paramètres utilisateur
├── theme.js             # Système de thème global
└── *.js                 # Logique métier par page
```

### Base de Données (SQLite/PostgreSQL)
- **Utilisateurs** avec authentification OAuth et 2FA
- **Collections** avec permissions et partage
- **Flux RSS** avec cache et métadonnées
- **Articles** avec contenu complet et flags de lecture
- **Messagerie** avec système de lecture par utilisateur
- **Archives** avec contenu permanent

## 🚀 Installation et Déploiement

### Prérequis
- [Docker](https://www.docker.com/) et Docker Compose
- [Git](https://git-scm.com/) pour le clonage
- Ports 3000 (frontend) et 8000 (backend) disponibles

### Démarrage Rapide

```bash
# 1. Cloner le projet
git clone https://github.com/ElouanDeriaux/suprss.git
cd suprss

# 2. Configuration (optionnel pour les fonctionnalités OAuth)
cp .env.example .env
# Éditez .env avec vos clés OAuth si nécessaire

# 3. Lancement avec Docker
# Linux/Mac
./start.sh

# Windows
start.bat

# Ou manuellement
docker-compose up --build -d
```

L'application sera accessible sur :
- **Frontend** : http://localhost:3000
- **API** : http://localhost:8000
- **API Documentation** : http://localhost:8000/docs

### Installation Manuelle (Développement)

```bash
# Backend
pip install fastapi sqlmodel uvicorn bcrypt python-jose[cryptography] feedparser requests apscheduler bleach python-dotenv authlib httpx

# Base de données
# SQLite (par défaut) : Aucune configuration requise
# PostgreSQL : Décommentez la section dans docker-compose.yml

# Lancement backend
uvicorn main:app --reload --port 8000

# Frontend (terminal séparé)
cd simple-frontend
python -m http.server 3000
```

## ⚙️ Configuration

### Variables d'Environnement
Copiez `.env.example` vers `.env` et configurez :

| Variable | Description | Comment l'obtenir | Obligatoire |
|----------|-------------|-------------------|-------------|
| `SECRET_KEY` | Clé secrète pour JWT | `openssl rand -hex 32` | ✅ |
| `GOOGLE_CLIENT_ID` | ID client OAuth Google | Google Cloud Console | ⚪ |
| `GOOGLE_CLIENT_SECRET` | Secret OAuth Google | Google Cloud Console | ⚪ |
| `GITHUB_CLIENT_ID` | ID client OAuth GitHub | GitHub Developer Settings | ⚪ |
| `GITHUB_CLIENT_SECRET` | Secret OAuth GitHub | GitHub Developer Settings | ⚪ |
| `SMTP_*` | Configuration email pour 2FA | Fournisseur email (Gmail, etc.) | ⚪ |

**Note :** Consultez `DOCUMENTATION_TECHNIQUE.md` pour un guide détaillé d'obtention des clés OAuth et SMTP.

### Base de Données
- **SQLite** (défaut) : Base intégrée `suprss.db`
- **PostgreSQL** : Configuré via Docker Compose

## 📊 Performances et Sécurité

### Optimisations
- **Cache RSS** avec ETag/If-Modified-Since
- **Sanitisation HTML** avec bleach pour la sécurité
- **Pagination** automatique pour les gros volumes
- **Index de base de données** optimisés

### Sécurité
- **Mots de passe** hachés avec bcrypt
- **Validation** stricte des entrées utilisateur
- **CORS** configuré pour la production
- **Tokens JWT** avec expiration
- **Authentification 2FA** optionnelle

## 🤝 Utilisation

### Démarrage Rapide
1. **Inscrivez-vous** avec email/mot de passe ou OAuth
2. **Créez une collection** pour organiser vos flux
3. **Ajoutez des flux** depuis les suggestions ou manuellement
4. **Explorez** vos articles dans l'interface de lecture
5. **Partagez** vos collections avec d'autres utilisateurs

### Fonctionnalités Avancées
- **Collections partagées** : Invitez des collaborateurs
- **Archives** : Sauvegardez définitivement vos articles importants  
- **Import/Export** : Migrez depuis/vers d'autres lecteurs RSS
- **Messagerie** : Discutez des articles en équipe

## 🛠️ Développement

### Stack Technologique
- **Backend** : FastAPI, SQLModel, Pydantic
- **Frontend** : Vanilla JavaScript, Tailwind CSS
- **Base de données** : SQLite/PostgreSQL
- **Conteneurisation** : Docker, Docker Compose
- **Authentication** : JWT, OAuth2, bcrypt

### Architecture
L'application suit une architecture 3-tiers stricte :
- **Présentation** : Interface JavaScript pure (pas de frameworks)
- **Logique métier** : API REST FastAPI avec validation Pydantic
- **Données** : SQLModel avec support multi-base

### Tests et Qualité
- Validation automatique des flux RSS
- Gestion d'erreurs robuste avec logs détaillés
- Code modulaire et documenté
- Respect des standards REST

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 👨‍💻 Auteur

**Elouan Deriaux**
- GitHub: [@ElouanDeriaux](https://github.com/ElouanDeriaux)
- Email: elouanderiaux@gmail.com

---

*Développé avec ❤️ pour une meilleure expérience de lecture RSS*