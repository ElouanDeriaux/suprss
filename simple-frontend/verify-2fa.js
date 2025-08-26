// verify-2fa.js
const API_BASE = 'http://localhost:8000';

// Ajouter le bouton de thème
document.addEventListener('DOMContentLoaded', function() {
  const themeContainer = document.getElementById('theme-button-container');
  if (themeContainer) {
    themeContainer.innerHTML = createThemeButton();
  }
});

// Récupérer les paramètres URL
const urlParams = new URLSearchParams(window.location.search);
const email = urlParams.get('email');
const tempToken = urlParams.get('temp_token');
const source = urlParams.get('source'); // 'google', 'github', ou null

// Rediriger si pas d'email
if (!email) {
    window.location.href = 'index.html';
}

// Afficher l'email
document.getElementById('email-display').value = email;

// Personnaliser le message selon la source OAuth
const authMessageEl = document.getElementById('auth-message');
if (source === 'google') {
    authMessageEl.textContent = '🔐 Connexion Google réussie ! Entrez le code envoyé par email pour finaliser votre connexion.';
} else if (source === 'github') {
    authMessageEl.textContent = '🔐 Connexion GitHub réussie ! Entrez le code envoyé par email pour finaliser votre connexion.';
} else {
    authMessageEl.textContent = 'Entrez le code de vérification envoyé par email';
}

// Variables globales
let countdownInterval;
let timeLeft = 600; // 10 minutes en secondes

// Démarrer le compte à rebours
function startCountdown() {
    countdownInterval = setInterval(() => {
        timeLeft--;
        
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        document.getElementById('countdown').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            showMessage('Code expiré. Veuillez demander un nouveau code.', 'error');
            document.getElementById('verify-form').style.display = 'none';
        }
    }, 1000);
}

// Afficher un message
function showMessage(text, type = 'info') {
    const messageEl = document.getElementById('message');
    messageEl.className = `mt-4 p-3 rounded text-sm ${
        type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
        type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
        'bg-blue-50 text-blue-700 border border-blue-200'
    }`;
    messageEl.textContent = text;
    messageEl.classList.remove('hidden');
}

// Masquer le message
function hideMessage() {
    document.getElementById('message').classList.add('hidden');
}

// Gestion de la saisie du code (auto-format)
document.getElementById('verification-code').addEventListener('input', function(e) {
    // Ne garder que les chiffres
    let value = e.target.value.replace(/[^0-9]/g, '');
    
    // Limiter à 6 caractères
    if (value.length > 6) {
        value = value.slice(0, 6);
    }
    
    e.target.value = value;
    
    // Auto-submit si 6 chiffres
    if (value.length === 6) {
        setTimeout(() => {
            document.getElementById('verify-form').dispatchEvent(new Event('submit'));
        }, 100);
    }
});

// Vérification du code
document.getElementById('verify-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const code = document.getElementById('verification-code').value;
    
    if (code.length !== 6) {
        showMessage('Le code doit contenir exactement 6 chiffres.', 'error');
        return;
    }
    
    // UI loading
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const verifyText = document.getElementById('verify-text');
    const verifyLoading = document.getElementById('verify-loading');
    
    submitBtn.disabled = true;
    verifyText.classList.add('hidden');
    verifyLoading.classList.remove('hidden');
    hideMessage();
    
    try {
        const response = await fetch(`${API_BASE}/auth/verify-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                code: code,
                temp_token: tempToken
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('✅ Connexion réussie ! Redirection...', 'success');
            
            // Stocker le token JWT
            localStorage.setItem('token', data.access_token);
            
            // Rediriger vers le dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            
        } else {
            showMessage(data.detail || 'Code invalide ou expiré.', 'error');
        }
        
    } catch (error) {
        console.error('Erreur vérification:', error);
        showMessage('Erreur de connexion. Réessayez.', 'error');
    } finally {
        // Restaurer UI
        submitBtn.disabled = false;
        verifyText.classList.remove('hidden');
        verifyLoading.classList.add('hidden');
    }
});

// Renvoyer le code
document.getElementById('resend-code').addEventListener('click', async function(e) {
    e.preventDefault();
    
    const btn = e.target;
    const originalText = btn.textContent;
    
    btn.textContent = 'Envoi...';
    btn.disabled = true;
    hideMessage();
    
    try {
        const formData = new FormData();
        formData.append('email', email);
        
        const response = await fetch(`${API_BASE}/auth/send-code`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('📧 Nouveau code envoyé par email !', 'success');
            
            // Redémarrer le countdown
            clearInterval(countdownInterval);
            timeLeft = 600;
            startCountdown();
            
            // Vider le champ code
            document.getElementById('verification-code').value = '';
            
        } else {
            showMessage(data.detail || 'Erreur lors de l\'envoi du code.', 'error');
        }
        
    } catch (error) {
        console.error('Erreur renvoi code:', error);
        showMessage('Erreur de connexion.', 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
});

// Focus automatique sur le champ code
document.getElementById('verification-code').focus();

// Démarrer le compte à rebours
startCountdown();