// Catégories et tags proposés dans le formulaire de recherche.
// Les résultats eux-mêmes viennent maintenant d'une vraie recherche web
// (netlify/functions/search.js), pas d'une base simulée.

const CATEGORIES = {
  livres: {
    label: "Livres",
    icon: "📚",
    tags: ["Roman", "Fantasy", "Science-fiction", "BD/Manga", "Essai", "Policier", "Jeunesse"],
  },
  jeux: {
    label: "Jeux vidéo",
    icon: "🎮",
    tags: ["Action", "RPG", "Aventure", "Sport", "Course", "Stratégie", "Multijoueur"],
  },
  consoles: {
    label: "Consoles",
    icon: "🕹️",
    tags: ["PS5", "Xbox Series X|S", "Nintendo Switch", "PC Gaming", "Rétro", "Portable"],
  },
};
