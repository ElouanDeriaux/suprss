// settings.js
const API = "http://localhost:8000";

// Éléments DOM
const $ = (id) => document.getElementById(id);
const usernameDisplay = $("username-display");
const profileUsername = $("profile-username");
const profileEmail = $("profile-email");
const saveUsernameBtn = $("save-username-btn");

const twofaStatus = $("2fa-status");
const toggle2faBtn = $("toggle-2fa-btn");
const twofaEmailVerification = $("2fa-email-verification");
const twofaVerificationMessage = $("2fa-verification-message");
const twofaVerificationCode = $("2fa-verification-code");
const confirm2faBtn = $("confirm-2fa-btn");
const cancel2faBtn = $("cancel-2fa-btn");

const changePasswordBtn = $("change-password-btn");
const deleteAccountBtn = $("delete-account-btn");

// Éléments import/export
const exportOpmlBtn = $("export-opml-btn");
const importOpmlBtn = $("import-opml-btn");
const importModal = $("import-modal");
const opmlFile = $("opml-file");
const importFeedback = $("import-feedback");
const confirmImportBtn = $("confirm-import-btn");
const cancelImportBtn = $("cancel-import-btn");

// Éléments interface thème
const themeRadios = document.querySelectorAll('input[name="theme"]');
const themeFeedback = $("theme-feedback");

// Éléments changement de mot de passe
const passwordChangeForm = $("password-change-form");
const passwordChangeTrigger = $("password-change-trigger");
const newPasswordInput = $("new-password");
const btnSavePassword = $("btn-save-password");
const btnCancelPassword = $("btn-cancel-password");
const passwordFeedback = $("password-feedback");

// Modal
const confirmModal = $("confirm-modal");
const modalTitle = $("modal-title");
const modalMessage = $("modal-message");
const modalCancel = $("modal-cancel");
const modalConfirm = $("modal-confirm");

// Toast
const toast = $("toast");
const toastContent = $("toast-content");

// Variables d'état
let userInfo = null;
let pending2faAction = null; // 'enable' ou 'disable'
let originalUsername = "";

// Utils
function showToast(message, type = 'info') {
  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
    warning: 'bg-yellow-600'
  };
  
  toastContent.className = `px-6 py-3 rounded-lg shadow-lg text-white font-medium ${colors[type] || colors.info}`;
  toastContent.textContent = message;
  
  toast.classList.remove("hidden");
  toast.classList.add("flex");
  
  setTimeout(() => {
    toast.classList.add("hidden");
    toast.classList.remove("flex");
  }, 4000);
}

function showModal(title, message, onConfirm, confirmText = 'Confirmer', confirmClass = 'bg-red-600 hover:bg-red-700') {
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modalConfirm.textContent = confirmText;
  modalConfirm.className = `px-4 py-2 text-white rounded-lg transition-colors ${confirmClass}`;
  
  // Reset events
  modalConfirm.onclick = null;
  modalCancel.onclick = null;
  
  modalConfirm.onclick = () => {
    confirmModal.classList.add("hidden");
    onConfirm();
  };
  modalCancel.onclick = () => confirmModal.classList.add("hidden");
  
  confirmModal.classList.remove("hidden");
  confirmModal.classList.add("flex");
}

async function apiCall(url, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };
  
  const response = await fetch(`${API}${url}`, {
    ...options,
    headers
  });
  
  if (!response.ok) {
    let errorMessage = "Erreur inconnue";
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
    } catch {
      errorMessage = await response.text();
    }
    throw new Error(errorMessage);
  }
  
  return response.json();
}

// Charger les informations utilisateur
async function loadUserInfo() {
  try {
    userInfo = await apiCall("/me");
    
    usernameDisplay.textContent = userInfo.username;
    profileUsername.value = userInfo.username;
    profileEmail.value = userInfo.email;
    originalUsername = userInfo.username;
    
    updateTwoFAStatus();
    updateUsernameButton();
    initializeThemeInterface();
    
  } catch (error) {
    console.error("Erreur chargement profil:", error);
    showToast(`Erreur: ${error.message}`, "error");
  }
}

