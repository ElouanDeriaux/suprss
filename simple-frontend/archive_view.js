const API = "http://localhost:8000";
const token = localStorage.getItem("token");
const auth = () => {
  if (!token) {
    console.error("Token manquant, redirection vers la page de connexion");
    window.location.href = "index.html";
    return {};
  }
  return { Authorization: `Bearer ${token}` };
};

const url = new URL(window.location.href);
const id = url.searchParams.get("id");

const $ = (s)=>document.querySelector(s);
const titleEl = $("#title");
const metaEl = $("#meta");
const contentEl = $("#content");
const btnSource = $("#btnSource");
const btnPdf = $("#btnPdf");
const contentBadge = $("#content-badge");

function hostFromUrl(url) {
  try { return new URL(url).hostname.replace(/^www\./,''); } catch { return ""; }
}
function fmtDate(s) {
  try { return new Date(s).toLocaleString("fr-FR"); } catch { return s || ""; }
}

function sanitizeArchivedHtml(html = "") {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;

  // Retire scripts/styles/noscript et éléments indésirables
  wrapper.querySelectorAll("script, style, noscript, nav, header, footer, aside, .navigation, .menu, .nav, .sidebar, .ads, .advertisement, .comments, .comment-section").forEach(el => el.remove());

  // Nettoie les attributs indésirables mais garde la structure
  wrapper.querySelectorAll("*").forEach(el => {
    // Garder certains attributs utiles
    const allowedAttrs = ["href", "src", "alt", "title"];
    const attrs = Array.from(el.attributes);
    attrs.forEach(attr => {
      if (!allowedAttrs.includes(attr.name.toLowerCase())) {
        el.removeAttribute(attr.name);
      }
    });
  });

  // Ouvre les liens dans un nouvel onglet
  wrapper.querySelectorAll("a[href]").forEach(a => {
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noreferrer");
  });

  // Ajuste les images pour qu'elles soient responsives
  wrapper.querySelectorAll("img").forEach(img => {
    img.style.maxWidth = "100%";
    img.style.height = "auto";
  });

  // Supprime les divs vides ou avec uniquement des espaces
  wrapper.querySelectorAll("div, span, p").forEach(el => {
    if (!el.textContent.trim() && el.children.length === 0) {
      el.remove();
    }
  });

  const content = wrapper.innerHTML;
  return content && content.trim() ? content : "<p>Contenu de l'article indisponible ou vide.</p>";
}

function formatRssContent(content = "") {
  if (!content || !content.trim()) {
    return "<p class='text-gray-500 italic'>Contenu RSS indisponible ou vide.</p>";
  }

  // Si le contenu semble être du HTML, le traiter normalement
  if (content.includes('<')) {
    return sanitizeArchivedHtml(content);
  }
  
  // Si c'est du texte brut RSS, le formatter de manière plus lisible
  const formatted = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      // Identifier les URLs et les rendre cliquables
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      return line.replace(urlRegex, '<a href="$1" target="_blank" rel="noreferrer" class="text-blue-600 hover:underline">$1</a>');
    })
    .map(line => `<p class="mb-3 leading-relaxed">${line}</p>`)
    .join('');
    
  return formatted || "<p class='text-gray-500 italic'>Contenu formaté indisponible.</p>";
}

async function load() {
  if (!id) {
    contentEl.textContent = "Identifiant manquant.";
    return;
  }
  const res = await fetch(`${API}/archive/${id}`, { headers: auth() });
  if (!res.ok) {
    contentEl.textContent = "Introuvable ou non autorisé.";
    return;
  }
  const a = await res.json();

  titleEl.textContent = a.title || "(sans titre)";
  metaEl.textContent = [hostFromUrl(a.link), fmtDate(a.archived_at)].filter(Boolean).join(" • ");

  btnSource.style.display = a.link ? "inline-flex" : "none";
  if (a.link) btnSource.href = a.link;
  
  // Remplacer le lien par un bouton pour gérer l'authentification
  btnPdf.onclick = async (e) => {
    e.preventDefault();
    const originalText = btnPdf.textContent;
    btnPdf.textContent = "Téléchargement...";
    btnPdf.disabled = true;
    
    try {
      const res = await fetch(`${API}/archive/${a.id}/pdf`, {
        headers: auth()
      });
      
      if (!res.ok) {
        alert("Erreur lors du téléchargement");
        return;
      }
      
      const blob = await res.blob();
      const contentType = res.headers.get("content-type") || "";
      const extension = contentType.includes("pdf") ? "pdf" : "html";
      
      const url = window.URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = `${a.title || 'article'}_archive.${extension}`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(downloadLink);
      
    } catch (error) {
      console.error("Erreur lors du téléchargement:", error);
      alert("Erreur réseau lors du téléchargement");
    } finally {
      btnPdf.textContent = originalText;
      btnPdf.disabled = false;
    }
  };

  // Utiliser le contenu RSS original si disponible, sinon le contenu HTML nettoyé
  if (a.content_original) {
    contentEl.innerHTML = formatRssContent(a.content_original);
    // Badge pour contenu RSS original
    contentBadge.textContent = "📡 Contenu RSS Original";
    contentBadge.className = "px-2 py-1 text-xs rounded-full font-medium bg-green-100 text-green-800";
    contentBadge.classList.remove("hidden");
  } else {
    contentEl.innerHTML = sanitizeArchivedHtml(a.content_html || "");
    // Badge pour contenu archivé nettoyé
    contentBadge.textContent = "🗄️ Contenu Archivé";
    contentBadge.className = "px-2 py-1 text-xs rounded-full font-medium bg-blue-100 text-blue-800";
    contentBadge.classList.remove("hidden");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (!token) return (window.location.href = "index.html");
  load();
});
