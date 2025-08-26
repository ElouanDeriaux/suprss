# email_service.py
import os
import smtplib
import secrets
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

def generate_verification_code() -> str:
    """Génère un code de vérification à 6 chiffres"""
    return f"{secrets.randbelow(1000000):06d}"

def send_verification_email(to_email: str, code: str, purpose: str = "login") -> bool:
    """Envoie un email de vérification 2FA"""
    try:
        # Configuration SMTP (Gmail par défaut, modifiable via env)
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_username = os.getenv("SMTP_USERNAME", "")
        smtp_password = os.getenv("SMTP_PASSWORD", "")
        
        if not smtp_username or not smtp_password:
            print("[INFO] Configuration SMTP manquante, simulation d'envoi")
            print(f"[SIMULATION] Email à {to_email} avec code {code} pour {purpose}")
            return True  # Simule un envoi réussi
        
        # Création du message
        msg = MIMEMultipart()
        msg['From'] = f"SUPRSS Security <{smtp_username}>"
        msg['Reply-To'] = "noreply@suprss.app"  
        msg['Sender'] = "SUPRSS Authentication System"
        msg['To'] = to_email
        
        if purpose == "login":
            msg['Subject'] = "🔐 Code de vérification SUPRSS"
            body = f"""
            <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563eb;">🔐 Vérification de connexion</h2>
                    <p>Votre code de vérification SUPRSS :</p>
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; color: #1f2937; letter-spacing: 4px;">{code}</span>
                    </div>
                    <p style="color: #666;">Ce code expire dans 10 minutes.</p>
                    <p style="color: #666; font-size: 12px;">Si vous n'avez pas demandé cette connexion, ignorez cet email.</p>
                </body>
            </html>
            """
        elif purpose == "oauth":
            msg['Subject'] = "🔗 Vérification OAuth SUPRSS"
            body = f"""
            <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #16a34a;">🔗 Vérification OAuth</h2>
                    <p>Code de vérification pour votre connexion via Google/GitHub :</p>
                    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; color: #166534; letter-spacing: 4px;">{code}</span>
                    </div>
                    <p style="color: #666;">Ce code expire dans 10 minutes.</p>
                </body>
            </html>
            """
        elif purpose == "enable_2fa":
            msg['Subject'] = "🔐 Activation de la 2FA SUPRSS"
            body = f"""
            <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #059669;">🔐 Activation de l'authentification double</h2>
                    <p>Vous avez demandé l'activation de la double authentification sur votre compte SUPRSS.</p>
                    <p>Code de vérification pour confirmer l'activation :</p>
                    <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; color: #065f46; letter-spacing: 4px;">{code}</span>
                    </div>
                    <p style="color: #666;">Ce code expire dans 10 minutes.</p>
                    <p style="color: #666; font-size: 12px;">Une fois activée, vous recevrez un code par email à chaque connexion.</p>
                </body>
            </html>
            """
        elif purpose == "disable_2fa":
            msg['Subject'] = "⚠️ Désactivation de la 2FA SUPRSS"
            body = f"""
            <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #dc2626;">⚠️ Désactivation de l'authentification double</h2>
                    <p>Vous avez demandé la désactivation de la double authentification sur votre compte SUPRSS.</p>
                    <p><strong>Attention :</strong> Cela réduira la sécurité de votre compte.</p>
                    <p>Code de vérification pour confirmer la désactivation :</p>
                    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; color: #991b1b; letter-spacing: 4px;">{code}</span>
                    </div>
                    <p style="color: #666;">Ce code expire dans 10 minutes.</p>
                </body>
            </html>
            """
        else:  # registration
            msg['Subject'] = "[OK] Confirmation d'inscription SUPRSS"
            body = f"""
            <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #dc2626;">[OK] Bienvenue sur SUPRSS !</h2>
                    <p>Code de vérification pour finaliser votre inscription :</p>
                    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; color: #991b1b; letter-spacing: 4px;">{code}</span>
                    </div>
                    <p style="color: #666;">Ce code expire dans 10 minutes.</p>
                </body>
            </html>
            """
        
        msg.attach(MIMEText(body, 'html'))
        
        # Envoi
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.sendmail(smtp_username, to_email, msg.as_string())
        
        print(f"[OK] Email envoye a {to_email}")
        return True
        
    except Exception as e:
        print(f"[ERREUR] Erreur envoi email: {str(e)}")
        return False

def get_code_expiry() -> datetime:
    """Retourne l'heure d'expiration (10 minutes)"""
    return datetime.utcnow() + timedelta(minutes=10)