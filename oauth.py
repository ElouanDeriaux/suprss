import os
from authlib.integrations.starlette_client import OAuth

# Déclaré une fois et importé dans main.py
oauth = OAuth()

# --- Google (si tu l'utilises toujours) ---
oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={
        "scope": "openid email profile",
        "prompt": "select_account",
        "access_type": "offline",
        "include_granted_scopes": "true"
    },
)

# --- GitHub ---
oauth.register(
    name="github",
    client_id=os.getenv("GITHUB_CLIENT_ID"),
    client_secret=os.getenv("GITHUB_CLIENT_SECRET"),
    authorize_url="https://github.com/login/oauth/authorize",
    access_token_url="https://github.com/login/oauth/access_token",
    api_base_url="https://api.github.com/",
    client_kwargs={
        "scope": "read:user user:email",
        "token_endpoint_auth_method": "client_secret_post"
    },
)
