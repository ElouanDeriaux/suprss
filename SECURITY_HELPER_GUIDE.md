# 🛡️ Guide Security Helper - SUPRSS

## 📋 Table des matières
1. [Qu'est-ce que Security Helper ?](#-quest-ce-que-security-helper-)
2. [Installation](#-installation)
3. [Utilisation Simple](#-utilisation-simple)
4. [Chiffrement du .env](#-chiffrement-du-env)
5. [Génération de Clés](#-génération-de-clés)
6. [Audit de Sécurité](#-audit-de-sécurité)
7. [Points Importants](#️-important)
8. [Résolution de problèmes](#-en-cas-de-problème)

## ✨ Chiffrement Automatique

L'application SUPRSS peut maintenant **automatiquement** déchiffrer votre fichier `.env.encrypted` au démarrage ! Plus besoin de déchiffrer manuellement.

## 📋 Qu'est-ce que Security Helper ?

`security_helper.py` est un **outil simple** pour renforcer la sécurité de votre installation SUPRSS :

✅ **Chiffrer votre fichier .env** avec un mot de passe maître  
✅ **Générer des clés sécurisées** automatiquement  
✅ **Effectuer un audit de sécurité** de base  
✅ **Configuration sécurisée** en une commande  

## 🚀 Installation

### Prérequis
**Python 3.11+ requis** pour Security Helper :
```powershell
# Installer Python si nécessaire
winget install Python.Python.3.12

# Vérifier l'installation
python --version
```

### Installation des dépendances
**Windows (PowerShell) :**
```powershell
# Installation complète recommandée
python -m pip install cryptography python-dotenv

# Alternative si pip3 disponible
pip3 install cryptography python-dotenv
```

⚠️ **Important** : `python-dotenv` est requis pour le déchiffrement automatique au démarrage de l'application.


## 💡 Utilisation Simple

### 1. Configuration Complète (Recommandée)
```powershell
python security_helper.py setup-security
```

**📋 Questions/Réponses attendues durant l'exécution :**
1. **"Mettre à jour automatiquement .env ? (y/N):"** → Répondez **"y"** (oui)
2. **"Voulez-vous chiffrer le fichier .env ? (y/N):"** → Répondez **"y"** (recommandé)
3. **"Entrez un mot de passe maître pour chiffrer .env:"** → Choisissez un mot de passe fort
4. **"Confirmez le mot de passe:"** → Retapez le même mot de passe
5. **"Supprimer le fichier .env original ? (y/N):"** → Répondez **"y"** (⚠️ ESSENTIEL pour sécurité !)

**✅ Cette commande fait tout automatiquement :**
- Génère de nouvelles clés sécurisées
- Configure les permissions fichiers
- Met à jour .gitignore
- Propose le chiffrement du .env
- Effectue un audit de sécurité

**💡 IMPORTANT : Si vous utilisez `setup-security`, vous n'avez PAS besoin des commandes individuelles ci-dessous !**

### 2. Commandes Individuelles (Inutiles si setup-security utilisé)

**Générer de nouvelles clés :**
```powershell
python security_helper.py generate-keys
```

**Chiffrer le .env :**
```powershell
python security_helper.py encrypt-env
```

**Déchiffrer le .env :**
```powershell
python security_helper.py decrypt-env
```

**Audit de sécurité :**
```powershell
python security_helper.py check-security
```

**Mode production :**
```powershell
python security_helper.py production-mode
```

## 🔐 Chiffrement du .env

### Pourquoi chiffrer ?
- Protège vos secrets même si quelqu'un accède à vos fichiers
- Mot de passe maître = sécurité renforcée
- Fichier `.env.encrypted` = secrets protégés

### Comment ça marche ?
1. Vous donnez un mot de passe maître
2. L'outil chiffre votre `.env` 
3. Sauvegarde dans `.env.encrypted`
4. **L'application déchiffre automatiquement au démarrage !**

### Workflow Automatique :
```powershell
# 1. Chiffrez votre .env une fois
python security_helper.py encrypt-env

# 2. L'application déchiffre automatiquement
# Soit en mode interactif (demande le mot de passe)
python main.py

# Soit en mode production (avec variable d'environnement)
$env:SUPRSS_MASTER_PASSWORD="votre-mot-de-passe"
python main.py
```

### Mode Production :
```powershell
# Configuration pour la production
python security_helper.py production-mode

# Docker Compose avec mot de passe automatique
$env:SUPRSS_MASTER_PASSWORD="votre-mot-de-passe"; docker-compose up -d
```

### Ancien Workflow (Manuel) :
```powershell
# Pour développer
python security_helper.py decrypt-env
# ... travail sur le projet ...
python security_helper.py encrypt-env

# Pour déployer
python security_helper.py decrypt-env
start.bat
python security_helper.py encrypt-env
```

## 🔑 Génération de Clés

L'outil génère automatiquement :
- `SECRET_KEY` : Clé JWT (32 caractères)
- `JWT_REFRESH_SECRET` : Refresh tokens
- `ENCRYPTION_KEY` : Chiffrement interne  
- `CSRF_SECRET` : Protection CSRF

## 🔍 Audit de Sécurité

Vérifie automatiquement :
- SECRET_KEY pas en valeur par défaut
- Longueur des clés suffisante
- Permissions fichier .env (600)
- .env présent dans .gitignore
- Pas de mots de passe par défaut

## ⚠️ Important

- **Gardez votre mot de passe maître en sécurité**
- **Ne committez JAMAIS le fichier .env**
- **Sauvegardez vos clés** avant de les régénérer

## 🆘 En cas de problème

**Mot de passe oublié ?**
```powershell
copy .env.example .env
# Reconfigurez manuellement
```

**Clés perdues ?**
```powershell
python security_helper.py generate-keys
```

---
*Dernière modification : 29 août 2025*