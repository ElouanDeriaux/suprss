const API = "http://localhost:8000";
const token = localStorage.getItem("token");
function authHeaders(extra = {}) { return { Authorization: `Bearer ${token}`, ...extra }; }

// Ajouter le bouton de thème
document.addEventListener('DOMContentLoaded', function() {
  const themeContainer = document.getElementById('theme-button-container');
  if (themeContainer) {
    themeContainer.innerHTML = createThemeButton();
  }
});

const url = new URL(window.location.href);
const feedId = url.searchParams.get("id");

const list = document.getElementById("list");
const searchInput = document.getElementById("search");
const filterRead = document.getElementById("filter-read");
const filterStarred = document.getElementById("filter-starred");
const btnMore = document.getElementById("load-more");
const btnAllRead = document.getElementById("mark-all-read");
const btnAllUnread = document.getElementById("mark-all-unread");
const btnRefresh = document.getElementById("refresh-feed");
const toast = document.getElementById("toast");

let offset = 0;
const limit = 20;
let lastQuery = { q: "", read: "", starred: "" };
let currentUserId = null;

// cache des articles déjà archivés (Set d'IDs d'articles)
let archivedIds = new Set();

// Récupérer les infos de l'utilisateur actuel
async function getCurrentUser() {
  if (currentUserId !== null) return currentUserId;
  
  try {
    const res = await fetch(`${API}/me`, { headers: authHeaders() });
    if (res.ok) {
      const user = await res.json();
      currentUserId = user.id;
      return currentUserId;
    }
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error);
  }
  return null;
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add("hidden"), 1300);
}

function stripHTML(s = "") {
  const tmp = document.createElement("div");
  tmp.innerHTML = s;
  return (tmp.textContent || tmp.innerText || "").replace(/\s+/g, " ").trim();
}

async function loadArchivedIdsForFeed(feedId) {
  archivedIds = new Set();
  try {
    // on récupère jusqu'à 1000 archives du feed (suffisant pour ton usage)
    const u = new URL(`${API}/archive`);
    u.searchParams.set("feed_id", feedId);
    u.searchParams.set("limit", "1000");
    u.searchParams.set("offset", "0");
    const res = await fetch(u, { headers: authHeaders() });
    if (!res.ok) return;
    const rows = await res.json();
    rows.forEach(r => {
      // Maintenant qu'on a article_id dans ArchiveOut, on peut utiliser ça
      if (r.article_id) {
        archivedIds.add(r.article_id);
      } else if (r.link) {
        // Fallback sur le lien si article_id n'est pas disponible
        archivedIds.add(r.link);
      }
    });
  } catch (error) {
    console.error("Erreur lors du chargement des archives:", error);
  }
}

function isArchived(article) {
  // Priorité à l'ID de l'article, sinon fallback sur le lien
  return archivedIds.has(article.id) || (article.link && archivedIds.has(article.link));
}

