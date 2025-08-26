const API = "http://localhost:8000";
const token = localStorage.getItem("token");

function authHeaders(extra = {}) { 
  return { Authorization: `Bearer ${token}`, ...extra }; 
}

// Ajouter le bouton de thème
document.addEventListener('DOMContentLoaded', function() {
  const themeContainer = document.getElementById('theme-button-container');
  if (themeContainer) {
    themeContainer.innerHTML = createThemeButton();
  }
});

// Éléments DOM
const searchInput = document.getElementById("search-favorites");
const clearSearchBtn = document.getElementById("clear-search");
const favoritesList = document.getElementById("favorites-list");
const loadMoreBtn = document.getElementById("load-more");
const favoritesCount = document.getElementById("favorites-count");
const emptyState = document.getElementById("empty-state");
const searchEmptyState = document.getElementById("search-empty-state");
const loading = document.getElementById("loading");
const toast = document.getElementById("toast");

// Variables d'état
let offset = 0;
const limit = 20;
let currentQuery = "";
let isLoading = false;
let hasMoreData = true;

// Utilitaires
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add("hidden"), 2000);
}

function stripHTML(s = "") {
  const tmp = document.createElement("div");
  tmp.innerHTML = s;
  return (tmp.textContent || tmp.innerText || "").replace(/\s+/g, " ").trim();
}

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 7) {
    return date.toLocaleDateString('fr-FR');
  } else if (diffDays > 0) {
    return `${diffDays} jour${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours}h ago`;
  } else {
    return "Récent";
  }
}

// Fonction principale pour charger les favoris
async function loadFavorites({ append = false } = {}) {
  if (isLoading) return;
  
  isLoading = true;
  
  if (!append) {
    loading.classList.remove("hidden");
    favoritesList.innerHTML = "";
    emptyState.classList.add("hidden");
    searchEmptyState.classList.add("hidden");
  }
  
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });
    
    if (currentQuery) {
      params.set("q", currentQuery);
    }
    
    const res = await fetch(`${API}/favorites/?${params.toString()}`, {
      headers: authHeaders()
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    const favorites = await res.json();
    
    loading.classList.add("hidden");
    
    // Mettre à jour le compteur
    if (!append && offset === 0) {
      updateFavoritesCount(favorites.length);
    }
    
    // Vérifier s'il y a plus de données
    hasMoreData = favorites.length === limit;
    loadMoreBtn.classList.toggle("hidden", !hasMoreData);
    
    if (favorites.length === 0) {
      if (!append && offset === 0) {
        if (currentQuery) {
          searchEmptyState.classList.remove("hidden");
        } else {
          emptyState.classList.remove("hidden");
        }
      }
      return;
    }
    
    // Afficher les favoris
    for (const article of favorites) {
      renderFavoriteArticle(article);
    }
    
  } catch (error) {
    console.error("Erreur lors du chargement des favoris:", error);
    loading.classList.add("hidden");
    showToast("Erreur lors du chargement des favoris");
    
    if (!append && offset === 0) {
      emptyState.classList.remove("hidden");
    }
  } finally {
    isLoading = false;
  }
}

function updateFavoritesCount(count) {
  if (count === 0) {
    favoritesCount.textContent = "";
  } else if (count === 1) {
    favoritesCount.textContent = "1 favori";
  } else {
    favoritesCount.textContent = `${count}+ favoris`;
  }
}

function renderFavoriteArticle(article) {
  const articleCard = document.createElement("div");
  articleCard.className = `bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow ${
    article.read ? "bg-gray-50/50" : ""
  }`;
  
  articleCard.innerHTML = `
    <div class="flex gap-4">
      <!-- Statut lu/non lu -->
      <div class="flex flex-col items-center gap-2 flex-shrink-0">
        <input type="checkbox" ${article.read ? "checked" : ""} 
               class="read-checkbox w-4 h-4 mt-1" data-article-id="${article.id}">
        <span class="text-xs px-2 py-1 rounded-full ${
          article.read 
            ? "bg-green-100 text-green-700 border border-green-200" 
            : "bg-amber-100 text-amber-700 border border-amber-200"
        }">
          ${article.read ? "Lu" : "Non lu"}
        </span>
      </div>
      
      <!-- Contenu principal -->
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-4 mb-3">
          <h3 class="text-lg font-semibold text-gray-900 leading-tight ${
            article.read ? "line-through text-gray-500" : ""
          }">
            <a href="${article.link}" target="_blank" rel="noopener noreferrer" 
               class="hover:text-blue-600 transition-colors article-link"
               data-article-id="${article.id}">
              ${article.title || "(Sans titre)"}
            </a>
          </h3>
          
          <!-- Actions -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <button class="unfavorite-btn px-3 py-1 text-sm bg-yellow-100 text-yellow-700 border border-yellow-200 rounded hover:bg-yellow-200 transition-colors"
                    data-article-id="${article.id}">
              ⭐ Retirer
            </button>
          </div>
        </div>
        
        ${article.content ? `
          <p class="text-gray-600 mb-3 leading-relaxed">
            ${stripHTML(article.content).slice(0, 200)}${stripHTML(article.content).length > 200 ? "..." : ""}
          </p>
        ` : ""}
        
        <div class="flex items-center gap-4 text-sm text-gray-500">
          <span>Feed ID: ${article.feed_id}</span>
          <span>•</span>
          <span>Article #${article.id}</span>
        </div>
      </div>
    </div>
  `;
  
  favoritesList.appendChild(articleCard);
  
  // Event listeners pour cette carte
  setupArticleEventListeners(articleCard, article);
}