function updateTwoFAStatus() {
  if (!userInfo) return;
  
  if (userInfo.is_2fa_enabled) {
    twofaStatus.textContent = "Activée";
    twofaStatus.className = "px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    toggle2faBtn.textContent = "Désactiver";
    toggle2faBtn.className = "px-4 py-2 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors";
    toggle2faBtn.disabled = false;
  } else {
    twofaStatus.textContent = "Désactivée";
    twofaStatus.className = "px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    toggle2faBtn.textContent = "Activer";
    toggle2faBtn.className = "px-4 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors";
    toggle2faBtn.disabled = false;
  }
}

// Gestion nom d'utilisateur
function updateUsernameButton() {
  if (!profileUsername || !saveUsernameBtn) return;
  
  const currentValue = profileUsername.value.trim();
  const hasChanged = currentValue !== originalUsername;
  const isValid = currentValue.length >= 2 && currentValue.length <= 50;
  
  saveUsernameBtn.disabled = !hasChanged || !isValid;
  
  if (hasChanged && !isValid) {
    if (currentValue.length < 2) {
      profileUsername.style.borderColor = "#ef4444";
    } else if (currentValue.length > 50) {
      profileUsername.style.borderColor = "#ef4444";
    }
  } else {
    profileUsername.style.borderColor = "";
  }
}

async function saveUsername() {
  const newUsername = profileUsername.value.trim();
  
  if (newUsername === originalUsername) {
    showToast("Aucun changement à sauvegarder", "info");
    return;
  }
  
  if (newUsername.length < 2 || newUsername.length > 50) {
    showToast("Le nom d'utilisateur doit contenir entre 2 et 50 caractères", "error");
    return;
  }
  
  try {
    saveUsernameBtn.disabled = true;
    saveUsernameBtn.textContent = "Sauvegarde...";
    
    const result = await apiCall("/settings/username", {
      method: "POST",
      body: JSON.stringify({ new_username: newUsername })
    });
    
    showToast(result.message, "success");
    
    // Mettre à jour les données locales
    originalUsername = newUsername;
    userInfo.username = newUsername;
    usernameDisplay.textContent = newUsername;
    updateUsernameButton();
    
  } catch (error) {
    console.error("Erreur changement nom:", error);
    showToast(`Erreur: ${error.message}`, "error");
    profileUsername.value = originalUsername; // Restaurer l'ancien nom
  } finally {
    saveUsernameBtn.disabled = false;
    saveUsernameBtn.textContent = "Sauvegarder";
  }
}

// Gestion 2FA
async function toggle2FA() {
  if (!userInfo) return;
  
  const isEnabling = !userInfo.is_2fa_enabled;
  pending2faAction = isEnabling ? 'enable' : 'disable';
  
  try {
    toggle2faBtn.disabled = true;
    toggle2faBtn.textContent = "Envoi...";
    
    const endpoint = isEnabling ? "/settings/2fa/enable" : "/settings/2fa/disable";
    const result = await apiCall(endpoint, { method: "POST" });
    
    twofaVerificationMessage.textContent = result.message;
    twofaEmailVerification.classList.remove("hidden");
    twofaVerificationCode.value = "";
    twofaVerificationCode.focus();
    
    showToast("Code de vérification envoyé par email", "info");
    
  } catch (error) {
    console.error("Erreur 2FA:", error);
    showToast(`Erreur: ${error.message}`, "error");
    toggle2faBtn.disabled = false;
    updateTwoFAStatus();
  }
}

async function confirm2FA() {
  if (!pending2faAction) return;
  
  const code = twofaVerificationCode.value.trim();
  if (code.length !== 6) {
    showToast("Le code doit contenir 6 chiffres", "error");
    return;
  }
  
  try {
    confirm2faBtn.disabled = true;
    confirm2faBtn.textContent = "Vérification...";
    
    const endpoint = `/settings/2fa/confirm-${pending2faAction}`;
    const result = await apiCall(endpoint, {
      method: "POST",
      body: JSON.stringify({ 
        email: userInfo.email, 
        code: code 
      })
    });
    
    showToast(result.message, "success");
    
    // Mettre à jour le statut
    userInfo.is_2fa_enabled = pending2faAction === 'enable';
    updateTwoFAStatus();
    cancel2FA();
    
  } catch (error) {
    console.error("Erreur confirmation 2FA:", error);
    showToast(`Erreur: ${error.message}`, "error");
    confirm2faBtn.disabled = false;
    confirm2faBtn.textContent = "Confirmer";
  }
}

