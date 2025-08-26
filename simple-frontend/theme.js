// theme.js - Système de thème commun pour toutes les pages

// Initialiser le thème au chargement de la page
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  const themeIcon = document.getElementById('theme-icon');
  
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
    if (themeIcon) themeIcon.textContent = '☀️';
  } else {
    document.documentElement.classList.remove('dark');
    if (themeIcon) themeIcon.textContent = '🌙';
  }
}

// Basculer entre thème clair et sombre
window.toggleTheme = function() {
  const html = document.documentElement;
  const themeIcon = document.getElementById('theme-icon');
  
  if (html.classList.contains('dark')) {
    html.classList.remove('dark');
    localStorage.setItem('theme', 'light');
    if (themeIcon) themeIcon.textContent = '🌙';
  } else {
    html.classList.add('dark');
    localStorage.setItem('theme', 'dark');
    if (themeIcon) themeIcon.textContent = '☀️';
  }
};

// Créer le bouton de thème
function createThemeButton() {
  return `
    <button id="theme-toggle" onclick="toggleTheme()" 
            class="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 text-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 transition-colors" 
            title="Basculer le thème">
      <span id="theme-icon">🌙</span>
    </button>
  `;
}

// Initialiser dès que le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTheme);
} else {
  initTheme();
}