// theme-minimal.js - Système de thème sans interface utilisateur
// Ne fait qu'appliquer le thème selon localStorage ou les préférences serveur

// Initialiser le thème au chargement de la page
function initTheme() {
  // Récupérer le thème depuis localStorage ou utiliser auto par défaut
  const savedTheme = localStorage.getItem('theme');
  
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (savedTheme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    // Mode auto : utiliser les préférences système
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}

// Initialiser dès que le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTheme);
} else {
  initTheme();
}