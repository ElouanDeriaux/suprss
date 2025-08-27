# Sécurité - SUPRSS

## 🔒 Mesures de sécurité implémentées

### Authentification
- ✅ **Mots de passe hachés** avec bcrypt (coût 12)
- ✅ **Tokens JWT** avec expiration (30 minutes)
- ✅ **OAuth2** sécurisé (Google, GitHub)
- ✅ **Authentification 2FA** par email
- ✅ **Validation stricte** des mots de passe (8+ chars, majuscule, minuscule, chiffre, spécial)

### Protection des données
- ✅ **Sanitisation HTML** avec bleach pour tous les contenus
- ✅ **Validation d'entrée** stricte avec Pydantic
- ✅ **CORS** configuré pour la production
- ✅ **Secrets externalisés** (pas de hardcoding)
- ✅ **Variables d'environnement** sécurisées

### Infrastructure
- ✅ **Base de données** avec contraintes d'intégrité
- ✅ **Docker** avec utilisateurs non-root
- ✅ **Réseau isolé** entre services
- ✅ **Healthchecks** pour tous les services

## 🚨 Variables d'environnement requises

**CRITIQUE** : Ces variables ne doivent JAMAIS être committées dans le code !

```bash
# Génération d'une clé secrète sécurisée
SECRET_KEY=$(openssl rand -hex 32)

# OAuth (optionnel mais recommandé)
GOOGLE_CLIENT_ID=votre-id-google
GOOGLE_CLIENT_SECRET=votre-secret-google
GITHUB_CLIENT_ID=votre-id-github  
GITHUB_CLIENT_SECRET=votre-secret-github

# SMTP pour 2FA (optionnel)
SMTP_USERNAME=votre-email@domain.com
SMTP_PASSWORD=mot-de-passe-application

# PostgreSQL (optionnel)
POSTGRES_PASSWORD=$(openssl rand -base64 32)
```

## ⚠️ Consignes de sécurité

### Développement
1. **Ne jamais** committer de secrets dans Git
2. **Utiliser** `.env.example` comme template
3. **Vérifier** `.gitignore` avant chaque commit
4. **Régénérer** les secrets avant déploiement

### Production
1. **Changer** toutes les clés par défaut
2. **Utiliser** HTTPS obligatoirement  
3. **Configurer** un firewall approprié
4. **Monitorer** les logs de sécurité
5. **Sauvegarder** régulièrement la base de données

### Gestion des secrets
```bash
# Génération de clés sécurisées
openssl rand -hex 32  # SECRET_KEY
openssl rand -base64 32  # Mots de passe DB
```

## 🛡️ Audit de sécurité

### Dernière vérification : 2024-08-27
- ✅ Aucun secret hardcodé dans le code
- ✅ Tous les mots de passe hachés 
- ✅ Variables d'environnement externalisées
- ✅ .gitignore renforcé contre les fuites
- ✅ Code de débogage nettoyé

### Prochaine révision : 2024-09-27
- [ ] Audit des dépendances
- [ ] Test de pénétration
- [ ] Révision des permissions
- [ ] Mise à jour des clés

## 📞 Signalement de vulnérabilité

Si vous découvrez une faille de sécurité :
1. **Ne pas** créer d'issue publique
2. **Contacter** directement : elouanderiaux@gmail.com
3. **Inclure** les détails de la vulnérabilité
4. **Attendre** la correction avant divulgation

---
*Ce document est mis à jour à chaque correction de sécurité*