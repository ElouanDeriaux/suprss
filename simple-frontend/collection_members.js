const API = "http://localhost:8000";
const token = localStorage.getItem("token");
const url = new URL(window.location.href);
const collectionId = url.searchParams.get("id");

const auth = () => {
  if (!token) {
    alert("Session expirée, veuillez vous reconnecter");
    window.location.href = "index.html";
    return {};
  }
  return { Authorization: `Bearer ${token}` };
};

// Elements DOM
const collectionInfo = document.getElementById("collection-info");
const inviteForm = document.getElementById("invite-form");
const inviteEmail = document.getElementById("invite-email");
const inviteRole = document.getElementById("invite-role");
const inviteFeedback = document.getElementById("invite-feedback");
const membersLoading = document.getElementById("members-loading");
const membersList = document.getElementById("members-list");
const membersEmpty = document.getElementById("members-empty");
const confirmModal = document.getElementById("confirm-modal");
const confirmTitle = document.getElementById("confirm-title");
const confirmMessage = document.getElementById("confirm-message");
const confirmButton = document.getElementById("confirm-button");

let currentMembers = [];
let isOwner = false;

// Fonctions utilitaires
function getRoleLabel(role) {
  const labels = {
    owner: "Propriétaire",
    admin: "Administrateur", 
    editor: "Éditeur",
    viewer: "Lecteur"
  };
  return labels[role] || role;
}

function getRoleBadgeClass(role) {
  const classes = {
    owner: "bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200",
    admin: "bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200",
    editor: "bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200", 
    viewer: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
  };
  return classes[role] || "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200";
}

// Charger les informations de la collection et ses membres
async function loadMembers() {
  if (!collectionId) {
    alert("ID de collection manquant");
    window.location.href = "dashboard.html";
    return;
  }

  try {
    const res = await fetch(`${API}/collections/${collectionId}/members`, {
      headers: auth()
    });

    if (!res.ok) {
      throw new Error("Erreur lors du chargement des membres");
    }

    const data = await res.json();
    
    // Afficher les infos de la collection
    collectionInfo.textContent = `Collection: ${data.collection.name}`;
    
    currentMembers = data.members;
    
    // Déterminer si l'utilisateur actuel est le propriétaire
    const currentUser = await getCurrentUser();
    isOwner = data.members.some(m => m.is_owner && m.email === currentUser.email);
    
    await renderMembers();
    
  } catch (error) {
    console.error("Erreur:", error);
    membersLoading.textContent = "Erreur lors du chargement des membres";
  }
}

async function getCurrentUser() {
  const res = await fetch(`${API}/me`, { headers: auth() });
  if (!res.ok) throw new Error("Erreur utilisateur");
  return res.json();
}

