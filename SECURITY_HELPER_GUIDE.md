# 🛡️ Guide Security Helper - SUPRSS

## 📋 Qu'est-ce que Security Helper ?

`security_helper.py` est un **outil simple** pour renforcer la sécurité de votre installation SUPRSS :

✅ **Chiffrer votre fichier .env** avec un mot de passe maître  
✅ **Générer des clés sécurisées** automatiquement  
✅ **Effectuer un audit de sécurité** de base  
✅ **Configuration sécurisée** en une commande  

## 🚀 Installation

```bash
pip install cryptography
```

## 💡 Utilisation Simple

### 1. Configuration Complète (Recommandée)
```bash
python security_helper.py setup-security
```
Cette commande fait tout automatiquement :
- Génère de nouvelles clés sécurisées
- Configure les permissions fichiers
- Met à jour .gitignore
- Propose le chiffrement du .env

### 2. Commandes Individuelles

**Générer de nouvelles clés :**
```bash
python security_helper.py generate-keys
```

**Chiffrer le .env :**
```bash
python security_helper.py encrypt-env
```

**Déchiffrer le .env :**
```bash
python security_helper.py decrypt-env
```

**Audit de sécurité :**
```bash
python security_helper.py check-security
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
4. Supprime optionnellement l'original

### Usage pratique :
```bash
# Pour développer
python security_helper.py decrypt-env
# ... travail sur le projet ...
python security_helper.py encrypt-env

# Pour déployer
python security_helper.py decrypt-env
./start.sh
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
```bash
cp .env.example .env
# Reconfigurez manuellement
```

**Clés perdues ?**
```bash
python security_helper.py generate-keys
```

---

*Simple, efficace, sans complications.*