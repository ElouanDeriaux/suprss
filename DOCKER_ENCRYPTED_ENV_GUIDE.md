# 🐳 Docker avec Environnement Chiffré - Guide SUPRSS

## 🚀 État Actuel

L'application SUPRSS fonctionne maintenant parfaitement avec Docker et Docker Compose, même avec des fichiers d'environnement chiffrés.

## 📋 Options de Déploiement

### Option 1: Développement avec .env Standard
```bash
# Utilisez le fichier .env temporaire fourni
docker-compose up -d
```

### Option 2: Production avec Environnement Chiffré
```bash
# 1. Supprimez le .env temporaire
rm .env

# 2. Définissez le mot de passe maître
export SUPRSS_MASTER_PASSWORD="votre-mot-de-passe-maitre"

# 3. Démarrez avec la variable d'environnement
docker-compose up -d
```

### Option 3: Production Sécurisée
```bash
# 1. Supprimez tous les fichiers .env non chiffrés
rm .env

# 2. Créez un fichier .env.docker avec seulement les variables Docker
cat > .env.docker << EOF
SUPRSS_MASTER_PASSWORD=votre-mot-de-passe-maitre
POSTGRES_USER=suprss_user
POSTGRES_PASSWORD=suprss_pass
POSTGRES_DB=suprss_db
EOF

# 3. Modifiez docker-compose.yml pour utiliser env_file: .env.docker
docker-compose up -d
```

## 🔧 Configuration Actuelle

### Fichiers Présents
- ✅ `.env` - Fichier temporaire pour développement Docker
- ✅ `.env.encrypted` - Fichier chiffré avec vos vraies variables
- ✅ `env_loader.py` - Chargeur intelligent d'environnement
- ✅ Docker configuré pour gérer les deux

### Comportement du Chargeur
1. **Si .env existe** → Utilise le fichier standard
2. **Si seulement .env.encrypted existe** → Déchiffre automatiquement
3. **Mode production** → Utilise SUPRSS_MASTER_PASSWORD

## 🛡️ Recommandations de Sécurité

### Pour le Développement
```bash
# Gardez le .env pour faciliter le développement
# Il sera ignoré par git automatiquement
```

### Pour la Production
```bash
# 1. Supprimez le .env
rm .env

# 2. Utilisez uniquement .env.encrypted
# 3. Définissez SUPRSS_MASTER_PASSWORD dans l'environnement système
```

## 📱 Commandes Utiles

### Vérifier l'État
```bash
# Status des conteneurs
docker-compose ps

# Logs de l'application
docker-compose logs backend

# Test de santé
curl http://localhost:8000/health
```

### Gestion des Environnements
```bash
# Chiffrer votre .env actuel
python security_helper.py encrypt-env

# Configurer pour la production
python security_helper.py production-mode

# Audit de sécurité
python security_helper.py check-security
```

## ✅ Vérification du Bon Fonctionnement

L'application est maintenant opérationnelle :
- 🐘 **PostgreSQL** : Connecté et initialisé
- 🚀 **Backend API** : Accessible sur http://localhost:8000
- 🌐 **Frontend** : Accessible sur http://localhost:3000
- 🔐 **Environnement** : Chargé correctement (chiffré ou standard)

## 🔄 Workflow Recommandé

### Développement
```bash
# 1. Travaillez avec .env standard
docker-compose up -d

# 2. Testez vos changements
# 3. Avant commit, chiffrez si nécessaire
python security_helper.py encrypt-env
```

### Déploiement Production
```bash
# 1. Clonez le repository
git clone [repo-url]

# 2. Configurez l'environnement chiffré
export SUPRSS_MASTER_PASSWORD="mot-de-passe-production"

# 3. Démarrez (utilisera automatiquement .env.encrypted)
docker-compose up -d
```

---

**🎉 Félicitations ! Votre setup Docker avec environnement chiffré fonctionne parfaitement !**