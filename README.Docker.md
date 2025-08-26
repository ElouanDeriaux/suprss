# 🐳 Déploiement Docker - SUPRSS

## Démarrage rapide

```bash
# Cloner le repository et naviguer dans le dossier
cd suprss

# Démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter les services
docker-compose down
```

## Services déployés

| Service  | Port | Description                |
|----------|------|----------------------------|
| Frontend | 3000 | Interface web (Nginx)      |
| Backend  | 8000 | API FastAPI                |
| Database | 5432 | PostgreSQL                 |

## URLs d'accès

- **Application web**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## Configuration

### Variables d'environnement

Copiez `.env.example` vers `.env` et modifiez selon vos besoins :

```bash
cp .env.example .env
```

### Données persistantes

Les données PostgreSQL sont stockées dans un volume Docker persistent `postgres_data`.

## Commandes utiles

```bash
# Reconstruire les images
docker-compose build

# Voir le statut des services
docker-compose ps

# Accéder aux logs d'un service spécifique
docker-compose logs backend
docker-compose logs frontend
docker-compose logs db

# Redémarrer un service
docker-compose restart backend

# Exécuter des commandes dans un conteneur
docker-compose exec backend bash
docker-compose exec db psql -U suprss_user -d suprss_db

# Nettoyer les volumes (⚠️ PERTE DE DONNÉES)
docker-compose down -v
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (Nginx)       │────│   (FastAPI)     │────│  (PostgreSQL)   │
│   Port: 3000    │    │   Port: 8000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Résolution de problèmes

### Le backend ne démarre pas
```bash
# Vérifier les logs
docker-compose logs backend

# Vérifier que PostgreSQL est démarré
docker-compose logs db
```

### Problèmes de permissions
```bash
# Recréer les volumes
docker-compose down -v
docker-compose up -d
```

### Réinitialiser complètement
```bash
docker-compose down -v
docker system prune -a
docker-compose up -d --build
```