function cancel2FA() {
  twofaEmailVerification.classList.add("hidden");
  twofaVerificationCode.value = "";
  confirm2faBtn.disabled = false;
  confirm2faBtn.textContent = "Confirmer";
  toggle2faBtn.disabled = false;
  pending2faAction = null;
  updateTwoFAStatus();
}

// Changement de mot de passe
const PWD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function showPasswordForm() {
  passwordChangeTrigger.classList.add("hidden");
  passwordChangeForm.classList.remove("hidden");
  newPasswordInput.value = "";
  updatePwdChecklist("");
  passwordFeedback.textContent = "";
  newPasswordInput.focus();
}

function hidePasswordForm() {
  passwordChangeTrigger.classList.remove("hidden");
  passwordChangeForm.classList.add("hidden");
  newPasswordInput.value = "";
  passwordFeedback.textContent = "";
}

function updatePwdChecklist(val) {
  const ok = {
    len: val.length >= 8,
    maj: /[A-Z]/.test(val),
    min: /[a-z]/.test(val),
    num: /\d/.test(val),
    spe: /[^A-Za-z0-9]/.test(val),
  };
  const list = document.querySelectorAll("#pwd-checklist li");
  list.forEach((li) => {
    const k = li.getAttribute("data-k");
    li.className = ok[k] ? "text-emerald-700 dark:text-emerald-400" : "text-gray-600 dark:text-gray-400";
    li.textContent = (ok[k] ? "✓ " : "• ") + li.textContent.replace(/^(\W )/, "");
  });
  btnSavePassword.disabled = !PWD_RULE.test(val);
}

async function submitPasswordChange() {
  const pwd = newPasswordInput.value;
  passwordFeedback.textContent = "";
  
  if (!PWD_RULE.test(pwd)) {
    passwordFeedback.className = "text-sm mb-4 text-red-600 dark:text-red-400";
    passwordFeedback.textContent = "Le mot de passe ne respecte pas toutes les exigences";
    return;
  }

  try {
    btnSavePassword.disabled = true;
    btnSavePassword.textContent = "Enregistrement...";
    
    await apiCall("/change-password", {
      method: "POST",
      body: JSON.stringify({ new_password: pwd })
    });
    
    passwordFeedback.className = "text-sm mb-4 text-green-600 dark:text-green-400";
    passwordFeedback.textContent = "✅ Mot de passe mis à jour avec succès";
    showToast("Mot de passe mis à jour", "success");
    
    setTimeout(() => hidePasswordForm(), 1500);
    
  } catch (error) {
    passwordFeedback.className = "text-sm mb-4 text-red-600 dark:text-red-400";
    passwordFeedback.textContent = `❌ Erreur: ${error.message}`;
    showToast(`Erreur: ${error.message}`, "error");
  } finally {
    btnSavePassword.disabled = false;
    btnSavePassword.textContent = "Enregistrer";
  }
}

// Suppression de compte
function deleteAccount() {
  showModal(
    "⚠️ Supprimer le compte", 
    "ATTENTION: Cette action est irréversible et supprimera définitivement toutes vos données (collections, flux, articles, archives). Êtes-vous absolument sûr ?",
    () => {
      // Second niveau de confirmation
      const confirmText = prompt("Tapez 'SUPPRIMER' pour confirmer la suppression de votre compte:");
      if (confirmText === 'SUPPRIMER') {
        performDeleteAccount();
      } else if (confirmText !== null) {
        showToast("Suppression annulée (texte incorrect)", "warning");
      }
    }
  );
}

