# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SUPRSS is a self-hosted RSS feed reader application with a FastAPI backend and simple HTML/JS frontend. The application allows users to create collections, add RSS feeds, read articles, and manage their reading status with features like starring and archiving.

## Architecture

### Backend (Python/FastAPI)
- **main.py**: Central FastAPI application with all API endpoints, authentication, and business logic
- **models.py**: SQLModel database models for users, collections, feeds, articles, and related entities
- **database.py**: SQLite database configuration and table creation
- **auth.py**: JWT authentication logic and user authentication utilities
- **oauth.py**: OAuth configuration for Google and GitHub authentication
- **utils.py**: Password hashing utilities using bcrypt
- **rss.py**: RSS feed parsing functionality (appears unused/legacy)

### Frontend (Vanilla HTML/JS)
Located in `simple-frontend/` directory:
- **dashboard.html/js**: Main application interface for managing collections and feeds
- **flux.html/js**: Feed viewing and article management
- **article.html/js**: Individual article reading interface
- **archive.html/js**: Archived articles management
- **index.html/js**: Login/authentication page
- **register.html/js**: User registration

### Database Schema
- **Users**: Basic user accounts with email/password or OAuth
- **Collections**: Organizational containers for feeds, with sharing capabilities
- **Feeds**: RSS feed URLs with metadata
- **Articles**: Parsed RSS articles with content and metadata
- **ArticleReadFlag**: Tracks read status per user/article
- **ArticleStar**: Tracks starred articles per user
- **ArticleArchive**: Permanent copies of articles with cleaned HTML
- **CollectionMember**: Manages collection sharing and permissions

## Quick Start

### Automated Scripts (Recommended)
```bash
# Start SUPRSS with automatic cleanup of existing instances
./start.sh        # Linux/Mac
start.bat         # Windows

# Stop SUPRSS cleanly
./stop.sh         # Linux/Mac
# (Windows: just close the terminal or use Ctrl+C in docker-compose)
```

The start scripts automatically:
- Check for existing SUPRSS instances
- Stop and remove conflicting containers
- Clean up orphaned networks
- Build and start fresh containers
- Verify service health
- Display status and access URLs

## Development Commands

### Backend
```bash
# Install Python dependencies (no requirements.txt - dependencies managed manually)
pip install fastapi sqlmodel uvicorn bcrypt python-jose feedparser requests apscheduler bleach python-dotenv authlib

# Run development server
uvicorn main:app --reload --port 8000

# Database setup (automatic on startup)
# SQLite database created as suprss.db
```

### Frontend
```bash
# Install Tailwind CSS dependencies
npm install

# Build CSS (if using Tailwind)
npx tailwindcss -i input.css -o output.css --watch

# Serve frontend (use any HTTP server)
# Frontend expects backend on localhost:8000
cd simple-frontend
python -m http.server 5500
```

### Docker
```bash
# Start PostgreSQL database (optional, currently using SQLite)
docker-compose up -d
```

## Key Features

### Authentication
- Email/password registration and login with strong password requirements
- JWT token-based authentication
- OAuth integration with Google and GitHub
- Session middleware for OAuth flows

### RSS Management
- Feed parsing with feedparser library
- ETag/If-Modified-Since caching for efficient updates
- Background scheduler for automatic feed refreshes every 10 minutes
- Duplicate detection for articles

### Content Processing
- HTML sanitization with bleach library
- Reader view with content extraction using python-readability
- Article archiving with permanent HTML snapshots

### User Features
- Collection-based organization with sharing capabilities
- Read/unread status tracking
- Article starring/favoriting
- Full-text search across articles
- Archive management for permanent article storage

## Security Considerations

- All HTML content is sanitized using bleach before storage/display
- Strong password requirements enforced with regex validation
- JWT tokens with configurable expiration
- CORS properly configured for development
- OAuth flows use secure redirect URIs

## Environment Configuration

Required environment variables (create .env file):
```
SECRET_KEY=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## Database Management

- SQLite database (suprss.db) created automatically
- All models use SQLModel for type safety
- Database schema managed through SQLModel.metadata.create_all()
- No migrations system - schema changes require manual handling

## API Structure

All endpoints are defined in main.py with clear separation:
- `/users/`, `/token` - Authentication
- `/collections/` - Collection management and sharing
- `/feeds/` - Feed CRUD and refresh operations
- `/articles/` - Article listing, reading, and management
- `/stars`, `/archive` - Special article collections
- `/auth/google/`, `/auth/github/` - OAuth flows

## Frontend Architecture

Simple vanilla JavaScript with no frameworks:
- Each page has corresponding HTML and JS files
- Uses fetch() for API communication
- JWT token stored in localStorage
- Tailwind CSS for styling
- Simple routing via separate HTML pages