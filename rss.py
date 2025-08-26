import feedparser
from datetime import datetime
from models import Article, Feed
from sqlmodel import Session
from database import engine

def fetch_and_store_articles(feed: Feed):
    d = feedparser.parse(feed.url)
    with Session(engine) as session:
        for entry in d.entries:
            existing = session.exec(
                f"SELECT * FROM article WHERE link='{entry.link}' AND feed_id={feed.id}"
            ).first()
            if not existing:
                article = Article(
                    title=entry.title,
                    link=entry.link,
                    published=datetime(*entry.published_parsed[:6]),
                    summary=entry.summary if "summary" in entry else None,
                    author=entry.get("author"),
                    feed_id=feed.id,
                )
                session.add(article)
        session.commit()
