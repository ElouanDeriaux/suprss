const API = "http://localhost:8000";
const token = localStorage.getItem("token");
const params = new URLSearchParams(window.location.search);
const articleId = params.get("id");

const $ = (id) => document.getElementById(id);

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${token}`, ...extra };
}

function extractYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
  } catch {}
  return null;
}

async function loadArticle() {
  const res = await fetch(`${API}/articles/${encodeURIComponent(articleId)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    $("title").textContent = "Article introuvable";
    $("content").textContent = "Erreur de chargement.";
    return;
  }
  const a = await res.json();

  $("title").textContent = a.title;
  $("content").textContent = a.content || a.link || "";
  $("source").href = a.link;

  const vid = extractYouTubeId(a.link);
  if (vid) {
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube.com/embed/${vid}`;
    iframe.width = "100%";
    iframe.height = "400";
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.className = "rounded";
    $("video").appendChild(iframe);
  }

  const btn = $("toggle-read");
  btn.textContent = a.read ? "Marquer comme non lu" : "Marquer comme lu";
  btn.onclick = async () => {
    const toRead = !a.read;
    const res2 = await fetch(`${API}/articles/${articleId}/read`, {
      method: toRead ? "POST" : "DELETE",
      headers: authHeaders()
    });
    if (res2.ok) {
      a.read = toRead;
      btn.textContent = a.read ? "Marquer comme non lu" : "Marquer comme lu";
    }
  };
}

document.addEventListener("DOMContentLoaded", loadArticle);
