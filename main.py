import os
import re
import secrets
from typing import List, Optional, Dict, Any

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, status, Form, Request, Query, UploadFile, File
from fastapi.responses import RedirectResponse, JSONResponse, Response
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from pydantic import BaseModel
from sqlmodel import Session, select, func, delete

# Import des services 2FA
from email_service import generate_verification_code, send_verification_email, get_code_expiry

from database import create_db_and_tables, engine
from models import (
    User, UserCreate,
    EmailVerificationCode,
    Collection, CollectionCreate,
    Feed, FeedCreate,
    CollectionMember,
    Article, ArticleCreate,
    ArticleOut,
    ArticleReadFlag,
    ArticleStar,
    ArticleArchive, ArchiveOut,
    CollectionMessage, MessageCreate, MessageOut, MessageReadFlag,
)
from utils import hash_password, verify_password
from auth import create_access_token, get_current_user
from oauth import oauth

import feedparser
import requests
from apscheduler.schedulers.background import BackgroundScheduler
import bleach
from sqlalchemy import or_, and_, func

load_dotenv()

app = FastAPI(title="SUPRSS API")

# Configuration middleware session déplacée plus bas avec CORS

# --- Endpoint de santé pour Docker ---
@app.get("/health")
def health_check():
    """Endpoint de santé pour les vérifications Docker"""
    from database import get_database_url
    try:
        # Test simple de connexion à la BDD
        with Session(engine) as session:
            session.exec(select(1))
        return {
            "status": "healthy",
            "database": "connected",
            "database_url": get_database_url().split("@")[-1] if "@" in get_database_url() else "sqlite"
        }
    except Exception as e:
        return {
            "status": "unhealthy", 
            "database": "disconnected",
            "error": str(e)
        }

# --- CORS ---
# Configuration CORS pour Docker et développement
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5500").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|frontend)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Sessions (OAuth Google/GitHub) ---
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SECRET_KEY", "dev-secret"),
    same_site="lax",
    https_only=False,
)

# ========= Helpers sécurité =========
PWD_REGEX = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$")

# ========= Modèles 2FA =========
class VerificationRequest(BaseModel):
    email: str
    code: str
    temp_token: Optional[str] = None

class TempTokenResponse(BaseModel):
    temp_token: str
    message: str
    expires_in: int  # en secondes

# ========= Modèles paramètres utilisateur =========
class UserSettings(BaseModel):
    is_2fa_enabled: bool

class UserInfo(BaseModel):
    id: int
    username: str
    email: str
    is_email_verified: bool
    is_2fa_enabled: bool
    theme_preference: str

class UsernameUpdate(BaseModel):
    new_username: str

class ThemePreference(BaseModel):
    theme: str  # "auto", "light", ou "dark"

def require_strong_password(pwd: str):
    if not PWD_REGEX.match(pwd or ""):
        raise HTTPException(
            status_code=400,
            detail={
                "code": "WEAK_PASSWORD",
                "message": "Mot de passe trop faible.",
                "requirements": "Min 8 caractères, au moins 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial."
            }
        )

# ========= Readability + sanitize =========
ALLOWED_TAGS = bleach.sanitizer.ALLOWED_TAGS | {"p", "img", "figure", "figcaption", "h1", "h2", "h3", "pre", "code", "blockquote"}
ALLOWED_ATTRS = {**bleach.sanitizer.ALLOWED_ATTRIBUTES, "img": ["src", "alt", "title", "width", "height"]}

def fetch_clean_html(url: str) -> str:
    try:
        r = requests.get(url, timeout=12, headers={"User-Agent": "SUPRSS/1.0"})
        r.raise_for_status()
        
        # Tentative d'extraction avec readability
        try:
            from readability import Document
            html = Document(r.text).summary(html_partial=True)
        except ImportError:
            # Si readability n'est pas installé, utiliser le contenu brut
            html = r.text
        except Exception as e:
            # Si readability échoue, utiliser le contenu brut
            print(f"Readability extraction failed for {url}: {e}")
            html = r.text
        
        # Nettoyage HTML avec bleach
        clean_html = bleach.clean(html, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRS, strip=True)
        
        # Vérifier que le contenu nettoyé n'est pas vide
        if not clean_html.strip():
            return "<p>Contenu extrait mais vide après nettoyage.</p>"
            
        return clean_html
        
    except requests.exceptions.Timeout:
        return "<p>Impossible d'extraire le contenu : délai d'attente dépassé.</p>"
    except requests.exceptions.RequestException as e:
        return f"<p>Impossible d'extraire le contenu : erreur de requête ({str(e)}).</p>"
    except Exception as e:
        return f"<p>Impossible d'extraire un contenu lisible pour cet article : {str(e)}</p>"

# ========= Dédoublonnage léger =========
def looks_duplicate(session: Session, feed_id: int, link: str, title: str) -> bool:
    existing = session.exec(
        select(Article).where(Article.feed_id == feed_id, Article.link == (link or ""))
    ).first()
    if existing:
        return True
    if title:
        existing_title = session.exec(
            select(Article).where(Article.feed_id == feed_id, Article.title == title[:255])
        ).first()
        if existing_title:
            return True
    return False

# ========= App state & scheduler =========
app.state.feed_cache: Dict[int, Dict[str, Any]] = {}
scheduler: Optional[BackgroundScheduler] = None

@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    global scheduler
    scheduler = BackgroundScheduler()
    scheduler.add_job(refresh_all_feeds_job, "interval", minutes=10, max_instances=1)
    scheduler.start()

@app.on_event("shutdown")
def on_shutdown():
    global scheduler
    if scheduler:
        scheduler.shutdown(wait=False)

@app.get("/")
def read_root():
    return {"message": "Bienvenue sur SUPRSS"}

# ========= AUTH =========
class PasswordUpdate(BaseModel):
    new_password: str

@app.post("/users/")
def create_user(user: UserCreate):
    email_norm = user.email.strip().lower()
    require_strong_password(user.password)
    with Session(engine) as session:
        exists = session.exec(select(User).where(User.email == email_norm)).first()
        if exists:
            raise HTTPException(status_code=400, detail={"code": "EMAIL_TAKEN", "message": "Email déjà utilisé"})
        new_user = User(username=user.username.strip(), email=email_norm, password=hash_password(user.password))
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        return {"id": new_user.id, "username": new_user.username, "email": new_user.email}

@app.post("/token")
def login_token(form_data: OAuth2PasswordRequestForm = Depends()):
    email = form_data.username.strip().lower()
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email)).first()
        if not user or not verify_password(form_data.password, user.password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail={"code": "INVALID_CREDENTIALS", "message": "Email ou mot de passe invalide"})
        
        # Si 2FA activée, envoyer code au lieu du token
        if user.is_2fa_enabled:
            code = generate_verification_code()
            
            if not send_verification_email(email, code, "login"):
                raise HTTPException(status_code=500, detail="Erreur envoi email")
            
            if not store_verification_code(session, email, code, "login"):
                raise HTTPException(status_code=500, detail="Erreur stockage code")
            
            temp_token = create_temp_token(email)
            
            return {
                "requires_2fa": True,
                "temp_token": temp_token,
                "message": "Code de vérification envoyé par email",
                "expires_in": 600
            }
        
        # Si pas de 2FA, connexion directe
        token = create_access_token({"sub": user.email})
        return {"access_token": token, "token_type": "bearer"}

@app.get("/me", response_model=UserInfo)
def read_my_profile(current_user: User = Depends(get_current_user)):
    return UserInfo(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        is_email_verified=current_user.is_email_verified,
        is_2fa_enabled=current_user.is_2fa_enabled,
        theme_preference=current_user.theme_preference
    )

@app.post("/change-password")
def change_password(data: PasswordUpdate, current_user: User = Depends(get_current_user)):
    require_strong_password(data.new_password)
    with Session(engine) as session:
        user = session.get(User, current_user.id)
        user.password = hash_password(data.new_password)
        session.add(user)
        session.commit()
    return {"message": "Mot de passe mis à jour"}

@app.post("/settings/2fa/enable")
def enable_2fa(current_user: User = Depends(get_current_user)):
    """Active la 2FA pour l'utilisateur actuel après vérification email"""
    with Session(engine) as session:
        user = session.get(User, current_user.id)
        if user.is_2fa_enabled:
            raise HTTPException(status_code=400, detail="2FA déjà activée")
        
        # Générer et envoyer un code de vérification
        code = generate_verification_code()
        if not send_verification_email(user.email, code, "enable_2fa"):
            raise HTTPException(status_code=500, detail="Erreur envoi email")
        
        if not store_verification_code(session, user.email, code, "enable_2fa"):
            raise HTTPException(status_code=500, detail="Erreur stockage code")
        
        return {"message": "Code de vérification envoyé par email pour activer la 2FA"}

@app.post("/settings/2fa/confirm-enable")
def confirm_enable_2fa(verification: VerificationRequest, current_user: User = Depends(get_current_user)):
    """Confirme l'activation de la 2FA avec le code reçu"""
    with Session(engine) as session:
        if not verify_code(session, current_user.email, verification.code, "enable_2fa"):
            raise HTTPException(status_code=400, detail="Code invalide ou expiré")
        
        # Activer la 2FA
        user = session.get(User, current_user.id)
        user.is_2fa_enabled = True
        user.is_email_verified = True  # Email vérifié par la même occasion
        session.add(user)
        session.commit()
        
        return {"message": "2FA activée avec succès"}

@app.post("/settings/2fa/disable")
def disable_2fa(current_user: User = Depends(get_current_user)):
    """Désactive la 2FA pour l'utilisateur actuel après vérification mot de passe"""
    with Session(engine) as session:
        user = session.get(User, current_user.id)
        if not user.is_2fa_enabled:
            raise HTTPException(status_code=400, detail="2FA déjà désactivée")
        
        # Générer et envoyer un code de vérification
        code = generate_verification_code()
        if not send_verification_email(user.email, code, "disable_2fa"):
            raise HTTPException(status_code=500, detail="Erreur envoi email")
        
        if not store_verification_code(session, user.email, code, "disable_2fa"):
            raise HTTPException(status_code=500, detail="Erreur stockage code")
        
        return {"message": "Code de vérification envoyé par email pour désactiver la 2FA"}

