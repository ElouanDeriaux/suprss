# 🚀 Installation Rapide - SUPRSS

## 📋 Ce dont vous avez besoin
1. **Docker Desktop** installé et démarré
   - [Windows](https://docs.docker.com/desktop/windows/install/)
   - [Mac](https://docs.docker.com/desktop/mac/install/)
   - [Linux](https://docs.docker.com/desktop/linux/install/)

## 📥 Télécharger SUPRSS

### Option 1: ZIP (Pas besoin de Git)
1. Aller sur : https://github.com/ElouanDeriaux/suprss
2. Cliquer sur **"Code"** (bouton vert)
3. Cliquer sur **"Download ZIP"**
4. Extraire le fichier
5. Renommer le dossier `suprss-main` en `suprss`

### Option 2: Avec Git

**Installation de Git (si nécessaire) :**

Sur **PowerShell Windows** :
```powershell
# Installer Git avec winget
winget install --id Git.Git -e --source winget
# Redémarrer PowerShell après installation
```

Sur **WSL/Linux** :
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install git
# CentOS/RHEL/Fedora
sudo yum install git    # ou sudo dnf install git
```

**Cloner le projet et déplacement dans le bon dossier :**
```bash
git clone https://github.com/ElouanDeriaux/suprss.git
cd suprss
```

## ⚙️ Configuration des emails 2FA (IMPORTANT)

⚠️ **OBLIGATOIRE pour la 2FA** : Pour que l'authentification 2 facteurs fonctionne, configurez un email dédié :

1. **Créer un email spécifique** pour votre application SUPRSS (ex: `suprss.monnom@gmail.com`)
2. **Activer la 2FA** sur ce compte Gmail
3. **Générer un mot de passe d'application** :
   - Aller dans Google Account → Sécurité → Vérification en 2 étapes
   - Cliquer "Mots de passe des applications"
   - Générer un mot de passe pour "Courrier"
4. **Configurer le fichier .env** :
   ```bash
   # Windows
   copy .env.example .env
   notepad .env
   
   # Linux/Mac
   cp .env.example .env
   nano .env
   ```
5. **Ajouter dans .env** :
   ```bash
   SECRET_KEY="votre-cle-generee"
   SMTP_SERVER="smtp.gmail.com"
   SMTP_PORT="587"
   SMTP_USERNAME="votre-email-suprss@gmail.com"
   SMTP_PASSWORD="xxxx yyyy zzzz wwww"  # Le mot de passe d'application 16 caractères
   ```

## ▶️ Lancer SUPRSS

1. **Ouvrir un terminal/invite de commande**
2. **Aller dans le dossier :**
   ```bash
   cd suprss
   ```

3. **Lancer l'application :**
   - **Windows** : Double-cliquer sur `start.bat`
   - **Mac/Linux** : `./start.sh`

4. **Attendre que ça démarre** (30 secondes environ)

5. **Ouvrir votre navigateur** et aller sur : http://localhost:3000

## ✅ C'est prêt !

Vous devriez voir la page de connexion SUPRSS.

## ❓ Problème ?

- **Docker pas démarré** : Ouvrez Docker Desktop
- **Port occupé** : Quelque chose utilise déjà le port 3000
- **Permission refusée** : Exécutez en tant qu'administrateur

## 🛑 Arrêter SUPRSS

```bash
docker-compose down
```

---
*Installation complète en moins de 5 minutes !*