async function renderMembers() {
  membersLoading.classList.add("hidden");
  
  if (currentMembers.length === 0) {
    membersEmpty.classList.remove("hidden");
    membersList.classList.add("hidden");
    return;
  }
  
  membersEmpty.classList.add("hidden");
  membersList.classList.remove("hidden");
  
  const currentUserId = await getCurrentUserId();
  
  membersList.innerHTML = currentMembers.map(member => `
    <div class="p-4 border-b dark:border-gray-700 last:border-b-0 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
          <span class="text-blue-600 dark:text-blue-200 font-semibold">${member.username.charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <div class="font-medium text-gray-900 dark:text-gray-100">${escapeHtml(member.username)}</div>
          <div class="text-sm text-gray-500 dark:text-gray-400">${escapeHtml(member.email)}</div>
        </div>
      </div>
      
      <div class="flex items-center gap-3">
        <span class="px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(member.role)}">
          ${getRoleLabel(member.role)}
        </span>
        
        ${isOwner && !member.is_owner ? `
          <div class="flex gap-2">
            <select onchange="changeRole(${member.id}, this.value)" 
                    class="text-sm border dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <option value="viewer" ${member.role === 'viewer' ? 'selected' : ''}>Lecteur</option>
              <option value="editor" ${member.role === 'editor' ? 'selected' : ''}>Éditeur</option>
              <option value="admin" ${member.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
            <button onclick="removeMember(${member.id}, '${escapeHtml(member.username)}')"
                    class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium">
              Retirer
            </button>
          </div>
        ` : ''}
        
        ${!isOwner && !member.is_owner && member.id === currentUserId ? `
          <button onclick="leaveMember(${member.id})"
                  class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium">
            Quitter
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  return str.replace(/[&<>\"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}

// Invitation de nouveaux membres
inviteForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  if (!isOwner) {
    showFeedback("Seul le propriétaire peut inviter des membres", "error");
    return;
  }
  
  const email = inviteEmail.value.trim();
  const role = inviteRole.value;
  
  if (!email) {
    showFeedback("Veuillez saisir un email", "error");
    return;
  }
  
  try {
    const formData = new FormData();
    formData.append("email", email);
    formData.append("role", role);
    
    const res = await fetch(`${API}/collections/${collectionId}/share`, {
      method: "POST",
      headers: auth(),
      body: formData
    });
    
    if (res.ok) {
      const result = await res.json();
      showFeedback(result.message, "success");
      inviteEmail.value = "";
      await loadMembers(); // Recharger la liste
    } else {
      const error = await res.text();
      showFeedback(error, "error");
    }
  } catch (error) {
    console.error("Erreur invitation:", error);
    showFeedback("Erreur réseau lors de l'invitation", "error");
  }
});

function showFeedback(message, type) {
  inviteFeedback.className = `mt-3 text-sm ${type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`;
  inviteFeedback.textContent = message;
  setTimeout(() => {
    inviteFeedback.textContent = "";
  }, 5000);
}

// Changer le rôle d'un membre
async function changeRole(userId, newRole) {
  if (!isOwner) {
    alert("Seul le propriétaire peut modifier les rôles");
    return;
  }
  
  try {
    const formData = new FormData();
    formData.append("role", newRole);
    
    const res = await fetch(`${API}/collections/${collectionId}/members/${userId}`, {
      method: "PUT",
      headers: auth(),
      body: formData
    });
    
    if (res.ok) {
      await loadMembers(); // Recharger la liste
      showFeedback("Rôle mis à jour avec succès", "success");
    } else {
      const error = await res.text();
      alert(`Erreur: ${error}`);
      await loadMembers(); // Recharger pour annuler le changement visuel
    }
  } catch (error) {
    console.error("Erreur changement rôle:", error);
    alert("Erreur réseau");
    await loadMembers();
  }
}

// Retirer un membre
function removeMember(userId, username) {
  showConfirmModal(
    "Retirer le membre",
    `Êtes-vous sûr de vouloir retirer ${username} de cette collection ?`,
    () => doRemoveMember(userId)
  );
}

function leaveMember(userId) {
  showConfirmModal(
    "Quitter la collection",
    "Êtes-vous sûr de vouloir quitter cette collection ?",
    () => doRemoveMember(userId)
  );
}

async function doRemoveMember(userId) {
  try {
    const res = await fetch(`${API}/collections/${collectionId}/members/${userId}`, {
      method: "DELETE",
      headers: auth()
    });
    
    if (res.ok) {
      const result = await res.json();
      alert(result.message);
      
      // Si l'utilisateur se retire lui-même, rediriger vers le dashboard
      const currentUser = await getCurrentUser();
      const removedMember = currentMembers.find(m => m.id === userId);
      if (removedMember && removedMember.email === currentUser.email) {
        window.location.href = "dashboard.html";
      } else {
        await loadMembers(); // Recharger la liste
      }
    } else {
      const error = await res.text();
      alert(`Erreur: ${error}`);
    }
  } catch (error) {
    console.error("Erreur suppression membre:", error);
    alert("Erreur réseau");
  }
  
  closeConfirmModal();
}

// Modal de confirmation
function showConfirmModal(title, message, confirmCallback) {
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmButton.onclick = confirmCallback;
  confirmModal.classList.remove("hidden");
}

function closeConfirmModal() {
  confirmModal.classList.add("hidden");
}

// Récupérer l'ID de l'utilisateur actuel
let currentUserId = null;

async function getCurrentUserId() {
  if (currentUserId === null) {
    try {
      const user = await getCurrentUser();
      currentUserId = user.id;
    } catch (error) {
      console.error("Erreur récupération utilisateur:", error);
    }
  }
  return currentUserId;
}

// Initialisation
document.addEventListener("DOMContentLoaded", async () => {
  if (!token) {
    window.location.href = "index.html";
    return;
  }
  
  await loadMembers();
});

// Fonctions globales
window.changeRole = changeRole;
window.removeMember = removeMember;
window.leaveMember = leaveMember;
window.closeConfirmModal = closeConfirmModal;