async function performDeleteAccount() {
  try {
    await apiCall("/users/me", { method: "DELETE" });
    showToast("Compte supprimé", "success");
    localStorage.removeItem("token");
    setTimeout(() => window.location.href = "index.html", 2000);
  } catch (error) {
    showToast(`Erreur: ${error.message}`, "error");
  }
}

// Gestion des préférences de thème
function initializeThemeInterface() {
  if (!userInfo) return;
  
  // Sélectionner le thème actuel
  const currentTheme = userInfo.theme_preference || "auto";
  const currentRadio = document.querySelector(`input[name="theme"][value="${currentTheme}"]`);
  if (currentRadio) {
    currentRadio.checked = true;
    updateThemeVisualFeedback(currentRadio);
  }
  
  // Ajouter les event listeners
  themeRadios.forEach(radio => {
    radio.addEventListener('change', handleThemeChange);
  });
}

function updateThemeVisualFeedback(selectedRadio) {
  // Mettre à jour l'apparence visuelle
  document.querySelectorAll('.theme-option').forEach(option => {
    const radio = option.querySelector('input[type="radio"]');
    const card = option.querySelector('.theme-card');
    const check = option.querySelector('.theme-check');
    
    if (radio.checked) {
      card.classList.add('border-blue-500', 'dark:border-blue-400', 'bg-blue-50', 'dark:bg-blue-900/20');
      card.classList.remove('border-gray-300', 'dark:border-gray-600');
      check.classList.remove('hidden');
    } else {
      card.classList.remove('border-blue-500', 'dark:border-blue-400', 'bg-blue-50', 'dark:bg-blue-900/20');
      card.classList.add('border-gray-300', 'dark:border-gray-600');
      check.classList.add('hidden');
    }
  });
}

async function handleThemeChange(event) {
  const selectedTheme = event.target.value;
  
  try {
    // Sauvegarder sur le serveur
    const result = await apiCall("/settings/theme", {
      method: "POST",
      body: JSON.stringify({ theme: selectedTheme })
    });
    
    // Mettre à jour l'interface
    updateThemeVisualFeedback(event.target);
    
    // Appliquer le nouveau thème immédiatement
    applyTheme(selectedTheme);
    
    // Feedback utilisateur
    themeFeedback.className = "text-sm mt-3 text-green-600 dark:text-green-400";
    themeFeedback.textContent = `✅ ${result.message}`;
    
    // Mettre à jour les données locales
    userInfo.theme_preference = selectedTheme;
    
    setTimeout(() => {
      themeFeedback.textContent = "";
    }, 3000);
    
  } catch (error) {
    console.error("Erreur sauvegarde thème:", error);
    themeFeedback.className = "text-sm mt-3 text-red-600 dark:text-red-400";
    themeFeedback.textContent = `❌ Erreur: ${error.message}`;
    
    // Remettre l'ancien choix
    const previousTheme = userInfo.theme_preference || "auto";
    const previousRadio = document.querySelector(`input[name="theme"][value="${previousTheme}"]`);
    if (previousRadio) {
      previousRadio.checked = true;
      updateThemeVisualFeedback(previousRadio);
    }
  }
}

function applyTheme(theme) {
  // Utiliser la logique de theme.js pour appliquer le thème
  if (theme === "light") {
    document.documentElement.classList.remove("dark");
    localStorage.theme = "light";
  } else if (theme === "dark") {
    document.documentElement.classList.add("dark");
    localStorage.theme = "dark";
  } else { // auto
    localStorage.removeItem("theme");
    // Appliquer selon les préférences système
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }
}

