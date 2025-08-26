#!/bin/bash

# Script de démarrage sécurisé pour SUPRSS
# Nettoie les instances existantes avant de lancer les nouvelles

echo "🚀 Démarrage de SUPRSS..."

# Vérifier si Docker est disponible
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé ou n'est pas dans le PATH"
    exit 1
fi

# Vérifier si Docker Compose est disponible
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé ou n'est pas dans le PATH"
    exit 1
fi

echo "🔍 Vérification des instances existantes..."

# Rechercher les conteneurs SUPRSS en cours
existing_containers=$(docker ps -q --filter "name=suprss")

if [ ! -z "$existing_containers" ]; then
    echo "⚠️  Instances SUPRSS détectées en cours d'exécution:"
    docker ps --filter "name=suprss" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo "🛑 Arrêt des instances existantes..."
    docker-compose down
    
    # Attendre que les conteneurs s'arrêtent complètement
    echo "⏳ Attente de l'arrêt complet..."
    sleep 3
    
    # Vérifier qu'ils sont bien arrêtés
    still_running=$(docker ps -q --filter "name=suprss")
    if [ ! -z "$still_running" ]; then
        echo "⚠️  Forçage de l'arrêt des conteneurs récalcitrants..."
        docker stop $still_running
        docker rm $still_running
    fi
fi

# Nettoyer les réseaux orphelins
echo "🧹 Nettoyage des réseaux orphelins..."
docker network prune -f > /dev/null 2>&1

# Vérifier qu'aucun conteneur SUPRSS n'est en cours
final_check=$(docker ps -q --filter "name=suprss")
if [ ! -z "$final_check" ]; then
    echo "❌ Impossible d'arrêter toutes les instances SUPRSS"
    echo "Conteneurs encore actifs:"
    docker ps --filter "name=suprss"
    exit 1
fi

echo "✅ Aucune instance en conflit détectée"

# Construire et lancer les nouveaux conteneurs
echo "🔨 Construction et lancement des conteneurs..."
docker-compose up --build -d

# Attendre que les services soient prêts
echo "⏳ Attente du démarrage des services..."
sleep 10

# Vérifier que tout fonctionne
echo "🔍 Vérification de l'état des services..."
docker-compose ps

# Vérifier les services spécifiques
services_status=$(docker-compose ps -q)
if [ -z "$services_status" ]; then
    echo "❌ Aucun service n'a démarré"
    exit 1
fi

# Vérifier la santé des conteneurs
unhealthy=$(docker ps --filter "name=suprss" --filter "health=unhealthy" -q)
if [ ! -z "$unhealthy" ]; then
    echo "⚠️  Certains conteneurs sont en mauvaise santé:"
    docker ps --filter "name=suprss" --filter "health=unhealthy"
fi

echo ""
echo "🎉 SUPRSS démarré avec succès !"
echo ""
echo "📱 Services disponibles:"
echo "   - Frontend: http://localhost:3000"
echo "   - API Backend: http://localhost:8000"
echo "   - Base de données: localhost:5432"
echo ""
echo "📊 État des conteneurs:"
docker ps --filter "name=suprss" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "📝 Pour voir les logs: docker-compose logs -f"
echo "🛑 Pour arrêter: docker-compose down"