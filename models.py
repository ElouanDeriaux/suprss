# models.py
from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship

# -------- USERS --------
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str
    email: str = Field(index=True, unique=True)
    password: str
    is_email_verified: bool = Field(default=False)
    is_2fa_enabled: bool = Field(default=True)  # 2FA activée par défaut pour la sécurité
    theme_preference: str = Field(default="auto")  # "auto", "light", ou "dark"

class UserCreate(SQLModel):
    username: str
    email: str
    password: str

# -------- 2FA EMAIL VERIFICATION --------
class EmailVerificationCode(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    email: str
    code: str = Field(max_length=6)  # Code à 6 chiffres
    expires_at: datetime
    used: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    purpose: str  # "login", "registration", "oauth"

# -------- COLLECTIONS --------
class Collection(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    user_id: int = Field(foreign_key="user.id")
    user: Optional["User"] = Relationship()
    feeds: list["Feed"] = Relationship(back_populates="collection")

class CollectionCreate(SQLModel):
    name: str

class CollectionMember(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    collection_id: int = Field(foreign_key="collection.id")
    user_id: int = Field(foreign_key="user.id")
    role: str = "viewer"

# -------- FEEDS --------
class Feed(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    url: str
    title: Optional[str] = None
    description: Optional[str] = None
    collection_id: int = Field(foreign_key="collection.id")
    collection: Optional[Collection] = Relationship(back_populates="feeds")

class FeedCreate(SQLModel):
    url: str
    title: str
    description: Optional[str] = None
    collection_id: int

# -------- ARTICLES --------
class Article(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    content: str
    link: str
    feed_id: int = Field(foreign_key="feed.id")

class ArticleCreate(SQLModel):
    title: str
    content: str
    link: str
    feed_id: int

# Lu / Non-lu
class ArticleReadFlag(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    article_id: int = Field(foreign_key="article.id", index=True)

# Favoris
class ArticleStar(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    article_id: int = Field(foreign_key="article.id", index=True)

# Archive (COPIE FIGÉE, indépendante de Article)
class ArticleArchive(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    article_id: Optional[int] = Field(default=None, foreign_key="article.id")
    feed_id: Optional[int] = Field(default=None, foreign_key="feed.id")
    title: str
    content_html: str  # déjà nettoyé/sanitized
    link: str
    archived_at: datetime = Field(default_factory=datetime.utcnow)

# -------- DTOs --------
class ArticleOut(SQLModel):
    id: int
    title: str
    content: str
    link: str
    feed_id: int
    read: bool = False
    starred: bool = False

class ArchiveOut(SQLModel):
    id: int
    title: str
    content_html: str
    content_original: Optional[str] = None  # Contenu RSS original
    link: str
    feed_id: Optional[int] = None
    article_id: Optional[int] = None
    archived_at: datetime

# -------- MESSAGERIE INSTANTANÉE --------
class CollectionMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    collection_id: int = Field(foreign_key="collection.id", index=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    message_type: str = Field(default="message")  # "message", "comment"
    article_id: Optional[int] = Field(default=None, foreign_key="article.id")  # Pour les commentaires d'articles

class MessageCreate(SQLModel):
    message: str
    message_type: str = "message"
    article_id: Optional[int] = None

# Message lu / Non-lu
class MessageReadFlag(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    message_id: int = Field(foreign_key="collectionmessage.id", index=True)

class MessageOut(SQLModel):
    id: int
    collection_id: int
    user_id: int
    username: str
    message: str
    created_at: datetime
    message_type: str
    article_id: Optional[int] = None
    article_title: Optional[str] = None
    article_link: Optional[str] = None
    read: bool = False