function setupArticleEventListeners(card, article) {
  // Checkbox lu/non lu
  const checkbox = card.querySelector(".read-checkbox");
  checkbox.addEventListener("change", async () => {
    await toggleReadStatus(article.id, checkbox.checked);
    updateCardReadState(card, checkbox.checked);
  });
  
  // Lien article (marquer comme lu au clic)
  const link = card.querySelector(".article-link");
  link.addEventListener("click", async () => {
    if (!checkbox.checked) {
      await toggleReadStatus(article.id, true);
      checkbox.checked = true;
      updateCardReadState(card, true);
    }
  });
  
  // Bouton retirer des favoris
  const unfavoriteBtn = card.querySelector(".unfavorite-btn");
  unfavoriteBtn.addEventListener("click", async () => {
    await removeFavorite(article.id, card);
  });
}

function updateCardReadState(card, isRead) {
  const title = card.querySelector(".article-link");
  const badge = card.querySelector("span.text-xs");
  
  if (isRead) {
    card.classList.add("bg-gray-50/50");
    title.classList.add("line-through", "text-gray-500");
    badge.className = "text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200";
    badge.textContent = "Lu";
  } else {
    card.classList.remove("bg-gray-50/50");
    title.classList.remove("line-through", "text-gray-500");
    badge.className = "text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200";
    badge.textContent = "Non lu";
  }
}

async function toggleReadStatus(articleId, isRead) {
  try {
    const method = isRead ? "POST" : "DELETE";
    const res = await fetch(`${API}/articles/${articleId}/read`, {
      method: method,
      headers: authHeaders()
    });
    
    if (res.ok) {
      showToast(isRead ? "Marqué comme lu ✓" : "Marqué comme non lu");
    }
  } catch (error) {
    console.error("Erreur toggle read:", error);
    showToast("Erreur lors de la mise à jour");
  }
}

async function removeFavorite(articleId, card) {
  try {
    const res = await fetch(`${API}/articles/${articleId}/star`, {
      method: "DELETE",
      headers: authHeaders()
    });
    
    if (res.ok) {
      // Animation de suppression
      card.style.opacity = "0.5";
      card.style.transform = "translateX(-20px)";
      card.style.transition = "all 0.3s ease";
      
      setTimeout(() => {
        card.remove();
        showToast("Retiré des favoris");
        
        // Vérifier s'il faut afficher l'état vide
        if (favoritesList.children.length === 0) {
          if (currentQuery) {
            searchEmptyState.classList.remove("hidden");
          } else {
            emptyState.classList.remove("hidden");
          }
        }
      }, 300);
    } else {
      showToast("Erreur lors de la suppression");
    }
  } catch (error) {
    console.error("Erreur remove favorite:", error);
    showToast("Erreur réseau");
  }
}

// Event listeners
searchInput.addEventListener("input", debounce(() => {
  currentQuery = searchInput.value.trim();
  offset = 0;
  loadFavorites({ append: false });
}, 500));

clearSearchBtn.addEventListener("click", () => {
  searchInput.value = "";
  currentQuery = "";
  offset = 0;
  loadFavorites({ append: false });
});

loadMoreBtn.addEventListener("click", () => {
  offset += limit;
  loadFavorites({ append: true });
});

// Fonction debounce pour la recherche
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Initialisation
document.addEventListener("DOMContentLoaded", () => {
  if (!token) {
    window.location.href = "index.html";
    return;
  }
  
  loadFavorites();
});