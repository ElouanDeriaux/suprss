const API = "http://127.0.0.1:8000";
function $(id){return document.getElementById(id)}
function setText(el,t=""){if(el)el.textContent=t}
function disable(el,v){if(el)el.disabled=v}

// Ajouter le bouton de thème
document.addEventListener('DOMContentLoaded', function() {
  const themeContainer = document.getElementById('theme-button-container');
  if (themeContainer) {
    themeContainer.innerHTML = createThemeButton();
  }
});

const registerForm = $("register-form");
const regUsername = $("reg-username");
const regEmail = $("reg-email");
const regPassword = $("reg-password");
const registerSubmit = $("register-submit");
const registerError = $("register-error");
const registerSuccess = $("register-success");
const pwdHints = $("pwd-hints");

// Règles mot de passe
const PWD_RULES = {
  length: { test: (s)=>s.length>=8, label:"Au moins 8 caractères" },
  upper:  { test: (s)=>/[A-Z]/.test(s), label:"1 lettre majuscule" },
  lower:  { test: (s)=>/[a-z]/.test(s), label:"1 lettre minuscule" },
  digit:  { test: (s)=>/\d/.test(s),    label:"1 chiffre" },
  special:{ test: (s)=>/[^A-Za-z0-9]/.test(s), label:"1 caractère spécial" },
  nospace:{ test: (s)=>/^\S+$/.test(s), label:"Sans espace" },
};
function getPasswordChecks(pwd){
  return Object.fromEntries(Object.entries(PWD_RULES).map(([k,r])=>[k,r.test(pwd)]));
}
function isPasswordValid(pwd){ return Object.values(getPasswordChecks(pwd)).every(Boolean); }
function renderPasswordHints(pwd){
  const checks = getPasswordChecks(pwd);
  const rows = Object.entries(PWD_RULES).map(([k,rule])=>{
    const ok = checks[k];
    return `<li class="flex items-center gap-2 ${ok?"text-emerald-700":"text-red-600"}">
      <span class="inline-block w-4">${ok?"✓":"✗"}</span>${rule.label}
    </li>`;
  }).join("");
  pwdHints.innerHTML = `
    <div class="rounded border ${isPasswordValid(pwd)?"border-emerald-300 bg-emerald-50":"border-red-300 bg-red-50"} p-3">
      <p class="font-medium mb-2">Le mot de passe doit contenir :</p>
      <ul class="text-sm space-y-1">${rows}</ul>
    </div>`;
}
renderPasswordHints("");
regPassword?.addEventListener("input",()=>renderPasswordHints(regPassword.value));

// Submit
registerForm?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  setText(registerError,""); setText(registerSuccess,"");

  const username = regUsername.value.trim();
  const email = regEmail.value.trim().toLowerCase();
  const password = regPassword.value;

  if(!isPasswordValid(password)){
    renderPasswordHints(password);
    setText(registerError,"Le mot de passe n’est pas assez complexe.");
    return;
  }

  disable(registerSubmit,true);
  try{
    const res = await fetch(`${API}/users/`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    if(!res.ok){
      const data = await res.json().catch(()=> ({}));
      
      // Gestion des erreurs structurées du backend
      if(data?.detail?.code === "EMAIL_TAKEN"){
        setText(registerError, data.detail.message || "Email déjà utilisé.");
      } else if(data?.detail?.message) {
        setText(registerError, data.detail.message);
      } else if(data?.detail && String(data.detail).toLowerCase().includes("déjà")){
        setText(registerError,"Email déjà utilisé.");
      } else {
        setText(registerError, data?.detail || "Échec de l'inscription.");
      }
      return;
    }

    setText(registerSuccess,"Compte créé ! Redirection vers la page de connexion…");
    setTimeout(()=>{ window.location.href="index.html"; }, 1200);
  }catch{
    setText(registerError,"Erreur réseau. Réessayez.");
  }finally{
    disable(registerSubmit,false);
  }
});
