const API = "http://localhost:8000";
const token = localStorage.getItem("token");

// Ajouter le bouton de thème
document.addEventListener('DOMContentLoaded', function() {
  const themeContainer = document.getElementById('theme-button-container');
  if (themeContainer) {
    themeContainer.innerHTML = createThemeButton();
  }
});
const auth = () => {
  if (!token) {
    alert("Session expirée, veuillez vous reconnecter");
    window.location.href = "index.html";
    return {};
  }
  return { Authorization: `Bearer ${token}` };
};

const $ = (s) => document.querySelector(s);
const qInput = $("#q");
const collectionSelect = $("#collectionSelect");
const feedSelect = $("#feedSelect");
const applyBtn = $("#applyBtn");
const resetBtn = $("#resetBtn");
const list = $("#archiveList");
const empty = $("#empty");
const prevBtn = $("#prevPage");
const nextBtn = $("#nextPage");

const PAGE_SIZE = 20;
let offset = 0;
let lastPageCount = 0;

function cleanAndExtractText(html = "") {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;

  // Supprimer les éléments indésirables
  tmp.querySelectorAll("script, style, noscript, nav, header, footer, aside, .navigation, .menu, .nav, .sidebar, .ads, .advertisement").forEach(el => el.remove());
  
  // Supprimer les attributs de style inline pour éviter le code CSS
  tmp.querySelectorAll("*").forEach(el => {
    el.removeAttribute("style");
    el.removeAttribute("class");
  });

  // Extraire le texte
  let text = tmp.textContent || tmp.innerText || "";
  
  // Nettoyer le texte
  text = text
    .replace(/\s+/g, " ")                    // Remplacer multiples espaces par un seul
    .replace(/\n\s*\n/g, "\n")              // Supprimer lignes vides multiples
    .replace(/[{}[\]();,.:!?'"]+/g, " ")    // Supprimer la ponctuation excessive
    .replace(/\b\w{1}\b/g, "")              // Supprimer lettres isolées
    .replace(/\d{4,}/g, "")                 // Supprimer longues séquences de chiffres
    .trim();

  return text;
}

function getExcerpt(html) {
  const text = cleanAndExtractText(html);
  if (!text || text.length < 10) return "Aperçu indisponible. Ouvrez l'article pour voir le contenu complet.";
  
  // Prendre les premiers mots plutôt qu'une coupe brutale
  const words = text.split(" ");
  if (words.length <= 50) return text;
  
  return words.slice(0, 50).join(" ") + "…";
}

function escapeHtml(str = "") {
  return str.replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}
function hostFromUrl(url = "") {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}
function fmtDate(iso) {
  try { return new Date(iso).toLocaleString("fr-FR"); } catch { return ""; }
}
function safeUrl(url = "#") {
  try { return new URL(url).toString(); } catch { return "#"; }
}
function setLoading(b) {
  applyBtn.disabled = b;
  applyBtn.textContent = b ? "Chargement…" : "Appliquer";
}

async function loadCollections() {
  const res = await fetch(`${API}/collections/`, { headers: auth() });
  if (!res.ok) return;
  const cols = await res.json();
  collectionSelect.innerHTML = `<option value="">Toutes</option>` +
    cols.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  feedSelect.innerHTML = `<option value="">Tous</option>`;
  feedSelect.disabled = true;
}

async function loadFeeds(collectionId) {
  if (!collectionId) {
    feedSelect.innerHTML = `<option value="">Tous</option>`;
    feedSelect.disabled = true;
    return;
  }
  const res = await fetch(`${API}/feeds/?collection_id=${encodeURIComponent(collectionId)}`, { headers: auth() });
  if (!res.ok) {
    feedSelect.innerHTML = `<option value="">Tous</option>`;
    feedSelect.disabled = true;
    return;
  }
  const feeds = await res.json();
  feedSelect.innerHTML = `<option value="">Tous</option>` +
    feeds.map(f => `<option value="${f.id}">${escapeHtml(f.title || "(sans titre)")}</option>`).join("");
  feedSelect.disabled = false;
}

async function fetchArchives({ q, collection_id, feed_id, limit, offset }) {
  const u = new URL(`${API}/archive`);
  if (q) u.searchParams.set("q", q);
  if (collection_id) u.searchParams.set("collection_id", collection_id);
  if (feed_id) u.searchParams.set("feed_id", feed_id);
  u.searchParams.set("limit", String(limit));
  u.searchParams.set("offset", String(offset));
  
  const res = await fetch(u.toString(), { headers: auth() });
  if (res.status === 401) {
    alert("Session expirée, veuillez vous reconnecter");
    window.location.href = "index.html";
    return [];
  }
  if (!res.ok) {
    const errorData = await res.text();
    throw new Error(`Erreur API: ${res.status} - ${errorData}`);
  }
  return res.json();
}

function archiveCard(a) {
  const card = document.createElement("article");
  card.className = "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm hover:shadow transition-colors";

  card.innerHTML = `
    <h2 class="text-lg font-semibold leading-snug line-clamp-2 text-gray-900 dark:text-white">
      ${escapeHtml(a.title || "(sans titre)")}
    </h2>

    <div class="mt-1 text-sm text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-2">
      ${a.link ? `<span class="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-700 dark:text-gray-300">${escapeHtml(hostFromUrl(a.link))}</span>` : ""}
      ${a.archived_at ? `<time datetime="${a.archived_at}">${escapeHtml(fmtDate(a.archived_at))}</time>` : ""}
    </div>

    <div class="mt-2 flex gap-2">
      <span class="px-2 py-0.5 text-xs rounded-full font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">📡 RSS Original</span>
    </div>

    <div class="mt-4 flex gap-2 flex-wrap">
      ${a.link ? `<a target="_blank" rel="noreferrer" href="${safeUrl(a.link)}" class="border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">Source</a>` : ""}
      <button onclick="downloadArchive(${a.id}, '${escapeHtml(a.title || 'article')}')" class="border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">Télécharger</button>
      <button onclick="deleteArchive(${a.id}, this)" class="border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 px-3 py-2 text-sm rounded bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900 transition-colors" title="Supprimer cette archive">Supprimer</button>
    </div>
  `;
  return card;
}

function render(rows) {
  list.innerHTML = "";
  if (!rows.length && offset === 0) {
    empty.classList.remove("hidden");
  } else {
    empty.classList.add("hidden");
    rows.forEach(a => list.appendChild(archiveCard(a)));
  }
  prevBtn.disabled = offset === 0;
  nextBtn.disabled = rows.length < PAGE_SIZE;
  lastPageCount = rows.length;
}

async function applyFilters(goFirst = true) {
  setLoading(true);
  try {
    if (goFirst) offset = 0;
    const q = qInput.value.trim();
    const collection_id = collectionSelect.value || "";
    const feed_id = (!feedSelect.disabled && feedSelect.value) ? feedSelect.value : "";
    
    const rows = await fetchArchives({
      q: q || undefined,
      collection_id: collection_id || undefined,
      feed_id: feed_id || undefined,
      limit: PAGE_SIZE,
      offset
    });
    render(rows);
  } catch (e) {
    console.error(e);
    list.innerHTML = "";
    empty.textContent = "Erreur lors du chargement de l’archive.";
    empty.classList.remove("hidden");
  } finally {
    setLoading(false);
  }
}

prevBtn.addEventListener("click", () => {
  if (offset === 0) return;
  offset = Math.max(0, offset - PAGE_SIZE);
  applyFilters(false);
});
nextBtn.addEventListener("click", () => {
  if (lastPageCount < PAGE_SIZE) return;
  offset += PAGE_SIZE;
  applyFilters(false);
});
collectionSelect.addEventListener("change", async () => {
  await loadFeeds(collectionSelect.value);
  feedSelect.value = "";
});
applyBtn.addEventListener("click", () => applyFilters(true));
resetBtn.addEventListener("click", async () => {
  qInput.value = "";
  collectionSelect.value = "";
  await loadFeeds("");
  feedSelect.value = "";
  applyFilters(true);
});

async function downloadArchive(archiveId, title) {
  try {
    console.log("🚀 Téléchargement archive:", { archiveId, title });
    
    const res = await fetch(`${API}/archive/${archiveId}/pdf`, {
      headers: auth()
    });
    
    console.log("📊 Réponse serveur:", res.status, res.statusText);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ Erreur serveur:", errorText);
      alert(`Erreur lors du téléchargement: ${res.status} - ${errorText}`);
      return;
    }
    
    // Créer un blob à partir de la réponse
    const blob = await res.blob();
    
    // Déterminer l'extension en fonction du type de contenu
    const contentType = res.headers.get("content-type") || "";
    console.log("📄 Type de contenu:", contentType);
    
    let extension = "txt";
    if (contentType.includes("pdf")) {
      extension = "pdf";
    } else if (contentType.includes("html")) {
      extension = "html";
    } else if (contentType.includes("text")) {
      extension = "txt";
    }
    
    // Créer un lien de téléchargement
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}_archive.${extension}`;
    document.body.appendChild(a);
    a.click();
    
    console.log("✅ Téléchargement réussi:", `${title}_archive.${extension}`);
    
    // Nettoyer
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
  } catch (error) {
    console.error("Erreur lors du téléchargement:", error);
    alert("Erreur réseau lors du téléchargement");
  }
}

async function deleteArchive(archiveId, buttonElement) {
  if (!confirm("Êtes-vous sûr de vouloir supprimer cette archive ? Cette action est irréversible.")) {
    return;
  }
  
  const originalText = buttonElement.textContent;
  buttonElement.disabled = true;
  buttonElement.textContent = "Suppression...";
  
  try {
    const res = await fetch(`${API}/archive/${archiveId}`, {
      method: "DELETE",
      headers: auth()
    });
    
    if (res.ok) {
      // Supprimer la carte de l'interface
      const card = buttonElement.closest("article");
      if (card) {
        card.style.opacity = "0.5";
        card.style.transition = "opacity 0.3s";
        setTimeout(() => card.remove(), 300);
      }
      // Note: dans une vraie app, on pourrait recharger la liste pour s'assurer de la cohérence
    } else {
      alert("Erreur lors de la suppression de l'archive");
      buttonElement.disabled = false;
      buttonElement.textContent = originalText;
    }
  } catch (error) {
    console.error("Erreur lors de la suppression:", error);
    alert("Erreur réseau lors de la suppression");
    buttonElement.disabled = false;
    buttonElement.textContent = originalText;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!token) return (window.location.href = "index.html");
  await loadCollections();
  await applyFilters(true);
});
