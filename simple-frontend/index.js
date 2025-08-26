const API = "http://localhost:8000";

function $(id) { return document.getElementById(id); }
function setText(el, text = "") { if (el) el.textContent = text; }
function disable(el, v) { if (el) el.disabled = v; }

// Ajouter le bouton de thème
document.addEventListener('DOMContentLoaded', function() {
  const themeContainer = document.getElementById('theme-button-container');
  if (themeContainer) {
    themeContainer.innerHTML = createThemeButton();
  }
});

const loginForm = $("login-form");
const loginEmail = $("login-email");
const loginPassword = $("login-password");
const loginSubmit = $("login-submit");
const loginError = $("login-error");
const oauthTip = $("oauth-tip");

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  setText(loginError, "");
  disable(loginSubmit, true);
  try {
    const form = new URLSearchParams();
    form.set("username", loginEmail.value.trim());
    form.set("password", loginPassword.value);

    const res = await fetch(`${API}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    if (!res.ok) {
      if (res.status === 401) {
        const data = await res.json().catch(() => ({}));
        if (data?.detail?.message) {
          setText(loginError, data.detail.message);
        } else {
          setText(loginError, "Identifiants invalides.");
        }
      } else {
        setText(loginError, "Impossible de se connecter.");
      }
      return;
    }

    const data = await res.json();
    
    // Si 2FA requise, rediriger vers la page de vérification
    if (data.requires_2fa) {
      const email = loginEmail.value.trim();
      const tempToken = data.temp_token;
      window.location.href = `verify-2fa.html?email=${encodeURIComponent(email)}&temp_token=${encodeURIComponent(tempToken)}`;
      return;
    }
    
    // Sinon, connexion directe
    localStorage.setItem("token", data.access_token);
    window.location.href = "dashboard.html";
  } catch {
    setText(loginError, "Erreur réseau. Réessayez.");
  } finally {
    disable(loginSubmit, false);
  }
});

// Tip pendant la redirection OAuth
["oauth-google", "oauth-github"].forEach(id => {
  const a = $(id);
  a?.addEventListener("click", () => oauthTip?.classList.remove("hidden"));
});
