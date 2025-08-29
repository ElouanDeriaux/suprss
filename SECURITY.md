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

**Génération PowerShell des clés :**
```powershell
# Génération d'une clé secrète sécurisée
$SECRET_KEY = [System.Web.Security.Membership]::GeneratePassword(64, 10)
Write-Host "SECRET_KEY générée : $SECRET_KEY"

# PostgreSQL (si nécessaire)
$POSTGRES_PASSWORD = [System.Web.Security.Membership]::GeneratePassword(32, 8)
Write-Host "POSTGRES_PASSWORD : $POSTGRES_PASSWORD"
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
```powershell
# Génération de clés sécurisées
[System.Web.Security.Membership]::GeneratePassword(64, 10)  # SECRET_KEY
[System.Web.Security.Membership]::GeneratePassword(32, 8)   # Mots de passe DB
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