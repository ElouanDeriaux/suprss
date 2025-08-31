@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo 🚀 Démarrage de SUPRSS...

REM Vérifier si Docker est disponible
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker n'est pas installé ou n'est pas dans le PATH
    pause
    exit /b 1
)

REM Vérifier si Docker Compose est disponible
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose n'est pas installé ou n'est pas dans le PATH
    pause
    exit /b 1
)

echo 🔍 Vérification des instances existantes...

REM Rechercher les conteneurs SUPRSS en cours
for /f %%i in ('docker ps -q --filter "name=suprss" 2^>nul') do set existing_containers=%%i

if defined existing_containers (
    echo ⚠️  Instances SUPRSS détectées en cours d'exécution:
    docker ps --filter "name=suprss" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo 🛑 Arrêt des instances existantes...
    docker-compose down
    
    REM Attendre que les conteneurs s'arrêtent complètement
    echo ⏳ Attente de l'arrêt complet...
    timeout /t 3 /nobreak >nul
    
    REM Vérifier qu'ils sont bien arrêtés
    for /f %%i in ('docker ps -q --filter "name=suprss" 2^>nul') do set still_running=%%i
    if defined still_running (
        echo ⚠️  Forçage de l'arrêt des conteneurs récalcitrants...
        docker stop !still_running!
        docker rm !still_running!
    )
)

REM Nettoyer les réseaux orphelins
echo 🧹 Nettoyage des réseaux orphelins...
docker network prune -f >nul 2>&1

REM Vérifier qu'aucun conteneur SUPRSS n'est en cours
for /f %%i in ('docker ps -q --filter "name=suprss" 2^>nul') do set final_check=%%i
if defined final_check (
    echo ❌ Impossible d'arrêter toutes les instances SUPRSS
    echo Conteneurs encore actifs:
    docker ps --filter "name=suprss"
    pause
    exit /b 1
)

echo ✅ Aucune instance en conflit détectée

REM Vérifier la configuration .env
echo 🔍 Vérification de la configuration...

REM Vérifier si .env existe
if not exist ".env" (
    if exist ".env.encrypted" (
        echo 🔐 Fichier .env chiffré détecté, déchiffrement nécessaire...
        
        REM Vérifier si Python est disponible
        python --version >nul 2>&1
        if errorlevel 1 (
            echo ❌ Python n'est pas installé ou n'est pas dans le PATH
            echo Python est requis pour déchiffrer le fichier .env
            pause
            exit /b 1
        )
        
        REM Vérifier si security_helper.py existe
        if not exist "security_helper.py" (
            echo ❌ security_helper.py introuvable
            echo Ce fichier est requis pour déchiffrer .env.encrypted
            pause
            exit /b 1
        )
        
        echo 🔑 Déchiffrement du fichier .env...
        echo Vous devez entrer votre mot de passe maître:
        python security_helper.py decrypt-env
        
        REM Vérifier si le déchiffrement a réussi
        if not exist ".env" (
            echo ❌ Échec du déchiffrement ou annulation par l'utilisateur
            echo Le fichier .env n'a pas été créé
            pause
            exit /b 1
        )
        
        echo ✅ Fichier .env déchiffré avec succès
    ) else (
        echo ❌ Aucun fichier de configuration trouvé
        echo Vous devez avoir soit un fichier .env soit un fichier .env.encrypted
        echo Consultez le guide d'installation: install.md
        pause
        exit /b 1
    )
) else (
    echo ✅ Fichier .env trouvé
)

REM Construire et lancer les nouveaux conteneurs
echo 🔨 Construction et lancement des conteneurs...
docker-compose up --build -d

REM Attendre que les services soient prêts
echo ⏳ Attente du démarrage des services...
timeout /t 10 /nobreak >nul

REM Vérifier que tout fonctionne
echo 🔍 Vérification de l'état des services...
docker-compose ps

REM Vérifier les services spécifiques
for /f %%i in ('docker-compose ps -q 2^>nul') do set services_status=%%i
if not defined services_status (
    echo ❌ Aucun service n'a démarré
    pause
    exit /b 1
)

REM Vérifier la santé des conteneurs
for /f %%i in ('docker ps --filter "name=suprss" --filter "health=unhealthy" -q 2^>nul') do set unhealthy=%%i
if defined unhealthy (
    echo ⚠️  Certains conteneurs sont en mauvaise santé:
    docker ps --filter "name=suprss" --filter "health=unhealthy"
)

REM Nettoyage sécurisé : supprimer le fichier .env déchiffré
if exist ".env" (
    if exist ".env.encrypted" (
        echo 🧹 Nettoyage sécurisé : suppression du fichier .env déchiffré...
        del ".env"
        if exist ".env" (
            echo ⚠️  Attention : Impossible de supprimer le fichier .env
            echo Pour des raisons de sécurité, supprimez-le manuellement après l'arrêt
        ) else (
            echo ✅ Fichier .env supprimé avec succès pour la sécurité
        )
    )
)

echo.
echo 🎉 SUPRSS démarré avec succès !
echo.
echo 📱 Services disponibles:
echo    - Frontend: http://localhost:3000
echo    - API Backend: http://localhost:8000
echo    - Base de données: localhost:5432
echo.
echo 📊 État des conteneurs:
docker ps --filter "name=suprss" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.
echo 📝 Pour voir les logs: docker-compose logs -f
echo 🛑 Pour arrêter: docker-compose down
echo.
pause