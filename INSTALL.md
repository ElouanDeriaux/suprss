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

**Cloner le projet :**
```bash
git clone https://github.com/ElouanDeriaux/suprss.git
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