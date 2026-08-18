// Base de données simulée (prototype) — à remplacer plus tard par de vrais
// appels à une API de recherche (SerpAPI, Google Shopping, Bing Search...).

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

// Chaque produit a plusieurs "offres" (vendeurs simulés) avec un prix,
// une note de fiabilité, un nombre d'avis et le type de vendeur.
const PRODUCTS = [
  {
    id: "b1",
    category: "livres",
    title: "Fourmi Rouge — Intégrale Fantasy",
    tags: ["Roman", "Fantasy"],
    offers: [
      { vendor: "Fnac", price: 18.9, rating: 4.7, reviews: 1240, type: "officiel" },
      { vendor: "Cultura", price: 19.5, rating: 4.6, reviews: 860, type: "officiel" },
      { vendor: "Amazon (vendeur tiers)", price: 15.9, rating: 3.2, reviews: 34, type: "marketplace" },
      { vendor: "Rakuten", price: 17.2, rating: 4.1, reviews: 210, type: "marketplace" },
    ],
  },
  {
    id: "b2",
    category: "livres",
    title: "Les Ombres de Kaelen — Science-fiction",
    tags: ["Roman", "Science-fiction"],
    offers: [
      { vendor: "Fnac", price: 21.9, rating: 4.5, reviews: 540, type: "officiel" },
      { vendor: "Decitre", price: 20.5, rating: 4.8, reviews: 390, type: "officiel" },
      { vendor: "Amazon (vendeur tiers)", price: 16.4, rating: 2.9, reviews: 18, type: "marketplace" },
    ],
  },
  {
    id: "b3",
    category: "livres",
    title: "Chroniques du Vide — BD Manga Vol.1",
    tags: ["BD/Manga"],
    offers: [
      { vendor: "Cultura", price: 7.9, rating: 4.6, reviews: 980, type: "officiel" },
      { vendor: "Fnac", price: 7.5, rating: 4.5, reviews: 1100, type: "officiel" },
      { vendor: "Rakuten", price: 6.2, rating: 3.5, reviews: 76, type: "marketplace" },
    ],
  },
  {
    id: "b4",
    category: "livres",
    title: "Petit Traité de Philosophie du Quotidien",
    tags: ["Essai"],
    offers: [
      { vendor: "Decitre", price: 14.9, rating: 4.4, reviews: 210, type: "officiel" },
      { vendor: "Amazon (vendeur tiers)", price: 11.9, rating: 3.0, reviews: 12, type: "marketplace" },
    ],
  },
  {
    id: "b5",
    category: "livres",
    title: "L'Inspecteur Vasseur — Policier",
    tags: ["Policier"],
    offers: [
      { vendor: "Fnac", price: 20.0, rating: 4.6, reviews: 430, type: "officiel" },
      { vendor: "Cultura", price: 19.9, rating: 4.5, reviews: 300, type: "officiel" },
      { vendor: "Rakuten", price: 16.5, rating: 3.8, reviews: 95, type: "marketplace" },
    ],
  },
  {
    id: "j1",
    category: "jeux",
    title: "Odyssée Stellaire (PS5)",
    tags: ["Action", "Aventure", "PS5"],
    offers: [
      { vendor: "Fnac", price: 64.99, rating: 4.7, reviews: 2100, type: "officiel" },
      { vendor: "Micromania", price: 62.99, rating: 4.6, reviews: 1800, type: "officiel" },
      { vendor: "Amazon (vendeur tiers)", price: 49.99, rating: 3.1, reviews: 45, type: "marketplace" },
      { vendor: "CDKeys", price: 54.99, rating: 4.2, reviews: 3200, type: "marketplace" },
    ],
  },
  {
    id: "j2",
    category: "jeux",
    title: "Royaumes Perdus RPG (Switch)",
    tags: ["RPG", "Aventure", "Nintendo Switch"],
    offers: [
      { vendor: "Fnac", price: 49.99, rating: 4.5, reviews: 1500, type: "officiel" },
      { vendor: "Micromania", price: 47.99, rating: 4.6, reviews: 1300, type: "officiel" },
      { vendor: "Rakuten", price: 41.99, rating: 3.6, reviews: 120, type: "marketplace" },
    ],
  },
  {
    id: "j3",
    category: "jeux",
    title: "Vitesse Max — Course Arcade (Xbox)",
    tags: ["Course", "Sport", "Xbox Series X|S"],
    offers: [
      { vendor: "Fnac", price: 39.99, rating: 4.3, reviews: 780, type: "officiel" },
      { vendor: "CDKeys", price: 32.99, rating: 4.1, reviews: 2200, type: "marketplace" },
      { vendor: "Amazon (vendeur tiers)", price: 28.99, rating: 2.7, reviews: 21, type: "marketplace" },
    ],
  },
  {
    id: "j4",
    category: "jeux",
    title: "Tacticus — Stratégie multijoueur (PC)",
    tags: ["Stratégie", "Multijoueur", "PC Gaming"],
    offers: [
      { vendor: "Steam", price: 34.99, rating: 4.6, reviews: 15400, type: "officiel" },
      { vendor: "CDKeys", price: 24.99, rating: 4.3, reviews: 4100, type: "marketplace" },
      { vendor: "Site inconnu", price: 12.99, rating: 1.8, reviews: 6, type: "marketplace" },
    ],
  },
  {
    id: "c1",
    category: "consoles",
    title: "Console NextGen Pro 1To",
    tags: ["PS5"],
    offers: [
      { vendor: "Fnac", price: 549.99, rating: 4.8, reviews: 3400, type: "officiel" },
      { vendor: "Micromania", price: 549.99, rating: 4.7, reviews: 2100, type: "officiel" },
      { vendor: "Amazon (vendeur tiers)", price: 519.0, rating: 3.0, reviews: 28, type: "marketplace" },
      { vendor: "Rakuten", price: 499.99, rating: 3.9, reviews: 340, type: "marketplace" },
    ],
  },
  {
    id: "c2",
    category: "consoles",
    title: "Console Hybride Portable 2",
    tags: ["Nintendo Switch", "Portable"],
    offers: [
      { vendor: "Fnac", price: 299.99, rating: 4.7, reviews: 5200, type: "officiel" },
      { vendor: "Cultura", price: 299.0, rating: 4.6, reviews: 1900, type: "officiel" },
      { vendor: "Rakuten", price: 279.0, rating: 4.0, reviews: 410, type: "marketplace" },
    ],
  },
  {
    id: "c3",
    category: "consoles",
    title: "Série X Compact",
    tags: ["Xbox Series X|S"],
    offers: [
      { vendor: "Fnac", price: 299.99, rating: 4.6, reviews: 2600, type: "officiel" },
      { vendor: "Micromania", price: 289.99, rating: 4.5, reviews: 1400, type: "officiel" },
      { vendor: "Site inconnu", price: 249.0, rating: 2.1, reviews: 9, type: "marketplace" },
    ],
  },
  {
    id: "c4",
    category: "consoles",
    title: "RetroBox Mini — 500 jeux classiques",
    tags: ["Rétro"],
    offers: [
      { vendor: "Fnac", price: 59.99, rating: 4.3, reviews: 890, type: "officiel" },
      { vendor: "Amazon (vendeur tiers)", price: 39.99, rating: 2.5, reviews: 15, type: "marketplace" },
      { vendor: "Rakuten", price: 44.99, rating: 3.7, reviews: 130, type: "marketplace" },
    ],
  },
];