// Export OPML
async function exportOPML() {
  try {
    exportOpmlBtn.disabled = true;
    exportOpmlBtn.textContent = "Exportation...";
    
    const response = await apiCall("/export/opml");
    
    // Créer un blob avec le contenu OPML
    const blob = new Blob([response.content], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    
    // Créer un lien de téléchargement
    const a = document.createElement("a");
    a.href = url;
    a.download = response.filename || "suprss-export.opml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast("Export OPML téléchargé avec succès", "success");
    
  } catch (error) {
    console.error("Erreur export:", error);
    showToast(`Erreur lors de l'export: ${error.message}`, "error");
  } finally {
    exportOpmlBtn.disabled = false;
    exportOpmlBtn.innerHTML = '<span aria-hidden="true">💾</span> Exporter en OPML';
  }
}

// Import OPML
function openImportDialog() {
  importModal.classList.remove("hidden");
  importModal.classList.add("flex");
  opmlFile.value = "";
  importFeedback.textContent = "";
  confirmImportBtn.disabled = true;
}

function closeImportDialog() {
  importModal.classList.add("hidden");
  importModal.classList.remove("flex");
  opmlFile.value = "";
  importFeedback.textContent = "";
  confirmImportBtn.disabled = true;
}

function updateImportButton() {
  confirmImportBtn.disabled = !opmlFile.files.length;
}

async function submitOPMLImport() {
  const file = opmlFile.files[0];
  if (!file) return;
  
  const formData = new FormData();
  formData.append("file", file);
  
  try {
    confirmImportBtn.disabled = true;
    confirmImportBtn.textContent = "Importation...";
    importFeedback.className = "text-sm mb-3 text-blue-600 dark:text-blue-400";
    importFeedback.textContent = "⏳ Import en cours...";
    
    const response = await fetch(`${API}/import/opml`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      let errorMessage = "Erreur inconnue";
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
      } catch {
        errorMessage = await response.text();
      }
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    
    importFeedback.className = "text-sm mb-3 text-green-600 dark:text-green-400";
    importFeedback.textContent = `✅ ${result.message}`;
    
    showToast("Import OPML terminé avec succès", "success");
    
    setTimeout(() => {
      closeImportDialog();
    }, 2000);
    
  } catch (error) {
    console.error("Erreur import:", error);
    importFeedback.className = "text-sm mb-3 text-red-600 dark:text-red-400";
    importFeedback.textContent = `❌ Erreur: ${error.message}`;
    showToast(`Erreur lors de l'import: ${error.message}`, "error");
  } finally {
    confirmImportBtn.disabled = false;
    confirmImportBtn.textContent = "Importer";
  }
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  loadUserInfo();
  
  // Event listeners nom d'utilisateur
  if (profileUsername) {
    profileUsername.addEventListener("input", updateUsernameButton);
  }
  if (saveUsernameBtn) {
    saveUsernameBtn.addEventListener("click", saveUsername);
  }
  
  toggle2faBtn.addEventListener("click", toggle2FA);
  confirm2faBtn.addEventListener("click", confirm2FA);
  cancel2faBtn.addEventListener("click", cancel2FA);
  
  // Event listeners changement de mot de passe
  changePasswordBtn.addEventListener("click", showPasswordForm);
  btnSavePassword.addEventListener("click", submitPasswordChange);
  btnCancelPassword.addEventListener("click", hidePasswordForm);
  newPasswordInput.addEventListener("input", (e) => {
    updatePwdChecklist(e.target.value);
  });
  
  deleteAccountBtn.addEventListener("click", deleteAccount);
  
  // Event listeners import/export
  exportOpmlBtn.addEventListener("click", exportOPML);
  importOpmlBtn.addEventListener("click", openImportDialog);
  confirmImportBtn.addEventListener("click", submitOPMLImport);
  cancelImportBtn.addEventListener("click", closeImportDialog);
  opmlFile.addEventListener("change", updateImportButton);
  
  // Écouter Enter dans le champ code 2FA
  twofaVerificationCode.addEventListener("keypress", (e) => {
    if (e.key === "Enter") confirm2FA();
  });
  
  // Écouter Enter dans le champ mot de passe
  newPasswordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !btnSavePassword.disabled) submitPasswordChange();
  });
  
  // Fermer modals en cliquant en dehors
  confirmModal.addEventListener("click", (e) => {
    if (e.target === confirmModal) {
      confirmModal.classList.add("hidden");
    }
  });
  
  importModal.addEventListener("click", (e) => {
    if (e.target === importModal) {
      closeImportDialog();
    }
  });
});