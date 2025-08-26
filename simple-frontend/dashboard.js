// dashboard.js
const API = "http://localhost:8000";
const token = localStorage.getItem("token");

// ---------- Helpers ----------
function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${token}`, ...extra };
}
function el(tag, className = "", text = "") {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text) n.textContent = text;
  return n;
}

// ---------- Flux suggérés ----------
const suggestedFeeds = [
  {
    title: "Le Monde - Actualités",
    url: "https://www.lemonde.fr/rss/une.xml",
    description: "Toute l'actualité française et internationale",
    category: "Actualités",
    icon: "🇫🇷"
  },
  {
    title: "Hacker News",
    url: "https://news.ycombinator.com/rss",
    description: "Tech, startups et programmation",
    category: "Technologie", 
    icon: "💻"
  },
  {
    title: "France Inter - À la Une",
    url: "https://www.radiofrance.fr/franceinter/rss",
    description: "L'actualité vue par France Inter",
    category: "Actualités",
    icon: "📻"
  },
  {
    title: "Korben.info",
    url: "https://korben.info/feed",
    description: "Geek, high tech et logiciels libres",
    category: "Technologie",
    icon: "🤖"
  },
  {
    title: "Journal du Net - Développement",
    url: "https://www.journaldunet.com/rss/",
    description: "Actualités développement web",
    category: "Développement",
    icon: "⚡"
  },
  {
    title: "Numerama",
    url: "https://www.numerama.com/feed/",
    description: "Culture numérique et tech",
    category: "Technologie", 
    icon: "🚀"
  },
  {
    title: "MIT Technology Review",
    url: "https://www.technologyreview.com/feed/",
    description: "Innovation et recherche technologique",
    category: "Science",
    icon: "🔬"
  },
  {
    title: "TechCrunch",
    url: "https://techcrunch.com/feed/",
    description: "Startups et technologies émergentes",
    category: "Startups",
    icon: "🏢"
  },
  {
    title: "The Verge",
    url: "https://www.theverge.com/rss/index.xml",
    description: "Technologie, science et culture",
    category: "Technologie",
    icon: "📱"
  }
];

// ---------- Sécurité & session ----------
async function me() {
  const res = await fetch(`${API}/me`, { headers: authHeaders() });
  if (!res.ok) throw 0;
  return res.json();
}
function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}
window.logout = logout;

// ---------- UI : barre utilisateur ----------
const userMenu = document.getElementById("user-menu");
const usernameDisplay = document.getElementById("username-display");

async function initUser() {
  try {
    const u = await me();
    usernameDisplay.textContent = u.username;
    userMenu.classList.remove("hidden");
  } catch {
    logout();
  }
}

// ---------- Collections ----------
const collectionsList = document.getElementById("collections-list");
const collectionsEmpty = document.getElementById("collections-empty");
const sharedCollectionsList = document.getElementById("shared-collections-list");
const sharedCollectionsEmpty = document.getElementById("shared-collections-empty");
const createCollectionForm = document.getElementById("create-collection-form");
const newCollectionName = document.getElementById("new-collection-name");
const activeCollectionName = document.getElementById("active-collection-name");

// Onglets
const tabMyCollections = document.getElementById("tab-my-collections");
const tabSharedCollections = document.getElementById("tab-shared-collections");
const myCollectionsContent = document.getElementById("my-collections-content");
const sharedCollectionsContent = document.getElementById("shared-collections-content");
const sharedCount = document.getElementById("shared-count");

let activeCollectionId = null;
let feedsCache = []; // pour "tout rafraîchir"
let myCollections = [];
let sharedCollections = [];
let currentTab = "my"; // "my" ou "shared"
let currentUserCache = null; // Cache pour éviter trop d'appels /me

async function loadCollections() {
  try {
    // Charger les collections possédées et partagées séparément
    const [ownedRes, sharedRes] = await Promise.all([
      fetch(`${API}/collections/owned`, { headers: authHeaders() }),
      fetch(`${API}/collections/shared`, { headers: authHeaders() })
    ]);
    
    if (!ownedRes.ok || !sharedRes.ok) throw 0;
    
    myCollections = await ownedRes.json();
    sharedCollections = await sharedRes.json();
    
    // Mettre à jour le compteur
    sharedCount.textContent = sharedCollections.length || "";
    sharedCount.style.display = sharedCollections.length ? "inline" : "none";
    
    // Afficher selon l'onglet actif
    await renderCollections();
    
    // Sélectionner la première collection disponible
    const firstCollection = currentTab === "my" ? myCollections[0] : sharedCollections[0];
    if (firstCollection) {
      selectCollection(firstCollection);
    } else if (currentTab === "shared" && myCollections.length > 0) {
      // Si pas de collections partagées, basculer vers "mes collections"
      switchTab("my");
    }
    
  } catch (error) {
    console.error("Erreur chargement collections:", error);
  }
}

async function renderCollections() {
  const collections = currentTab === "my" ? myCollections : sharedCollections;
  const list = currentTab === "my" ? collectionsList : sharedCollectionsList;
  const empty = currentTab === "my" ? collectionsEmpty : sharedCollectionsEmpty;
  
  list.innerHTML = "";
  
  if (!collections.length) {
    empty.classList.remove("hidden");
    return;
  }
  
  empty.classList.add("hidden");
  
  for (const c of collections) {
    const container = el("div", "flex items-center gap-2");
    
    const btn = el(
      "button",
      "px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 flex-1 text-gray-900 dark:text-white bg-white dark:bg-gray-800 transition-colors",
      c.name
    );
    btn.onclick = () => selectCollection(c);
    
    // Pour les collections partagées, ajouter un badge du propriétaire
    if (currentTab === "shared") {
      const ownerBadge = el(
        "span",
        "px-2 py-1 text-xs bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 rounded-full",
        "👤 Partagée"
      );
      container.appendChild(ownerBadge);
      
      // Ajouter l'indicateur de messages non lus pour les collections partagées
      const unreadCount = await getCollectionUnreadCount(c.id);
      if (unreadCount > 0) {
        const unreadIndicator = el(
          "span",
          "px-2 py-1 text-xs bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-200 rounded-full font-semibold",
          `💬 ${unreadCount}`
        );
        unreadIndicator.title = `${unreadCount} message(s) non lu(s)`;
        container.appendChild(unreadIndicator);
      }
    }
    
    container.appendChild(btn);
    
    // Bouton de gestion des membres (seulement pour les propriétaires)
    if (currentTab === "my") {
      const membersBtn = el(
        "button", 
        "px-2 py-1 text-xs rounded border border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors",
        "👥"
      );
      membersBtn.title = "Gérer les membres";
      membersBtn.onclick = () => window.location.href = `collection_members.html?id=${c.id}`;
      container.appendChild(membersBtn);
      
      // Bouton de suppression (seulement pour les propriétaires)
      const deleteBtn = el(
        "button", 
        "px-2 py-1 text-xs rounded border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 transition-colors",
        "✕"
      );
      deleteBtn.title = "Supprimer la collection";
      deleteBtn.onclick = () => deleteCollection(c);
      container.appendChild(deleteBtn);
    } else {
      // Pour les collections partagées, bouton pour voir les membres (lecture seule)
      const viewMembersBtn = el(
        "button", 
        "px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
        "👁️"
      );
      viewMembersBtn.title = "Voir les membres";
      viewMembersBtn.onclick = () => window.location.href = `collection_members.html?id=${c.id}`;
      container.appendChild(viewMembersBtn);
    }
    list.appendChild(container);
  }
}

// Gestion des onglets
async function switchTab(tab) {
  currentTab = tab;
  
  if (tab === "my") {
    tabMyCollections.className = "px-4 py-2 border-b-2 border-blue-600 text-blue-600 font-medium";
    tabSharedCollections.className = "px-4 py-2 border-b-2 border-transparent text-gray-500 hover:text-gray-700";
    myCollectionsContent.classList.remove("hidden");
    sharedCollectionsContent.classList.add("hidden");
  } else {
    tabMyCollections.className = "px-4 py-2 border-b-2 border-transparent text-gray-500 hover:text-gray-700";
    tabSharedCollections.className = "px-4 py-2 border-b-2 border-blue-600 text-blue-600 font-medium";
    myCollectionsContent.classList.add("hidden");
    sharedCollectionsContent.classList.remove("hidden");
  }
  
  await renderCollections();
}

// Event listeners pour les onglets
tabMyCollections.addEventListener("click", () => switchTab("my"));
tabSharedCollections.addEventListener("click", () => switchTab("shared"));

// Fonction pour mettre à jour les indicateurs de collections
async function updateCollectionIndicators() {
  await renderCollections();
}

// Validation en temps réel pour éviter les doublons
newCollectionName.addEventListener("input", (e) => {
  const name = e.target.value.trim().toLowerCase();
  const existingNames = myCollections.map(c => c.name.toLowerCase());
  
  if (name && existingNames.includes(name)) {
    e.target.style.borderColor = "#ef4444"; // Rouge
    e.target.style.backgroundColor = "#fef2f2"; // Rouge clair
    
    // Afficher un petit message d'erreur
    let errorMsg = document.getElementById("collection-name-error");
    if (!errorMsg) {
      errorMsg = document.createElement("small");
      errorMsg.id = "collection-name-error";
      errorMsg.className = "text-red-500 text-xs mt-1";
      e.target.parentNode.insertBefore(errorMsg, e.target.nextSibling);
    }
    errorMsg.textContent = "❌ Ce nom existe déjà";
  } else {
    e.target.style.borderColor = "";
    e.target.style.backgroundColor = "";
    
    const errorMsg = document.getElementById("collection-name-error");
    if (errorMsg) {
      errorMsg.remove();
    }
  }
});

// ---------- Système de notifications ----------
function showToast(message, type = "info", duration = 5000) {
  const toastContainer = document.getElementById("toast-container");
  const toast = document.createElement("div");
  
  const bgColors = {
    success: "bg-green-500",
    error: "bg-red-500", 
    warning: "bg-yellow-500",
    info: "bg-blue-500"
  };
  
  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️", 
    info: "ℹ️"
  };
  
  toast.className = `${bgColors[type]} text-white px-4 py-3 rounded shadow-lg flex items-center gap-2 min-w-80 transform transition-all duration-300 translate-x-full opacity-0`;
  toast.innerHTML = `
    <span class="text-lg">${icons[type]}</span>
    <span class="flex-1">${message}</span>
    <button onclick="this.parentElement.remove()" class="text-white hover:text-gray-200 ml-2">✕</button>
  `;
  
  toastContainer.appendChild(toast);
  
  // Animation d'entrée
  setTimeout(() => {
    toast.classList.remove("translate-x-full", "opacity-0");
  }, 100);
  
  // Auto-suppression
  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.add("translate-x-full", "opacity-0");
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

function showPermissionError(action, requiredRole) {
  const roleLabels = {
    owner: "propriétaire",
    admin: "administrateur", 
    editor: "éditeur",
    viewer: "lecteur"
  };
  
  showToast(
    `❌ Accès refusé: ${action} nécessite le rôle "${roleLabels[requiredRole]}" ou supérieur.`,
    "error",
    6000
  );
}

async function selectCollection(c) {
  activeCollectionId = c.id;
  activeCollectionName.textContent = c.name;
  
  // Afficher le rôle de l'utilisateur dans cette collection
  await updateUserRoleBadge(c);
  
  await loadFeeds();
}

async function updateUserRoleBadge(collection) {
  const roleBadge = document.getElementById("user-role-badge");
  
  try {
    const currentUser = await me();
    
    if (collection.user_id === currentUser.id) {
      // Propriétaire
      roleBadge.textContent = "👑 Propriétaire";
      roleBadge.className = "text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800";
      roleBadge.classList.remove("hidden");
    } else {
      // Collection partagée - récupérer le rôle
      const res = await fetch(`${API}/collections/${collection.id}/members`, {
        headers: authHeaders()
      });
      
      if (res.ok) {
        const data = await res.json();
        const userMember = data.members.find(m => m.email === currentUser.email && !m.is_owner);
        
        if (userMember) {
          const roleLabels = {
            admin: "👨‍💼 Administrateur",
            editor: "✏️ Éditeur", 
            viewer: "👁️ Lecteur"
          };
          
          const roleColors = {
            admin: "bg-red-100 text-red-800",
            editor: "bg-blue-100 text-blue-800",
            viewer: "bg-gray-100 text-gray-800"
          };
          
          roleBadge.textContent = roleLabels[userMember.role] || userMember.role;
          roleBadge.className = `text-xs px-2 py-1 rounded-full ${roleColors[userMember.role]}`;
          roleBadge.classList.remove("hidden");
        } else {
          roleBadge.classList.add("hidden");
        }
      } else {
        roleBadge.classList.add("hidden");
      }
    }
  } catch (error) {
    console.error("Erreur récupération rôle:", error);
    roleBadge.classList.add("hidden");
  }
}

createCollectionForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = newCollectionName.value.trim();
  
  if (!name) {
    showToast("❌ Le nom de la collection est requis", "error");
    return;
  }
  
  if (name.length < 2) {
    showToast("❌ Le nom doit contenir au moins 2 caractères", "error");
    return;
  }
  
  if (name.length > 50) {
    showToast("❌ Le nom ne peut pas dépasser 50 caractères", "error");
    return;
  }
  
  try {
    const res = await fetch(`${API}/collections/`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ name }),
    });
    
    if (res.ok) {
      newCollectionName.value = "";
      await loadCollections();
      showToast(`✅ Collection "${name}" créée avec succès!`, "success");
    } else if (res.status === 400) {
      const errorText = await res.text();
      if (errorText.includes("existe déjà")) {
        showToast(`❌ Une collection "${name}" existe déjà`, "error");
      } else {
        showToast(`❌ ${errorText}`, "error");
      }
    } else {
      const errorText = await res.text();
      showToast(`❌ Erreur (${res.status}): ${errorText}`, "error");
    }
  } catch (error) {
    console.error("Erreur création collection:", error);
    showToast(`❌ Erreur réseau: ${error.message}`, "error");
  }
});

// ---------- Feeds ----------
const feedForm = document.getElementById("create-feed-form");
const feedTitle = document.getElementById("feed-title");
const feedUrl = document.getElementById("feed-url");
const feedDesc = document.getElementById("feed-description");
const addBtn = feedForm.querySelector("button[type=submit]");
const feedContainer = document.getElementById("feed-container");
const feedsEmpty = document.getElementById("feeds-empty");

// bouton “Tout rafraîchir” (ID corrigé)
const refreshAllBtn = document.getElementById("refresh-collection-btn");

[feedTitle, feedUrl].forEach((i) =>
  i.addEventListener("input", () => {
    addBtn.disabled = !(feedTitle.value.trim() && feedUrl.value.trim());
  })
);

feedForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!activeCollectionId) {
    showToast("❌ Aucune collection sélectionnée", "error");
    return;
  }
  
  const title = feedTitle.value.trim();
  const url = feedUrl.value.trim();
  
  if (!title || !url) {
    showToast("❌ Titre et URL sont requis", "error");
    return;
  }
  
  const body = {
    title: title,
    url: url,
    description: feedDesc.value.trim() || null,
    collection_id: activeCollectionId,
  };
  
  console.log("🚀 Création flux:", body); // Debug
  
  try {
    const res = await fetch(`${API}/feeds/`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });
    
    console.log("📡 Réponse serveur:", res.status); // Debug
    
    if (res.ok) {
      feedTitle.value = "";
      feedUrl.value = "";
      feedDesc.value = "";
      addBtn.disabled = true;
      await loadFeeds();
      showToast("✅ Flux ajouté avec succès!", "success");
    } else {
      const errorText = await res.text();
      console.error("❌ Erreur serveur:", errorText); // Debug
      
      if (res.status === 403) {
        if (errorText.includes("Accès interdit")) {
          showPermissionError("l'ajout de flux", "editor");
        } else {
          showToast(`❌ Accès refusé: ${errorText}`, "error");
        }
      } else {
        showToast(`❌ Erreur (${res.status}): ${errorText}`, "error");
      }
    }
  } catch (error) {
    console.error("💥 Erreur réseau:", error); // Debug
    showToast(`❌ Erreur réseau: ${error.message}`, "error");
  }
});

async function loadFeeds() {
  feedContainer.innerHTML = "";
  const status = document.getElementById("status");
  status.textContent = "Chargement des flux…";
  
  try {
    const res = await fetch(
      `${API}/feeds/?collection_id=${encodeURIComponent(activeCollectionId)}`,
      { headers: authHeaders() }
    );
    
    if (!res.ok) {
      if (res.status === 403) {
        status.textContent = "❌ Accès refusé à cette collection";
        showToast("Vous n'avez pas accès à cette collection", "error");
      } else {
        status.textContent = "❌ Erreur de chargement";
        showToast("Erreur lors du chargement des flux", "error");
      }
      return;
    }
    
    const feeds = await res.json();
    feedsCache = feeds;
    status.textContent = "";
    
    if (!feeds.length) {
      feedsEmpty.classList.remove("hidden");
      return;
    }
    feedsEmpty.classList.add("hidden");
    
    // Rendu des flux
    for (const f of feeds) {
      const card = el(
        "div",
        "bg-white dark:bg-gray-800 rounded shadow p-4 flex flex-col gap-3 relative transition-colors"
      );

      // Badge non lus (rempli après calcul)
      const badge = el(
        "span",
        "absolute top-3 right-3 text-sm px-3 py-1 rounded-full bg-amber-100 text-amber-700 hidden"
      );
      badge.textContent = "—";
      card.appendChild(badge);

      const h = el("h3", "text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2");
      const titleText = el("span", "", f.title || "(sans titre)");
      const unreadIcon = el("span", "hidden", "🔔");
      unreadIcon.title = "Cette collection a des messages non lus";
      h.appendChild(titleText);
      h.appendChild(unreadIcon);
      card.appendChild(h);

      if (f.description) {
        card.appendChild(el("p", "text-gray-600 dark:text-gray-300", f.description));
      }

      const line = el("div", "flex items-center gap-2");
      const openBtn = el(
        "a",
        "inline-block bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded",
        "Ouvrir"
      );
      openBtn.href = `flux.html?id=${f.id}`;
      const refreshBtn = el(
        "button",
        "inline-block bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 px-3 py-2 rounded text-gray-900 dark:text-white transition-colors",
        "Rafraîchir"
      );
      refreshBtn.onclick = async () => {
        refreshBtn.disabled = true;
        await fetch(`${API}/feeds/${encodeURIComponent(f.id)}/refresh`, {
          method: "POST",
          headers: authHeaders(),
        }).catch(() => {});
        refreshBtn.disabled = false;
        // recalcul du compteur
        const n = await computeUnreadCount(f.id);
        updateBadgeDisplay(badge, n);
        updateUnreadCounter(); // total en haut à droite
      };
      
      const deleteBtn = el(
        "button",
        "inline-block bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 border border-red-300 dark:border-red-600 px-3 py-2 rounded text-red-700 dark:text-red-300 transition-colors",
        "✕"
      );
      deleteBtn.title = "Supprimer ce flux";
      deleteBtn.onclick = async () => {
        await deleteFeed(f);
      };

      line.append(openBtn, refreshBtn, deleteBtn);
      card.appendChild(line);
      feedContainer.appendChild(card);

      // Calcul du compteur
      computeUnreadCount(f.id).then((n) => updateBadgeDisplay(badge, n));
    }

    updateUnreadCounter();
    
  } catch (error) {
    console.error("Erreur chargement flux:", error);
    status.textContent = "❌ Erreur réseau";
    showToast("Erreur réseau lors du chargement", "error");
    return;
  }
}

// “Tout rafraîchir” pour la collection active
refreshAllBtn?.addEventListener("click", async () => {
  if (!feedsCache.length) return;
  refreshAllBtn.disabled = true;
  const jobs = feedsCache.map((f) =>
    fetch(`${API}/feeds/${encodeURIComponent(f.id)}/refresh`, {
      method: "POST",
      headers: authHeaders(),
    }).catch(() => {})
  );
  await Promise.all(jobs);
  await loadFeeds();
  refreshAllBtn.disabled = false;
});

// Met à jour l'affichage du badge et de l'icône selon le nombre de messages non lus
function updateBadgeDisplay(badge, unreadCount) {
  // Trouver l'icône dans le même flux
  const feedCard = badge.closest('.bg-white, .dark\\:bg-gray-800');
  const unreadIcon = feedCard ? feedCard.querySelector('h3 span[title*="messages non lus"]') : null;
  
  if (unreadCount === 0) {
    badge.classList.add("hidden");
    badge.textContent = "";
    if (unreadIcon) {
      unreadIcon.classList.add("hidden");
    }
  } else {
    badge.classList.remove("hidden");
    badge.textContent = `${unreadCount}`;
    if (unreadIcon) {
      unreadIcon.classList.remove("hidden");
    }
    
    // Nettoyer les anciennes classes de couleur
    badge.className = badge.className.replace(
      /(bg-\w+-\d+|text-\w+-\d+)/g, 
      ""
    ).replace(/\s+/g, ' ').trim();
    
    // Classes de base
    const baseClasses = "absolute top-3 right-3 text-sm px-3 py-1 rounded-full font-bold";
    
    // Couleurs selon le nombre de messages non lus
    let colorClasses;
    if (unreadCount >= 50) {
      colorClasses = "bg-red-600 text-white"; // Rouge pour beaucoup de non lus
    } else if (unreadCount >= 10) {
      colorClasses = "bg-orange-500 text-white"; // Orange pour moyennement de non lus
    } else {
      colorClasses = "bg-blue-500 text-white"; // Bleu pour peu de non lus
    }
    
    badge.className = `${baseClasses} ${colorClasses}`;
  }
}

// Compte les non lus en appelant /articles (page 1 suffit pour badge)
async function computeUnreadCount(feedId) {
  try {
    const res = await fetch(
      `${API}/articles/?feed_id=${encodeURIComponent(feedId)}&limit=100`,
      { headers: authHeaders() }
    );
    if (!res.ok) return 0;
    const list = await res.json();
    return list.reduce((acc, a) => acc + (a.read ? 0 : 1), 0);
  } catch {
    return 0;
  }
}

// total non-lus de la collection
async function updateUnreadCounter() {
  if (!feedsCache.length) {
    document.getElementById("unread-counter").textContent = "";
    return;
  }
  let total = 0;
  for (const f of feedsCache) {
    total += await computeUnreadCount(f.id);
  }
  document.getElementById("unread-counter").textContent =
    total ? `${total} article(s) non lus` : "Tout est lu 🎉";
}


// ---------- Thème sombre ----------
// Système de thème maintenant géré par theme.js

// ---------- Messages non lus (Dashboard) ----------
async function getUnreadMessagesSummary() {
  try {
    const res = await fetch(`${API}/unread-messages-summary`, {
      headers: authHeaders()
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (error) {
    console.error("Erreur lors de la récupération du résumé des messages:", error);
  }
  return { total_unread: 0, collections: [] };
}

// Fonction pour obtenir le nombre de messages non lus par collection ID
async function getCollectionUnreadCount(collectionId) {
  try {
    const summary = await getUnreadMessagesSummary();
    const collection = summary.collections.find(c => c.collection_id === collectionId);
    return collection ? collection.unread_count : 0;
  } catch (error) {
    console.error("Erreur lors de la récupération du compteur pour la collection:", error);
    return 0;
  }
}

async function updateUnreadMessagesIndicator() {
  const summary = await getUnreadMessagesSummary();
  const userMenu = document.getElementById("user-menu");
  
  // Supprimer l'ancien indicateur s'il existe
  const existingIndicator = document.getElementById("unread-messages-indicator");
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  if (summary.total_unread > 0) {
    // Créer le nouvel indicateur
    const indicator = document.createElement("div");
    indicator.id = "unread-messages-indicator";
    indicator.className = "inline-flex items-center gap-2 text-orange-700 dark:text-orange-400 hover:text-orange-900 dark:hover:text-orange-300 font-medium border-l border-gray-300 dark:border-gray-600 pl-4 cursor-pointer";
    indicator.title = `${summary.total_unread} message(s) non lu(s) dans vos collections`;
    
    // Détails par collection pour le tooltip
    const collectionsDetails = summary.collections.map(c => 
      `${c.collection_name}: ${c.unread_count} message(s)`
    ).join("\n");
    
    indicator.innerHTML = `
      <span aria-hidden="true" class="text-lg">🔔</span>
      <span class="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[1.5rem] text-center font-semibold">${summary.total_unread}</span>
      <span class="hidden sm:inline text-sm">message${summary.total_unread > 1 ? 's' : ''} non lu${summary.total_unread > 1 ? 's' : ''}</span>
    `;
    
    if (collectionsDetails) {
      indicator.title += `:\n${collectionsDetails}`;
    }
    
    // Action au clic : aller vers la première collection avec des messages non lus
    indicator.addEventListener('click', () => {
      if (summary.collections.length > 0) {
        const firstCollectionId = summary.collections[0].collection_id;
        window.location.href = `flux.html?collection=${firstCollectionId}`;
      }
    });
    
    // Insérer avant le lien paramètres
    const settingsLink = userMenu.querySelector('a[href="settings.html"]');
    if (settingsLink) {
      userMenu.insertBefore(indicator, settingsLink);
    }
  }
  
  // Mettre à jour aussi les indicateurs des collections
  await updateCollectionIndicators();
}

// ---------- Suppression des collections ----------
async function deleteCollection(collection) {
  const confirmed = await showConfirmDialog(
    "Supprimer la collection", 
    `Êtes-vous sûr de vouloir supprimer la collection "${collection.name}" ?\n\nCette action supprimera également :\n• Tous les flux de la collection\n• Tous les articles et leurs données\n• Tous les messages du chat\n• Tous les partages\n\nCette action est irréversible !`,
    "Supprimer",
    "danger"
  );
  
  if (!confirmed) return;
  
  try {
    const res = await fetch(`${API}/collections/${collection.id}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    
    if (res.ok) {
      showToast("Collection supprimée avec succès", "success");
      await loadCollections();
      
      // Si c'était la collection active, désélectionner
      if (activeCollectionId === collection.id) {
        activeCollectionId = null;
        activeCollectionName.textContent = "—";
        feedContainer.innerHTML = "";
        feedsEmpty.classList.add("hidden");
        document.getElementById("status").textContent = "Sélectionnez une collection pour voir ses flux.";
      }
    } else {
      let errorMessage = "Erreur inconnue";
      try {
        const errorData = await res.json();
        errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
      } catch {
        errorMessage = await res.text();
      }
      showToast(`Erreur lors de la suppression: ${errorMessage}`, "error");
    }
  } catch (error) {
    console.error("Erreur lors de la suppression:", error);
    showToast("Erreur réseau lors de la suppression", "error");
  }
}

