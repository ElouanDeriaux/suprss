# Sécurité - SUPRSS

> ⚠️ **IMPORTANT - Limitations de Sécurité Actuelles**
> 
> **SUPRSS est actuellement destiné à un usage local très restreint uniquement (localhost).**
> 
> **Limitations critiques pour un déploiement Internet :**
> - ❌ **Pas de HTTPS** - Toutes les communications sont en HTTP non chiffré
> - ❌ **Configuration par défaut** - Non optimisée pour la sécurité en production
> - ❌ **Pas de protection avancée** contre les attaques externes (DDoS, etc.)
> 
> **🚫 NE PAS exposer cette version sur Internet sans modifications importantes**
> 
> **🔒 Prochaine amélioration majeure** : Implémentation complète du HTTPS et durcissement sécuritaire pour usage en production.

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

**Exemple .env :**
```env
# OBLIGATOIRE : Clé secrète JWT (utilisez la génération PowerShell ci-dessus)
SECRET_KEY="votre-cle-generee-64-caracteres"

# OBLIGATOIRE : SMTP pour authentification
SMTP_SERVER="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USERNAME="votre-email-suprss@gmail.com"
SMTP_PASSWORD="xxxxyyyyzzzzwwww"  # Mot de passe d'APPLICATION Gmail (16 caractères)

# OPTIONNEL : OAuth (améliore l'expérience utilisateur)
GOOGLE_CLIENT_ID="votre-id-google"
GOOGLE_CLIENT_SECRET="votre-secret-google"
GITHUB_CLIENT_ID="votre-id-github"
GITHUB_CLIENT_SECRET="votre-secret-github"
```

**Génération des clés :**

⚠️ **Prérequis** : Python 3.11+ requis (voir les guides d'installation INSTALL.md ou README.md)

```powershell
# Méthode recommandée avec Python (installé en prérequis)
python -c "import secrets; print('SECRET_KEY=' + secrets.token_hex(32))"

# Alternative PowerShell native (si System.Web disponible)
# $SECRET_KEY = [System.Web.Security.Membership]::GeneratePassword(64, 10)
```

## ⚠️ Consignes de sécurité

### Développement
1. **Ne jamais** committer de secrets dans Git
2. **Utiliser** `.env.example` comme template
3. **Vérifier** `.gitignore` avant chaque commit
4. **Régénérer** les secrets avant déploiement

### Production
⚠️ **IMPORTANT** : Cette version n'est pas prête pour la production Internet !

**Pour un usage localhost uniquement :**
1. **Changer** toutes les clés par défaut
2. **Sauvegarder** régulièrement la base de données
3. **Surveiller** les accès locaux

**Pour un futur déploiement Internet (nécessite des développements supplémentaires) :**
1. **Implémenter HTTPS** avec certificats SSL/TLS valides
2. **Configurer** un reverse proxy sécurisé (nginx/Apache)
3. **Durcir** la configuration Docker pour la production
4. **Ajouter** des protections DDoS et rate limiting
5. **Mettre en place** un firewall approprié
6. **Monitorer** les logs de sécurité

### Gestion des secrets
```powershell
# Méthode recommandée - Python (fonctionne partout)
python -c "import secrets; print(secrets.token_hex(32))"  # SECRET_KEY

# Méthode alternative - PowerShell (si System.Web disponible)  
# [System.Web.Security.Membership]::GeneratePassword(64, 10)
```

## 🛡️ Audit de sécurité

### Dernière vérification
- ✅ Aucun secret hardcodé dans le code
- ✅ Tous les mots de passe hachés 
- ✅ Variables d'environnement externalisées
- ✅ .gitignore renforcé contre les fuites
- ✅ Code de débogage nettoyé

### Prochaines révisions programmées
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
*Dernière modification : 29 août 2025*