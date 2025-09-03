# SUPRSS

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-brightgreen.svg)
![Python](https://img.shields.io/badge/python-3.11+-blue.svg)
![Windows](https://img.shields.io/badge/platform-Windows-blue.svg)
![PowerShell](https://img.shields.io/badge/shell-PowerShell-blue.svg)

🚨 **IMPORTANT - Récupérer le projet depuis GitHub** 🚨  

**Ce projet doit obligatoirement être récupéré via git clone depuis le dépôt GitHub officiel :**  
**https://github.com/ElouanDeriaux/suprss**

Les fichiers téléchargés en ZIP peuvent causer des problèmes d'encodage avec les emojis sur Windows. Utilisez uniquement la méthode git clone pour garantir un fonctionnement optimal.

---

**SUPRSS** est une application web moderne de gestion de flux RSS, **optimisée pour Windows et PowerShell**, conçue pour offrir une expérience utilisateur intuitive et des fonctionnalités avancées de collaboration. Développée avec FastAPI et une interface vanilla JavaScript optimisée, elle propose une alternative complète aux solutions existantes.

**📚 Documentation complète :** 
1. **🪟 `WINDOWS_COMPATIBILITY.md`** - Pourquoi Windows uniquement (à lire en premier)
2. **🚀 `INSTALL.md`** - Installation détaillée Windows avec PowerShell
3. **👥 `MANUEL_UTILISATEUR.md`** - Guide complet pour les utilisateurs finaux et pour l'évaluation SUPINFO

**📖 Guides de configuration :**
- **📖 `OAUTH_SETUP_GUIDE.md`** - Configuration OAuth Google et GitHub (optionnel)
- **🛡️ `SECURITY_HELPER_GUIDE.md`** - Chiffrement automatique des credentials

**🔧 Documentation technique :**
- **📚 `DOCUMENTATION_TECHNIQUE.md`** - Documentation développeurs et pour l'évaluation SUPINFO
- **🔐 `SECURITY.md`** - Bonnes pratiques sécurité

> ⚠️ **IMPORTANT - Usage Local Uniquement**
> 
> **SUPRSS est actuellement destiné à un usage local très restreint (localhost uniquement).**
> Cette version ne doit PAS être exposée sur Internet ou utilisée en production sans modifications importantes.
> 
> **Limitations de sécurité actuelles :**
> - ❌ **Pas de HTTPS** - Communication non chiffrée (HTTP uniquement)
> - ❌ **Configuration par défaut** - Non adaptée pour un environnement de production
> - ❌ **Pas de protection avancée** contre les attaques externes
> 
> **🔒 Prochaine amélioration majeure** : Implémentation complète du HTTPS et sécurisation pour usage en production.

> 🪟 **Plateforme supportée** : Windows uniquement avec PowerShell
> 
> Cette application est spécifiquement conçue et testée pour l'environnement Windows. Toutes les instructions utilisent PowerShell comme shell par défaut.

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
- **Réparation automatique** des archives corrompues

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
- **Téléchargement d'archives** en formats TXT et HTML

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

### 🖥️ Prérequis Windows
- **Windows 10/11** (version recommandée)
- **PowerShell 5.1+** (installé par défaut sur Windows)
- **[Python 3.11+](https://www.python.org/downloads/windows/)** pour la génération de clés et les outils de sécurité
  - **Installation rapide avec winget** : `winget install Python.Python.3.12`
  - **Vérifier l'installation** : `python --version`
- **[Docker Desktop pour Windows](https://docs.docker.com/desktop/windows/install/)** et Docker Compose
- **[Git pour Windows](https://git-scm.com/download/win)** pour le clonage (optionnel)
- **Ports disponibles** : 3000 (frontend) et 8000 (backend)

> ⚠️ **Note importante** : Cette application est optimisée pour Windows uniquement. Les instructions utilisent PowerShell comme environnement shell par défaut.

### Démarrage Rapide

Pour avoir le guide détaillé pour installer le projet : 🚀 `INSTALL.md`** - Installation détaillée Windows avec PowerShell

### Installation avec Git (Méthode Recommandée)

**Installation de Git pour Windows (si nécessaire) :**

```powershell
# Méthode recommandée avec winget
winget install --id Git.Git -e --source winget
# Redémarrer PowerShell après installation

# Alternative : Téléchargement manuel depuis https://git-scm.com/download/win
```

**Clonage du projet :**
```powershell
# 1. Cloner le projet
git clone https://github.com/ElouanDeriaux/suprss.git
cd suprss

# 2. Configuration sécurisée avec Security Helper (RECOMMANDÉ)
copy .env.example .env
# Éditez .env avec vos vraies credentials, puis :

# ÉTAPE OBLIGATOIRE : Installer les dépendances
python -m pip install cryptography python-dotenv

# Configuration automatique sécurisée
python security_helper.py setup-security

# 3. Lancement sécurisé
start.bat
```

**📋 Questions/Réponses pour setup-security :**
1. **"Mettre à jour automatiquement .env ? (y/N):"** → Répondez **"y"**
2. **"Voulez-vous chiffrer le fichier .env ? (y/N):"** → Répondez **"y"** 
3. **"Entrez un mot de passe maître :"** → Choisissez un mot de passe fort
4. **"Confirmez le mot de passe :"** → Retapez le même mot de passe
5. **"Supprimer le fichier .env original ? (y/N):"** → Répondez **"y"** (sécurité réelle)

L'application sera accessible sur :
- **Frontend** : http://localhost:3000
- **API** : http://localhost:8000
- **API Documentation** : http://localhost:8000/docs

## 🛑 Arrêt et Gestion de l'Application

### Arrêter SUPRSS
```powershell
# Arrêt avec le script fourni
stop.bat

# Ou directement avec Docker Compose
docker-compose down
docker-compose down -v  # Arrêt avec suppression des volumes
```

### Administration de la Base de Données

#### Suppression complète de la base de données
Pour supprimer toutes les données de la base tout en conservant la structure des tables :

```powershell
# Supprimer toutes les données (PowerShell)
docker exec -it suprss_db psql -U suprss_user -d suprss_db
# Puis dans psql, exécuter :
TRUNCATE TABLE article, articlearchive, articlereadflag, articlestar, collection, collectionmember, collectionmessage, emailverificationcode, feed, messagereadflag, "user" CASCADE;
# \q pour quitter
```

⚠️ **ATTENTION** : Cette commande supprime **toutes les données** de manière irréversible.

## 🔧 Configuration

### Variables d'Environnement
Copiez `.env.example` vers `.env` et configurez :

| Variable | Description | Comment l'obtenir | Obligatoire |
|----------|-------------|-------------------|-------------|
| `SECRET_KEY` | Clé secrète pour JWT | `openssl rand -hex 32` | ✅ |
| `GOOGLE_CLIENT_ID` | ID client OAuth Google | Google Cloud Console | ⚪ Optionnel - Améliore l'expérience utilisateur |
| `GOOGLE_CLIENT_SECRET` | Secret OAuth Google | Google Cloud Console | ⚪ Optionnel - Améliore l'expérience utilisateur |
| `GITHUB_CLIENT_ID` | ID client OAuth GitHub | GitHub Developer Settings | ⚪ Optionnel - Améliore l'expérience utilisateur |
| `GITHUB_CLIENT_SECRET` | Secret OAuth GitHub | GitHub Developer Settings | ⚪ Optionnel - Améliore l'expérience utilisateur |
| `SMTP_*` | Configuration email pour authentification | Fournisseur email (Gmail, etc.) | ✅ |

### 🛡️ Security Helper - Sécurisation Avancée

SUPRSS inclut maintenant un outil de sécurité intégré pour protéger vos credentials :

```powershell
# Installer les dépendances requises
python -m pip install cryptography python-dotenv

# Configuration sécurisée complète en une commande
python security_helper.py setup-security
```

⚠️ **Important** : Répondez "y" à toutes les questions pour une sécurité optimale, notamment pour la suppression du fichier .env original.

L'application déchiffre automatiquement le fichier .env.encrypted au démarrage :
- **Avec start.bat** : Demande le mot de passe interactivement  
- **Avec Docker** : Nécessite la variable `SUPRSS_MASTER_PASSWORD` ou déchiffrement manuel

**Fonctionnalités :**
- ✅ **Chiffrement automatique** de vos fichiers .env
- ✅ **Génération de clés sécurisées** (SECRET_KEY, JWT, CSRF)  
- ✅ **Déchiffrement transparent** au démarrage de l'application
- ✅ **Support Docker** avec variables d'environnement
- ✅ **Audit de sécurité** automatique
- ✅ **Mode production** sécurisé

Voir le guide complet : `SECURITY_HELPER_GUIDE.md`

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
- **Chiffrement automatique des fichiers .env** avec Security Helper
- **Variables chiffrées** : Protection des credentials OAuth et secrets
- **Déchiffrement automatique** au démarrage (mode production et développement)
- **Secrets externalisés** : Aucun secret hardcodé
- **Audit de sécurité** : Documentation complète (voir SECURITY.md)

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

## 🔧 Développement

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
*Dernière modification : 29 août 2025*