@app.post("/settings/2fa/confirm-disable")
def confirm_disable_2fa(verification: VerificationRequest, current_user: User = Depends(get_current_user)):
    """Confirme la désactivation de la 2FA avec le code reçu"""
    with Session(engine) as session:
        if not verify_code(session, current_user.email, verification.code, "disable_2fa"):
            raise HTTPException(status_code=400, detail="Code invalide ou expiré")
        
        # Désactiver la 2FA
        user = session.get(User, current_user.id)
        user.is_2fa_enabled = False
        session.add(user)
        session.commit()
        
        return {"message": "2FA désactivée avec succès"}

@app.post("/settings/username")
def update_username(data: UsernameUpdate, current_user: User = Depends(get_current_user)):
    """Met à jour le nom d'utilisateur"""
    new_username = data.new_username.strip()
    
    if not new_username or len(new_username) < 2:
        raise HTTPException(status_code=400, detail="Le nom d'utilisateur doit contenir au moins 2 caractères")
    
    if len(new_username) > 50:
        raise HTTPException(status_code=400, detail="Le nom d'utilisateur ne peut pas dépasser 50 caractères")
    
    with Session(engine) as session:
        # Vérifier si le nom d'utilisateur est déjà pris
        existing_user = session.exec(select(User).where(User.username == new_username, User.id != current_user.id)).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est déjà utilisé")
        
        # Mettre à jour le nom d'utilisateur
        user = session.get(User, current_user.id)
        user.username = new_username
        session.add(user)
        session.commit()
        
        return {"message": "Nom d'utilisateur mis à jour avec succès"}

@app.post("/settings/theme")
def update_theme_preference(data: ThemePreference, current_user: User = Depends(get_current_user)):
    """Met à jour la préférence de thème de l'utilisateur"""
    valid_themes = ["auto", "light", "dark"]
    
    if data.theme not in valid_themes:
        raise HTTPException(status_code=400, detail=f"Thème invalide. Valeurs acceptées: {', '.join(valid_themes)}")
    
    with Session(engine) as session:
        user = session.get(User, current_user.id)
        user.theme_preference = data.theme
        session.add(user)
        session.commit()
        
        return {"message": "Préférence de thème mise à jour avec succès", "theme": data.theme}