// ---------- Suppression des flux ----------
async function deleteFeed(feed) {
  const confirmed = await showConfirmDialog(
    "Supprimer le flux", 
    `Êtes-vous sûr de vouloir supprimer le flux "${feed.title}" ?\n\nCette action supprimera également :\n• Tous les articles du flux\n• Toutes les données associées (favoris, archives, etc.)\n• Tous les commentaires sur les articles\n\nCette action est irréversible !`,
    "Supprimer",
    "danger"
  );
  
  if (!confirmed) return;
  
  try {
    const res = await fetch(`${API}/feeds/${feed.id}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    
    if (res.ok) {
      showToast("Flux supprimé avec succès", "success");
      await loadFeeds(); // Recharger les flux
    } else {
      let errorMessage = "Erreur inconnue";
      try {
        const errorData = await res.json();
        errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
      } catch {
        errorMessage = await res.text();
      }
      
      if (res.status === 403) {
        showToast("Vous n'avez pas les permissions pour supprimer ce flux", "error");
      } else {
        showToast(`Erreur lors de la suppression: ${errorMessage}`, "error");
      }
    }
  } catch (error) {
    console.error("Erreur lors de la suppression:", error);
    showToast("Erreur réseau lors de la suppression", "error");
  }
}

// ---------- Boîte de dialogue de confirmation ----------
function showConfirmDialog(title, message, confirmText = "Confirmer", type = "primary") {
  return new Promise((resolve) => {
    // Créer la modale
    const modal = document.createElement("div");
    modal.className = "fixed inset-0 bg-black/50 flex items-center justify-center z-50";
    
    const colors = {
      primary: "bg-blue-600 hover:bg-blue-700",
      danger: "bg-red-600 hover:bg-red-700",
      warning: "bg-yellow-600 hover:bg-yellow-700"
    };
    
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">${title}</h3>
          <p class="text-gray-600 dark:text-gray-300 mb-6 whitespace-pre-line">${message}</p>
          <div class="flex justify-end gap-3">
            <button id="cancel-btn" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Annuler
            </button>
            <button id="confirm-btn" class="px-4 py-2 ${colors[type]} text-white rounded transition-colors">
              ${confirmText}
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Gérer les clics
    const confirmBtn = modal.querySelector("#confirm-btn");
    const cancelBtn = modal.querySelector("#cancel-btn");
    
    confirmBtn.addEventListener("click", () => {
      document.body.removeChild(modal);
      resolve(true);
    });
    
    cancelBtn.addEventListener("click", () => {
      document.body.removeChild(modal);
      resolve(false);
    });
    
    // Fermer avec Escape
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        document.body.removeChild(modal);
        document.removeEventListener("keydown", handleEscape);
        resolve(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    
    // Fermer en cliquant sur le fond
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
        resolve(false);
      }
    });
  });
}

// ---------- Flux suggérés UI ----------
// Variable pour éviter les event listeners dupliqués
let suggestionsEventListenerAdded = false;

function renderSuggestedFeeds() {
  const container = document.getElementById("suggested-feeds");
  const toggleBtn = document.getElementById("toggle-suggestions");
  
  if (!container) return;
  
  // Vérifier l'état de la visibilité depuis localStorage
  const isHidden = localStorage.getItem("suggestions-hidden") === "true";
  
  if (isHidden) {
    container.style.display = "none";
    toggleBtn.textContent = "afficher";
  } else {
    container.style.display = "grid";
    toggleBtn.textContent = "masquer";
  }
  
  // Event listener pour le bouton toggle (une seule fois)
  if (!toggleBtn.dataset.listenerAdded) {
    toggleBtn.addEventListener("click", () => {
      const isCurrentlyHidden = container.style.display === "none";
      
      if (isCurrentlyHidden) {
        container.style.display = "grid";
        toggleBtn.textContent = "masquer";
        localStorage.setItem("suggestions-hidden", "false");
      } else {
        container.style.display = "none";
        toggleBtn.textContent = "afficher";
        localStorage.setItem("suggestions-hidden", "true");
      }
    });
    toggleBtn.dataset.listenerAdded = "true";
  }
  
  // Générer les cartes de flux suggérés
  container.innerHTML = "";
  
  suggestedFeeds.forEach((feed, index) => {
    const card = document.createElement("div");
    card.className = "bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow";
    
    const safeTitle = feed.title.replace(/"/g, '&quot;');
    const safeDescription = feed.description.replace(/"/g, '&quot;');
    
    card.innerHTML = `
      <div class="flex items-start justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="text-2xl">${feed.icon}</span>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-gray-100 text-sm">${feed.title}</h3>
            <span class="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">${feed.category}</span>
          </div>
        </div>
      </div>
      
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">${feed.description}</p>
      
      <div class="flex items-center justify-between">
        <code class="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">${feed.url.split('/')[2]}</code>
        <button class="add-suggested-btn bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded transition-colors"
                data-feed-index="${index}">
          + Ajouter
        </button>
      </div>
    `;
    
    container.appendChild(card);
  });
  
  // Ajouter l'event listener une seule fois
  if (!suggestionsEventListenerAdded) {
    container.addEventListener("click", (e) => {
      if (e.target.classList.contains("add-suggested-btn")) {
        const feedIndex = parseInt(e.target.dataset.feedIndex);
        const feed = suggestedFeeds[feedIndex];
        if (feed) {
          addSuggestedFeed(feed.title, feed.url, feed.description);
        }
      }
    });
    suggestionsEventListenerAdded = true;
  }
}

async function addSuggestedFeed(title, url, description) {
  console.log("🚀 Ajout flux suggéré:", { title, url, description, activeCollectionId });
  
  if (!activeCollectionId) {
    showToast("⚠️ Sélectionnez d'abord une collection", "warning");
    return;
  }
  
  // Désactiver le bouton temporairement pour éviter les double-clics
  const buttons = document.querySelectorAll('.add-suggested-btn');
  buttons.forEach(btn => btn.disabled = true);
  
  try {
    console.log(`📡 Envoi vers: ${API}/collections/${activeCollectionId}/feeds`);
    
    const res = await fetch(`${API}/collections/${activeCollectionId}/feeds`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        title: title,
        url: url,
        description: description
      })
    });
    
    console.log(`📊 Réponse serveur:`, res.status);
    
    if (res.ok) {
      showToast(`✅ Flux "${title}" ajouté avec succès !`, "success");
      await loadFeeds(); // Recharger les flux
    } else {
      const error = await res.text();
      console.error("❌ Erreur serveur:", error);
      showToast(`❌ Erreur (${res.status}): ${error}`, "error");
    }
  } catch (error) {
    console.error("💥 Erreur réseau:", error);
    showToast(`❌ Erreur réseau: ${error.message}`, "error");
  } finally {
    // Réactiver les boutons
    buttons.forEach(btn => btn.disabled = false);
  }
}

// Fonction d'ajout des flux suggérés

// ---------- Boot ----------
document.addEventListener("DOMContentLoaded", async () => {
  if (!token) return (window.location.href = "index.html");
  // initTheme() géré par theme.js
  await initUser();
  await loadCollections();
  
  // Afficher les flux suggérés
  renderSuggestedFeeds();
  
  // Charger l'indicateur de messages non lus
  await updateUnreadMessagesIndicator();
  
  // Mettre à jour l'indicateur toutes les 30 secondes
  setInterval(updateUnreadMessagesIndicator, 30000);
});