async function fetchPage({ append = false } = {}) {
  const params = new URLSearchParams({ feed_id: feedId, limit, offset });
  if (lastQuery.q) params.set("q", lastQuery.q);
  if (lastQuery.read) params.set("read", lastQuery.read);
  if (lastQuery.starred) params.set("starred", lastQuery.starred);

  const res = await fetch(`${API}/articles/?${params.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) return;
  const data = await res.json();
  if (!append) list.innerHTML = "";

  for (const a of data) {
    const isRead = !!a.read;

    const card = document.createElement("div");
    card.className =
      "rounded border p-4 flex gap-3 items-start bg-white dark:bg-gray-800 transition-colors " +
      (isRead ? "bg-emerald-50/60 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700" : "border-gray-200 dark:border-gray-600");

    // Colonne gauche : pastille + checkbox
    const left = document.createElement("div");
    left.className = "flex flex-col items-center gap-2";

    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = isRead;
    chk.className = "mt-1 w-4 h-4";
    chk.title = a.read ? "Marqué comme lu" : "Marqué comme non lu";
    left.appendChild(chk);

    const pill = document.createElement("span");
    pill.className =
      "text-[11px] px-2 py-0.5 rounded-full " +
      (isRead
        ? "bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-600"
        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600");
    pill.textContent = isRead ? "Lu" : "Non lu";
    left.appendChild(pill);

    card.appendChild(left);

    // Corps
    const body = document.createElement("div");
    body.className = "flex-1";

    const title = document.createElement("a");
    title.href = a.link || "#";
    title.target = "_blank";
    title.rel = "noreferrer";
    title.textContent = a.title || "(sans titre)";
    title.className =
      "font-semibold hover:underline " +
      (isRead ? "line-through text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-white");

    // 1) Marquage automatique en "Lu" au clic sur le titre
    title.addEventListener("click", async (e) => {
      // on laisse s’ouvrir dans un nouvel onglet,
      // mais on déclenche immédiatement le POST côté API + MAJ UI locale
      try {
        await fetch(`${API}/articles/${a.id}/read`, {
          method: "POST",
          headers: authHeaders(),
        });
        // met à jour le visuel
        chk.checked = true;
        card.className = "rounded border p-4 flex gap-3 items-start bg-white dark:bg-gray-800 bg-emerald-50/60 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 transition-colors";
        pill.className = "text-[11px] px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-600";
        pill.textContent = "Lu";
        title.className = "font-semibold line-through text-gray-500 dark:text-gray-400 hover:underline";
      } catch (_) {}
      // pas de preventDefault: on laisse le navigateur ouvrir le lien
    });

    body.appendChild(title);

    if (a.content) {
      const p = document.createElement("p");
      p.className = "text-gray-600 dark:text-gray-300 mt-1";
      p.textContent = stripHTML(a.content).slice(0, 300);
      body.appendChild(p);
    }

    // Actions : Archiver + Étoile
    const actions = document.createElement("div");
    actions.className = "mt-2 flex items-center gap-2";

    const btnSave = document.createElement("button");
    btnSave.className = "px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors";
    btnSave.textContent = "Archiver";

    const btnStar = document.createElement("button");
    btnStar.className = "px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors";
    btnStar.textContent = a.starred ? "⭐ Favori" : "☆ Favoris";
    btnStar.title = a.starred ? "Retirer des favoris" : "Ajouter aux favoris";

    const btnComment = document.createElement("button");
    btnComment.className = "px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors";
    btnComment.textContent = "💭 Commenter";
    btnComment.title = "Commenter cet article";

    // 2) Empêcher le ré-archivage (désactiver si déjà archivé)
    if (isArchived(a)) {
      btnSave.disabled = true;
      btnSave.classList.add("opacity-60", "cursor-not-allowed");
      btnSave.textContent = "Déjà archivé";
      btnSave.title = "Cet article a déjà été archivé.";
    }

    btnSave.onclick = async () => {
      if (btnSave.disabled) return;
      btnSave.disabled = true;
      btnSave.textContent = "Archivage...";
      try {
        const res = await fetch(`${API}/articles/${a.id}/archive`, {
          method: "POST",
          headers: authHeaders(),
        });
        if (res.ok) {
          // le back renvoie { ok: True, archive_id: X } — si déjà archivé, il renvoie l'existant
          const data = await res.json();
          showToast("Article archivé avec succès 🗃️");
          // on marque localement comme archivé pour bloquer de nouveau l'action
          archivedIds.add(a.id);
          if (a.link) archivedIds.add(a.link);
          btnSave.textContent = "Déjà archivé";
          btnSave.classList.add("opacity-60", "cursor-not-allowed");
        } else {
          showToast("Impossible d'archiver cet article");
          btnSave.disabled = false;
          btnSave.textContent = "Archiver";
        }
      } catch (error) {
        console.error("Erreur lors de l'archivage:", error);
        showToast("Erreur réseau");
        btnSave.disabled = false;
        btnSave.textContent = "Archiver";
      }
    };

    // Gestion des favoris
    btnStar.onclick = async () => {
      btnStar.disabled = true;
      try {
        const method = a.starred ? "DELETE" : "POST";
        const res = await fetch(`${API}/articles/${a.id}/star`, {
          method: method,
          headers: authHeaders(),
        });
        if (res.ok) {
          a.starred = !a.starred;
          btnStar.textContent = a.starred ? "⭐ Favori" : "☆ Favoris";
          btnStar.title = a.starred ? "Retirer des favoris" : "Ajouter aux favoris";
          showToast(a.starred ? "Ajouté aux favoris ⭐" : "Retiré des favoris");
        } else {
          showToast("Impossible de modifier les favoris");
        }
      } catch (error) {
        console.error("Erreur lors de la gestion des favoris:", error);
        showToast("Erreur réseau");
      }
      btnStar.disabled = false;
    };

    // Gestion des commentaires
    btnComment.onclick = () => {
      openCommentModal(a);
    };

    actions.appendChild(btnSave);
    actions.appendChild(btnStar);
    actions.appendChild(btnComment);

    body.appendChild(actions);
    card.appendChild(body);
    list.appendChild(card);

    // Checkbox lu/non-lu côté UI (si l’utilisateur utilise la case plutôt que le titre)
    chk.addEventListener("change", async () => {
      if (chk.checked) {
        await fetch(`${API}/articles/${a.id}/read`, { method: "POST", headers: authHeaders() });
        card.className = "rounded border p-4 flex gap-3 items-start bg-white dark:bg-gray-800 bg-emerald-50/60 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 transition-colors";
        pill.className = "text-[11px] px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-600";
        pill.textContent = "Lu";
        title.className = "font-semibold line-through text-gray-500 dark:text-gray-400 hover:underline";
        showToast("Marqué comme lu ✓");
      } else {
        await fetch(`${API}/articles/${a.id}/read`, { method: "DELETE", headers: authHeaders() });
        card.className = "rounded border p-4 flex gap-3 items-start bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 transition-colors";
        pill.className = "text-[11px] px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600";
        pill.textContent = "Non lu";
        title.className = "font-semibold text-gray-900 dark:text-white hover:underline";
        showToast("Remis en non lu");
      }
    });
  }

  btnMore.style.display = data.length < limit ? "none" : "inline-flex";
}

searchInput.addEventListener("input", () => {
  lastQuery.q = searchInput.value.trim();
  offset = 0;
  fetchPage({ append: false });
});
filterRead.addEventListener("change", () => {
  lastQuery.read = filterRead.value;
  offset = 0;
  fetchPage({ append: false });
});
filterStarred.addEventListener("change", () => {
  lastQuery.starred = filterStarred.value;
  offset = 0;
  fetchPage({ append: false });
});
btnMore.addEventListener("click", () => {
  offset += limit;
  fetchPage({ append: true });
});

btnAllRead.addEventListener("click", async () => {
  await fetch(`${API}/feeds/${feedId}/mark-all-read`, {
    method: "POST",
    headers: authHeaders(),
  });
  offset = 0;
  fetchPage({ append: false });
  showToast("Tous les articles marqués comme lus ✓");
});
btnAllUnread.addEventListener("click", async () => {
  await fetch(`${API}/feeds/${feedId}/mark-all-unread`, {
    method: "POST",
    headers: authHeaders(),
  });
  offset = 0;
  fetchPage({ append: false });
  showToast("Tous les articles remis en non lu");
});
btnRefresh.addEventListener("click", async () => {
  await fetch(`${API}/feeds/${feedId}/refresh`, {
    method: "POST",
    headers: authHeaders(),
  });
  offset = 0;
  // on met aussi à jour la liste des articles déjà archivés
  await loadArchivedIdsForFeed(feedId);
  fetchPage({ append: false });
  showToast("Flux rafraîchi");
});

document.addEventListener("DOMContentLoaded", async () => {
  if (!token || !feedId) return (window.location.href = "index.html");
  // charger les archives existantes pour ce feed afin de bloquer "Archiver" si besoin
  await loadArchivedIdsForFeed(feedId);
  fetchPage();
  
  // Récupérer l'ID de la collection pour le chat
  await loadCollectionForChat();
  
  // Mettre à jour le badge du chat dès le chargement
  await updateChatButtonBadge();
});

// ========= MESSAGERIE =========

let currentCollectionId = null;

const chatModal = document.getElementById("chat-modal");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-message");
const openChatBtn = document.getElementById("open-chat");
const closeChatBtn = document.getElementById("close-chat");

// Debug retiré - le chat devrait maintenant fonctionner

async function loadCollectionForChat() {
  try {
    const res = await fetch(`${API}/feeds/${feedId}`, { headers: authHeaders() });
    if (res.ok) {
      const feed = await res.json();
      currentCollectionId = feed.collection_id;
    }
  } catch (error) {
    console.error("Erreur lors du chargement de la collection:", error);
  }
}

async function loadChatMessages() {
  if (!currentCollectionId) return;
  
  // S'assurer que l'utilisateur actuel est chargé
  await getCurrentUser();
  
  try {
    const res = await fetch(`${API}/collections/${currentCollectionId}/messages?limit=50`, {
      headers: authHeaders()
    });
    
    if (res.ok) {
      const messages = await res.json();
      renderMessages(messages.reverse()); // Afficher les plus anciens en premier
    }
  } catch (error) {
    console.error("Erreur lors du chargement des messages:", error);
    showToast("Erreur lors du chargement du chat");
  }
}

function renderMessages(messages) {
  chatMessages.innerHTML = "";
  
  messages.forEach(message => {
    const msgEl = document.createElement("div");
    const isUnread = !message.read;
    const bgClass = isUnread ? "bg-blue-50 border-l-4 border-blue-400" : "bg-gray-50";
    msgEl.className = `${bgClass} rounded p-3 transition-colors`;
    
    const isComment = message.message_type === "comment";
    const typeIcon = isComment ? "💭" : "💬";
    
    msgEl.innerHTML = `
      <div class="flex items-center gap-2 mb-1">
        <span class="text-sm font-medium text-blue-600">${typeIcon} ${escapeHtml(message.username)}</span>
        <span class="text-xs text-gray-500">${formatMessageDate(message.created_at)}</span>
        ${isComment && message.article_link ? `<a href="${escapeHtml(message.article_link)}" target="_blank" rel="noreferrer" class="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-0.5 rounded transition-colors cursor-pointer" title="Ouvrir l'article directement">📄 ${escapeHtml(message.article_title || 'Article')}</a>` : isComment ? `<span class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">📄 ${escapeHtml(message.article_title || 'Article')}</span>` : ''}
      </div>
      <div class="text-sm text-gray-800">${escapeHtml(message.message)}</div>
    `;
    
    // Marquer automatiquement comme lu SEULEMENT si ce n'est PAS son propre message
    if (isUnread && message.user_id !== currentUserId) {
      markMessageAsRead(message.id);
    }
    
    chatMessages.appendChild(msgEl);
  });
  
  // Scroller vers le bas
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatMessageDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString("fr-FR", { 
    day: "2-digit", 
    month: "2-digit", 
    hour: "2-digit", 
    minute: "2-digit" 
  });
}

async function markMessageAsRead(messageId) {
  try {
    await fetch(`${API}/messages/${messageId}/read`, {
      method: "POST",
      headers: authHeaders()
    });
  } catch (error) {
    console.error("Erreur lors du marquage du message comme lu:", error);
  }
}

async function getUnreadMessagesCount() {
  if (!currentCollectionId) return 0;
  
  try {
    const res = await fetch(`${API}/collections/${currentCollectionId}/unread-count`, {
      headers: authHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      return data.unread_count;
    }
  } catch (error) {
    console.error("Erreur lors de la récupération du compteur:", error);
  }
  return 0;
}

async function updateChatButtonBadge() {
  const unreadCount = await getUnreadMessagesCount();
  const chatBtn = document.getElementById("open-chat");
  
  if (chatBtn) {
    if (unreadCount > 0) {
      chatBtn.innerHTML = `💬 Chat <span class="bg-red-500 text-white text-xs px-2 py-1 rounded-full ml-1">${unreadCount}</span>`;
      chatBtn.classList.add("relative");
    } else {
      chatBtn.innerHTML = "💬 Chat";
      chatBtn.classList.remove("relative");
    }
  }
}

async function sendMessage() {
  const message = chatInput.value.trim();
  if (!message || !currentCollectionId) return;
  
  sendBtn.disabled = true;
  sendBtn.textContent = "...";
  
  try {
    const res = await fetch(`${API}/collections/${currentCollectionId}/messages`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: message,
        message_type: "message"
      })
    });
    
    if (res.ok) {
      chatInput.value = "";
      await loadChatMessages(); // Recharger les messages
      await updateChatButtonBadge(); // Mettre à jour le badge
    } else {
      showToast("Erreur lors de l'envoi du message");
    }
  } catch (error) {
    console.error("Erreur lors de l'envoi:", error);
    showToast("Erreur réseau");
  }
  
  sendBtn.disabled = false;
  sendBtn.textContent = "Envoyer";
}

// Event listeners pour le chat (avec vérification d'existence)
if (openChatBtn) {
  openChatBtn.addEventListener("click", async () => {
    chatModal.classList.remove("hidden");
    await loadChatMessages();
    await updateChatButtonBadge(); // Mettre à jour après ouverture
    chatInput.focus();
  });
} else {
  console.error("Bouton open-chat non trouvé !");
}

if (closeChatBtn) {
  closeChatBtn.addEventListener("click", () => {
    chatModal.classList.add("hidden");
  });
}

if (chatModal) {
  chatModal.addEventListener("click", (e) => {
    if (e.target === chatModal) {
      chatModal.classList.add("hidden");
    }
  });
}

if (sendBtn) {
  sendBtn.addEventListener("click", sendMessage);
}

if (chatInput) {
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });
}

// Actualiser les messages toutes les 5 secondes quand le chat est ouvert
// Et mettre à jour le badge du chat toutes les 10 secondes
setInterval(async () => {
  if (!chatModal.classList.contains("hidden")) {
    await loadChatMessages();
  }
  // Toujours mettre à jour le badge, même si le chat n'est pas ouvert
  await updateChatButtonBadge();
}, 5000);

// ========= COMMENTAIRES D'ARTICLES =========

function openCommentModal(article) {
  const commentText = prompt(`Commentaire sur l'article "${article.title}":`);
  if (!commentText || !commentText.trim()) return;
  
  sendArticleComment(article.id, commentText.trim());
}

async function sendArticleComment(articleId, comment) {
  if (!currentCollectionId) {
    showToast("Erreur: Collection non trouvée");
    return;
  }
  
  try {
    const res = await fetch(`${API}/collections/${currentCollectionId}/messages`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: comment,
        message_type: "comment",
        article_id: articleId
      })
    });
    
    if (res.ok) {
      showToast("Commentaire ajouté ✓");
      // Mettre à jour le badge de chat pour les autres utilisateurs
      setTimeout(() => {
        updateChatButtonBadge();
      }, 1000);
    } else {
      showToast("Erreur lors de l'ajout du commentaire");
    }
  } catch (error) {
    console.error("Erreur lors de l'envoi du commentaire:", error);
    showToast("Erreur réseau");
  }
}