# ========= COLLECTIONS =========
@app.post("/collections/")
def create_collection(collection: CollectionCreate, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        # Vérifier si une collection avec ce nom existe déjà pour cet utilisateur
        existing = session.exec(
            select(Collection).where(
                Collection.user_id == current_user.id,
                Collection.name == collection.name.strip()
            )
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400, 
                detail=f"Une collection nommée '{collection.name}' existe déjà"
            )
        
        new_collection = Collection(name=collection.name.strip(), user_id=current_user.id)
        session.add(new_collection)
        session.commit()
        session.refresh(new_collection)
        return new_collection

@app.get("/collections/")
def read_collections(current_user: User = Depends(get_current_user)):
    """Retourne toutes les collections (pour compatibilité avec ancien code)"""
    with Session(engine) as session:
        owned = session.exec(select(Collection).where(Collection.user_id == current_user.id)).all()
        shared = session.exec(
            select(Collection).join(CollectionMember).where(CollectionMember.user_id == current_user.id)
        ).all()
        return owned + shared

@app.get("/collections/owned")
def read_owned_collections(current_user: User = Depends(get_current_user)):
    """Retourne uniquement les collections que l'utilisateur possède"""
    with Session(engine) as session:
        owned = session.exec(select(Collection).where(Collection.user_id == current_user.id)).all()
        return owned

@app.get("/collections/shared")
def read_shared_collections(current_user: User = Depends(get_current_user)):
    """Retourne uniquement les collections partagées avec l'utilisateur"""
    with Session(engine) as session:
        shared = session.exec(
            select(Collection).join(CollectionMember).where(CollectionMember.user_id == current_user.id)
        ).all()
        return shared

@app.post("/collections/{collection_id}/share")
def share_collection(
    collection_id: int,
    email: str = Form(...),
    role: str = Form("viewer"),
    current_user: User = Depends(get_current_user),
):
    with Session(engine) as session:
        collection = session.get(Collection, collection_id)
        if not collection or collection.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Accès interdit")

        target = session.exec(select(User).where(User.email == email.strip().lower())).first()
        if not target:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")

        existing = session.exec(
            select(CollectionMember).where(
                CollectionMember.collection_id == collection_id,
                CollectionMember.user_id == target.id,
            )
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Déjà membre")

        member = CollectionMember(collection_id=collection_id, user_id=target.id, role=role)
        session.add(member)
        session.commit()
        return {"message": f"Collection partagée avec {email} en tant que {role}"}

@app.delete("/collections/{collection_id}")
def delete_collection(collection_id: int, current_user: User = Depends(get_current_user)):
    """Supprime une collection (seul le propriétaire peut supprimer)"""
    with Session(engine) as session:
        collection = session.get(Collection, collection_id)
        if not collection:
            raise HTTPException(status_code=404, detail="Collection introuvable")
        
        # Seul le propriétaire peut supprimer sa collection
        if collection.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Seul le propriétaire peut supprimer cette collection")
        
        # Récupérer tous les feeds de la collection pour avoir leurs IDs
        feeds = session.exec(select(Feed).where(Feed.collection_id == collection_id)).all()
        feed_ids = [feed.id for feed in feeds]
        
        # Récupérer tous les articles des feeds pour avoir leurs IDs
        article_ids = []
        if feed_ids:
            articles = session.exec(select(Article).where(Article.feed_id.in_(feed_ids))).all()
            article_ids = [article.id for article in articles]
        
        # Supprimer en lot tous les flags et étoiles des articles
        if article_ids:
            session.exec(delete(ArticleReadFlag).where(ArticleReadFlag.article_id.in_(article_ids)))
            session.exec(delete(ArticleStar).where(ArticleStar.article_id.in_(article_ids)))
            session.exec(delete(ArticleArchive).where(ArticleArchive.article_id.in_(article_ids)))
        
        # Supprimer tous les articles des feeds
        if feed_ids:
            session.exec(delete(Article).where(Article.feed_id.in_(feed_ids)))
        
        # Supprimer tous les feeds de la collection
        session.exec(delete(Feed).where(Feed.collection_id == collection_id))
        
        # Récupérer les messages de la collection pour avoir leurs IDs
        messages = session.exec(select(CollectionMessage).where(CollectionMessage.collection_id == collection_id)).all()
        message_ids = [message.id for message in messages]
        
        # Supprimer les flags de lecture des messages
        if message_ids:
            session.exec(delete(MessageReadFlag).where(MessageReadFlag.message_id.in_(message_ids)))
        
        # Supprimer tous les messages de la collection
        session.exec(delete(CollectionMessage).where(CollectionMessage.collection_id == collection_id))
        
        # Supprimer tous les membres de la collection
        session.exec(delete(CollectionMember).where(CollectionMember.collection_id == collection_id))
        
        # Supprimer la collection
        session.delete(collection)
        session.commit()
        
        return {"ok": True, "message": "Collection supprimée avec succès"}

# ========= FEEDS =========
@app.post("/feeds/")
def create_feed(feed: FeedCreate, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        collection = session.get(Collection, feed.collection_id)
        
        # Vérifier si l'utilisateur a les permissions pour ajouter des flux
        # Propriétaire : toujours autorisé
        # Admin ou Editor : autorisés
        is_authorized = collection.user_id == current_user.id
        
        if not is_authorized:
            member = session.exec(
                select(CollectionMember).where(
                    CollectionMember.collection_id == feed.collection_id,
                    CollectionMember.user_id == current_user.id,
                    CollectionMember.role.in_(["admin", "editor"])
                )
            ).first()
            is_authorized = member is not None

        if not collection or not is_authorized:
            raise HTTPException(status_code=403, detail="Accès interdit : seuls les propriétaires, administrateurs et éditeurs peuvent ajouter des flux")

        new_feed = Feed(
            url=feed.url,
            title=feed.title,
            description=feed.description,
            collection_id=feed.collection_id,
        )
        session.add(new_feed)
        session.commit()
        session.refresh(new_feed)
        return new_feed

@app.get("/feeds/")
def get_feeds(collection_id: int, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        collection = session.get(Collection, collection_id)
        is_member = session.exec(
            select(CollectionMember).where(
                CollectionMember.collection_id == collection_id,
                CollectionMember.user_id == current_user.id,
            )
        ).first()
        if not collection or (collection.user_id != current_user.id and not is_member):
            raise HTTPException(status_code=403, detail="Accès interdit")

        return session.exec(select(Feed).where(Feed.collection_id == collection_id)).all()

@app.get("/feeds/summary")
def feeds_summary(collection_id: int, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        collection = session.get(Collection, collection_id)
        is_member = session.exec(
            select(CollectionMember).where(
                CollectionMember.collection_id == collection_id,
                CollectionMember.user_id == current_user.id,
            )
        ).first()
        if not collection or (collection.user_id != current_user.id and not is_member):
            raise HTTPException(status_code=403, detail="Accès interdit")

        feeds = session.exec(select(Feed).where(Feed.collection_id == collection_id)).all()
        result = []
        for f in feeds:
            article_ids: list[int] = session.exec(
                select(Article.id).where(Article.feed_id == f.id)
            ).all()
            if not article_ids:
                unread = 0
            else:
                read_ids = set(
                    session.exec(
                        select(ArticleReadFlag.article_id).where(
                            ArticleReadFlag.user_id == current_user.id,
                            ArticleReadFlag.article_id.in_(article_ids),
                        )
                    ).all()
                )
                unread = len(article_ids) - len(read_ids)
            result.append({
                "id": f.id,
                "title": f.title,
                "description": f.description,
                "url": f.url,
                "unread": unread
            })
        return result

@app.get("/feeds/{feed_id}")
def get_feed(feed_id: int, current_user: User = Depends(get_current_user)):
    """Récupère les informations d'un feed"""
    with Session(engine) as session:
        feed = session.get(Feed, feed_id)
        if not feed:
            raise HTTPException(status_code=404, detail="Flux introuvable")

        collection = feed.collection
        is_member = session.exec(
            select(CollectionMember).where(
                CollectionMember.collection_id == collection.id,
                CollectionMember.user_id == current_user.id,
            )
        ).first()
        if collection.user_id != current_user.id and not is_member:
            raise HTTPException(status_code=403, detail="Non autorisé")

        return {
            "id": feed.id,
            "title": feed.title,
            "url": feed.url,
            "description": feed.description,
            "collection_id": feed.collection_id
        }

@app.post("/feeds/{feed_id}/refresh")
def refresh_feed(feed_id: int, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        feed = session.get(Feed, feed_id)
        if not feed:
            raise HTTPException(status_code=404, detail="Flux introuvable")

        collection = feed.collection
        is_member = session.exec(
            select(CollectionMember).where(
                CollectionMember.collection_id == collection.id,
                CollectionMember.user_id == current_user.id,
            )
        ).first()
        if collection.user_id != current_user.id and not is_member:
            raise HTTPException(status_code=403, detail="Non autorisé")

        # ETag/Modified en mémoire
        headers = {}
        cache = app.state.feed_cache.get(feed_id, {})
        if cache.get("etag"):
            headers["If-None-Match"] = cache["etag"]
        if cache.get("modified"):
            headers["If-Modified-Since"] = cache["modified"]

        parsed = feedparser.parse(feed.url, request_headers=headers)

        if parsed.get("etag"):
            cache["etag"] = parsed.etag
        if parsed.get("modified"):
            try:
                import email.utils as eut
                cache["modified"] = eut.formatdate(feedparser.mktime_tz(parsed.modified))
            except Exception:
                pass
        app.state.feed_cache[feed_id] = cache

        if getattr(parsed, "status", None) == 304:
            return {"inserted": 0}

        created = 0
        for e in parsed.entries:
            link = getattr(e, "link", "") or ""
            title = getattr(e, "title", "") or "(sans titre)"
            summary = getattr(e, "summary", None) or getattr(e, "description", "") or ""
            if looks_duplicate(session, feed_id, link, title):
                continue
            a = Article(title=title[:255], content=summary, link=link, feed_id=feed_id)
            session.add(a)
            created += 1

        session.commit()
        return {"inserted": created}

@app.post("/collections/{collection_id}/refresh-all")
def refresh_all(collection_id: int, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        collection = session.get(Collection, collection_id)
        if not collection:
            raise HTTPException(status_code=404, detail="Collection introuvable")

        is_member = session.exec(
            select(CollectionMember).where(
                CollectionMember.collection_id == collection_id,
                CollectionMember.user_id == current_user.id,
            )
        ).first()
        if collection.user_id != current_user.id and not is_member:
            raise HTTPException(status_code=403, detail="Non autorisé")

        feeds = session.exec(select(Feed).where(Feed.collection_id == collection_id)).all()
        total_inserted = 0
        for f in feeds:
            parsed = feedparser.parse(f.url)
            for e in parsed.entries:
                link = getattr(e, "link", "") or ""
                title = getattr(e, "title", "") or "(sans titre)"
                summary = getattr(e, "summary", None) or getattr(e, "description", "") or ""

                exists = session.exec(
                    select(Article).where(Article.feed_id == f.id, Article.link == link)
                ).first()
                if exists:
                    continue

                a = Article(title=title[:255], content=summary, link=link, feed_id=f.id)
                session.add(a)
                total_inserted += 1

        session.commit()
        return {"inserted": total_inserted}

@app.delete("/feeds/{feed_id}")
def delete_feed(feed_id: int, current_user: User = Depends(get_current_user)):
    """Supprime un flux (seul le propriétaire de la collection ou admin/editor peut supprimer)"""
    with Session(engine) as session:
        feed = session.get(Feed, feed_id)
        if not feed:
            raise HTTPException(status_code=404, detail="Flux introuvable")
        
        collection = session.get(Collection, feed.collection_id)
        if not collection:
            raise HTTPException(status_code=404, detail="Collection introuvable")
        
        # Vérifier les permissions
        is_owner = collection.user_id == current_user.id
        is_member = session.exec(
            select(CollectionMember).where(
                CollectionMember.collection_id == collection.id,
                CollectionMember.user_id == current_user.id
            )
        ).first()
        
        has_permission = is_owner
        if is_member and is_member.role in ["admin", "editor"]:
            has_permission = True
        
        if not has_permission:
            raise HTTPException(status_code=403, detail="Permissions insuffisantes pour supprimer ce flux")
        
        # Supprimer tous les articles du flux EN LOT (optimisé)
        article_ids = session.exec(select(Article.id).where(Article.feed_id == feed_id)).all()
        
        if article_ids:
            article_ids = list(article_ids)
            
            # Supprimer les messages liés aux articles
            message_ids = session.exec(
                select(CollectionMessage.id).where(CollectionMessage.article_id.in_(article_ids))
            ).all()
            
            if message_ids:
                message_ids = list(message_ids)
                session.exec(delete(MessageReadFlag).where(MessageReadFlag.message_id.in_(message_ids)))
                session.exec(delete(CollectionMessage).where(CollectionMessage.id.in_(message_ids)))
            
            # Supprimer les flags et étoiles des articles en lot
            session.exec(delete(ArticleReadFlag).where(ArticleReadFlag.article_id.in_(article_ids)))
            session.exec(delete(ArticleStar).where(ArticleStar.article_id.in_(article_ids)))
            session.exec(delete(ArticleArchive).where(ArticleArchive.article_id.in_(article_ids)))
            
            # Supprimer les articles en lot
            session.exec(delete(Article).where(Article.id.in_(article_ids)))
        
        # Supprimer le flux
        session.delete(feed)
        session.commit()
        
        return {"ok": True, "message": "Flux supprimé avec succès"}

# ========= ARTICLES =========
@app.get("/articles/", response_model=List[ArticleOut])
def list_articles(
    feed_id: int,
    q: Optional[str] = Query(None, description="Recherche plein texte (titre + contenu)"),
    read: Optional[str] = Query(None, regex="^(true|false)$", description="Filtre lu/non-lu"),
    starred: Optional[str] = Query(None, regex="^(true|false)$", description="Filtre favoris"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user)
):
    with Session(engine) as session:
        feed = session.get(Feed, feed_id)
        if not feed:
            raise HTTPException(status_code=404, detail="Flux introuvable")

        collection = feed.collection
        is_member = session.exec(
            select(CollectionMember).where(
                CollectionMember.collection_id == collection.id,
                CollectionMember.user_id == current_user.id,
            )
        ).first()
        if collection.user_id != current_user.id and not is_member:
            raise HTTPException(status_code=403, detail="Non autorisé")

        stmt = select(Article).where(Article.feed_id == feed_id).order_by(Article.id.desc())
        if q:
            like = f"%{q.strip()}%"
            stmt = stmt.where(or_(Article.title.ilike(like), Article.content.ilike(like)))

        stmt = stmt.offset(offset).limit(limit)
        articles = session.exec(stmt).all()

        ids = [a.id for a in articles]
        if not ids:
            return []

        read_ids = set(
            session.exec(
                select(ArticleReadFlag.article_id).where(
                    ArticleReadFlag.user_id == current_user.id,
                    ArticleReadFlag.article_id.in_(ids),
                )
            ).all()
        )
        star_ids = set(
            session.exec(
                select(ArticleStar.article_id).where(
                    ArticleStar.user_id == current_user.id,
                    ArticleStar.article_id.in_(ids),
                )
            ).all()
        )

        out = []
        for a in articles:
            is_read = (a.id in read_ids)
            is_star = (a.id in star_ids)
            if read == "true" and not is_read:
                continue
            if read == "false" and is_read:
                continue
            if starred == "true" and not is_star:
                continue
            if starred == "false" and is_star:
                continue
            out.append(ArticleOut(
                id=a.id, title=a.title, content=a.content, link=a.link, feed_id=a.feed_id,
                read=is_read, starred=is_star
            ))
        return out

@app.get("/articles/{article_id}", response_model=ArticleOut)
def get_article(article_id: int, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        a = session.get(Article, article_id)
        if not a:
            raise HTTPException(status_code=404, detail="Article introuvable")

        feed = session.get(Feed, a.feed_id)
        collection = feed.collection
        is_member = session.exec(
            select(CollectionMember).where(
                CollectionMember.collection_id == collection.id,
                CollectionMember.user_id == current_user.id,
            )
        ).first()
        if collection.user_id != current_user.id and not is_member:
            raise HTTPException(status_code=403, detail="Non autorisé")

        was_read = session.exec(
            select(ArticleReadFlag).where(
                ArticleReadFlag.user_id == current_user.id,
                ArticleReadFlag.article_id == article_id,
            )
        ).first() is not None

        is_star = session.exec(
            select(ArticleStar).where(
                ArticleStar.user_id == current_user.id,
                ArticleStar.article_id == article_id
            )
        ).first() is not None

        return ArticleOut(
            id=a.id, title=a.title, content=a.content, link=a.link, feed_id=a.feed_id,
            read=was_read, starred=is_star
        )

# Reader view (HTML nettoyé)
@app.get("/articles/{article_id}/reader")
def reader_view(article_id: int, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        a = session.get(Article, article_id)
        if not a:
            raise HTTPException(status_code=404, detail="Article introuvable")
        feed = session.get(Feed, a.feed_id)
        collection = feed.collection
        is_member = session.exec(
            select(CollectionMember).where(
                CollectionMember.collection_id == collection.id,
                CollectionMember.user_id == current_user.id,
            )
        ).first()
        if collection.user_id != current_user.id and not is_member:
            raise HTTPException(status_code=403, detail="Non autorisé")

        if not a.link:
            return JSONResponse({"html": "<p>Aucun lien source.</p>"})
        clean_html = fetch_clean_html(a.link)
        return JSONResponse({"html": clean_html})

# ---- Lu / Non lu ----
@app.post("/articles/{article_id}/read")
def mark_read(article_id: int, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        exists = session.exec(
            select(ArticleReadFlag).where(
                ArticleReadFlag.user_id == current_user.id,
                ArticleReadFlag.article_id == article_id,
            )
        ).first()
        if exists:
            return {"ok": True}
        session.add(ArticleReadFlag(user_id=current_user.id, article_id=article_id))
        session.commit()
        return {"ok": True}

@app.delete("/articles/{article_id}/read")
def unmark_read(article_id: int, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        flag = session.exec(
            select(ArticleReadFlag).where(
                ArticleReadFlag.user_id == current_user.id,
                ArticleReadFlag.article_id == article_id,
            )
        ).first()
        if flag:
            session.delete(flag)
            session.commit()
        return {"ok": True}

@app.post("/feeds/{feed_id}/mark-all-read")
def mark_all_read(feed_id: int, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        feed = session.get(Feed, feed_id)
        if not feed:
            raise HTTPException(status_code=404, detail="Flux introuvable")

        collection = feed.collection
        is_member = session.exec(
            select(CollectionMember).where(
                CollectionMember.collection_id == collection.id,
                CollectionMember.user_id == current_user.id,
            )
        ).first()
        if collection.user_id != current_user.id and not is_member:
            raise HTTPException(status_code=403, detail="Non autorisé")

        article_ids: list[int] = session.exec(
            select(Article.id).where(Article.feed_id == feed_id)
        ).all()
        if not article_ids:
            return {"marked": 0}

        already_read_ids = set(
            session.exec(
                select(ArticleReadFlag.article_id).where(
                    ArticleReadFlag.user_id == current_user.id,
                    ArticleReadFlag.article_id.in_(article_ids),
                )
            ).all()
        )

        to_add = [
            ArticleReadFlag(user_id=current_user.id, article_id=aid)
            for aid in article_ids
            if aid not in already_read_ids
        ]
        if to_add:
            session.add_all(to_add)
            session.commit()

        return {"marked": len(to_add)}

@app.post("/feeds/{feed_id}/mark-all-unread")
def mark_all_unread(feed_id: int, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        feed = session.get(Feed, feed_id)
        if not feed:
            raise HTTPException(status_code=404, detail="Flux introuvable")

        collection = feed.collection
        is_member = session.exec(
            select(CollectionMember).where(
                CollectionMember.collection_id == collection.id,
                CollectionMember.user_id == current_user.id,
            )
        ).first()
        if collection.user_id != current_user.id and not is_member:
            raise HTTPException(status_code=403, detail="Non autorisé")

        article_ids: list[int] = session.exec(
            select(Article.id).where(Article.feed_id == feed_id)
        ).all()
        if not article_ids:
            return {"unmarked": 0}

        flags = session.exec(
            select(ArticleReadFlag).where(
                ArticleReadFlag.user_id == current_user.id,
                ArticleReadFlag.article_id.in_(article_ids),
            )
        ).all()
        for f in flags:
            session.delete(f)
        session.commit()
        return {"unmarked": len(flags)}

# ========= Favoris =========
@app.get("/favorites/", response_model=List[ArticleOut])
def list_favorites(
    q: Optional[str] = Query(None, description="Recherche dans les favoris"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user)
):
    """Récupère TOUS les articles favoris de l'utilisateur, toutes collections confondues"""
    with Session(engine) as session:
        # Récupérer tous les IDs d'articles favoris de l'utilisateur
        star_stmt = select(ArticleStar.article_id).where(ArticleStar.user_id == current_user.id)
        starred_article_ids = session.exec(star_stmt).all()
        
        if not starred_article_ids:
            return []
        
        # Récupérer les articles correspondants avec accès utilisateur vérifié
        stmt = (
            select(Article)
            .join(Feed)
            .join(Collection)
            .where(Article.id.in_(starred_article_ids))
            .where(
                or_(
                    Collection.user_id == current_user.id,  # Collections possédées
                    Collection.id.in_(  # Collections partagées
                        select(CollectionMember.collection_id).where(
                            CollectionMember.user_id == current_user.id
                        )
                    )
                )
            )
            .order_by(Article.id.desc())
        )
        
        # Filtrage par recherche si fourni
        if q:
            like = f"%{q.strip()}%"
            stmt = stmt.where(or_(Article.title.ilike(like), Article.content.ilike(like)))
        
        stmt = stmt.offset(offset).limit(limit)
        articles = session.exec(stmt).all()
        
        if not articles:
            return []
        
        # Récupérer les statuts lu/non-lu pour ces articles
        article_ids = [a.id for a in articles]
        read_ids = set(
            session.exec(
                select(ArticleReadFlag.article_id).where(
                    ArticleReadFlag.user_id == current_user.id,
                    ArticleReadFlag.article_id.in_(article_ids),
                )
            ).all()
        )
        
        # Construire la réponse
        out = []
        for a in articles:
            is_read = (a.id in read_ids)
            out.append(ArticleOut(
                id=a.id, title=a.title, content=a.content, link=a.link, feed_id=a.feed_id,
                read=is_read, starred=True  # Tous favoris par définition
            ))
        
        return out

@app.post("/articles/{article_id}/star")
def star_article(article_id: int, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        art = session.get(Article, article_id)
        if not art:
            raise HTTPException(status_code=404, detail="Article introuvable")

        feed = session.get(Feed, art.feed_id)
        collection = feed.collection
        is_member = session.exec(select(CollectionMember).where(
            CollectionMember.collection_id == collection.id,
            CollectionMember.user_id == current_user.id,
        )).first()
        if collection.user_id != current_user.id and not is_member:
            raise HTTPException(status_code=403, detail="Non autorisé")

        exists = session.exec(select(ArticleStar).where(
            ArticleStar.user_id == current_user.id,
            ArticleStar.article_id == article_id
        )).first()
        if exists:
            return {"ok": True}
        session.add(ArticleStar(user_id=current_user.id, article_id=article_id))
        session.commit()
        return {"ok": True}

@app.delete("/articles/{article_id}/star")
def unstar_article(article_id: int, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        star = session.exec(select(ArticleStar).where(
            ArticleStar.user_id == current_user.id,
            ArticleStar.article_id == article_id
        )).first()
        if star:
            session.delete(star)
            session.commit()
        return {"ok": True}

@app.get("/stars", response_model=List[ArticleOut])
def list_stars(
    collection_id: Optional[int] = None,
    feed_id: Optional[int] = None,
    q: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user)
):
    with Session(engine) as session:
        star_article_ids = [aid for (aid,) in session.exec(
            select(ArticleStar.article_id).where(ArticleStar.user_id == current_user.id)
        ).all()]
        if not star_article_ids:
            return []

        stmt = select(Article).where(Article.id.in_(star_article_ids))

        if feed_id:
            stmt = stmt.where(Article.feed_id == feed_id)
        if collection_id:
            feed_ids = [fid for (fid,) in session.exec(select(Feed.id).where(Feed.collection_id == collection_id)).all()]
            if not feed_ids:
                return []
            stmt = stmt.where(Article.feed_id.in_(feed_ids))

        if q:
            like = f"%{q.strip()}%"
            stmt = stmt.where(or_(Article.title.ilike(like), Article.content.ilike(like)))

        stmt = stmt.order_by(Article.id.desc()).offset(offset).limit(limit)
        arts = session.exec(stmt).all()
        if not arts:
            return []

        ids = [a.id for a in arts]
        read_ids = set([rid for (rid,) in session.exec(
            select(ArticleReadFlag.article_id).where(
                ArticleReadFlag.user_id == current_user.id,
                ArticleReadFlag.article_id.in_(ids)
            )
        ).all()])

        out: List[ArticleOut] = []
        for a in arts:
            out.append(ArticleOut(
                id=a.id, title=a.title, content=a.content, link=a.link, feed_id=a.feed_id,
                read=(a.id in read_ids), starred=True
            ))
        return out

# ========= ARCHIVE =========
@app.post("/articles/{article_id}/archive")
def archive_article(article_id: int, current_user: User = Depends(get_current_user)):
    """
    Crée une COPIE figée de l’article (HTML nettoyé) pour l’utilisateur.
    """
    with Session(engine) as session:
        art = session.get(Article, article_id)
        if not art:
            raise HTTPException(status_code=404, detail="Article introuvable")

        feed = session.get(Feed, art.feed_id)
        collection = feed.collection
        is_member = session.exec(select(CollectionMember).where(
            CollectionMember.collection_id == collection.id,
            CollectionMember.user_id == current_user.id,
        )).first()
        if collection.user_id != current_user.id and not is_member:
            raise HTTPException(status_code=403, detail="Non autorisé")

        clean_html = fetch_clean_html(art.link) if art.link else bleach.clean(art.content or "", tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRS, strip=True)

        # éviter les doublons exacts (même user + même article_id)
        exists = session.exec(select(ArticleArchive).where(
            ArticleArchive.user_id == current_user.id,
            ArticleArchive.article_id == article_id
        )).first()
        if exists:
            return {"ok": True, "archive_id": exists.id}

        snap = ArticleArchive(
            user_id=current_user.id,
            article_id=article_id,
            feed_id=art.feed_id,
            title=art.title[:255] if art.title else "(sans titre)",
            content_html=clean_html,
            link=art.link or "",
        )
        session.add(snap)
        session.commit()
        session.refresh(snap)
        return {"ok": True, "archive_id": snap.id}

@app.get("/repair-archives")
def repair_archives(current_user: User = Depends(get_current_user)):
    """Répare les archives avec des feed_id manquants ou incorrects"""
    with Session(engine) as session:
        # Récupérer toutes les archives de l'utilisateur
        archives = session.exec(select(ArticleArchive).where(ArticleArchive.user_id == current_user.id)).all()
        
        repaired_count = 0
        for archive in archives:
            if archive.feed_id is None and archive.article_id:
                # Essayer de récupérer le feed_id depuis l'article original
                article = session.get(Article, archive.article_id)
                if article and article.feed_id:
                    archive.feed_id = article.feed_id
                    repaired_count += 1
        
        if repaired_count > 0:
            session.commit()
        
        return {"repaired": repaired_count}

@app.get("/export/opml")
def export_opml(current_user: User = Depends(get_current_user)):
    """Exporte tous les flux de l'utilisateur au format OPML"""
    with Session(engine) as session:
        # Récupérer toutes les collections de l'utilisateur
        collections = session.exec(select(Collection).where(Collection.user_id == current_user.id)).all()
        
        # Créer la structure OPML
        opml = ET.Element("opml", version="2.0")
        head = ET.SubElement(opml, "head")
        
        # En-tête OPML
        title = ET.SubElement(head, "title")
        title.text = f"Flux RSS de {current_user.username}"
        
        date_created = ET.SubElement(head, "dateCreated")
        date_created.text = datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S GMT")
        
        body = ET.SubElement(opml, "body")
        
        # Parcourir chaque collection
        for collection in collections:
            # Récupérer les flux de cette collection
            feeds = session.exec(select(Feed).where(Feed.collection_id == collection.id)).all()
            
            if feeds:  # Seulement si la collection a des flux
                # Créer l'outline pour la collection
                collection_outline = ET.SubElement(body, "outline")
                collection_outline.set("title", collection.name)
                collection_outline.set("text", collection.name)
                
                # Ajouter chaque flux comme sous-outline
                for feed in feeds:
                    feed_outline = ET.SubElement(collection_outline, "outline")
                    feed_outline.set("type", "rss")
                    feed_outline.set("text", feed.title or "Flux sans titre")
                    feed_outline.set("title", feed.title or "Flux sans titre")
                    feed_outline.set("xmlUrl", feed.url)
                    if feed.description:
                        feed_outline.set("description", feed.description)
        
        # Générer le XML
        ET.indent(opml, space="  ")
        xml_string = ET.tostring(opml, encoding="utf-8", xml_declaration=True).decode("utf-8")
        
        # Nom de fichier avec date
        filename = f"suprss_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.opml"
        
        return {
            "content": xml_string,
            "filename": filename
        }

@app.post("/import/opml")
async def import_opml(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """Importe des flux RSS depuis un fichier OPML"""
    
    # Vérifier le type de fichier
    if not file.filename.lower().endswith(('.opml', '.xml')):
        raise HTTPException(status_code=400, detail="Le fichier doit être au format OPML (.opml ou .xml)")
    
    try:
        # Lire le contenu du fichier
        content = await file.read()
        
        # Parser le XML
        root = ET.fromstring(content)
        
        # Vérifier que c'est bien un fichier OPML
        if root.tag != "opml":
            raise HTTPException(status_code=400, detail="Le fichier n'est pas au format OPML valide")
        
        created_collections = 0
        created_feeds = 0
        skipped_feeds = 0
        
        with Session(engine) as session:
            # Parcourir la structure OPML
            body = root.find("body")
            if body is None:
                raise HTTPException(status_code=400, detail="Structure OPML invalide : pas de balise <body>")
            
            for outline in body.findall("outline"):
                # Cas 1: outline représente une collection (contient des sous-outlines)
                sub_outlines = outline.findall("outline")
                
                if sub_outlines:
                    # C'est une collection
                    collection_name = outline.get("title") or outline.get("text") or "Collection importée"
                    
                    # Vérifier si la collection existe déjà
                    existing_collection = session.exec(
                        select(Collection).where(
                            Collection.user_id == current_user.id,
                            Collection.name == collection_name
                        )
                    ).first()
                    
                    if not existing_collection:
                        # Créer la nouvelle collection
                        new_collection = Collection(name=collection_name, user_id=current_user.id)
                        session.add(new_collection)
                        session.flush()  # Pour obtenir l'ID
                        created_collections += 1
                        collection_id = new_collection.id
                    else:
                        collection_id = existing_collection.id
                    
                    # Ajouter les flux de cette collection
                    for feed_outline in sub_outlines:
                        if feed_outline.get("type") == "rss" and feed_outline.get("xmlUrl"):
                            feed_url = feed_outline.get("xmlUrl")
                            feed_title = feed_outline.get("title") or feed_outline.get("text") or "Flux importé"
                            feed_description = feed_outline.get("description") or ""
                            
                            # Vérifier si le flux existe déjà dans cette collection
                            existing_feed = session.exec(
                                select(Feed).where(
                                    Feed.collection_id == collection_id,
                                    Feed.url == feed_url
                                )
                            ).first()
                            
                            if not existing_feed:
                                new_feed = Feed(
                                    url=feed_url,
                                    title=feed_title,
                                    description=feed_description,
                                    collection_id=collection_id
                                )
                                session.add(new_feed)
                                created_feeds += 1
                            else:
                                skipped_feeds += 1
                
                else:
                    # Cas 2: outline représente directement un flux (pas de sous-outlines)
                    if outline.get("type") == "rss" and outline.get("xmlUrl"):
                        # Créer une collection "Flux importés" si elle n'existe pas
                        collection_name = "Flux importés"
                        existing_collection = session.exec(
                            select(Collection).where(
                                Collection.user_id == current_user.id,
                                Collection.name == collection_name
                            )
                        ).first()
                        
                        if not existing_collection:
                            new_collection = Collection(name=collection_name, user_id=current_user.id)
                            session.add(new_collection)
                            session.flush()
                            created_collections += 1
                            collection_id = new_collection.id
                        else:
                            collection_id = existing_collection.id
                        
                        # Ajouter le flux
                        feed_url = outline.get("xmlUrl")
                        feed_title = outline.get("title") or outline.get("text") or "Flux importé"
                        feed_description = outline.get("description") or ""
                        
                        existing_feed = session.exec(
                            select(Feed).where(
                                Feed.collection_id == collection_id,
                                Feed.url == feed_url
                            )
                        ).first()
                        
                        if not existing_feed:
                            new_feed = Feed(
                                url=feed_url,
                                title=feed_title,
                                description=feed_description,
                                collection_id=collection_id
                            )
                            session.add(new_feed)
                            created_feeds += 1
                        else:
                            skipped_feeds += 1
            
            # Sauvegarder toutes les modifications
            session.commit()
        
        return {
            "success": True,
            "message": "Import OPML terminé avec succès",
            "stats": {
                "collections_created": created_collections,
                "feeds_created": created_feeds,
                "feeds_skipped": skipped_feeds
            }
        }
        
    except ET.ParseError:
        raise HTTPException(status_code=400, detail="Le fichier OPML n'est pas un XML valide")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'import : {str(e)}")

# ========= GESTION DES MEMBRES DE COLLECTION =========

@app.get("/collections/{collection_id}/members")
def get_collection_members(collection_id: int, current_user: User = Depends(get_current_user)):
    """Récupérer tous les membres d'une collection avec leurs rôles"""
    with Session(engine) as session:
        collection = session.get(Collection, collection_id)
        if not collection:
            raise HTTPException(status_code=404, detail="Collection introuvable")
        
        # Vérifier que l'utilisateur a accès à cette collection
        is_owner = collection.user_id == current_user.id
        is_member = session.exec(
            select(CollectionMember).where(
                CollectionMember.collection_id == collection_id,
                CollectionMember.user_id == current_user.id
            )
        ).first()
        
        if not is_owner and not is_member:
            raise HTTPException(status_code=403, detail="Accès interdit")
        
        # Récupérer tous les membres
        members_query = session.exec(
            select(CollectionMember, User)
            .join(User, CollectionMember.user_id == User.id)
            .where(CollectionMember.collection_id == collection_id)
        ).all()
        
        # Ajouter le propriétaire
        owner = session.get(User, collection.user_id)
        members = [
            {
                "id": owner.id,
                "username": owner.username,
                "email": owner.email,
                "role": "owner",
                "is_owner": True
            }
        ]
        
        # Ajouter les autres membres
        for member, user in members_query:
            members.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": member.role,
                "is_owner": False
            })
        
        return {
            "collection": {
                "id": collection.id,
                "name": collection.name
            },
            "members": members
        }

@app.put("/collections/{collection_id}/members/{user_id}")
def update_member_role(
    collection_id: int,
    user_id: int,
    role: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    """Modifier le rôle d'un membre (seul le propriétaire peut le faire)"""
    with Session(engine) as session:
        collection = session.get(Collection, collection_id)
        if not collection or collection.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Seul le propriétaire peut modifier les rôles")
        
        if role not in ["viewer", "editor", "admin"]:
            raise HTTPException(status_code=400, detail="Rôle invalide. Valeurs possibles: viewer, editor, admin")
        
        member = session.exec(
            select(CollectionMember).where(
                CollectionMember.collection_id == collection_id,
                CollectionMember.user_id == user_id
            )
        ).first()
        
        if not member:
            raise HTTPException(status_code=404, detail="Membre introuvable")
        
        member.role = role
        session.commit()
        
        return {"message": f"Rôle mis à jour vers {role}"}

@app.delete("/collections/{collection_id}/members/{user_id}")
def remove_member(
    collection_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user)
):
    """Retirer un membre d'une collection"""
    with Session(engine) as session:
        collection = session.get(Collection, collection_id)
        if not collection:
            raise HTTPException(status_code=404, detail="Collection introuvable")
        
        # Seul le propriétaire ou le membre lui-même peuvent retirer
        is_owner = collection.user_id == current_user.id
        is_self = user_id == current_user.id
        
        if not is_owner and not is_self:
            raise HTTPException(status_code=403, detail="Accès interdit")
        
        member = session.exec(
            select(CollectionMember).where(
                CollectionMember.collection_id == collection_id,
                CollectionMember.user_id == user_id
            )
        ).first()
        
        if not member:
            raise HTTPException(status_code=404, detail="Membre introuvable")
        
        session.delete(member)
        session.commit()
        
        action = "quitté" if is_self else "retiré"
        return {"message": f"Membre {action} avec succès"}

@app.get("/test-collection-filter")
def test_collection_filter(collection_id: int, current_user: User = Depends(get_current_user)):
    """Test du filtrage par collection"""
    with Session(engine) as session:
        # 1. Vérifier la collection
        collection = session.get(Collection, collection_id)
        if not collection:
            return {"error": "Collection introuvable", "collection_id": collection_id}
        
        # 2. Récupérer les flux de cette collection
        feeds = session.exec(select(Feed).where(Feed.collection_id == collection_id)).all()
        
        # 3. Récupérer toutes les archives de l'utilisateur
        all_archives = session.exec(select(ArticleArchive).where(ArticleArchive.user_id == current_user.id)).all()
        
        # 4. Filtrer les archives par feed_id
        filtered_archives = [a for a in all_archives if a.feed_id in [f.id for f in feeds]]
        
        return {
            "collection_name": collection.name,
            "collection_id": collection_id,
            "feeds_in_collection": [{"id": f.id, "title": f.title} for f in feeds],
            "total_user_archives": len(all_archives),
            "archives_with_null_feed_id": len([a for a in all_archives if a.feed_id is None]),
            "filtered_archives_count": len(filtered_archives),
            "sample_archives": [
                {"id": a.id, "title": a.title[:30], "feed_id": a.feed_id} 
                for a in all_archives[:5]
            ]
        }


@app.get("/archive", response_model=List[ArchiveOut])
def list_archive(
    q: Optional[str] = Query(None, description="Recherche dans titre/contenu archivé"),
    collection_id: Optional[int] = None,
    feed_id: Optional[int] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
):
    with Session(engine) as session:
        stmt = select(ArticleArchive).where(ArticleArchive.user_id == current_user.id)

        if feed_id:
            stmt = stmt.where(ArticleArchive.feed_id == feed_id)

        if collection_id:
            # Récupérer TOUS les flux de cette collection
            feed_ids = session.exec(
                select(Feed.id).where(Feed.collection_id == collection_id)
            ).all()
            
            print(f"Collection {collection_id}: trouvé {len(feed_ids)} flux: {feed_ids}")
            
            if feed_ids:
                stmt = stmt.where(ArticleArchive.feed_id.in_(feed_ids))
                print(f"Applique filtre: feed_id in {feed_ids}")
            else:
                # Si aucun flux dans cette collection, retourner vide
                print(f"Aucun flux trouvé pour collection {collection_id}")
                return []

        if q:
            like = f"%{q.strip()}%"
            # recherche simple sur title + content_html
            from sqlalchemy import cast, String
            stmt = stmt.where(
                or_(
                    ArticleArchive.title.ilike(like),
                    cast(ArticleArchive.content_html, String).ilike(like),
                )
            )

        stmt = stmt.order_by(ArticleArchive.id.desc()).offset(offset).limit(limit)
        rows = session.exec(stmt).all()
        print(f"Requête finale: trouvé {len(rows)} archives")

        return [
            ArchiveOut(
                id=r.id,
                title=r.title,
                content_html=r.content_html,
                link=r.link,
                feed_id=r.feed_id,
                article_id=r.article_id,
                archived_at=r.archived_at,
            )
            for r in rows
        ]

@app.get("/archive/{archive_id}", response_model=ArchiveOut)
def get_archive_item(archive_id: int, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        a = session.get(ArticleArchive, archive_id)
        if not a or a.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Archive introuvable")
        
        # Récupérer le contenu original de l'article si disponible
        original_content = None
        if a.article_id:
            original_article = session.get(Article, a.article_id)
            if original_article:
                original_content = original_article.content
        
        return ArchiveOut(
            id=a.id,
            title=a.title,
            content_html=a.content_html,
            content_original=original_content,
            link=a.link,
            feed_id=a.feed_id,
            article_id=a.article_id,
            archived_at=a.archived_at,
        )

@app.delete("/archive/{archive_id}")
def delete_archive_item(archive_id: int, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        a = session.get(ArticleArchive, archive_id)
        if not a or a.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Archive introuvable")
        session.delete(a)
        session.commit()
        return {"ok": True}

@app.get("/archive/{archive_id}/pdf")
def download_archive_rss(archive_id: int, current_user: User = Depends(get_current_user)):
    """
    Télécharge le contenu RSS original de l'article archivé
    """
    with Session(engine) as session:
        a = session.get(ArticleArchive, archive_id)
        if not a or a.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Archive introuvable")
        
        # Récupérer le contenu RSS original
        original_content = None
        if a.article_id:
            original_article = session.get(Article, a.article_id)
            if original_article:
                original_content = original_article.content
        
        # Si pas de contenu original, utiliser le contenu HTML archivé
        content_to_download = original_content or a.content_html
        
        # Nom de fichier sécurisé
        safe_title = "".join(c for c in a.title if c.isalnum() or c in (' ', '-', '_')).strip()
        safe_title = safe_title[:50] if safe_title else "article"
        filename = f"{safe_title}_{archive_id}_rss.txt"
        
        # Contenu formaté avec métadonnées
        formatted_content = f"""Titre: {a.title}
Source: {a.link}
Archivé le: {a.archived_at.strftime('%d/%m/%Y à %H:%M')}
Type de contenu: {'RSS original' if original_content else 'Contenu archivé'}

----------------------------------------

{content_to_download}
"""
        
        return Response(
            content=formatted_content,
            media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename=\"{filename}\""}
        )

# ========= 2FA HELPERS =========
def create_temp_token(email: str) -> str:
    """Crée un token temporaire pour la 2FA"""
    return secrets.token_urlsafe(32)

def store_verification_code(session: Session, email: str, code: str, purpose: str = "login") -> bool:
    """Stocke un code de vérification en base"""
    try:
        # Récupérer l'utilisateur pour avoir son ID
        user = session.exec(select(User).where(User.email == email)).first()
        if not user:
            return False
        
        # Supprimer les anciens codes non utilisés pour cet email/purpose
        old_codes = session.exec(
            select(EmailVerificationCode).where(
                EmailVerificationCode.email == email,
                EmailVerificationCode.purpose == purpose,
                EmailVerificationCode.used == False
            )
        ).all()
        for old_code in old_codes:
            session.delete(old_code)
        
        # Créer le nouveau code dans la même transaction
        verification = EmailVerificationCode(
            user_id=user.id,
            email=email,
            code=code,
            expires_at=get_code_expiry(),
            purpose=purpose
        )
        session.add(verification)
        session.commit()  # Commit tout en une fois
        return True
    except Exception as e:
        print(f"❌ Erreur stockage code: {e}")
        session.rollback()  # Rollback en cas d'erreur
        return False

def verify_code(session: Session, email: str, code: str, purpose: str = "login") -> bool:
    """Vérifie un code de validation"""
    verification = session.exec(
        select(EmailVerificationCode).where(
            EmailVerificationCode.email == email,
            EmailVerificationCode.code == code,
            EmailVerificationCode.purpose == purpose,
            EmailVerificationCode.used == False,
            EmailVerificationCode.expires_at > datetime.utcnow()
        )
    ).first()
    
    if verification:
        verification.used = True
        session.commit()
        return True
    return False

# ========= 2FA ROUTES =========
@app.post("/auth/send-code", response_model=TempTokenResponse)
def send_verification_code_route(email: str = Form(...)):
    """Envoie un code de vérification 2FA par email"""
    with Session(engine) as session:
        # Vérifier que l'utilisateur existe et a la 2FA activée
        user = session.exec(select(User).where(User.email == email)).first()
        if not user:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")
        
        if not user.is_2fa_enabled:
            raise HTTPException(status_code=400, detail="2FA non activée pour cet utilisateur")
        
        # Générer et envoyer le code
        code = generate_verification_code()
        
        if not send_verification_email(email, code, "login"):
            raise HTTPException(status_code=500, detail="Erreur envoi email")
        
        if not store_verification_code(session, email, code, "login"):
            raise HTTPException(status_code=500, detail="Erreur stockage code")
        
        # Créer un token temporaire
        temp_token = create_temp_token(email)
        
        return TempTokenResponse(
            temp_token=temp_token,
            message="Code de vérification envoyé par email",
            expires_in=600  # 10 minutes
        )

@app.post("/auth/verify-code")
def verify_code_route(verification: VerificationRequest):
    """Vérifie un code 2FA et retourne le token JWT final"""
    with Session(engine) as session:
        if not verify_code(session, verification.email, verification.code, "login"):
            raise HTTPException(status_code=400, detail="Code invalide ou expiré")
        
        # Récupérer l'utilisateur
        user = session.exec(select(User).where(User.email == verification.email)).first()
        if not user:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")
        
        # Générer le token JWT final
        token = create_access_token({"sub": user.email})
        return {"access_token": token, "token_type": "bearer", "message": "Connexion réussie"}

# ========= OAUTH =========
@app.get("/auth/google/login")
async def google_login(request: Request):
    redirect_uri = request.url_for("google_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)

@app.get("/auth/google/callback")
async def google_callback(request: Request):
    try:
        # Fix pour le problème CSRF state mismatch
        request.session.clear()  # Clear session to avoid state conflicts
        token = await oauth.google.authorize_access_token(request)
        resp = await oauth.google.get("https://openidconnect.googleapis.com/v1/userinfo", token=token)
        user_info = resp.json()
    except Exception as e:
        # Si problème de state, on essaie une approche alternative
        if "state" in str(e).lower():
            try:
                # Alternative: utiliser directement le code d'autorisation
                code = request.query_params.get("code")
                if code:
                    import httpx
                    async with httpx.AsyncClient() as client:
                        token_response = await client.post(
                            "https://oauth2.googleapis.com/token",
                            data={
                                "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                                "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                                "code": code,
                                "grant_type": "authorization_code",
                                "redirect_uri": str(request.url_for("google_callback")),
                            }
                        )
                        token_data = token_response.json()
                        
                        # Récupérer les infos utilisateur avec le token
                        user_response = await client.get(
                            "https://openidconnect.googleapis.com/v1/userinfo",
                            headers={"Authorization": f"Bearer {token_data['access_token']}"}
                        )
                        user_info = user_response.json()
                else:
                    raise HTTPException(status_code=400, detail=f"Échec d'authentification Google: {e}")
            except Exception as e2:
                raise HTTPException(status_code=400, detail=f"Échec d'authentification Google: {e2}")
        else:
            raise HTTPException(status_code=400, detail=f"Échec d'authentification Google: {e}")

    email = (user_info.get("email") or "").lower()
    username = user_info.get("name") or (email.split("@")[0] if email else "google_user")

    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email)).first()
        if not user:
            # Créer un nouvel utilisateur OAuth avec 2FA (via la plateforme OAuth)
            # Générer un mot de passe aléatoirement sécurisé pour les utilisateurs OAuth
            oauth_password = secrets.token_urlsafe(32)
            user = User(username=username, email=email, password=hash_password(oauth_password), is_2fa_enabled=True)
            session.add(user)
            session.commit()
            session.refresh(user)
        
        # Connexion directe pour OAuth (simple comme avant)
        jwt_token = create_access_token({"sub": email})
        return RedirectResponse(f"http://localhost:3000/dashboard.html?token={jwt_token}")

@app.get("/auth/github/login")
async def github_login(request: Request):
    redirect_uri = request.url_for("github_callback")
    return await oauth.github.authorize_redirect(request, redirect_uri)

@app.get("/auth/github/callback")
async def github_callback(request: Request):
    try:
        token = await oauth.github.authorize_access_token(request)
        resp = await oauth.github.get("https://api.github.com/user", token=token)
        user_info = resp.json()
        email = (user_info.get("email") or "").lower()
        if not email:
            emails_resp = await oauth.github.get("https://api.github.com/user/emails", token=token)
            emails = emails_resp.json()
            prim = next((e["email"] for e in emails if e.get("primary")), None)
            email = (prim or "").lower()
        username = user_info.get("name") or user_info.get("login") or (email.split("@")[0] if email else "github_user")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Échec d'authentification GitHub: {e}")

    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email)).first()
        if not user:
            # Créer un nouvel utilisateur OAuth avec 2FA (via la plateforme OAuth)
            # Générer un mot de passe aléatoirement sécurisé pour les utilisateurs OAuth
            oauth_password = secrets.token_urlsafe(32)
            user = User(username=username, email=email, password=hash_password(oauth_password), is_2fa_enabled=True)
            session.add(user)
            session.commit()
            session.refresh(user)

        # Connexion directe pour OAuth (simple comme avant)
        jwt_token = create_access_token({"sub": email})
        return RedirectResponse(f"http://localhost:3000/dashboard.html?token={jwt_token}")

# ========= Scheduler job =========
def refresh_all_feeds_job():
    with Session(engine) as session:
        feeds = session.exec(select(Feed)).all()
        total = 0
        for f in feeds:
            headers = {}
            cache = app.state.feed_cache.get(f.id, {})
            if cache.get("etag"):
                headers["If-None-Match"] = cache["etag"]
            if cache.get("modified"):
                headers["If-Modified-Since"] = cache["modified"]
            parsed = feedparser.parse(f.url, request_headers=headers)
            if parsed.get("etag"):
                cache["etag"] = parsed.etag
            if parsed.get("modified"):
                try:
                    import email.utils as eut
                    cache["modified"] = eut.formatdate(feedparser.mktime_tz(parsed.modified))
                except Exception:
                    pass
            app.state.feed_cache[f.id] = cache
            if getattr(parsed, "status", None) == 304:
                continue
            for e in parsed.entries:
                link = getattr(e, "link", "") or ""
                title = getattr(e, "title", "") or "(sans titre)"
                summary = getattr(e, "summary", None) or getattr(e, "description", "") or ""
                if looks_duplicate(session, f.id, link, title):
                    continue
                a = Article(title=title[:255], content=summary, link=link, feed_id=f.id)
                session.add(a)
                total += 1
        session.commit()
        print(f"[Scheduler] Articles insérés: {total}")

# ========= MESSAGERIE INSTANTANÉE =========

@app.get("/collections/{collection_id}/messages", response_model=List[MessageOut])
def get_collection_messages(
    collection_id: int, 
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user)
):
    """Récupère les messages d'une collection (messagerie + commentaires)"""
    with Session(engine) as session:
        # Vérifier que l'utilisateur a accès à la collection
        collection = session.get(Collection, collection_id)
        if not collection:
            raise HTTPException(status_code=404, detail="Collection introuvable")
        
        # Vérifier les permissions (propriétaire ou membre)
        is_owner = collection.user_id == current_user.id
        is_member = session.exec(
            select(CollectionMember).where(
                CollectionMember.collection_id == collection_id,
                CollectionMember.user_id == current_user.id
            )
        ).first() is not None
        
        if not (is_owner or is_member):
            raise HTTPException(status_code=403, detail="Accès refusé à cette collection")
        
        # Récupérer les messages avec les informations utilisateur et article
        stmt = select(
            CollectionMessage, User.username, Article.title.label("article_title"), Article.link.label("article_link"), CollectionMessage.user_id
        ).join(
            User, CollectionMessage.user_id == User.id
        ).outerjoin(
            Article, CollectionMessage.article_id == Article.id
        ).where(
            CollectionMessage.collection_id == collection_id
        ).order_by(
            CollectionMessage.created_at.desc()
        ).offset(offset).limit(limit)
        
        results = session.exec(stmt).all()
        
        # Récupérer les IDs des messages lus par l'utilisateur actuel
        read_message_ids = set()
        read_flags = session.exec(
            select(MessageReadFlag.message_id).where(
                MessageReadFlag.user_id == current_user.id
            )
        ).all()
        read_message_ids.update(read_flags)
        
        messages = []
        for message, username, article_title, article_link, user_id in results:
            is_read = message.id in read_message_ids
            messages.append(MessageOut(
                id=message.id,
                collection_id=message.collection_id,
                user_id=user_id,
                username=username,
                message=message.message,
                created_at=message.created_at,
                message_type=message.message_type,
                article_id=message.article_id,
                article_title=article_title,
                article_link=article_link,
                read=is_read
            ))
        
        return messages

@app.post("/collections/{collection_id}/messages")
def send_message(
    collection_id: int,
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user)
):
    """Envoie un message dans une collection"""
    with Session(engine) as session:
        # Vérifier que l'utilisateur a accès à la collection
        collection = session.get(Collection, collection_id)
        if not collection:
            raise HTTPException(status_code=404, detail="Collection introuvable")
        
        # Vérifier les permissions
        is_owner = collection.user_id == current_user.id
        is_member = session.exec(
            select(CollectionMember).where(
                CollectionMember.collection_id == collection_id,
                CollectionMember.user_id == current_user.id
            )
        ).first() is not None
        
        if not (is_owner or is_member):
            raise HTTPException(status_code=403, detail="Accès refusé à cette collection")
        
        # Vérifier l'article si c'est un commentaire
        if message_data.message_type == "comment" and message_data.article_id:
            article = session.get(Article, message_data.article_id)
            if not article:
                raise HTTPException(status_code=404, detail="Article introuvable")
            
            # Vérifier que l'article appartient à un flux de cette collection
            feed = session.get(Feed, article.feed_id)
            if not feed or feed.collection_id != collection_id:
                raise HTTPException(status_code=400, detail="L'article n'appartient pas à cette collection")
        
        # Créer le message
        new_message = CollectionMessage(
            collection_id=collection_id,
            user_id=current_user.id,
            message=message_data.message,
            message_type=message_data.message_type,
            article_id=message_data.article_id
        )
        
        session.add(new_message)
        session.commit()
        session.refresh(new_message)
        
        return {"ok": True, "message_id": new_message.id}

@app.delete("/messages/{message_id}")
def delete_message(message_id: int, current_user: User = Depends(get_current_user)):
    """Supprime un message (seul l'auteur ou le propriétaire de la collection peut supprimer)"""
    with Session(engine) as session:
        message = session.get(CollectionMessage, message_id)
        if not message:
            raise HTTPException(status_code=404, detail="Message introuvable")
        
        # Vérifier les permissions
        collection = session.get(Collection, message.collection_id)
        is_author = message.user_id == current_user.id
        is_collection_owner = collection and collection.user_id == current_user.id
        
        if not (is_author or is_collection_owner):
            raise HTTPException(status_code=403, detail="Vous ne pouvez pas supprimer ce message")
        
        session.delete(message)
        session.commit()
        
        return {"ok": True}

@app.get("/articles/{article_id}/comments", response_model=List[MessageOut])
def get_article_comments(
    article_id: int,
    current_user: User = Depends(get_current_user)
):
    """Récupère les commentaires d'un article spécifique"""
    with Session(engine) as session:
        # Vérifier que l'article existe et que l'utilisateur y a accès
        article = session.get(Article, article_id)
        if not article:
            raise HTTPException(status_code=404, detail="Article introuvable")
        
        feed = session.get(Feed, article.feed_id)
        if not feed:
            raise HTTPException(status_code=404, detail="Flux introuvable")
        
        collection = session.get(Collection, feed.collection_id)
        if not collection:
            raise HTTPException(status_code=404, detail="Collection introuvable")
        
        # Vérifier les permissions
        is_owner = collection.user_id == current_user.id
        is_member = session.exec(
            select(CollectionMember).where(
                CollectionMember.collection_id == collection.id,
                CollectionMember.user_id == current_user.id
            )
        ).first() is not None
        
        if not (is_owner or is_member):
            raise HTTPException(status_code=403, detail="Accès refusé")
        
        # Récupérer les commentaires
        stmt = select(
            CollectionMessage, User.username
        ).join(
            User, CollectionMessage.user_id == User.id
        ).where(
            CollectionMessage.article_id == article_id,
            CollectionMessage.message_type == "comment"
        ).order_by(
            CollectionMessage.created_at.asc()
        )
        
        results = session.exec(stmt).all()
        
        comments = []
        for message, username in results:
            comments.append(MessageOut(
                id=message.id,
                collection_id=message.collection_id,
                user_id=message.user_id,
                username=username,
                message=message.message,
                created_at=message.created_at,
                message_type=message.message_type,
                article_id=message.article_id,
                article_title=article.title,
                article_link=article.link
            ))
        
        return comments

@app.post("/messages/{message_id}/read")
def mark_message_as_read(message_id: int, current_user: User = Depends(get_current_user)):
    """Marque un message comme lu"""
    with Session(engine) as session:
        # Vérifier que le message existe et que l'utilisateur y a accès
        message = session.get(CollectionMessage, message_id)
        if not message:
            raise HTTPException(status_code=404, detail="Message introuvable")
        
        # Vérifier l'accès à la collection
        collection = session.get(Collection, message.collection_id)
        if not collection:
            raise HTTPException(status_code=404, detail="Collection introuvable")
        
        is_owner = collection.user_id == current_user.id
        is_member = session.exec(
            select(CollectionMember).where(
                CollectionMember.collection_id == message.collection_id,
                CollectionMember.user_id == current_user.id
            )
        ).first() is not None
        
        if not (is_owner or is_member):
            raise HTTPException(status_code=403, detail="Accès refusé à cette collection")
        
        # Vérifier si déjà marqué comme lu
        existing_flag = session.exec(
            select(MessageReadFlag).where(
                MessageReadFlag.user_id == current_user.id,
                MessageReadFlag.message_id == message_id
            )
        ).first()
        
        if not existing_flag:
            # Créer le flag de lecture
            read_flag = MessageReadFlag(
                user_id=current_user.id,
                message_id=message_id
            )
            session.add(read_flag)
            session.commit()
        
        return {"ok": True}

@app.delete("/messages/{message_id}/read")
def mark_message_as_unread(message_id: int, current_user: User = Depends(get_current_user)):
    """Marque un message comme non lu"""
    with Session(engine) as session:
        # Vérifier que le message existe et que l'utilisateur y a accès
        message = session.get(CollectionMessage, message_id)
        if not message:
            raise HTTPException(status_code=404, detail="Message introuvable")
        
        # Vérifier l'accès à la collection
        collection = session.get(Collection, message.collection_id)
        if not collection:
            raise HTTPException(status_code=404, detail="Collection introuvable")
        
        is_owner = collection.user_id == current_user.id
        is_member = session.exec(
            select(CollectionMember).where(
                CollectionMember.collection_id == message.collection_id,
                CollectionMember.user_id == current_user.id
            )
        ).first() is not None
        
        if not (is_owner or is_member):
            raise HTTPException(status_code=403, detail="Accès refusé à cette collection")
        
        # Supprimer le flag de lecture s'il existe
        existing_flag = session.exec(
            select(MessageReadFlag).where(
                MessageReadFlag.user_id == current_user.id,
                MessageReadFlag.message_id == message_id
            )
        ).first()
        
        if existing_flag:
            session.delete(existing_flag)
            session.commit()
        
        return {"ok": True}

@app.get("/collections/{collection_id}/unread-count")
def get_unread_messages_count(collection_id: int, current_user: User = Depends(get_current_user)):
    """Récupère le nombre de messages non lus dans une collection"""
    with Session(engine) as session:
        # Vérifier l'accès à la collection
        collection = session.get(Collection, collection_id)
        if not collection:
            raise HTTPException(status_code=404, detail="Collection introuvable")
        
        is_owner = collection.user_id == current_user.id
        is_member = session.exec(
            select(CollectionMember).where(
                CollectionMember.collection_id == collection_id,
                CollectionMember.user_id == current_user.id
            )
        ).first() is not None
        
        if not (is_owner or is_member):
            raise HTTPException(status_code=403, detail="Accès refusé à cette collection")
        
        # Requête optimisée : compter directement les messages non lus 
        # MAIS exclure les messages créés par l'utilisateur actuel
        unread_count = session.exec(
            select(func.count(CollectionMessage.id))
            .select_from(CollectionMessage)
            .outerjoin(MessageReadFlag, 
                       and_(MessageReadFlag.message_id == CollectionMessage.id,
                            MessageReadFlag.user_id == current_user.id))
            .where(
                CollectionMessage.collection_id == collection_id,
                CollectionMessage.user_id != current_user.id,  # NE PAS compter ses propres messages
                MessageReadFlag.id.is_(None)  # Messages sans flag de lecture = non lus
            )
        ).one()
        
        return {"unread_count": unread_count}

@app.get("/unread-messages-summary")
def get_unread_messages_summary(current_user: User = Depends(get_current_user)):
    """Récupère un résumé des messages non lus par collection pour le dashboard"""
    with Session(engine) as session:
        # Requête optimisée : récupérer directement les collections avec leur nombre de messages non lus
        # en une seule requête complexe MAIS exclure les messages créés par l'utilisateur actuel
        unread_summary = session.exec(
            select(
                Collection.id,
                Collection.name,
                func.count(CollectionMessage.id).label('unread_count')
            )
            .select_from(Collection)
            .join(CollectionMessage, CollectionMessage.collection_id == Collection.id)
            .outerjoin(MessageReadFlag, 
                       and_(MessageReadFlag.message_id == CollectionMessage.id,
                            MessageReadFlag.user_id == current_user.id))
            .outerjoin(CollectionMember,
                       and_(CollectionMember.collection_id == Collection.id,
                            CollectionMember.user_id == current_user.id))
            .where(
                or_(
                    Collection.user_id == current_user.id,  # Collections possédées
                    CollectionMember.id.is_not(None)       # Collections partagées
                ),
                CollectionMessage.user_id != current_user.id,  # NE PAS compter ses propres messages
                MessageReadFlag.id.is_(None)  # Messages non lus seulement
            )
            .group_by(Collection.id, Collection.name)
            .having(func.count(CollectionMessage.id) > 0)
        ).all()
        
        summary = []
        total_unread = 0
        
        for collection_id, collection_name, unread_count in unread_summary:
            total_unread += unread_count
            summary.append({
                "collection_id": collection_id,
                "collection_name": collection_name,
                "unread_count": unread_count
            })
        
        return {
            "total_unread": total_unread,
            "collections": summary
        }

@app.delete("/users/me")
def delete_current_user(current_user: User = Depends(get_current_user)):
    """Supprime le compte utilisateur actuel et toutes ses données associées"""
    with Session(engine) as session:
        # Refresh l'utilisateur pour avoir la dernière version
        session.add(current_user)
        session.refresh(current_user)
        
        try:
            # Supprimer DIRECTEMENT toutes les données liées à l'utilisateur (optimisé)
            session.exec(delete(ArticleReadFlag).where(ArticleReadFlag.user_id == current_user.id))
            session.exec(delete(ArticleStar).where(ArticleStar.user_id == current_user.id))
            session.exec(delete(ArticleArchive).where(ArticleArchive.user_id == current_user.id))
            session.exec(delete(MessageReadFlag).where(MessageReadFlag.user_id == current_user.id))
            session.exec(delete(CollectionMember).where(CollectionMember.user_id == current_user.id))
            
            # AJOUT : Supprimer les codes de vérification email
            from models import EmailVerificationCode
            session.exec(delete(EmailVerificationCode).where(EmailVerificationCode.user_id == current_user.id))
            
            # Supprimer les collections et leurs données associées
            user_collections = session.exec(
                select(Collection.id).where(Collection.user_id == current_user.id)
            ).all()
            
            if user_collections:
                collection_ids = list(user_collections)
                
                # D'ABORD récupérer tous les messages pour supprimer leurs flags
                message_ids = session.exec(
                    select(CollectionMessage.id).where(CollectionMessage.collection_id.in_(collection_ids))
                ).all()
                
                if message_ids:
                    message_ids = list(message_ids)
                    # Supprimer TOUS les MessageReadFlag qui référencent ces messages
                    session.exec(delete(MessageReadFlag).where(MessageReadFlag.message_id.in_(message_ids)))
                
                # ENSUITE supprimer les messages et membres
                session.exec(delete(CollectionMessage).where(CollectionMessage.collection_id.in_(collection_ids)))
                session.exec(delete(CollectionMember).where(CollectionMember.collection_id.in_(collection_ids)))
                
                # Supprimer les feeds et articles
                feed_ids = session.exec(select(Feed.id).where(Feed.collection_id.in_(collection_ids))).all()
                if feed_ids:
                    feed_ids = list(feed_ids)
                    article_ids = session.exec(select(Article.id).where(Article.feed_id.in_(feed_ids))).all()
                    if article_ids:
                        article_ids = list(article_ids)
                        session.exec(delete(ArticleReadFlag).where(ArticleReadFlag.article_id.in_(article_ids)))
                        session.exec(delete(ArticleStar).where(ArticleStar.article_id.in_(article_ids)))
                        session.exec(delete(ArticleArchive).where(ArticleArchive.article_id.in_(article_ids)))
                        session.exec(delete(Article).where(Article.id.in_(article_ids)))
                    session.exec(delete(Feed).where(Feed.id.in_(feed_ids)))
                
                session.exec(delete(Collection).where(Collection.id.in_(collection_ids)))
            
            # Finalement, supprimer l'utilisateur
            session.delete(current_user)
            session.commit()
            
            return {"message": "Compte utilisateur supprimé avec succès"}
            
        except Exception as e:
            session.rollback()
            raise HTTPException(
                status_code=500, 
                detail=f"Erreur lors de la suppression du compte: {str(e)}"
            )
