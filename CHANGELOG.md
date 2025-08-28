# 📝 CHANGELOG - SUPRSS

## 🛡️ [v2.1.0] - 2025-08-28 - Sécurité Avancée

### 🔐 Nouvelles Fonctionnalités Majeures

**Security Helper - Protection Automatique des Credentials**
- ✨ **Chiffrement automatique des fichiers .env** avec mot de passe maître
- ✨ **Déchiffrement transparent** au démarrage de l'application
- ✨ **Génération automatique de clés sécurisées** (SECRET_KEY, JWT, CSRF, etc.)
- ✨ **Audit de sécurité automatisé** avec recommandations
- ✨ **Configuration des permissions** fichiers sécurisées
- ✨ **Support Docker** avec variables d'environnement chiffrées

**Support Docker Avancé**
- 🐳 **Environnements chiffrés** compatibles avec Docker Compose
- 🐳 **Variable SUPRSS_MASTER_PASSWORD** pour le déchiffrement automatique
- 🐳 **Guide complet Docker** avec environnements sécurisés

### 📚 Documentation Mise à Jour

**Nouveaux Guides**
- 📖 `SECURITY_HELPER_GUIDE.md` - Guide complet du Security Helper
- 📖 `DOCKER_ENCRYPTED_ENV_GUIDE.md` - Docker avec environnements chiffrés
- 📖 `CHANGELOG.md` - Journal des modifications

**Guides Améliorés**
- 🔄 `README.md` - Ajout des fonctionnalités de sécurité
- 🔄 `INSTALL.md` - Instructions Security Helper et configuration sécurisée

### 🔧 Améliorations Techniques

**Chargeur d'Environnement Intelligent**
- 📁 `env_loader.py` - Module de chargement automatique des environnements
- 🔀 **Priorise le fichier chiffré** si un mot de passe maître est fourni
- 🔀 **Fallback automatique** vers le fichier standard si disponible
- 🔀 **Mode interactif et non-interactif** pour différents environnements

**Corrections de Bugs**
- 🐛 **Imports SQLAlchemy** manquants (`and_`, `func`) ajoutés
- 🐛 **Problèmes d'encodage Unicode** sur Windows corrigés
- 🐛 **Configuration Docker** optimisée pour les environnements chiffrés

### 🛠️ Outils de Développement

**Security Helper CLI**
```powershell
python security_helper.py setup-security     # Configuration complète
python security_helper.py encrypt-env        # Chiffrement .env
python security_helper.py decrypt-env        # Déchiffrement .env
python security_helper.py generate-keys      # Génération clés sécurisées
python security_helper.py check-security     # Audit de sécurité
python security_helper.py production-mode    # Configuration production
```

### 📊 Impact Sécurité

**Avant cette version :**
- ❌ Fichiers .env en clair sur le disque
- ❌ Clés par défaut potentiellement faibles
- ❌ Configuration manuelle des permissions
- ❌ Pas d'audit de sécurité automatique

**Avec cette version :**
- ✅ **Chiffrement AES-256** des fichiers sensibles
- ✅ **PBKDF2** avec 100,000 itérations pour la dérivation de clés
- ✅ **Génération cryptographiquement sécurisée** des secrets
- ✅ **Audit automatique** avec détection des faiblesses
- ✅ **Gestion transparente** des environnements chiffrés
- ✅ **Support production** avec variables d'environnement

### 🚀 Migration

**Pour les installations existantes :**
```powershell
# 1. Mise à jour du code
git pull origin main

# 2. Configuration sécurisée automatique
python security_helper.py setup-security

# 3. (Optionnel) Chiffrement de l'environnement
python security_helper.py encrypt-env

# 4. Redémarrage avec déchiffrement automatique
docker-compose restart
```

**Compatibilité :**
- ✅ **100% rétrocompatible** - Les anciennes installations continuent de fonctionner
- ✅ **Migration douce** - Le Security Helper propose les améliorations sans forcer
- ✅ **Fallback automatique** - Si le déchiffrement échoue, utilise le fichier standard

---

## 📋 Versions Précédentes

### [v2.0.0] - Base SUPRSS
- 🎉 Application RSS complète avec FastAPI
- 🔐 Authentification OAuth (Google, GitHub)  
- 📚 Système de collections partagées
- 💬 Messagerie intégrée
- 🗄️ Archivage permanent des articles
- 🐳 Support Docker complet

---

**🎯 Prochaines Fonctionnalités Prévues :**
- 🔄 Rotation automatique des clés
- 📱 Application mobile PWA
- 🌐 Support multi-langues
- 📊 Métriques et analytics
- 🔔 Notifications push