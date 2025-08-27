# ⚠️ IMPORTANT : Format du Mot de Passe d'Application Gmail

## 🔐 Clarification Cruciale

Quand vous générez un **mot de passe d'application Gmail**, Google l'affiche avec des espaces pour faciliter la lecture :

```
Affiché par Google : xxxx yyyy zzzz wwww
```

**❌ ERREUR COMMUNE :** Copier-coller avec les espaces
```bash
# INCORRECT - Ne fonctionnera PAS
SMTP_PASSWORD="abcd efgh ijkl mnop"
```

**✅ CORRECT :** Coller SANS les espaces
```bash
# CORRECT - Fonctionnera
SMTP_PASSWORD="abcdefghijklmnop"
```

## 🎯 Marche à Suivre

1. **Générez le mot de passe d'application** dans votre compte Google
2. **Google affiche** : `abcd efgh ijkl mnop` (avec espaces)
3. **Dans votre .env, tapez** : `SMTP_PASSWORD="abcdefghijklmnop"` (SANS espaces)

## 🚨 Symptômes d'une Erreur de Format

Si votre mot de passe contient des espaces, vous verrez ces erreurs :
- `Authentication failed`
- `Invalid credentials`
- `SMTP authentication error`
- Emails 2FA non envoyés

## 💡 Astuce

Pour éviter l'erreur, quand vous copiez le mot de passe de Google :
1. Sélectionnez tout le mot de passe
2. Collez-le dans un éditeur de texte
3. **Supprimez manuellement les espaces**
4. Copiez la version sans espaces dans votre `.env`

---

*Cette clarification devrait résoudre 90% des problèmes de configuration SMTP !*